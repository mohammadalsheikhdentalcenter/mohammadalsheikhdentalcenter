//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { MedicalHistory, connectDB, Patient, User } from "@/lib/db-server"
import { verifyToken, verifyPatientToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get("patientId")

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID required" }, { status: 400 })
    }

    let payload: any = null
    let userRole = "patient"
    let userId = patientId

    // Try to verify as JWT token first (for doctors/staff)
    const jwtPayload = verifyToken(token)
    if (jwtPayload) {
      payload = jwtPayload
      userRole = jwtPayload.role
      userId = jwtPayload.userId
    } else {
      // If JWT fails, try as patient token
      const patientTokenId = verifyPatientToken(token)
      if (patientTokenId) {
        userRole = "patient"
        userId = patientTokenId
      } else {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 })
      }
    }

    // ALLOW PATIENTS TO VIEW THEIR OWN MEDICAL HISTORY
    // if (userRole === "patient" && userId !== patientId) {
    //   return NextResponse.json({ error: "Access denied" }, { status: 403 })
    // }

    if (userRole === "doctor") {
      console.log("[v0] Doctor accessing medical history for patient:", patientId)

      const patient = await Patient.findById(patientId)
      if (!patient) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 })
      }
    }

    const history = await MedicalHistory.findOne({ patientId }).populate("doctorId", "name specialty").lean()

    console.log("[v0] Fetched medical history:", {
      hasHistory: !!history,
      entriesCount: history?.entries?.length || 0,
    })

    if (history && history.entries?.length > 0) {
      const processedEntries = await Promise.all(
        history.entries.map(async (entry: any) => {
          let doctorName = entry.doctorName || "Unknown"
          let createdByName = entry.createdByName || "Unknown"
          const createdById = entry.createdById
            ? String(entry.createdById)
            : entry.doctorId
              ? String(entry.doctorId)
              : null

          if (entry.doctorId && !entry.doctorName) {
            const doctor = await User.findById(entry.doctorId).select("name specialty")
            doctorName = doctor?.name || "Unknown"
          }

          if (createdById && !entry.createdByName) {
            const creator = await User.findById(createdById).select("name specialty")
            createdByName = creator?.name || "Unknown"
          }

          return {
            ...entry,
            createdById, // Explicitly include createdById as string
            doctorName,
            createdByName,
          }
        }),
      )

      return NextResponse.json({
        success: true,
        history: {
          ...history,
          entries: processedEntries,
        },
      })
    }

    const patient = await Patient.findById(patientId)

    return NextResponse.json({
      success: true,
      history: {
        _id: null,
        patientId,
        doctorId: null,
        entries: [],
        patientDoctorHistory: patient.doctorHistory || [],
        createdAt: null,
        updatedAt: null,
      },
    })
  } catch (error) {
    console.error("[v0] GET medical history error:", error)
    return NextResponse.json({ error: "Failed to fetch medical history" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    // Only doctors can create/edit medical history
    if (payload.role !== "doctor") {
      return NextResponse.json({ error: "Only doctors can manage medical history" }, { status: 403 })
    }

    const { patientId, entry, diagnosis, dateOfVisit } = await request.json()

    if (!patientId || !entry) {
      return NextResponse.json({ error: "Missing required fields: patientId and entry" }, { status: 400 })
    }

    if (!entry.findings || !entry.treatment) {
      return NextResponse.json({ error: "Missing required fields: symptoms/findings and treatment" }, { status: 400 })
    }

    const doctor = await User.findById(payload.userId)
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 })
    }

    let history = await MedicalHistory.findOne({ patientId })

    const visitDate = dateOfVisit ? new Date(dateOfVisit) : new Date()

    if (!history) {
      history = await MedicalHistory.create({
        patientId,
        doctorId: payload.userId,
        entries: [
          {
            ...entry,
            doctorId: payload.userId,
            doctorName: doctor.name,
            createdById: payload.userId,
            createdByName: doctor.name,
            date: visitDate,
          },
        ],
      })
    } else {
      history.entries.push({
        ...entry,
        doctorId: payload.userId,
        doctorName: doctor.name,
        createdById: payload.userId,
        createdByName: doctor.name,
        date: visitDate,
      })
      history.updatedAt = new Date()
      await history.save()
    }

    const mainDoctor = await User.findById(history.doctorId).select("name specialty")

    return NextResponse.json({
      success: true,
      history: {
        ...history.toObject(),
        doctorId: mainDoctor,
      },
    })
  } catch (error) {
    console.error("[v0] POST medical history error:", error)
    return NextResponse.json({ error: "Failed to save medical history: " + error.message }, { status: 500 })
  }
}
