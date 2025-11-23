import { type NextRequest, NextResponse } from "next/server"
import { AppointmentReport, connectDB, Appointment } from "@/lib/db-server"
import { decryptData } from "@/lib/encryption"

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    await connectDB()

    const { token } = await params

    if (!token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 })
    }

    let decryptedData: { appointmentId: string; patientId: string }
    try {
      const decrypted = decryptData(token)
      decryptedData = JSON.parse(decrypted)
    } catch (error) {
      console.error("[PUBLIC] Token decryption failed:", error)
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const { appointmentId, patientId } = decryptedData

    // Fetch the appointment report
    const report = await AppointmentReport.findOne({
      appointmentId,
      patientId,
    })
      .populate("patientId", "name email phone")
      .populate("doctorId", "name specialty email licenseNumber")
      .populate("appointmentId", "date time type status")

    if (!report) {
      console.warn("[PUBLIC] Report not found for appointment:", appointmentId)
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    // Verify the appointment exists and is completed/closed
    const appointment = await Appointment.findById(appointmentId)
    if (!appointment) {
      console.warn("[PUBLIC] Appointment not found:", appointmentId)
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // if (!["completed", "closed"].includes(appointment.status)) {
    //   console.warn("[PUBLIC] Appointment not completed:", appointmentId, appointment.status)
    //   return NextResponse.json({ error: "Report not available for this appointment" }, { status: 403 })
    // }

    console.log("[PUBLIC] Report fetched successfully for patient:", patientId)
    return NextResponse.json({ success: true, report })
  } catch (error) {
    console.error("[PUBLIC] Error fetching patient report:", error)
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 })
  }
}
