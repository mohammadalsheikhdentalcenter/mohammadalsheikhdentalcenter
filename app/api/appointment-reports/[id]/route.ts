//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { Appointment, connectDB, AppointmentReport, Patient, User } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"
import { sendAppointmentReschedule, sendAppointmentCancellation, sendAppointmentConfirmation, sendAppointmentConfirmationArabic } from "@/lib/whatsapp-service"
import { sendAppointmentCancellationEmail, sendAppointmentRescheduleEmail } from "@/lib/nodemailer-service"
import { getAllPhoneNumbers, formatTimeFor12Hour } from "@/lib/utils"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🟢 [GET] Fetching appointment details")
    await connectDB()

    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      console.warn("🔴 [GET] No token found in request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      console.warn("🔴 [GET] Invalid token received")
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { id } = params
    console.log("🟠 [GET] Fetching appointment with ID:", id)

    const appointment = await Appointment.findById(id)
    if (!appointment) {
      console.warn("🔴 [GET] Appointment not found:", id)
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // Check permissions - user can view their own appointment or admin/receptionist can view any
    if (payload.role === "patient" && appointment.patientId !== payload.userId) {
      console.warn("🔴 [GET] Patient trying to view another patient's appointment")
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (payload.role === "doctor" && appointment.doctorId !== payload.userId) {
      console.warn("🔴 [GET] Doctor trying to view another doctor's appointment")
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    console.log("🟢 [GET] Appointment fetched successfully")
    return NextResponse.json({
      success: true,
      appointment,
    })
  } catch (error) {
    console.error("🔴 [GET] Unexpected error fetching appointment:", error)
    return NextResponse.json({ error: "Failed to fetch appointment" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🟢 [PATCH] Updating report")
    await connectDB()

    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      console.warn("🔴 [PATCH] No token found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      console.warn("🔴 [PATCH] Invalid token")
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    if (payload.role !== "doctor" && payload.role !== "admin") {
      console.warn("🔴 [PATCH] Unauthorized role tried to update report:", payload.role)
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { id } = params
    const body = await request.json()
    const { findings, notes, followUpDetails, nextVisitDate, nextVisitTime } = body // Added nextVisitTime

    const report = await AppointmentReport.findById(id)
    if (!report) {
      console.warn("🔴 [PATCH] Report not found:", id)
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    const appointment = await Appointment.findById(report.appointmentId)
    if (!appointment) {
      console.warn("🔴 [PATCH] Appointment not found:", report.appointmentId)
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    if (appointment.status === "closed") {
      console.warn("🔴 [PATCH] Cannot edit report for closed appointment")
      return NextResponse.json({ error: "Cannot edit reports for closed appointments" }, { status: 403 })
    }

    if (payload.role === "doctor") {
      const isReportCreator = String(report.doctorId) === String(payload.userId)

      const isCurrentDoctor = appointment && String(appointment.doctorId) === String(payload.userId)
      const isOriginalDoctor = appointment && String(appointment.originalDoctorId) === String(payload.userId)

      if (!isReportCreator && !isCurrentDoctor && !isOriginalDoctor) {
        console.warn("🔴 [PATCH] Doctor trying to update unauthorized report")
        return NextResponse.json({ error: "You can only edit your own reports" }, { status: 403 })
      }
    }

    const updateData: any = {}
    if (findings !== undefined) updateData.findings = findings
    if (notes !== undefined) updateData.notes = notes
    if (followUpDetails !== undefined) updateData.followUpDetails = followUpDetails
    if (nextVisitDate !== undefined) updateData.nextVisitDate = nextVisitDate ? nextVisitDate : null
    if (nextVisitTime !== undefined) updateData.nextVisitTime = nextVisitTime ? nextVisitTime : null
    updateData.updatedAt = new Date()

    // Get the existing appointment ID BEFORE updating the report
    const existingNextVisitId = report.nextVisitAppointmentId
    console.log("[v0] Existing next visit appointment ID:", existingNextVisitId)

    const updatedReport = await AppointmentReport.findByIdAndUpdate(id, updateData, { new: true })
      .populate("patientId", "name email phone")
      .populate("doctorId", "name specialty")
      .populate("appointmentId", "date time type")

    if (!updatedReport) {
      console.warn("🔴 [PATCH] Failed to update report")
      return NextResponse.json({ error: "Failed to update report" }, { status: 500 })
    }

    // Handle next visit appointment updates
    try {
      console.log("[v0] Handling next visit appointment for updated report")
      
      // Determine the final next visit date and time values
      const finalNextVisitDate = nextVisitDate !== undefined ? nextVisitDate : report.nextVisitDate
      const finalNextVisitTime = nextVisitTime !== undefined ? nextVisitTime : report.nextVisitTime
      
      console.log("[v0] Final next visit values:", { finalNextVisitDate, finalNextVisitTime })
      
      // Check if either date or time was changed
      if (nextVisitDate !== undefined || nextVisitTime !== undefined) {
        // Case 1: Next visit dates are being removed (set to null/empty)
        if (!finalNextVisitDate || !String(finalNextVisitDate).trim() || !finalNextVisitTime || !String(finalNextVisitTime).trim()) {
          if (existingNextVisitId) {
            // Cancel the previously created appointment
            await Appointment.findByIdAndUpdate(existingNextVisitId, {
              status: "cancelled",
            })
            console.log("[v0] Next visit appointment cancelled due to report update:", existingNextVisitId)
          }
        } 
        // Case 2: Next visit dates are provided - update or create
        else if (finalNextVisitDate && String(finalNextVisitDate).trim() && finalNextVisitTime && String(finalNextVisitTime).trim()) {
          if (existingNextVisitId) {
            // IMPORTANT: Update the EXISTING appointment instead of creating a new one
            const updatedAppointment = await Appointment.findByIdAndUpdate(
              existingNextVisitId,
              {
                date: String(finalNextVisitDate).trim(),
                time: String(finalNextVisitTime).trim(),
                status: "confirmed",
              },
              { new: true }
            )
            console.log("[v0] ✅ Next visit appointment UPDATED (not recreated):", existingNextVisitId, {
              date: finalNextVisitDate,
              time: finalNextVisitTime,
            })

            // Send reschedule notification via WhatsApp
            const patientData = await Patient.findById(report.patientId)
            const doctorData = await User.findById(report.doctorId)
            if (patientData) {
              const allPhoneNumbers = getAllPhoneNumbers(patientData)
              console.log("[v0] WhatsApp Reschedule - Phone numbers:", { count: allPhoneNumbers?.length, numbers: allPhoneNumbers })
              
              if (allPhoneNumbers && allPhoneNumbers.length > 0) {
                const formattedRescheduleTime = formatTimeFor12Hour(String(finalNextVisitTime).trim())
                console.log("[v0] WhatsApp Reschedule - Formatted time:", { original: finalNextVisitTime, formatted: formattedRescheduleTime })
                
                try {
                  // Send English template
                  console.log("[v0] Sending English WhatsApp reschedule template")
                  const rescheduleResult = await sendAppointmentReschedule(
                    allPhoneNumbers,
                    patientData.name,
                    String(finalNextVisitDate).trim(),
                    formattedRescheduleTime,
                    doctorData?.name || "Doctor",
                  )
                  console.log("[v0] English reschedule result:", rescheduleResult)
                  
                  // Send Arabic template (if available)
                  // Note: Add Arabic reschedule template if available in whatsapp-service
                } catch (whatsappErr) {
                  console.error("[v0] Error sending WhatsApp reschedule:", whatsappErr)
                }
              } else {
                console.warn("[v0] No phone numbers found for reschedule notification")
              }
            }
          } else {
            // Create new appointment if one wasn't created before
            const patientData = await Patient.findById(report.patientId)
            const doctorData = await User.findById(report.doctorId)
            
            const newAppointment = await Appointment.create({
              patientId: String(report.patientId),
              patientName: patientData?.name || "Patient",
              doctorId: String(report.doctorId),
              doctorName: doctorData?.name || "Doctor",
              date: String(finalNextVisitDate).trim(),
              time: String(finalNextVisitTime).trim(),
              type: "Consultation",
              status: "confirmed",
              duration: 30,
              isReferred: false,
              createdBy: String(payload.userId),
              createdByName: payload.userName,
            })
            
            // Update report with the new appointment ID
            await AppointmentReport.findByIdAndUpdate(id, {
              nextVisitAppointmentId: newAppointment._id.toString(),
            })
            
            console.log("[v0] Next visit appointment created during report update:", newAppointment._id.toString())

            // Send confirmation notification
            if (patientData) {
              const allPhoneNumbers = getAllPhoneNumbers(patientData)
              console.log("[v0] WhatsApp Confirmation - Phone numbers:", { count: allPhoneNumbers?.length, numbers: allPhoneNumbers })
              
              if (allPhoneNumbers && allPhoneNumbers.length > 0) {
                const formattedConfirmTime = formatTimeFor12Hour(String(finalNextVisitTime).trim())
                console.log("[v0] WhatsApp Confirmation - Formatted time:", { original: finalNextVisitTime, formatted: formattedConfirmTime })
                
                try {
                  // Send English template
                  console.log("[v0] Sending English WhatsApp confirmation template")
                  const confirmResult = await sendAppointmentConfirmation(
                    allPhoneNumbers,
                    patientData.name,
                    String(finalNextVisitDate).trim(),
                    formattedConfirmTime,
                    doctorData?.name || "Doctor",
                  )
                  console.log("[v0] English confirmation result:", confirmResult)
                  
                  // Send Arabic template
                  console.log("[v0] Sending Arabic WhatsApp confirmation template")
                  const arabicResult = await sendAppointmentConfirmationArabic(
                    allPhoneNumbers,
                    String(finalNextVisitDate).trim(),
                    formattedConfirmTime,
                    doctorData?.name || "Doctor",
                    patientData.name,
                  )
                  console.log("[v0] Arabic confirmation result:", arabicResult)
                } catch (whatsappErr) {
                  console.error("[v0] Error sending WhatsApp confirmation:", whatsappErr)
                }
              } else {
                console.warn("[v0] No phone numbers found for confirmation notification")
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error handling next visit appointment during update:", error)
      // Don't fail the report update if appointment handling fails
    }

    console.log("🟢 [PATCH] Report updated successfully:", id)
    return NextResponse.json(updatedReport, { status: 200 })
  } catch (error) {
    console.error("🔴 [PATCH] Error updating report:", error)
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🟢 [DELETE] Deleting report")
    await connectDB()

    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      console.warn("🔴 [DELETE] No token found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      console.warn("🔴 [DELETE] Invalid token")
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // if (payload.role !== "admin" && payload.role !== "receptionist") {
    //   console.warn("🔴 [DELETE] Unauthorized role tried to delete report:", payload.role)
    //   return NextResponse.json({ error: "Access denied" }, { status: 403 })
    // }

    const { id } = params
    console.log("🟠 [DELETE] Report ID:", id)

    const deletedReport = await AppointmentReport.findByIdAndDelete(id)

    if (!deletedReport) {
      console.warn("🔴 [DELETE] Report not found:", id)
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    console.log("🟢 [DELETE] Report deleted successfully:", id)
    return NextResponse.json({
      success: true,
      message: "Report deleted successfully",
      report: deletedReport,
    })
  } catch (error) {
    console.error("🔴 [DELETE] Error deleting report:", error)
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 })
  }
}
