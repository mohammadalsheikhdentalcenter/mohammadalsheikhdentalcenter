//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import {
  Patient,
  User,
  connectDB,
  ToothChart,
  Appointment,
  PatientImage,
  MedicalHistory,
  AppointmentReport,
  Billing,
} from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"
import { Types } from "mongoose"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const patient = await Patient.findById(params.id).populate("assignedDoctorId", "name email specialty")
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 })

    if (payload.role === "doctor") {
      const doctorId = new Types.ObjectId(payload.userId)
      console.log("  Doctor access check - Doctor ID:", doctorId, "Patient assigned to:", patient.assignedDoctorId?._id)
      if (!patient.assignedDoctorId || !patient.assignedDoctorId._id.equals(doctorId)) {
        console.log(
          "  Access denied: Doctor",
          payload.userId,
          "trying to access patient assigned to",
          patient.assignedDoctorId?._id,
        )
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    return NextResponse.json({ success: true, patient })
  } catch (error) {
    console.error("  Get patient error:", error)
    return NextResponse.json({ error: "Failed to fetch patient" }, { status: 500 })
  }
}

// Also update the PUT endpoint for patient updates - FIXED VERSION
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const { id } = params
    const updateData = await request.json()

    // Handle email in update data - convert empty strings to null
    if (updateData.email !== undefined) {
      updateData.email = updateData.email?.trim() || null
      
      // Check for email uniqueness only if email is provided
      if (updateData.email) {
        const existingPatient = await Patient.findOne({ 
          email: updateData.email.toLowerCase(), 
          _id: { $ne: id } 
        })
        if (existingPatient) {
          return NextResponse.json(
            { error: "Email already exists in patient records. Please use a different email." },
            { status: 409 }
          )
        }
      }
    }

    // Validate critical credentials if they're being updated
    if (updateData.phone || updateData.dob || updateData.idNumber) {
      const patient = await Patient.findById(id)
      if (!patient) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 })
      }

      const mergedData = { ...patient.toObject(), ...updateData }

      const missingCriticalCredentials = []
      if (!mergedData.name?.trim()) missingCriticalCredentials.push("Name")
      if (!mergedData.phone?.trim()) missingCriticalCredentials.push("Phone")
      if (!mergedData.dob?.trim()) missingCriticalCredentials.push("Date of Birth")
      if (!mergedData.idNumber?.trim()) missingCriticalCredentials.push("ID Number")

      if (missingCriticalCredentials.length > 0) {
        return NextResponse.json(
          {
            error: `Cannot update: Missing critical patient credentials: ${missingCriticalCredentials.join(", ")}`,
          },
          { status: 400 },
        )
      }
    }

    const updatedPatient = await Patient.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("assignedDoctorId", "name email specialty")

    if (!updatedPatient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, patient: updatedPatient })
  } catch (error) {
    console.error("  PUT /api/patients error:", error)
    
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Email already exists in patient records. Please use a different email." },
        { status: 409 }
      )
    }
    
    const errorMessage = error instanceof Error ? error.message : "Failed to update patient"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    await connectDB()

    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    if (payload.role !== "admin" && payload.role !== "receptionist" && payload.role !== "hr") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    console.log("  Starting cascade delete for patient:", id)

    const deletedRecords = {
      toothCharts: 0,
      appointments: 0,
      images: 0,
      medicalHistory: 0,
      reports: 0,
      billing: 0,
    }

    // Delete tooth charts
    const deletedCharts = await ToothChart.deleteMany({ patientId: id })
    deletedRecords.toothCharts = deletedCharts.deletedCount
    console.log("  Deleted tooth charts:", deletedCharts.deletedCount)

    // Delete appointments
    const deletedAppointments = await Appointment.deleteMany({ patientId: id })
    deletedRecords.appointments = deletedAppointments.deletedCount
    console.log("  Deleted appointments:", deletedAppointments.deletedCount)

    // Delete patient images (x-rays, photos, scans)
    const deletedImages = await PatientImage.deleteMany({ patientId: id })
    deletedRecords.images = deletedImages.deletedCount
    console.log("  Deleted patient images:", deletedImages.deletedCount)

    // Delete medical history
    const deletedMedicalHistory = await MedicalHistory.deleteMany({
      patientId: id,
    })
    deletedRecords.medicalHistory = deletedMedicalHistory.deletedCount
    console.log("  Deleted medical history records:", deletedMedicalHistory.deletedCount)

    // Delete appointment reports
    const deletedReports = await AppointmentReport.deleteMany({
      patientId: id,
    })
    deletedRecords.reports = deletedReports.deletedCount
    console.log("  Deleted appointment reports:", deletedReports.deletedCount)

    // Delete billing records
    const deletedBilling = await Billing.deleteMany({ patientId: id })
    deletedRecords.billing = deletedBilling.deletedCount
    console.log("  Deleted billing records:", deletedBilling.deletedCount)

    // Finally, delete the patient
    const deleted = await Patient.findByIdAndDelete(id)
    if (!deleted) return NextResponse.json({ error: "Patient not found" }, { status: 404 })

    console.log("  Patient and all related data deleted successfully:", id)
    return NextResponse.json({
      success: true,
      message: "Patient and all related data deleted successfully",
      deletedRecords,
    })
  } catch (error) {
    console.error("  Delete patient error:", error)
    return NextResponse.json({ error: "Failed to delete patient" }, { status: 500 })
  }
}
