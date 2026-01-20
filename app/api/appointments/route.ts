//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { Appointment, connectDB, User, Patient, AppointmentReferral } from "@/lib/db-server"
import { verifyToken, verifyPatientToken } from "@/lib/auth"
import { sendAppointmentConfirmationArabic, getAllPhoneNumbers, sendAppointmentConfirmation } from "@/lib/whatsapp-service"
import { validateAppointmentSchedulingServer } from "@/lib/appointment-validation-server"
import { sendAppointmentConfirmationEmail } from "@/lib/nodemailer-service"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    let patientId: string | null = null

    if (!payload) {
      // Try patient token
      patientId = verifyPatientToken(token)
      if (!patientId) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 })
      }
    }

    // Extract patientId from URL query parameters if provided
    const { searchParams } = new URL(request.url)
    const requestedPatientId = searchParams.get("patientId")

    const query: any = {}

    if (payload?.role === "doctor") {
      // If a specific patientId is requested, filter by both doctor and patient
      if (requestedPatientId) {
        query.patientId = requestedPatientId
        query.$or = [
          { doctorId: String(payload.userId) }, // Current assignments
          { originalDoctorId: String(payload.userId) }, // Referred out appointments
          {
            status: "refer_back",
            originalDoctorId: String(payload.userId),
          },
        ]
        console.log("[v0] Doctor fetching appointments for specific patient:", {
          patientId: requestedPatientId,
          doctorId: String(payload.userId),
        })
      } else {
        // Get all appointments for this doctor
        query.$or = [
          { doctorId: String(payload.userId) }, // Current assignments
          { originalDoctorId: String(payload.userId) }, // Referred out appointments
          {
            status: "refer_back",
            originalDoctorId: String(payload.userId),
          },
        ]
        console.log("[v0] Doctor fetching all appointments with query:", JSON.stringify(query))
        console.log("[v0] Doctor ID:", String(payload.userId))
      }
    } else if (patientId || requestedPatientId) {
      // For patients, show only their appointments
      query.patientId = patientId || requestedPatientId
      console.log("[v0] Patient fetching appointments - patientId:", patientId || requestedPatientId)
    }
    // For admin and receptionist, show all appointments

    const appointments = await Appointment.find(query).sort({
      date: -1,
      time: -1,
    })

    console.log("[v0] Found appointments:", appointments.length, "for query:", query)
    console.log(
      "[v0] Appointments details:",
      appointments.map((apt) => ({
        _id: apt._id,
        doctorId: apt.doctorId,
        originalDoctorId: apt.originalDoctorId,
        isReferred: apt.isReferred,
        patientName: apt.patientName,
      })),
    )

    let filteredAppointments = appointments
    if (payload?.role === "doctor") {
      filteredAppointments = []

      for (const apt of appointments) {
        // If this appointment is referred to this doctor and the referral is still pending, exclude it
        if (apt.isReferred && String(apt.doctorId) === String(payload.userId)) {
          // Check if there's a pending referral for this appointment
          const referral = await AppointmentReferral.findById(apt.currentReferralId)
          if (referral && referral.status === "pending") {
            console.log("[v0] Excluding appointment with pending referral:", apt._id)
            continue // Skip this appointment
          }
        }

        filteredAppointments.push(apt)
      }
    }

    return NextResponse.json({
      success: true,
      appointments: filteredAppointments.map((apt) => ({
        _id: apt._id.toString(),
        id: apt._id.toString(),
        patientId: apt.patientId,
        patientName: apt.patientName,
        doctorId: apt.doctorId,
        doctorName: apt.doctorName,
        date: apt.date,
        time: apt.time,
        type: apt.type,
        status: apt.status,
        roomNumber: apt.roomNumber,
        duration: apt.duration,
        isReferred: apt.isReferred || false,
        originalDoctorId: apt.originalDoctorId || null,
        originalDoctorName: apt.originalDoctorName || null,
        currentReferralId: apt.currentReferralId || null,
        createdBy: apt.createdBy || null, // ADD THIS LINE
        createdByName: apt.createdByName || null, // ADD THIS LINE
      })),
    })
  } catch (error) {
    console.error("[v0] Get appointments error:", error)
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    console.log("[DEBUG] Database connected")

    const token = request.headers.get("authorization")?.split(" ")[1]
    console.log("[DEBUG] Token received:", token ? "Yes" : "No")

    if (!token) {
      console.warn("[DEBUG] No token found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    console.log("[DEBUG] Token payload:", payload)

    if (!payload) {
      console.warn("[DEBUG] Invalid token")
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { patientId, patientName, doctorId, doctorName, date, time, type, roomNumber, duration } =
      await request.json()
    console.log("[DEBUG] Appointment data:", {
      patientId,
      patientName,
      doctorId,
      doctorName,
      date,
      time,
      type,
    })

    const finalDoctorId = String(doctorId).trim()
    if (!finalDoctorId) {
      console.warn("[DEBUG] Doctor ID is missing")
      return NextResponse.json({ error: "Doctor ID is required" }, { status: 400 })
    }

    if (!patientId || !String(patientId).trim()) {
      console.warn("[DEBUG] Patient ID is missing")
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 })
    }

    let doctor = null
    try {
      doctor = await User.findById(finalDoctorId)
    } catch (err) {
      console.warn("[DEBUG] Error finding doctor with ID:", finalDoctorId, err)
      doctor = null
    }

    console.log("[DEBUG] Doctor found:", doctor ? doctor.name : "No doctor found")

    if (!doctor) {
      console.warn("[DEBUG] Doctor not found with ID:", finalDoctorId)
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 })
    }

    // Use server-side validation (no token needed) - include roomNumber for room conflict checking
    const validation = await validateAppointmentSchedulingServer(finalDoctorId, date, time, duration || 30, undefined, roomNumber)
    if (!validation.isValid) {
      console.warn("[DEBUG] Validation failed:", validation.error)
      return NextResponse.json({ error: validation.error }, { status: 409 })
    }

    const newAppointment = await Appointment.create({
      patientId,
      patientName,
      doctorId: finalDoctorId,
      doctorName,
      date,
      time,
      type,
      status: "confirmed",
      roomNumber,
      duration: duration || 30,
      isReferred: false,
      originalDoctorId: null,
      originalDoctorName: null,
      currentReferralId: null,
      createdBy: String(payload.userId),
      createdByName: payload.userName,
    })
    console.log("[DEBUG] Appointment created:", newAppointment._id.toString())

    console.log("[DEBUG] Looking up patient with ID:", patientId)

    // Fetch patient phone number from Patient collection
    const patient = await Patient.findById(patientId)

    console.log("[DEBUG] Patient found:", patient ? patient.name : "No patient found")

    const allPhoneNumbers = getAllPhoneNumbers(patient)
    console.log("[DEBUG] Patient all phone numbers:", allPhoneNumbers)

    if (patient && allPhoneNumbers.length > 0) {
      const appointmentId = newAppointment._id.toString()
      
      console.log("[DEBUG] Sending WhatsApp BILINGUAL confirmation to all numbers:", {
        phones: allPhoneNumbers,
        patientName,
        date,
        time,
        doctorName,
        appointmentId,
      })

      // Send English template first
      const whatsappResultEnglish = await sendAppointmentConfirmation(
        allPhoneNumbers,  // Send to all phone numbers, not just primary
        patientName,
        date,
        time,
        doctorName,
      )

      console.log("[v0] ✅ ENGLISH CONFIRMATION TEMPLATE: WhatsApp result:", whatsappResultEnglish)

      // Then send Arabic template
      const whatsappResultArabic = await sendAppointmentConfirmationArabic(
        allPhoneNumbers,  // Send to all phone numbers
        date,
        time,
        doctorName,
        patientName,
      )

      console.log("[v0] ✅ ARABIC CONFIRMATION TEMPLATE: WhatsApp result:", whatsappResultArabic)

      // Check results
      const englishSuccess = whatsappResultEnglish.success
      const arabicSuccess = whatsappResultArabic.success

      if (!englishSuccess && !arabicSuccess) {
        console.warn("[v0] ⚠️ BOTH TEMPLATES FAILED:", {
          englishError: whatsappResultEnglish.error,
          arabicError: whatsappResultArabic.error,
        })
      } else if (!englishSuccess) {
        console.warn("[v0] ⚠️ ENGLISH TEMPLATE FAILED:", whatsappResultEnglish.error)
        console.log("[v0] ✅ ARABIC TEMPLATE SENT successfully")
      } else if (!arabicSuccess) {
        console.warn("[v0] ⚠️ ARABIC TEMPLATE FAILED:", whatsappResultArabic.error)
        console.log("[v0] ✅ ENGLISH TEMPLATE SENT successfully")
      } else {
        console.log("[v0] ✅ BOTH ENGLISH AND ARABIC TEMPLATES SENT successfully")
      }
    } else {
      console.warn("[DEBUG] Patient phone numbers missing — WhatsApp message skipped")
    }

    if (patient && patient.email) {
      console.log("  Sending email confirmation to patient:", patient.email)
      const emailResult = await sendAppointmentConfirmationEmail(
        patient.email,
        patientName,
        doctorName,
        date,
        time,
        type || "Appointment",
      )

      if (!emailResult.success) {
        console.warn("  Email notification failed for appointment creation:", emailResult.error)
      } else {
        console.log("  Email appointment confirmation sent:", emailResult.messageId)
      }
    } else {
      console.warn("  Patient email missing — Email message skipped")
    }

    return NextResponse.json({
      success: true,
      appointment: {
        _id: newAppointment._id.toString(),
        id: newAppointment._id.toString(),
        patientId: newAppointment.patientId,
        patientName: newAppointment.patientName,
        doctorId: newAppointment.doctorId,
        doctorName: newAppointment.doctorName,
        date: newAppointment.date,
        time: newAppointment.time,
        type: newAppointment.type,
        status: newAppointment.status,
        roomNumber: newAppointment.roomNumber,
        duration: newAppointment.duration,
        isReferred: newAppointment.isReferred,
        originalDoctorId: newAppointment.originalDoctorId,
        originalDoctorName: newAppointment.originalDoctorName,
        currentReferralId: newAppointment.currentReferralId,
        createdBy: newAppointment.createdBy,
        createdByName: newAppointment.createdByName,
      },
    })
  } catch (error) {
    console.error("  Add appointment error:", error)
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB()
    console.log("[DEBUG] Database connected")

    const token = request.headers.get("authorization")?.split(" ")[1]
    console.log("[DEBUG] Token received:", token ? "Yes" : "No")

    if (!token) {
      console.warn("[DEBUG] No token found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    console.log("[DEBUG] Token payload:", payload)

    if (!payload) {
      console.warn("[DEBUG] Invalid token")
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { appointmentId, patientId, patientName, doctorId, doctorName, date, time, type, roomNumber, duration } =
      await request.json()
    console.log("[DEBUG] Appointment data:", {
      appointmentId,
      patientId,
      patientName,
      doctorId,
      doctorName,
      date,
      time,
      type,
    })

    if (!appointmentId || !String(appointmentId).trim()) {
      console.warn("[DEBUG] Appointment ID is missing")
      return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 })
    }

    const appointment = await Appointment.findById(appointmentId)
    console.log("[DEBUG] Appointment found:", appointment ? appointment._id.toString() : "No appointment found")

    if (!appointment) {
      console.warn("[DEBUG] Appointment not found with ID:", appointmentId)
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    if (payload?.role === "doctor" && String(appointment.createdBy) !== String(payload.userId)) {
      console.warn("[DEBUG] Doctor trying to edit appointment they did not create")
      return NextResponse.json({ error: "Unauthorized - you can only edit appointments you created" }, { status: 403 })
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        patientId,
        patientName,
        doctorId: String(doctorId),
        doctorName,
        date,
        time,
        type,
        roomNumber,
        duration: duration || 30,
      },
      { new: true },
    )
    console.log("[DEBUG] Appointment updated:", updatedAppointment._id.toString())

    return NextResponse.json({
      success: true,
      appointment: {
        _id: updatedAppointment._id.toString(),
        id: updatedAppointment._id.toString(),
        patientId: updatedAppointment.patientId,
        patientName: updatedAppointment.patientName,
        doctorId: updatedAppointment.doctorId,
        doctorName: updatedAppointment.doctorName,
        date: updatedAppointment.date,
        time: updatedAppointment.time,
        type: updatedAppointment.type,
        status: updatedAppointment.status,
        roomNumber: updatedAppointment.roomNumber,
        duration: updatedAppointment.duration,
        isReferred: updatedAppointment.isReferred,
        originalDoctorId: updatedAppointment.originalDoctorId,
        originalDoctorName: updatedAppointment.originalDoctorName,
        currentReferralId: updatedAppointment.currentReferralId,
        createdBy: updatedAppointment.createdBy,
        createdByName: updatedAppointment.createdByName,
      },
    })
  } catch (error) {
    console.error("  Update appointment error:", error)
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB()
    console.log("[DEBUG] Database connected")

    const token = request.headers.get("authorization")?.split(" ")[1]
    console.log("[DEBUG] Token received:", token ? "Yes" : "No")

    if (!token) {
      console.warn("[DEBUG] No token found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    console.log("[DEBUG] Token payload:", payload)

    if (!payload) {
      console.warn("[DEBUG] Invalid token")
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get("id")
    console.log("[DEBUG] Appointment ID to delete:", appointmentId)

    if (!appointmentId || !String(appointmentId).trim()) {
      console.warn("[DEBUG] Appointment ID is missing")
      return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 })
    }

    const appointment = await Appointment.findById(appointmentId)
    console.log("[DEBUG] Appointment found:", appointment ? appointment._id.toString() : "No appointment found")

    if (!appointment) {
      console.warn("[DEBUG] Appointment not found with ID:", appointmentId)
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    if (payload?.role === "doctor" && String(appointment.createdBy) !== String(payload.userId)) {
      console.warn("[DEBUG] Doctor trying to delete appointment they did not create")
      return NextResponse.json(
        { error: "Unauthorized - you can only delete appointments you created" },
        { status: 403 },
      )
    }

    await Appointment.findByIdAndDelete(appointmentId)
    console.log("[DEBUG] Appointment deleted:", appointmentId)

    return NextResponse.json({
      success: true,
      message: "Appointment deleted successfully",
    })
  } catch (error) {
    console.error("  Delete appointment error:", error)
    return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 })
  }
}
