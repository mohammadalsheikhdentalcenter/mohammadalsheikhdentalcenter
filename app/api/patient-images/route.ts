import { type NextRequest, NextResponse } from "next/server"
import { PatientImage, connectDB, Patient, User, Appointment } from "@/lib/db-server"
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
    const queryPatientId = searchParams.get("patientId")

    if (!queryPatientId && !patientId) {
      return NextResponse.json({ error: "Patient ID required" }, { status: 400 })
    }

    const finalPatientId = patientId || queryPatientId

    if (payload?.role === "doctor") {
      const patient = await Patient.findById(finalPatientId)
      if (!patient) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 })
      }

      const isAssignedDoctor = patient.assignedDoctorId?.toString() === payload.userId
      const wasPreviouslyAssigned = patient.doctorHistory?.some((dh: any) => dh.doctorId?.toString() === payload.userId)

      const hasAppointment = await Appointment.findOne({
        patientId: finalPatientId,
        doctorId: payload.userId,
        status: { $nin: ["cancelled", "no-show"] },
      })

      if (!isAssignedDoctor && !wasPreviouslyAssigned && !hasAppointment) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    const images = await PatientImage.find({ patientId: finalPatientId })
      .populate("uploadedBy", "name _id")
      .sort({ uploadedAt: -1 })

    return NextResponse.json({ success: true, images })
  } catch (error) {
    console.error("  GET patient images error:", error)
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    if (payload.role !== "doctor") {
      return NextResponse.json({ error: "Only doctors can upload images" }, { status: 403 })
    }

    const { patientId, type, title, description, imageUrl, notes } = await request.json()

    if (!patientId || !type || !imageUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const image = await PatientImage.create({
      patientId,
      type,
      title,
      description,
      imageUrl,
      uploadedBy: payload.userId,
      notes,
    })

    await image.populate("uploadedBy", "name _id")

    const { Patient } = await import("@/lib/db-server")
    const patientData = await Patient.findById(patientId)
    const uploadedByUser = await User.findById(payload.userId)

    if (patientData && patientData.email && uploadedByUser) {
      console.log("  Sending X-ray upload email to patient:", patientData.email)
      const { sendXrayUploadEmail } = await import("@/lib/nodemailer-service")

      const emailResult = await sendXrayUploadEmail(
        patientData.email,
        patientData.name,
        type,
        uploadedByUser.name,
        title,
      )

      if (!emailResult.success) {
        console.warn("  X-ray upload email failed:", emailResult.error)
      } else {
        console.log("  X-ray upload email sent successfully:", emailResult.messageId)
      }
    } else {
      console.warn("  Patient email or uploader not found — X-ray email skipped")
    }

    return NextResponse.json({ success: true, image })
  } catch (error) {
    console.error("  POST patient image error:", error)
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
  }
}
