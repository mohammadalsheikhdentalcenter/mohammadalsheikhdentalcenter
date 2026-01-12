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

    console.log(`[v0] Referral update attempt:`, {
      referralId: id,
      action,
      notes,
      userId: payload.userId,
    })

    const referral = await AppointmentReferral.findById(id)
    if (!referral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 })
    }

    console.log(`[v0] Found referral:`, {
      currentStatus: referral.status,
      toDoctorId: referral.toDoctorId,
      fromDoctorId: referral.fromDoctorId,
      appointmentId: referral.appointmentId,
    })

    // Doctor 2 accepts referral
    if (action === "accept") {
      if (String(referral.toDoctorId) !== String(payload.userId)) {
        return NextResponse.json({ error: "Only the referred-to doctor can accept this referral" }, { status: 403 })
      }

      const appointment = await Appointment.findById(referral.appointmentId)
      if (!appointment) {
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
      }

      // Appointment now appears in Doctor 2 dashboard with "Referred Case" status
      await Appointment.findByIdAndUpdate(referral.appointmentId, {
        doctorId: payload.userId,
        doctorName: payload.name || "Unknown",
        isReferred: true,
        originalDoctorId: appointment.originalDoctorId || appointment.doctorId,
        originalDoctorName: appointment.originalDoctorName || appointment.doctorName,
        currentReferralId: id,
        status: "confirmed", // Active status for referred case
        updatedAt: new Date(),
      })

      referral.status = "accepted" // Referral accepted
      referral.updatedAt = new Date()

      console.log("[v0] Referral accepted (STEP 5) - Doctor 2 now sees appointment in dashboard")
    }
    // Doctor 2 refers back to Doctor 1
    else if (action === "refer_back") {
      if (String(referral.toDoctorId) !== String(payload.userId)) {
        return NextResponse.json({ error: "Only the doctor currently assigned can refer back" }, { status: 403 })
      }

      const appointment = await Appointment.findById(referral.appointmentId)
      if (!appointment) {
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
      }

      // Appointment status changes to "refer_back" - signals Doctor 1 can act
      await Appointment.findByIdAndUpdate(referral.appointmentId, {
        status: "refer_back",
        referralNotes: notes || "",
        lastReferBackDate: new Date(),
        awaitingOriginalDoctorAction: true, // Doctor 1 now has actions available
        updatedAt: new Date(),
      })

      referral.status = "referred_back" // Mark referral as referred back
      referral.notes = notes || ""
      referral.updatedAt = new Date()

      console.log("[v0] Appointment marked as refer_back (STEP 8):", {
        appointmentId: referral.appointmentId,
        referredDoctorId: payload.userId,
        referredDoctorName: payload.name,
        originalDoctorId: appointment.originalDoctorId,
        notes: notes,
      })
    }
    // Doctor 2 completes referral (marks case as complete)
    else if (action === "complete") {
      if (String(referral.toDoctorId) !== String(payload.userId)) {
        return NextResponse.json({ error: "Only the doctor currently assigned can mark as complete" }, { status: 403 })
      }

      referral.status = "completed" // Referral complete
      referral.notes = notes || ""
      referral.updatedAt = new Date()

      console.log("[v0] Referral marked as complete (STEP 7):", {
        referralId: id,
        appointmentId: referral.appointmentId,
      })
    }
    // Doctor 1 cancels referral before Doctor 2 accepts
    else if (action === "reject") {
      if (String(referral.toDoctorId) !== String(payload.userId)) {
        return NextResponse.json(
          {
            error: `Only the referred-to doctor can reject this referral.`,
          },
          { status: 403 },
        )
      }

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

      // Revert to original doctor
      await Appointment.findByIdAndUpdate(referral.appointmentId, {
        doctorId: appointment.originalDoctorId,
        doctorName: appointment.originalDoctorName,
        isReferred: false,
        originalDoctorId: null,
        originalDoctorName: null,
        currentReferralId: null,
        updatedAt: new Date(),
      })

      referral.status = "rejected"
      referral.notes = notes || "Referral rejected"
      referral.updatedAt = new Date()

      console.log("[v0] Referral rejected - reverted to original doctor")
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    console.log(`[v0] Saving referral with new status:`, referral.status)
    await referral.save()

    console.log("[v0] Referral updated successfully:", {
      referralId: id,
      action,
      newStatus: referral.status,
      appointmentId: referral.appointmentId,
    })

    return NextResponse.json({ success: true, referral })
  } catch (error) {
    console.error("[v0] PUT appointment referral error:", {
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
