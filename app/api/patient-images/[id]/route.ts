import { type NextRequest, NextResponse } from "next/server"
import { PatientImage, connectDB, Patient } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const { id } = await params
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const image = await PatientImage.findById(id).populate("uploadedBy", "name _id")
    if (!image) return NextResponse.json({ error: "Image not found" }, { status: 404 })

    if (payload.role === "doctor") {
      const patient = await Patient.findById(image.patientId)
      if (!patient) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 })
      }

      const isAssignedDoctor = patient.assignedDoctorId?.toString() === payload.userId
      const wasPreviouslyAssigned = patient.doctorHistory?.some((dh: any) => dh.doctorId?.toString() === payload.userId)

      if (!isAssignedDoctor && !wasPreviouslyAssigned) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    return NextResponse.json({ success: true, image })
  } catch (error) {
    console.error("[v0] GET patient image error:", error)
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const { id } = await params
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    if (payload.role !== "doctor") {
      return NextResponse.json({ error: "Only doctors can delete images" }, { status: 403 })
    }

    const image = await PatientImage.findById(id).populate("uploadedBy", "_id")
    if (!image) return NextResponse.json({ error: "Image not found" }, { status: 404 })

    const uploadedById = image.uploadedBy?._id ? String(image.uploadedBy._id) : String(image.uploadedBy)
    const currentDoctorId = String(payload.userId)

    if (uploadedById !== currentDoctorId) {
      return NextResponse.json({ error: "You can only delete images you uploaded" }, { status: 403 })
    }

    await PatientImage.findByIdAndDelete(id)
    return NextResponse.json({ success: true, message: "Image deleted successfully" })
  } catch (error) {
    console.error("[v0] DELETE patient image error:", error)
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 })
  }
}
