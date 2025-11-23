//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { AppointmentReport, connectDB, Patient, User, Appointment } from "@/lib/db-server"
import { verifyToken, verifyPatientToken } from "@/lib/auth"

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

    const query: any = {}

    if (appointmentId) {
      query.appointmentId = appointmentId
      // Don't filter by doctorId when checking specific appointment - any doctor's report counts
    } else if (payload?.role === "doctor") {
      // This allows doctors to see reports created by referred doctors on their appointments
      console.log("[v0] Fetching all appointment reports for doctor view")
      // No doctorId filter - doctor will see all reports and filter on frontend based on appointments they own
    } else if (payload?.role === "admin" || payload?.role === "receptionist") {
      // Admin and receptionist see all reports
    } else if (patientId) {
      // For patients, only show their own reports
      query.patientId = patientId
    }

    if (queryPatientId && payload?.role !== "doctor" && !patientId) {
      query.patientId = queryPatientId
    }

    const reports = await AppointmentReport.find(query)
      .populate("patientId", "name email phone")
      .populate("doctorId", "name specialty")
      .populate("appointmentId", "date time type")
      .sort({ createdAt: -1 })

    return NextResponse.json({ success: true, reports })
  } catch (error) {
    console.error("  GET appointment reports error:", error)
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
    const { appointmentId, patientId, procedures, findings, notes, nextVisit, followUpDetails } = body

    if (!appointmentId || !String(appointmentId).trim()) {
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

    const appointmentExists = await Appointment.findById(appointmentId)
    if (!appointmentExists) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    const reportData = {
      appointmentId: String(appointmentId).trim(),
      patientId: String(patientId).trim(),
      doctorId: payload.userId,
      procedures: proceduresArray,
      findings: String(findings).trim(),
      notes: String(notes).trim(),
      nextVisit: nextVisit ? new Date(nextVisit) : null,
      followUpDetails: followUpDetails ? String(followUpDetails).trim() : "",
    }

    console.log("  Creating report with data:", reportData)

    const report = await AppointmentReport.create(reportData)

    if (!report) {
      console.error("  Report creation returned null")
      return NextResponse.json({ error: "Failed to create report in database" }, { status: 500 })
    }

    const populatedReport = await AppointmentReport.findById(report._id)
      .populate("patientId", "name")
      .populate("doctorId", "name specialty")

    console.log("  Report created successfully:", populatedReport)

    const patientData = await Patient.findById(patientId)
    if (patientData && patientData.email) {
      console.log("  Sending treatment report email to patient:", patientData.email)
      const { sendTreatmentReportEmail } = await import("@/lib/nodemailer-service")

      const procedureNames = proceduresArray.map((p) => p.name)
      const nextVisitDateFormatted = nextVisit ? new Date(nextVisit).toLocaleDateString() : undefined

      const emailResult = await sendTreatmentReportEmail(
        patientData.email,
        patientData.name,
        doctorExists.name,
        procedureNames,
        findings,
        nextVisitDateFormatted,
      )

      if (!emailResult.success) {
        console.warn("  Treatment report email failed:", emailResult.error)
      } else {
        console.log("  Treatment report email sent successfully:", emailResult.messageId)
      }
    } else {
      console.warn("  Patient email not found — Treatment report email skipped")
    }

    // if (patientData?.phone) {
    //   console.log("  Scheduling WhatsApp notification for 1 minute after report creation")

    //     try {
    //       console.log("  Sending WhatsApp medical report link to patient:", patientData.phone)
    //       const { sendMedicalReportLink } = await import("@/lib/whatsapp-service")
    //       const { encryptData } = await import("@/lib/encryption")

    //       // Generate secure token for the report
    //       const token = encryptData(JSON.stringify({ appointmentId, patientId }))
    //       const encodedToken = encodeURIComponent(token)
    //       const reportLink = `${process.env.NEXT_PUBLIC_APP_URL}/public/reports/${encodedToken}`

    //       const appointmentData = await Appointment.findById(appointmentId)
    //       const appointmentDate = appointmentData?.date
    //         ? new Date(appointmentData.date).toLocaleDateString("en-US", {
    //             year: "numeric",
    //             month: "short",
    //             day: "numeric",
    //           })
    //         : "N/A"
    //       const appointmentTime = appointmentData?.time || "N/A"

    //       const whatsappResult = await sendMedicalReportLink(
    //         patientData.phone,
    //         patientData.name,
    //         appointmentDate,
    //         appointmentTime,
    //         doctorExists.name,
    //         reportLink,
    //       )

    //       if (whatsappResult.success) {
    //         console.log("  WhatsApp medical report link sent successfully:", whatsappResult.messageId)
    //       } else {
    //         console.warn("  WhatsApp medical report link failed:", whatsappResult.error)
    //       }
    //     } catch (err) {
    //       console.error("  Error sending WhatsApp notification:", err)
    //     }
    //  // 60000 milliseconds = 1 minute
    // }

    return NextResponse.json({ success: true, report: populatedReport })
  } catch (error) {
    console.error("  POST appointment report error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: `Failed to create report: ${errorMessage}` }, { status: 500 })
  }
}
