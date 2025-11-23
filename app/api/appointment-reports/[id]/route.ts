//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { Appointment, connectDB, AppointmentReport } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"
import { sendAppointmentReschedule, sendAppointmentCancellation } from "@/lib/whatsapp-service"
import { validateAppointmentScheduling } from "@/lib/appointment-validation"
import { sendAppointmentCancellationEmail, sendAppointmentRescheduleEmail } from "@/lib/nodemailer-service"

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

    const { id } = await params
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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🟢 [PUT] Appointment update called")
    await connectDB()
    console.log("🟢 [PUT] Database connected successfully")

    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      console.warn("🔴 [PUT] No token found in request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      console.warn("🔴 [PUT] Invalid token received")
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { id } = await params
    const updateData = await request.json()
    console.log("🟠 [PUT] Update data received:", updateData)

    // Doctor permissions check
    if (payload.role === "doctor") {
      if (updateData.status && !["cancelled", "completed", "closed"].includes(updateData.status)) {
        console.warn("🔴 [PUT] Doctor trying to set invalid status:", updateData.status)
        return NextResponse.json({ error: "Doctors can only cancel, close, or complete appointments" }, { status: 403 })
      }

      const appointment = await Appointment.findById(id)
      if (appointment && appointment.doctorId !== payload.userId) {
        console.warn("🔴 [PUT] Doctor trying to update another doctor's appointment")
        return NextResponse.json({ error: "You can only manage your own appointments" }, { status: 403 })
      }
    } else if (payload.role !== "admin" && payload.role !== "receptionist") {
      console.warn("🔴 [PUT] Unauthorized role tried to update appointment:", payload.role)
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const originalAppointment = await Appointment.findById(id)
    if (!originalAppointment) {
      console.warn("🔴 [PUT] Appointment not found for ID:", id)
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    console.log("🟠 [PUT] Original appointment found:", originalAppointment.status)

    if (updateData.date || updateData.time) {
      const newDate = updateData.date || originalAppointment.date
      const newTime = updateData.time || originalAppointment.time
      const newDuration = updateData.duration || originalAppointment.duration || 30

      // Only check if date/time actually changed
      if (newDate !== originalAppointment.date || newTime !== originalAppointment.time) {
        const validation = await validateAppointmentScheduling(
          originalAppointment.doctorId,
          newDate,
          newTime,
          newDuration,
          id, // Exclude current appointment from validation
        )

        if (!validation.isValid) {
          console.warn("🔴 [PUT] Validation failed:", validation.error)
          return NextResponse.json({ error: validation.error }, { status: 409 })
        }
      }
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(id, updateData, { new: true })
    if (!updatedAppointment) {
      console.warn("🔴 [PUT] Failed to update appointment with ID:", id)
      return NextResponse.json({ error: "Appointment not found after update" }, { status: 404 })
    }

    console.log("🟢 [PUT] Appointment updated successfully")

    // Fetch patient
    const { Patient } = await import("@/lib/db-server")
    const patient = await Patient.findById(originalAppointment.patientId)
    console.log("🟠 [PUT] Patient found:", patient ? patient.name : "❌ No patient found")

    if (patient && patient.phone) {
      console.log("🟢 [PUT] Patient phone detected:", patient.phone)

      // Appointment cancellation notification
      if (updateData.status === "cancelled" && originalAppointment.status !== "cancelled") {
        console.log("🟠 [PUT] Appointment marked as cancelled — sending WhatsApp cancellation...")

        const whatsappResult = await sendAppointmentCancellation(
          patient.phone,
          originalAppointment.patientName,
          originalAppointment.doctorName,
          originalAppointment.date,
        )

        console.log("🟣 [PUT] WhatsApp cancellation result:", whatsappResult)

        if (!whatsappResult.success) {
          console.warn("⚠️ [PUT] WhatsApp cancellation failed:", whatsappResult.error)
        } else {
          console.log("✅ [PUT] WhatsApp cancellation sent successfully:", whatsappResult.messageId)
        }

        if (patient.email) {
          console.log("  Sending email cancellation to patient:", patient.email)
          const emailResult = await sendAppointmentCancellationEmail(
            patient.email,
            originalAppointment.patientName,
            originalAppointment.doctorName,
            originalAppointment.date,
          )

          if (!emailResult.success) {
            console.warn("  Email cancellation failed:", emailResult.error)
          } else {
            console.log("  Email cancellation sent successfully:", emailResult.messageId)
          }
        }

        // Appointment reschedule notification
      } else if (
        (updateData.date && updateData.date !== originalAppointment.date) ||
        (updateData.time && updateData.time !== originalAppointment.time)
      ) {
        const newDate = updateData.date || originalAppointment.date
        const newTime = updateData.time || originalAppointment.time

        console.log("🟠 [PUT] Appointment rescheduled — sending WhatsApp notification...", {
          newDate,
          newTime,
        })

        const whatsappResult = await sendAppointmentReschedule(
          patient.phone,
          originalAppointment.patientName,
          newDate,
          newTime,
          originalAppointment.doctorName,
        )

        console.log("[v0] ✅ RESCHEDULE TEMPLATE: WhatsApp result:", whatsappResult)

        if (!whatsappResult.success) {
          console.warn("[v0] ⚠️ RESCHEDULE TEMPLATE FAILED:", whatsappResult.error)
        } else {
          console.log("[v0] ✅ RESCHEDULE TEMPLATE SENT successfully with messageId:", whatsappResult.messageId)
        }

        if (patient.email) {
          console.log("  Sending email reschedule to patient:", patient.email)
          const emailResult = await sendAppointmentRescheduleEmail(
            patient.email,
            originalAppointment.patientName,
            originalAppointment.doctorName,
            newDate,
            newTime,
            originalAppointment.date,
            originalAppointment.time,
          )

          if (!emailResult.success) {
            console.warn("  Email reschedule failed:", emailResult.error)
          } else {
            console.log("  Email reschedule sent successfully:", emailResult.messageId)
          }
        }
      } else {
        console.log("ℹ️ [PUT] No WhatsApp notification required for this update")
      }
    } else {
      console.warn("❌ [PUT] Patient phone not found — WhatsApp message skipped")
    }

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
    })
  } catch (error) {
    console.error("🔴 [PUT] Unexpected error updating appointment:", error)
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 })
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

    if (payload.role !== "admin" && payload.role !== "receptionist") {
      console.warn("🔴 [DELETE] Unauthorized role tried to delete report:", payload.role)
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { id } = await params
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

    const { id } = await params
    const body = await request.json()
    const { findings, notes, followUpDetails, nextVisit } = body

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
    if (nextVisit !== undefined) updateData.nextVisit = nextVisit ? new Date(nextVisit) : null
    updateData.updatedAt = new Date()

    const updatedReport = await AppointmentReport.findByIdAndUpdate(id, updateData, { new: true })
      .populate("patientId", "name email phone")
      .populate("doctorId", "name specialty")
      .populate("appointmentId", "date time type")

    if (!updatedReport) {
      console.warn("🔴 [PATCH] Failed to update report")
      return NextResponse.json({ error: "Failed to update report" }, { status: 500 })
    }

    console.log("🟢 [PATCH] Report updated successfully:", id)
    return NextResponse.json(updatedReport, { status: 200 })
  } catch (error) {
    console.error("🔴 [PATCH] Error updating report:", error)
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 })
  }
}
