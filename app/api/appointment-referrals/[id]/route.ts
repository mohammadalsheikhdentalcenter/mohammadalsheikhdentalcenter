//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { AppointmentReferral, connectDB, Appointment } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== "doctor") {
      return NextResponse.json({ error: "Only doctors can update referrals" }, { status: 403 })
    }

    const { id } = params
    const { action, notes } = await request.json()

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 })
    }

    console.log(`[DEBUG] Referral update attempt:`, {
      referralId: id,
      action,
      notes,
      userId: payload.userId,
    })

    const referral = await AppointmentReferral.findById(id)
    if (!referral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 })
    }

    console.log(`[DEBUG] Found referral:`, {
      currentStatus: referral.status,
      toDoctorId: referral.toDoctorId,
      fromDoctorId: referral.fromDoctorId,
      appointmentId: referral.appointmentId,
    })

    // Verify permissions based on action
    if (action === "accept") {
      if (String(referral.toDoctorId) !== String(payload.userId)) {
        return NextResponse.json({ error: "Only the referred-to doctor can accept this referral" }, { status: 403 })
      }

      const appointment = await Appointment.findById(referral.appointmentId)
      if (!appointment) {
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
      }

      await Appointment.findByIdAndUpdate(referral.appointmentId, {
        doctorId: payload.userId,
        doctorName: payload.name || "Unknown",
        isReferred: true,
        originalDoctorId: appointment.originalDoctorId || appointment.doctorId,
        originalDoctorName: appointment.originalDoctorName || appointment.doctorName,
        currentReferralId: id,
      })

      referral.status = "accepted"
      referral.updatedAt = new Date()
    } else if (action === "refer_back") {
      if (String(referral.toDoctorId) !== String(payload.userId)) {
        return NextResponse.json({ error: "Only the doctor currently assigned can refer back" }, { status: 403 })
      }

      const appointment = await Appointment.findById(referral.appointmentId)
      if (!appointment) {
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
      }

      await Appointment.findByIdAndUpdate(referral.appointmentId, {
        doctorId: appointment.originalDoctorId,
        doctorName: appointment.originalDoctorName,
        isReferred: false,
        originalDoctorId: null,
        originalDoctorName: null,
        currentReferralId: null,
      })

      referral.status = "referred_back"
      referral.notes = notes || ""
      referral.updatedAt = new Date()
    } else if (action === "complete") {
      if (String(referral.toDoctorId) !== String(payload.userId)) {
        return NextResponse.json({ error: "Only the doctor currently assigned can mark as complete" }, { status: 403 })
      }

      referral.status = "completed"
      referral.notes = notes || ""
      referral.updatedAt = new Date()
    } else if (action === "reject") {
      if (String(referral.toDoctorId) !== String(payload.userId)) {
        return NextResponse.json(
          {
            error: `Only the referred-to doctor can reject this referral.`,
          },
          { status: 403 },
        )
      }

      // Only allow rejection of pending referrals
      if (referral.status !== "pending") {
        return NextResponse.json(
          {
            error: `Only pending referrals can be rejected. Current status: ${referral.status}`,
          },
          { status: 400 },
        )
      }
       const appointment = await Appointment.findById(referral.appointmentId)
      if (!appointment) {
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
      }

      await Appointment.findByIdAndUpdate(referral.appointmentId, {
        doctorId: appointment.originalDoctorId,
        doctorName: appointment.originalDoctorName,
        isReferred: false,
        originalDoctorId: null,
        originalDoctorName: null,
        currentReferralId: null,
      })
      referral.status = "rejected"
      referral.notes = notes || "Referral rejected"
      referral.updatedAt = new Date()
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    console.log(`[DEBUG] Saving referral with new status:`, referral.status)

    await referral.save()

    console.log("[DEBUG] Referral updated successfully:", {
      referralId: id,
      action,
      newStatus: referral.status,
      appointmentId: referral.appointmentId,
    })

    return NextResponse.json({ success: true, referral })
  } catch (error) {
    console.error("PUT appointment referral error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })
    return NextResponse.json(
      {
        error: `Failed to update referral: ${error.message}`,
      },
      { status: 500 },
    )
  }
}
