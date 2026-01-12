import { type NextRequest, NextResponse } from "next/server"
import { Patient, User, connectDB } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"
import { Types } from "mongoose"
import { formatPhoneForDatabase, validatePhoneWithDetails } from "@/lib/validation"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const query: any = {}

    if (payload.role === "doctor") {
      // Previously: doctors could only see assigned patients or patients with active appointments
      // Now: doctors can see all patients in the system
      // This allows doctors to book appointments and access medical history for any patient
      const patients = await Patient.find({}).populate("assignedDoctorId", "name email specialty")
      return NextResponse.json({ success: true, patients })
    }

    const patients = await Patient.find(query).populate("assignedDoctorId", "name email specialty")

    return NextResponse.json({ success: true, patients })
  } catch (error) {
    console.error("GET /api/patients error:", error)
    return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    if (payload.role === "doctor") return NextResponse.json({ error: "Doctors cannot add patients" }, { status: 403 })

    const {
      name,
      phones,
      email,
      dob,
      insuranceProvider,
      allergies = [],
      medicalConditions = [],
      assignedDoctorId,
      idNumber,
      address,
      insuranceNumber,
      photoUrl,
    } = await request.json()

    // Validate critical credentials
    const missingCriticalCredentials = []
    if (!name?.trim()) missingCriticalCredentials.push("Name")
    
    // Validate phones array
    const validPhones = phones?.filter((p: any) => p.number?.trim()) || []
    if (validPhones.length === 0) missingCriticalCredentials.push("Phone Number")
    
    // Validate each phone
    for (const phone of validPhones) {
      const validation = validatePhoneWithDetails(phone.number)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
    }
    
    if (!dob?.trim()) missingCriticalCredentials.push("Date of Birth")
    if (!idNumber?.trim()) missingCriticalCredentials.push("ID Number")

    if (missingCriticalCredentials.length > 0) {
      return NextResponse.json(
        {
          error: `Missing critical patient credentials: ${missingCriticalCredentials.join(", ")}`,
        },
        { status: 400 },
      )
    }

    // Check if ID number already exists
    const existingPatientWithId = await Patient.findOne({ idNumber: idNumber.trim() })
    if (existingPatientWithId) {
      return NextResponse.json(
        {
          error: `Patient ID number "${idNumber}" already exists. Please use a different ID number.`,
        },
        { status: 409 },
      )
    }

    // Handle email properly - convert empty string to null
    const emailToUse = email?.trim() || null

    // Only check for email uniqueness if email is provided and not empty
    if (emailToUse && emailToUse !== "") {
      // Check if email exists in staff records
      const existingUser = await User.findOne({ email: emailToUse.toLowerCase() })
      if (existingUser) {
        return NextResponse.json(
          {
            error: "Email already exists in staff records. Please use a different email.",
          },
          { status: 409 },
        )
      }

      // Check if email exists in patient records
      const existingPatient = await Patient.findOne({
        email: emailToUse.toLowerCase(),
        _id: { $ne: null },
      })
      if (existingPatient) {
        return NextResponse.json(
          {
            error: "Email already exists in patient records. Please use a different email.",
          },
          { status: 409 },
        )
      }
    }

    if (!assignedDoctorId) {
      return NextResponse.json({ error: "Doctor assignment is required" }, { status: 400 })
    }

    if (!Types.ObjectId.isValid(assignedDoctorId)) {
      console.error("Invalid doctor ID format:", assignedDoctorId)
      return NextResponse.json({ error: "Invalid doctor ID format" }, { status: 400 })
    }

    const doctor = await User.findById(assignedDoctorId)
    if (!doctor) {
      return NextResponse.json({ error: "Selected doctor not found" }, { status: 404 })
    }

    if (doctor.role !== "doctor") {
      return NextResponse.json({ error: "Selected user is not a doctor" }, { status: 400 })
    }

    const formattedPhones = validPhones.map((p: any) => ({
      number: formatPhoneForDatabase(p.number),
      isPrimary: p.isPrimary || false,
    }))

    // Ensure at least one phone is marked as primary
    if (!formattedPhones.some((p: any) => p.isPrimary)) {
      formattedPhones[0].isPrimary = true
    }

    // Create patient data object
    const patientData: any = {
      name,
      phones: formattedPhones,
      dob,
      idNumber: idNumber.trim(),
      address: address || "",
      insuranceProvider: insuranceProvider || "",
      insuranceNumber: insuranceNumber || "",
      allergies,
      medicalConditions,
      status: "active",
      balance: 0,
      photoUrl: photoUrl || null,
      assignedDoctorId: doctor._id,
      doctorHistory: [
        {
          doctorId: doctor._id,
          doctorName: doctor.name,
          startDate: new Date(),
        },
      ],
      medicalHistory: "",
    }

    // Only add email if it's not null/empty
    if (emailToUse && emailToUse !== "") {
      patientData.email = emailToUse.toLowerCase()
    }

    const newPatient = await Patient.create(patientData)
    await newPatient.populate("assignedDoctorId", "name email specialty")

    return NextResponse.json({ success: true, patient: newPatient })
  } catch (error: any) {
    console.error("POST /api/patients error:", error)

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

    const errorMessage = error instanceof Error ? error.message : "Failed to add patient"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    if (payload.role === "doctor")
      return NextResponse.json({ error: "Doctors cannot delete patients" }, { status: 403 })

    const { id } = params

    const deletedPatient = await Patient.findByIdAndDelete(id)
    if (!deletedPatient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, message: "Patient deleted successfully" })
  } catch (error) {
    console.error("DELETE /api/patients error:", error)
    return NextResponse.json({ error: "Failed to delete patient" }, { status: 500 })
  }
}

