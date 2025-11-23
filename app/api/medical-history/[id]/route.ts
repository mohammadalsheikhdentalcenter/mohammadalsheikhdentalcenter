//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { MedicalHistory, connectDB, Patient, User } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    if (payload.role !== "doctor") {
      return NextResponse.json({ error: "Only doctors can update medical history" }, { status: 403 })
    }

    const { entryIndex, entry } = await request.json()

    if (entryIndex === undefined || !entry) {
      console.error("[v0] Missing entryIndex or entry in request body")
      return NextResponse.json({ error: "Missing entryIndex or entry" }, { status: 400 })
    }

    const history = await MedicalHistory.findById(id)
    if (!history) {
      console.error("[v0] Medical history not found:", id)
      return NextResponse.json({ error: "Medical history not found" }, { status: 404 })
    }

    const patient = await Patient.findById(history.patientId)
    if (!patient) {
      console.error("[v0] Patient not found with ID:", history.patientId)
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    if (entryIndex < 0 || entryIndex >= history.entries.length) {
      console.error("[v0] Invalid entry index:", entryIndex, "Total entries:", history.entries.length)
      return NextResponse.json({ error: "Invalid entry index" }, { status: 400 })
    }

    const entryToEdit = history.entries[entryIndex]
    if (!entryToEdit) {
      console.error("[v0] Entry not found at index:", entryIndex)
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    const entryCreatorId = String(entryToEdit.createdById || entryToEdit.doctorId || "")
    const currentDoctorId = String(payload.userId || "")

    console.log("[v0] PUT - Comparing creatorIds:", {
      entryCreatorId,
      currentDoctorId,
      match: entryCreatorId === currentDoctorId,
      historyId: id,
      entryIndex,
    })

    if (entryCreatorId !== currentDoctorId) {
      console.error("[v0] Permission denied - creator mismatch")
      return NextResponse.json({ error: "You can only edit entries you created" }, { status: 403 })
    }

    history.entries[entryIndex] = {
      ...(history.entries[entryIndex].toObject?.() || history.entries[entryIndex]),
      date: history.entries[entryIndex].date,
      notes: entry.notes,
      findings: entry.findings,
      treatment: entry.treatment,
      medications: entry.medications || [],
      doctorId: history.entries[entryIndex].doctorId,
      doctorName: history.entries[entryIndex].doctorName,
      createdById: history.entries[entryIndex].createdById,
      createdByName: history.entries[entryIndex].createdByName,
    }

    history.updatedAt = new Date()
    await history.save()

    const updatedHistory = history.toObject()
    if (updatedHistory.entries && Array.isArray(updatedHistory.entries)) {
      for (const e of updatedHistory.entries) {
        if (e.createdById) {
          e.createdById = String(e.createdById)
        }
        if (e.doctorId) {
          e.doctorId = String(e.doctorId)
        }
      }
    }

    return NextResponse.json({ success: true, history: updatedHistory })
  } catch (error) {
    console.error("[v0] PUT medical history error:", error)
    return NextResponse.json({ error: "Failed to update medical history: " + String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    if (payload.role !== "doctor") {
      return NextResponse.json({ error: "Only doctors can delete medical history" }, { status: 403 })
    }

    const { entryIndex } = await request.json()

    if (entryIndex === undefined) {
      return NextResponse.json({ error: "Entry index required" }, { status: 400 })
    }

    const history = await MedicalHistory.findById(id)
    if (!history) {
      console.error("[v0] Medical history not found with ID:", id)
      return NextResponse.json({ error: "Medical history not found" }, { status: 404 })
    }

    const patient = await Patient.findById(history.patientId)
    if (!patient) {
      console.error("[v0] Patient not found with ID:", history.patientId)
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    if (entryIndex < 0 || entryIndex >= history.entries.length) {
      console.error("[v0] Invalid entry index:", entryIndex, "Total entries:", history.entries.length)
      return NextResponse.json({ error: "Invalid entry index" }, { status: 400 })
    }

    const entryToDelete = history.entries[entryIndex]
    if (!entryToDelete) {
      console.error("[v0] Entry not found at index:", entryIndex)
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    const entryCreatorId = String(entryToDelete.createdById || entryToDelete.doctorId || "")
    const currentDoctorId = String(payload.userId || "")

    console.log("[v0] DELETE - Comparing creatorIds:", {
      entryCreatorId,
      currentDoctorId,
      match: entryCreatorId === currentDoctorId,
      historyId: id,
      entryIndex,
    })

    if (entryCreatorId !== currentDoctorId) {
      console.error("[v0] Permission denied - creator mismatch")
      return NextResponse.json({ error: "You can only delete entries you created" }, { status: 403 })
    }

    const currentDoctor = await User.findById(currentDoctorId).select("name")

    // Ensure all remaining entries have required fields before saving
    for (let i = 0; i < history.entries.length; i++) {
      if (i !== entryIndex) {
        if (!history.entries[i].createdById) {
          history.entries[i].createdById = history.entries[i].doctorId
        }
        if (!history.entries[i].createdByName && currentDoctor) {
          history.entries[i].createdByName = history.entries[i].doctorName || currentDoctor.name
        }
      }
    }

    history.entries.splice(entryIndex, 1)
    history.updatedAt = new Date()
    await history.save()

    const updatedHistory = history.toObject()
    if (updatedHistory.entries && Array.isArray(updatedHistory.entries)) {
      for (const e of updatedHistory.entries) {
        if (e.createdById) {
          e.createdById = String(e.createdById)
        }
        if (e.doctorId) {
          e.doctorId = String(e.doctorId)
        }
      }
    }

    return NextResponse.json({ success: true, history: updatedHistory })
  } catch (error) {
    console.error("[v0] DELETE medical history error:", error)
    return NextResponse.json({ error: "Failed to delete medical history entry: " + String(error) }, { status: 500 })
  }
}
