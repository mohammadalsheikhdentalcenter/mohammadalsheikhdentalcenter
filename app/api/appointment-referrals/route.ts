//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { AppointmentReferral, connectDB, Appointment, User } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== "doctor") {
      return NextResponse.json({ error: "Only doctors can view referral requests" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filterType = searchParams.get("type") || "all" // "received", "sent", or "all"

    const query: any = {}

    if (filterType === "received") {
      query.toDoctorId = payload.userId
    } else if (filterType === "sent") {
      query.fromDoctorId = payload.userId
    } else if (filterType === "all") {
      query.$or = [{ toDoctorId: payload.userId }, { fromDoctorId: payload.userId }]
    }

    const referrals = await AppointmentReferral.find(query).sort({ createdAt: -1 })

    return NextResponse.json({ success: true, referrals })
  } catch (error) {
    console.error("GET appointment referrals error:", error)
    return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== "doctor") {
      return NextResponse.json({ error: "Only doctors can create referrals" }, { status: 403 })
    }

    const { appointmentId, toDoctorId, referralReason } = await request.json()

    console.log("[v0] Referral request received:", {
      appointmentId,
      toDoctorId,
      referralReason,
      fromDoctor: payload.userId,
    })

    if (!appointmentId) {
      return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 })
    }

    if (!toDoctorId) {
      return NextResponse.json({ error: "Target doctor is required" }, { status: 400 })
    }

    if (!referralReason || !String(referralReason).trim()) {
      return NextResponse.json({ error: "Referral reason is required" }, { status: 400 })
    }

    const appointment = await Appointment.findById(appointmentId)
    console.log("[v0] Appointment lookup result:", {
      appointmentId,
      found: !!appointment,
      patientId: appointment?.patientId,
      patientName: appointment?.patientName,
      doctorId: appointment?.doctorId,
      status: appointment?.status,
      isReferred: appointment?.isReferred,
      originalDoctorId: appointment?.originalDoctorId,
    })

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    if (!appointment.patientId || String(appointment.patientId).trim() === "") {
      console.error("[v0] Appointment missing or invalid patientId:", {
        appointmentId,
        patientId: appointment.patientId,
        patientIdType: typeof appointment.patientId,
        appointmentData: {
          _id: appointment._id,
          patientName: appointment.patientName,
          doctorId: appointment.doctorId,
          date: appointment.date,
        },
      })
      return NextResponse.json(
        {
          error: "Patient ID is required",
          details: "The appointment does not have a valid patient associated with it. Please contact support.",
        },
        { status: 400 },
      )
    }

    const isReferBackStatus = appointment.status === "refer_back"
    const isOriginalDoctor = String(appointment.originalDoctorId) === String(payload.userId)
    const isCurrentDoctor = String(appointment.doctorId) === String(payload.userId)

    if (isReferBackStatus && !isOriginalDoctor) {
      return NextResponse.json(
        { error: "Only the original doctor can refer this appointment after it has been referred back" },
        { status: 403 },
      )
    }

    // Verify the requesting doctor owns this appointment (or is original doctor in refer_back case)
    if (!isReferBackStatus && !isCurrentDoctor) {
      return NextResponse.json({ error: "You can only refer your own appointments" }, { status: 403 })
    }

    // Check if appointment is already referred (and not in refer_back status)
    if (appointment.isReferred && !isReferBackStatus) {
      return NextResponse.json({ error: "This appointment is already referred to another doctor" }, { status: 400 })
    }

    // Get target doctor info
    const targetDoctor = await User.findById(toDoctorId)
    if (!targetDoctor) {
      return NextResponse.json({ error: "Target doctor not found" }, { status: 404 })
    }

    // Create referral record with pending status
    const referral = await AppointmentReferral.create({
      appointmentId,
      patientId: String(appointment.patientId),
      patientName: appointment.patientName,
      fromDoctorId: payload.userId,
      fromDoctorName: payload.name || "Unknown",
      toDoctorId: String(toDoctorId),
      toDoctorName: targetDoctor.name,
      referralReason: String(referralReason).trim(),
      status: "pending",
      notes: "",
      createdAt: new Date(),
    })

    const appointmentUpdate: any = {
      doctorId: String(toDoctorId),
      doctorName: targetDoctor.name,
      isReferred: true,
      currentReferralId: referral._id,
      updatedAt: new Date(),
    }

    if (isReferBackStatus) {
      // Reset refer_back status to confirmed for new referral cycle
      appointmentUpdate.status = "confirmed"
      appointmentUpdate.awaitingOriginalDoctorAction = false
      appointmentUpdate.lastReferBackDate = null
      console.log("[v0] Re-referring appointment after refer_back - resetting flags")
    } else {
      // First time referral - set original doctor fields
      appointmentUpdate.originalDoctorId = appointment.doctorId
      appointmentUpdate.originalDoctorName = appointment.doctorName
    }

    await Appointment.findByIdAndUpdate(appointmentId, appointmentUpdate)

    console.log("[v0] Appointment referred successfully:", {
      appointmentId,
      patientId: appointment.patientId,
      fromDoctor: payload.userId,
      fromDoctorName: payload.name,
      toDoctor: String(toDoctorId),
      toDoctorName: targetDoctor.name,
      referralStatus: "pending",
      isReReferral: isReferBackStatus,
    })

    return NextResponse.json({ success: true, referral })
  } catch (error) {
    console.error("[v0] POST appointment referral error:", error)
    return NextResponse.json({ error: "Failed to create referral" }, { status: 500 })
  }
}
