//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { AppointmentReport, connectDB, Patient, User, Appointment } from "@/lib/db-server"
import { verifyToken, verifyPatientToken } from "@/lib/auth"
import { sendAppointmentConfirmation, sendAppointmentConfirmationArabic } from "@/lib/whatsapp-service"
import { getAllPhoneNumbers } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    let patientId: string | null = null

    if (!payload) {
      patientId = verifyPatientToken(token)
      if (!patientId) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 })
      }
    }

    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get("appointmentId")
    const queryPatientId = searchParams.get("patientId")
    const doctorId = searchParams.get("doctorId")

    const query: any = {}

    if (appointmentId) {
      query.appointmentId = appointmentId
    } else if (queryPatientId) {
      query.patientId = queryPatientId
    } else if (payload?.role === "admin" || payload?.role === "receptionist") {
      // Admin and receptionist see all reports
    } else if (payload?.role === "doctor") {
      // Doctor sees all reports for their appointments
      console.log("[v0] Fetching all appointment reports for doctor view")
      if (doctorId) {
        query.doctorId = doctorId
      } else {
        query.doctorId = payload.userId
      }
    } else if (patientId) {
      query.patientId = patientId
    }

    if (queryPatientId && payload?.role !== "doctor" && !patientId) {
      query.patientId = queryPatientId
    }

    // Add condition to filter out reports without appointmentId if needed
    const excludeStandalone = searchParams.get("excludeStandalone")
    if (excludeStandalone === "true") {
      query.appointmentId = { $ne: null } // Only include reports with appointmentId
    }

    const reports = await AppointmentReport.find(query)
      .populate("patientId", "name email phone")
      .populate("doctorId", "name specialty")
      .populate({
        path: "appointmentId",
        select: "date time type",
      })
      .sort({ createdAt: -1 })

    const reportsWithPrevious = await Promise.all(
      reports.map(async (report: any) => {
        if (report.previousReportId) {
          const prevReport = await AppointmentReport.findById(report.previousReportId).select(
            "findings notes doctorName doctorRole createdAt"
          )
          return {
            ...report.toObject(),
            previousReport: prevReport ? prevReport.toObject() : null,
          }
        }
        return report.toObject()
      })
    )

    return NextResponse.json({ success: true, reports: reportsWithPrevious })
  } catch (error) {
    console.error("GET appointment reports error:", error)
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    if (payload.role !== "doctor") {
      return NextResponse.json({ error: "Only doctors can create reports" }, { status: 403 })
    }

    const body = await request.json()
    const {
      appointmentId,
      patientId,
      procedures,
      findings,
      notes,
      nextVisitDate,
      nextVisitTime,
      followUpDetails,
      signature,
      isStandalone, // Flag for reports created directly from Clinical Tools
    } = body

    // If not standalone, appointmentId is required
    if (!isStandalone && (!appointmentId || !String(appointmentId).trim())) {
      return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 })
    }

    if (!patientId || !String(patientId).trim()) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 })
    }

    let proceduresArray = []
    if (Array.isArray(procedures)) {
      proceduresArray = procedures
        .filter((p) => p && String(p).trim())
        .map((p) => ({
          name: String(p).trim(),
          description: "",
          tooth: "",
          status: "completed",
        }))
    } else if (typeof procedures === "string") {
      proceduresArray = procedures
        .split("\n")
        .map((p) => String(p).trim())
        .filter(Boolean)
        .map((p) => ({
          name: p,
          description: "",
          tooth: "",
          status: "completed",
        }))
    }

    if (!proceduresArray || proceduresArray.length === 0) {
      return NextResponse.json({ error: "At least one procedure is required" }, { status: 400 })
    }

    if (!findings || String(findings).trim() === "") {
      return NextResponse.json({ error: "Findings are required" }, { status: 400 })
    }

    if (!notes || String(notes).trim() === "") {
      return NextResponse.json({ error: "Notes are required" }, { status: 400 })
    }

    const patientExists = await Patient.findById(patientId)
    if (!patientExists) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    const doctorExists = await User.findById(payload.userId)
    if (!doctorExists) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 })
    }

    // For standalone reports, skip appointment-specific checks
    let appointmentExists = null
    let doctorRole = "original"
    let referralId = null
    let previousReportId = null

    if (!isStandalone) {
      appointmentExists = await Appointment.findById(appointmentId)
      if (!appointmentExists) {
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
      }

      // Check if doctor already created a report for this appointment
      const existingReport = await AppointmentReport.findOne({
        appointmentId: appointmentId,
        doctorId: payload.userId,
      })

      if (existingReport) {
        return NextResponse.json(
          {
            error: "You have already created a report for this appointment. One report per doctor maximum.",
            details: "You cannot create another report for the same appointment.",
          },
          { status: 403 }
        )
      }

      // Original doctor creating report after referral back
      // CRITICAL RULE: Only if they didn't create one before
      if (appointmentExists.status === "refer_back") {
        const originalReportBeforeReferral = await AppointmentReport.findOne({
          appointmentId: appointmentId,
          doctorId: payload.userId,
          doctorRole: "original",
        })

        if (originalReportBeforeReferral) {
          return NextResponse.json(
            {
              error:
                "You cannot create another report after referral back. You already created a report before referring this case.",
              details: "Only one report per doctor is allowed.",
            },
            { status: 403 }
          )
        }

        // Original doctor can create now since they didn't create before
        doctorRole = "original"
        referralId = null
      }
      // Referred doctor creating report
      else if (appointmentExists.isReferred && String(appointmentExists.doctorId) === String(payload.userId)) {
        doctorRole = "referred"
        referralId = appointmentExists.currentReferralId

        // Find the original doctor's report to reference
        const originalReport = await AppointmentReport.findOne({
          appointmentId: appointmentId,
          doctorRole: "original",
        }).sort({ createdAt: -1 })

        if (originalReport) {
          previousReportId = originalReport._id
        }
      }
      // Original doctor creating first report
      else if (String(appointmentExists.originalDoctorId || appointmentExists.doctorId) === String(payload.userId)) {
        doctorRole = "original"
        referralId = null
      } else {
        return NextResponse.json(
          { error: "You are not authorized to create a report for this appointment" },
          { status: 403 }
        )
      }
    }

    let nextVisitDateTime = null
    if (nextVisitDate && nextVisitDate.trim() && nextVisitTime && nextVisitTime.trim()) {
      try {
        const combinedDateTime = `${nextVisitDate}T${nextVisitTime}:00`
        nextVisitDateTime = new Date(combinedDateTime)
      } catch (error) {
        console.error("Error parsing next visit datetime:", error)
        nextVisitDateTime = new Date(nextVisitDate)
      }
    } else if (nextVisitDate && nextVisitDate.trim()) {
      nextVisitDateTime = new Date(nextVisitDate)
    }

    let nextVisitAppointmentId: string | null = null

    const reportData: any = {
      patientId: String(patientId).trim(),
      doctorId: payload.userId,
      doctorName: doctorExists.name,
      procedures: proceduresArray,
      findings: String(findings).trim(),
      notes: String(notes).trim(),
      nextVisitDate: nextVisitDate ? nextVisitDate : null,
      nextVisitTime: nextVisitTime ? nextVisitTime : null,
      followUpDetails: followUpDetails ? String(followUpDetails).trim() : "",
      signature: signature || null,
      doctorRole: doctorRole,
      referralId: referralId,
      previousReportId: previousReportId,
      reportStatus: "submitted",
    }

    // Only add appointmentId if it exists and is a valid string (for linked reports)
    // For standalone reports, don't include appointmentId at all to avoid schema validation errors
    if (appointmentId && String(appointmentId).trim() && String(appointmentId).trim() !== "undefined") {
      reportData.appointmentId = String(appointmentId).trim()
    } else if (isStandalone) {
      // For standalone reports, we might still want to track if it was created from an appointment
      // But if no appointmentId is provided, leave it undefined
      reportData.appointmentId = undefined
    }

    console.log("[v0] Creating report with multi-report data:", reportData)

    const report = await AppointmentReport.create(reportData)

    if (!report) {
      console.error("[v0] Report creation returned null")
      return NextResponse.json({ error: "Failed to create report in database" }, { status: 500 })
    }

    const populatedReport = await AppointmentReport.findById(report._id)
      .populate("patientId", "name")
      .populate("doctorId", "name specialty")
      .populate({
        path: "appointmentId",
        select: "date time type",
      })

    const reportResponse: any = populatedReport?.toObject() || {}
    if (report.previousReportId) {
      const prevReport = await AppointmentReport.findById(report.previousReportId).select(
        "findings notes doctorName doctorRole createdAt"
      )
      reportResponse.previousReport = prevReport ? prevReport.toObject() : null
    }

    console.log("[v0] Report created successfully:", reportResponse)

    // If next visit date and time are provided, create an appointment for the next visit
    if (nextVisitDate && nextVisitDate.trim() && nextVisitTime && nextVisitTime.trim()) {
      try {
        console.log("[v0] Creating next visit appointment:", { nextVisitDate, nextVisitTime, isStandalone })
        
        // Create the next visit appointment
        const nextVisitAppointment = await Appointment.create({
          patientId: String(patientId).trim(),
          patientName: patientExists?.name || "Patient",
          doctorId: String(payload.userId),
          doctorName: doctorExists.name,
          date: nextVisitDate,
          time: nextVisitTime,
          type: "Consultation", // Default type for follow-up visits
          status: "confirmed",
          roomNumber: appointmentExists?.roomNumber || undefined, // Use same room if available (only for appointment-linked reports)
          duration: 30, // Standard follow-up duration
          isReferred: false,
          originalDoctorId: null,
          originalDoctorName: null,
          currentReferralId: null,
          createdBy: String(payload.userId),
          createdByName: doctorExists.name,
        })
        
        nextVisitAppointmentId = nextVisitAppointment._id.toString()
        console.log("[v0] Next visit appointment created successfully:", nextVisitAppointmentId)
        
        // Update report with the next visit appointment ID for future updates
        await AppointmentReport.findByIdAndUpdate(report._id, {
          nextVisitAppointmentId: nextVisitAppointmentId,
        })
        
        // Send WhatsApp notification for next visit appointment
        const allPhoneNumbers = patientExists ? getAllPhoneNumbers(patientExists) : []
        if (allPhoneNumbers && allPhoneNumbers.length > 0) {
          // Send English template
          await sendAppointmentConfirmation(
            allPhoneNumbers,
            patientExists.name,
            nextVisitDate,
            nextVisitTime,
            doctorExists.name,
          ).catch(err => console.warn("[v0] Failed to send English WhatsApp for next visit:", err))
          
          // Send Arabic template
          await sendAppointmentConfirmationArabic(
            allPhoneNumbers,
            nextVisitDate,
            nextVisitTime,
            doctorExists.name,
            patientExists.name,
          ).catch(err => console.warn("[v0] Failed to send Arabic WhatsApp for next visit:", err))
        }
      } catch (error) {
        console.error("[v0] Error creating next visit appointment:", error)
        // Don't fail the entire report creation if next visit appointment creation fails
      }
    }

    const patientData_ForEmail = patientExists
    if (patientData_ForEmail && patientData_ForEmail.email) {
      console.log("[v0] Sending treatment report email to patient:", patientData_ForEmail.email)
      const { sendTreatmentReportEmail } = await import("@/lib/nodemailer-service")

      const procedureNames = proceduresArray.map((p) => p.name)

      let nextVisitFormatted = undefined
      if (nextVisitDateTime) {
        const dateStr = nextVisitDateTime.toLocaleDateString()
        const timeStr = nextVisitTime ? ` at ${nextVisitTime}` : ""
        nextVisitFormatted = `${dateStr}${timeStr}`
      }

      const emailResult = await sendTreatmentReportEmail(
        patientData_ForEmail.email,
        patientData_ForEmail.name,
        doctorExists.name,
        procedureNames,
        findings,
        nextVisitFormatted,
      )

      if (!emailResult.success) {
        console.warn("[v0] Treatment report email failed:", emailResult.error)
      } else {
        console.log("[v0] Treatment report email sent successfully:", emailResult.messageId)
      }
    } else {
      console.warn("[v0] Patient email not found — Treatment report email skipped")
    }

    return NextResponse.json({ success: true, report: reportResponse })
  } catch (error) {
    console.error("[v0] POST appointment report error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: `Failed to create report: ${errorMessage}` }, { status: 500 })
  }
}