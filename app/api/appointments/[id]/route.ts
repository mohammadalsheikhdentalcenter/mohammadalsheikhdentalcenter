//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { Appointment, connectDB } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"
import { sendAppointmentReschedule, sendAppointmentCancellation, getAllPhoneNumbers } from "@/lib/whatsapp-service"
import { validateAppointmentSchedulingServer } from "@/lib/appointment-validation-server"
import { encryptData } from "@/lib/encryption"
import { AppointmentReport } from "@/lib/db-server"
import { Patient } from "@/lib/db-server"
import { AppointmentReferral } from "@/lib/db-server"
import { sendAppointmentCancellationEmail } from "@/lib/nodemailer-service"
import { sendAppointmentRescheduleEmail } from "@/lib/nodemailer-service"
import { formatTimeFor12Hour } from "@/lib/utils"

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

    if (
      payload.role === "doctor" &&
      appointment.doctorId !== payload.userId &&
      appointment.originalDoctorId !== payload.userId
    ) {
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

    const { id } = params
    const updateData = await request.json()
    console.log("🟠 [PUT] Update data received:", updateData)

    // Find the appointment first
    const originalAppointment = await Appointment.findById(id)
    if (!originalAppointment) {
      console.warn("🔴 [PUT] Appointment not found for ID:", id)
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    console.log("🟠 [PUT] Original appointment found:", {
      id: originalAppointment._id,
      doctorId: originalAppointment.doctorId,
      originalDoctorId: originalAppointment.originalDoctorId,
      isReferred: originalAppointment.isReferred,
      status: originalAppointment.status,
      createdBy: originalAppointment.createdBy,
      currentUserId: payload.userId,
    })

    // Check permissions for doctors
    if (payload.role === "doctor") {
      const isOriginalDoctor = String(originalAppointment.originalDoctorId) === String(payload.userId)
      const isCurrentDoctor = String(originalAppointment.doctorId) === String(payload.userId)
      const isReferBack = originalAppointment.status === "refer_back"

      console.log("🟠 [PUT] Doctor permission check:", {
        isOriginalDoctor,
        isCurrentDoctor,
        isReferBack,
        status: originalAppointment.status,
      })

      // Original doctor can manage when appointment is referred back
      if (isReferBack && isOriginalDoctor) {
        console.log("🟢 [PUT] Original doctor managing referred back appointment - allowed")
      }
      // Current doctor can manage their assigned appointments
      else if (isCurrentDoctor) {
        console.log("🟢 [PUT] Current doctor managing their appointment - allowed")
      }
      // Doctor can manage appointments they created (for non-referred cases)
      else if (String(originalAppointment.createdBy) === String(payload.userId)) {
        console.log("🟢 [PUT] Doctor managing appointment they created - allowed")
      } else {
        console.warn("🔴 [PUT] Doctor trying to manage appointment they don't own")
        return NextResponse.json(
          {
            error: "You can only manage your own appointments",
          },
          { status: 403 },
        )
      }
    }
    // Admin and receptionist can always manage appointments
    else if (payload.role !== "admin" && payload.role !== "receptionist") {
      console.warn("🔴 [PUT] Unauthorized role tried to update appointment:", payload.role)
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    console.log("🟠 [PUT] Closing appointment...")

    if (updateData.status === "closed" && originalAppointment.status !== "closed") {
      console.log("🟢 [PUT] Proceeding with closing appointment (report is optional)")

      // If there's an active referral, mark it as completed
      if (originalAppointment.currentReferralId) {
        await AppointmentReferral.findByIdAndUpdate(originalAppointment.currentReferralId, {
          status: "completed",
          notes: "Appointment closed by original doctor",
          updatedAt: new Date(),
        })
        console.log("🟢 [PUT] Related referral closed:", originalAppointment.currentReferralId)
      }
    }

    // Validate time slot if date/time is being changed
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

    // Apply the update
    const updatedAppointment = await Appointment.findByIdAndUpdate(id, updateData, { new: true })
    if (!updatedAppointment) {
      console.warn("🔴 [PUT] Failed to update appointment with ID:", id)
      return NextResponse.json({ error: "Appointment not found after update" }, { status: 404 })
    }

    console.log("🟢 [PUT] Appointment updated successfully")

    // Fetch patient for notifications
    const patient = await Patient.findById(originalAppointment.patientId)
    console.log("🟠 [PUT] Patient found:", patient ? patient.name : "❌ No patient found")

    const allPhoneNumbers = getAllPhoneNumbers(patient)
    console.log("🟢 [PUT] Patient all phone numbers detected:", allPhoneNumbers)

    if (patient && allPhoneNumbers.length > 0) {
      console.log("🟢 [PUT] Patient phone numbers detected:", allPhoneNumbers)

      // Handle appointment closure with medical report link
      if (updateData.status === "closed" && originalAppointment.status !== "closed") {
        console.log("🟠 [PUT] Appointment marked as closed — checking for medical report...")

        const report = await AppointmentReport.findOne({
          appointmentId: id,
          patientId: originalAppointment.patientId,
        })

        if (report) {
          console.log("🟠 [PUT] Medical report found — generating secure link...")

          // Generate encrypted token with appointment and patient IDs
          const reportToken = encryptData(
            JSON.stringify({
              appointmentId: id,
              patientId: originalAppointment.patientId,
            }),
          )

          const reportLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/public/reports/${reportToken}`

          console.log("🟠 [PUT] Sending WhatsApp report link to all patient numbers...")

          const whatsappResult = await sendAppointmentCancellation(allPhoneNumbers, patient.name, reportLink)

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
        const formattedCancellationTime = formatTimeFor12Hour(originalAppointment.time)

        const whatsappResult = await sendAppointmentCancellation(
          allPhoneNumbers,
          originalAppointment.patientName,
          originalAppointment.date,
          formattedCancellationTime,
          originalAppointment.doctorName,
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
            formattedCancellationTime,
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
        const formattedNewTime = formatTimeFor12Hour(newTime)

        console.log("🟠 [PUT] Appointment rescheduled — sending WhatsApp notification...", {
          newDate,
          originalTime: newTime,
          formattedTime: formattedNewTime,
        })

        const whatsappResult = await sendAppointmentReschedule(
          allPhoneNumbers,
          originalAppointment.patientName,
          newDate,
          formattedNewTime,
          originalAppointment.doctorName,
        )

        console.log("🟣 [PUT] WhatsApp reschedule result:", whatsappResult)

        if (!whatsappResult.success) {
          console.warn("⚠️ [PUT] WhatsApp reschedule failed:", whatsappResult.error)
        } else {
          console.log("✅ [PUT] WhatsApp reschedule sent successfully:", whatsappResult.messageId)
        }

        if (patient.email) {
          console.log("  Sending email reschedule to patient:", patient.email)
          const emailResult = await sendAppointmentRescheduleEmail(
            patient.email,
            originalAppointment.patientName,
            originalAppointment.doctorName,
            newDate,
            formattedNewTime,
            originalAppointment.date,
            formatTimeFor12Hour(originalAppointment.time),
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

    const { id } = params
    console.log("🟠 [DELETE] Deleting appointment with ID:", id)

    const deletedAppointment = await Appointment.findByIdAndDelete(id)
    if (!deletedAppointment) {
      console.warn("🔴 [DELETE] Appointment not found:", id)
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    console.log("🟢 [DELETE] Appointment deleted successfully:", deletedAppointment._id)

    const deletedReferrals = await AppointmentReferral.deleteMany({ appointmentId: id })
    console.log("🟢 [DELETE] Deleted appointment referrals:", deletedReferrals.deletedCount)

    const patient = await Patient.findById(deletedAppointment.patientId)
    console.log("🟠 [DELETE] Patient found for notification:", patient ? patient.name : "❌ None")

    const allPhoneNumbers = getAllPhoneNumbers(patient)

    if (patient && allPhoneNumbers.length > 0) {
      console.log("🟢 [DELETE] Sending WhatsApp cancellation notification to:", allPhoneNumbers)
      const formattedDeleteTime = formatTimeFor12Hour(deletedAppointment.time)

      const whatsappResult = await sendAppointmentCancellation(
        allPhoneNumbers,
        deletedAppointment.patientName,
        deletedAppointment.date,
        formattedDeleteTime,
        deletedAppointment.doctorName,
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
      const formattedDeleteEmailTime = formatTimeFor12Hour(deletedAppointment.time)
      const emailResult = await sendAppointmentCancellationEmail(
        patient.email,
        deletedAppointment.patientName,
        deletedAppointment.doctorName,
        deletedAppointment.date,
        formattedDeleteEmailTime,
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
