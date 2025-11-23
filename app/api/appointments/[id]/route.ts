//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { Appointment, connectDB, User } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"
import { sendAppointmentReschedule, sendAppointmentCancellation } from "@/lib/whatsapp-service"
import { validateAppointmentSchedulingServer } from "@/lib/appointment-validation-server"

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

    if (payload.role === "doctor") {
      const appointment = await Appointment.findById(id)
      if (appointment && appointment.doctorId !== payload.userId) {
        console.warn("🔴 [PUT] Doctor trying to update another doctor's appointment")
        return NextResponse.json({ error: "You can only manage your own appointments" }, { status: 403 })
      }
      // Doctors can now update all appointment fields for their own appointments
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

    if (updateData.status === "closed" && originalAppointment.status !== "closed") {
      console.log("🟠 [PUT] Checking for medical report before closing appointment...")
      const { AppointmentReport } = await import("@/lib/db-server")
      const report = await AppointmentReport.findOne({
        appointmentId: id,
        patientId: originalAppointment.patientId,
      })

      if (!report) {
        console.warn("🔴 [PUT] Cannot close appointment without medical report")
        return NextResponse.json(
          { error: "Cannot close appointment without a medical report. Please create a report first." },
          { status: 400 },
        )
      }
      console.log("🟢 [PUT] Medical report found, proceeding with closing appointment")

      if (originalAppointment.currentReferralId) {
        const { AppointmentReferral } = await import("@/lib/db-server")
        await AppointmentReferral.findByIdAndUpdate(originalAppointment.currentReferralId, {
          status: "completed",
          notes: "Appointment closed by original doctor",
          updatedAt: new Date(),
        })
        console.log("🟢 [PUT] Related referral closed:", originalAppointment.currentReferralId)
      }
    }

    if (updateData.date || updateData.time) {
      const newDate = updateData.date || originalAppointment.date
      const newTime = updateData.time || originalAppointment.time
      const newDuration = updateData.duration || originalAppointment.duration || 30

      // Only check if date/time actually changed
      if (newDate !== originalAppointment.date || newTime !== originalAppointment.time) {
        const validation = await validateAppointmentSchedulingServer(
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

      if (updateData.status === "closed" && originalAppointment.status !== "closed") {
        console.log("🟠 [PUT] Appointment marked as closed — checking for medical report...")

        const { AppointmentReport } = await import("@/lib/db-server")
        const report = await AppointmentReport.findOne({
          appointmentId: id,
          patientId: originalAppointment.patientId,
        })

        if (report) {
          console.log("🟠 [PUT] Medical report found — generating secure link...")
          const { encryptData } = await import("@/lib/encryption")

          // Generate encrypted token with appointment and patient IDs
          const reportToken = encryptData(
            JSON.stringify({
              appointmentId: id,
              patientId: originalAppointment.patientId,
            }),
          )

          const reportLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/public/reports/${reportToken}`

          console.log("🟠 [PUT] Sending WhatsApp report link to patient...")

          const { sendMedicalReportLink } = await import("@/lib/whatsapp-service")
          const whatsappResult = await sendMedicalReportLink(patient.phone, patient.name, reportLink)

          console.log("🟣 [PUT] WhatsApp report link result:", whatsappResult)

          if (!whatsappResult.success) {
            console.warn("⚠️ [PUT] WhatsApp report link failed:", whatsappResult.error)
          } else {
            console.log("✅ [PUT] WhatsApp report link sent successfully:", whatsappResult.messageId)
          }
        } else {
          console.warn("⚠️ [PUT] No medical report found for appointment")
        }
      }

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
          const { sendAppointmentCancellationEmail } = await import("@/lib/nodemailer-service")
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
          originalAppointment.doctorName,
          newDate,
          newTime,
        )

        console.log("🟣 [PUT] WhatsApp reschedule result:", whatsappResult)

        if (!whatsappResult.success) {
          console.warn("⚠️ [PUT] WhatsApp reschedule failed:", whatsappResult.error)
        } else {
          console.log("✅ [PUT] WhatsApp reschedule sent successfully:", whatsappResult.messageId)
        }

        if (patient.email) {
          console.log("  Sending email reschedule to patient:", patient.email)
          const { sendAppointmentRescheduleEmail } = await import("@/lib/nodemailer-service")
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
    console.log("🟢 [DELETE] Appointment deletion called")
    await connectDB()
    console.log("🟢 [DELETE] Database connected successfully")

    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    if (payload.role === "doctor") {
      console.warn("🔴 [DELETE] Doctor not allowed to delete appointment")
      return NextResponse.json(
        { error: "Doctors cannot delete appointments. Please contact admin or receptionist." },
        { status: 403 },
      )
    }

    if (payload.role !== "admin" && payload.role !== "receptionist") {
      console.warn("🔴 [DELETE] Unauthorized role tried to delete appointment:", payload.role)
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { id } = await params
    console.log("🟠 [DELETE] Deleting appointment with ID:", id)

    const deletedAppointment = await Appointment.findByIdAndDelete(id)
    if (!deletedAppointment) {
      console.warn("🔴 [DELETE] Appointment not found:", id)
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    console.log("🟢 [DELETE] Appointment deleted successfully:", deletedAppointment._id)

    const { AppointmentReferral } = await import("@/lib/db-server")
    const deletedReferrals = await AppointmentReferral.deleteMany({ appointmentId: id })
    console.log("🟢 [DELETE] Deleted appointment referrals:", deletedReferrals.deletedCount)

    const patient = await User.findById(deletedAppointment.patientId)
    console.log("🟠 [DELETE] Patient found for notification:", patient ? patient.name : "❌ None")

    if (patient && patient.phone) {
      console.log("🟢 [DELETE] Sending WhatsApp cancellation notification to:", patient.phone)

      const whatsappResult = await sendAppointmentCancellation(
        patient.phone,
        deletedAppointment.patientName,
        deletedAppointment.doctorName,
        deletedAppointment.date,
      )

      console.log("🟣 [DELETE] WhatsApp cancellation result:", whatsappResult)

      if (!whatsappResult.success) {
        console.warn("⚠️ [DELETE] WhatsApp cancellation failed:", whatsappResult.error)
      } else {
        console.log("✅ [DELETE] WhatsApp cancellation sent successfully:", whatsappResult.messageId)
      }
    } else {
      console.warn("❌ [DELETE] Patient phone not found — WhatsApp skipped")
    }

    if (patient && patient.email) {
      console.log("  Sending email cancellation to patient:", patient.email)
      const { sendAppointmentCancellationEmail } = await import("@/lib/nodemailer-service")
      const emailResult = await sendAppointmentCancellationEmail(
        patient.email,
        deletedAppointment.patientName,
        deletedAppointment.doctorName,
        deletedAppointment.date,
        deletedAppointment.time,
      )

      if (!emailResult.success) {
        console.warn("  Email cancellation failed:", emailResult.error)
      } else {
        console.log("  Email cancellation sent successfully:", emailResult.messageId)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Appointment deleted successfully",
    })
  } catch (error) {
    console.error("🔴 [DELETE] Unexpected error deleting appointment:", error)
    return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 })
  }
}
