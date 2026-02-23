//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { ToothChart, connectDB } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

// GET - Fetch all general procedures for a chart
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const chartId = request.nextUrl.searchParams.get("chartId")
    if (!chartId) {
      return NextResponse.json({ error: "Chart ID is required" }, { status: 400 })
    }

    const chart = await ToothChart.findById(chartId)
    if (!chart) {
      return NextResponse.json({ error: "Tooth chart not found" }, { status: 404 })
    }

    // Enrich general procedures with doctor names and patient names
    const enrichedProcedures = await Promise.all(
      (chart.generalProcedures || []).map(async (proc) => {
        if (proc.createdBy && !proc.createdByName) {
          const { User } = await import("@/lib/db-server")
          const doctor = await User.findById(proc.createdBy)
          if (doctor) {
            proc.createdByName = doctor.name || doctor.email
          }
        }
        if (!proc.patientName) {
          const { Patient } = await import("@/lib/db-server")
          const patient = await Patient.findById(chart.patientId)
          if (patient) {
            proc.patientName = patient.name
          }
        }
        return proc
      })
    )

    return NextResponse.json({
      success: true,
      procedures: enrichedProcedures,
    })
  } catch (error) {
    console.error("[v0] Error fetching general procedures:", error)
    return NextResponse.json(
      { error: "Failed to fetch general procedures" },
      { status: 500 }
    )
  }
}

// POST - Create a new general procedure
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = await request.json()
    const { chartId, patientId, name, date, comments } = body

    if (!chartId || !name) {
      return NextResponse.json(
        { error: "Chart ID and procedure name are required" },
        { status: 400 }
      )
    }

    const chart = await ToothChart.findById(chartId)
    if (!chart) {
      return NextResponse.json({ error: "Tooth chart not found" }, { status: 404 })
    }

    const mongoose = await import("mongoose")
    const { User, Patient } = await import("@/lib/db-server")
    
    let doctorName = "Unknown";
    let patientName = "Unknown";
    
    try {
      const doctor = await User.findById(payload.userId)
      doctorName = doctor?.name || doctor?.email || payload.name || "Unknown"
    } catch (docError) {
      doctorName = payload.name || "Unknown"
    }

    try {
      const patient = await Patient.findById(patientId || chart.patientId)
      patientName = patient?.name || "Unknown"
    } catch (patientError) {
      patientName = "Unknown"
    }

    const newGeneralProcedure = {
      _id: new mongoose.Types.ObjectId(),
      name,
      date: date ? new Date(date) : new Date(),
      comments: comments || "",
      createdBy: payload.userId,
      createdByName: doctorName,
      patientName: patientName,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const updatedChart = await ToothChart.findByIdAndUpdate(
      chartId,
      {
        $push: { generalProcedures: newGeneralProcedure },
        $set: {
          lastReview: new Date(),
          doctorId: payload.userId,
          doctorName: doctorName,
        },
      },
      { new: true, runValidators: true }
    )

    if (!updatedChart) {
      return NextResponse.json({ error: "Failed to create procedure" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      procedure: newGeneralProcedure,
      chart: updatedChart,
    })
  } catch (error) {
    console.error("Error creating general procedure:", error)
    return NextResponse.json(
      { error: "Failed to create general procedure: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
