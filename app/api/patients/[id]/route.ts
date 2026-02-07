//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import {
  Patient,
  connectDB,
  ToothChart,
  Appointment,
  PatientImage,
  MedicalHistory,
  AppointmentReport,
  Billing,
  User, // Import User model
} from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"
import { Types } from "mongoose"
import { formatPhoneForDatabase, validatePhoneWithDetails } from "@/lib/validation"


export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const patient = await Patient.findById(params.id).populate("assignedDoctorId", "name email specialty")
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 })

    // if (payload.role === "doctor") {
    //   const doctorId = new Types.ObjectId(payload.userId)
    //   console.log("  Doctor access check - Doctor ID:", doctorId, "Patient assigned to:", patient.assignedDoctorId?._id)
    //   if (!patient.assignedDoctorId || !patient.assignedDoctorId._id.equals(doctorId)) {
    //     console.log(
    //       "  Access denied: Doctor",
    //       payload.userId,
    //       "trying to access patient assigned to",
    //       patient.assignedDoctorId?._id,
    //     )
    //     return NextResponse.json({ error: "Access denied" }, { status: 403 })
    //   }
    // }

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

    // Check if patient exists
    const patient = await Patient.findById(id)
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    // Check if idNumber is being updated and if it's unique
    if (updateData.idNumber && updateData.idNumber !== patient.idNumber) {
      const existingPatientWithId = await Patient.findOne({
        idNumber: updateData.idNumber.trim(),
        _id: { $ne: id }, // Exclude the current patient from the check
      })
      if (existingPatientWithId) {
        return NextResponse.json(
          {
            error: `Patient ID number "${updateData.idNumber}" already exists. Please use a different ID number.`,
          },
          { status: 409 },
        )
      }
      updateData.idNumber = updateData.idNumber.trim()
    }

    // Handle email in update data - convert empty strings to null
    if (updateData.email !== undefined) {
      updateData.email = updateData.email?.trim() || null

      // Check for email uniqueness only if email is provided and not null/empty
      if (updateData.email && updateData.email !== "" && updateData.email !== patient.email) {
        const existingPatient = await Patient.findOne({
          email: updateData.email.toLowerCase(),
          _id: { $ne: id },
        })
        if (existingPatient) {
          return NextResponse.json(
            { error: "Email already exists in patient records. Please use a different email." },
            { status: 409 },
          )
        }
      }
    }

    // Validate phones if they're being updated
    if (updateData.phones && Array.isArray(updateData.phones)) {
      // Filter out empty phone numbers
      const validPhones = updateData.phones.filter((p: any) => p.number?.trim()) || []
      
      if (validPhones.length === 0) {
        return NextResponse.json(
          { error: "At least one phone number is required" },
          { status: 400 }
        )
      }
      
      // Validate each phone
      for (const phone of validPhones) {
        const validation = validatePhoneWithDetails(phone.number)
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 })
        }
      }

      // Format phones for database
      updateData.phones = validPhones.map((p: any) => ({
        number: formatPhoneForDatabase(p.number),
        isPrimary: p.isPrimary || false,
      }))

      // Ensure at least one phone is marked as primary
      if (!updateData.phones.some((p: any) => p.isPrimary)) {
        updateData.phones[0].isPrimary = true
      }
    }

    // Merge existing patient data with update data for validation
    const mergedData = { 
      ...patient.toObject(), 
      ...updateData,
      // If phones weren't updated, use existing phones
      phones: updateData.phones || patient.phones
    }
    
    // Validate critical credentials
    const missingCriticalCredentials = []
    
    // Check name
    if (!mergedData.name?.trim()) missingCriticalCredentials.push("Name")
    
    // Check phones - ensure we have at least one valid phone
    const hasValidPhone = mergedData.phones && 
      Array.isArray(mergedData.phones) && 
      mergedData.phones.some((p: any) => p.number?.trim())
    if (!hasValidPhone) missingCriticalCredentials.push("Phone Number")
    
    // Check date of birth
    if (!mergedData.dob?.trim()) missingCriticalCredentials.push("Date of Birth")
    
    // Check ID number
    if (!mergedData.idNumber?.trim()) missingCriticalCredentials.push("ID Number")

    if (missingCriticalCredentials.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot update: Missing critical patient credentials: ${missingCriticalCredentials.join(", ")}`,
        },
        { status: 400 },
      )
    }

    // Prepare update data - ensure email is properly handled
    const updateDataToUse: any = { ...updateData }
    if (updateDataToUse.email === "") {
      updateDataToUse.email = null
    }

    // Handle age and nationality
    if (updateDataToUse.age !== undefined) {
      updateDataToUse.age = updateDataToUse.age ? parseInt(updateDataToUse.age) : null
    }
    if (updateDataToUse.nationality !== undefined) {
      updateDataToUse.nationality = updateDataToUse.nationality?.trim() || ""
    }

    // Handle doctor assignment update
    if (updateDataToUse.assignedDoctorId && updateDataToUse.assignedDoctorId !== patient.assignedDoctorId?.toString()) {
      if (!Types.ObjectId.isValid(updateDataToUse.assignedDoctorId)) {
        return NextResponse.json({ error: "Invalid doctor ID format" }, { status: 400 })
      }

      const doctor = await User.findById(updateDataToUse.assignedDoctorId)
      if (!doctor) {
        return NextResponse.json({ error: "Selected doctor not found" }, { status: 404 })
      }

      if (doctor.role !== "doctor") {
        return NextResponse.json({ error: "Selected user is not a doctor" }, { status: 400 })
      }

      // Add to doctor history if doctor is changing
      const doctorHistoryEntry = {
        doctorId: doctor._id,
        doctorName: doctor.name,
        startDate: new Date(),
      }
      
      updateDataToUse.doctorHistory = [
        ...(patient.doctorHistory || []),
        doctorHistoryEntry,
      ]
    }

    // Handle allergies - convert string to array if needed
    if (updateDataToUse.allergies !== undefined) {
      if (typeof updateDataToUse.allergies === 'string') {
        updateDataToUse.allergies = updateDataToUse.allergies
          .split(',')
          .map((a: string) => a.trim())
          .filter(Boolean)
      } else if (Array.isArray(updateDataToUse.allergies)) {
        updateDataToUse.allergies = updateDataToUse.allergies
          .map((a: any) => typeof a === 'string' ? a.trim() : a)
          .filter(Boolean)
      }
    }

    // Handle medical conditions - convert string to array if needed
    if (updateDataToUse.medicalConditions !== undefined) {
      if (typeof updateDataToUse.medicalConditions === 'string') {
        updateDataToUse.medicalConditions = updateDataToUse.medicalConditions
          .split(',')
          .map((c: string) => c.trim())
          .filter(Boolean)
      } else if (Array.isArray(updateDataToUse.medicalConditions)) {
        updateDataToUse.medicalConditions = updateDataToUse.medicalConditions
          .map((c: any) => typeof c === 'string' ? c.trim() : c)
          .filter(Boolean)
      }
    }

    const updatedPatient = await Patient.findByIdAndUpdate(id, updateDataToUse, {
      new: true,
      runValidators: true,
    }).populate("assignedDoctorId", "name email specialty")

    if (!updatedPatient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, patient: updatedPatient })
  } catch (error: any) {
    console.error("PUT /api/patients error:", error)

    // Handle duplicate key error specifically
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.email) {
        return NextResponse.json(
          { error: "Email already exists in patient records. Please use a different email." },
          { status: 409 },
        )
      }
      if (error.keyPattern && error.keyPattern.idNumber) {
        return NextResponse.json(
          { error: "Patient ID number already exists. Please use a different ID number." },
          { status: 409 },
        )
      }
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
