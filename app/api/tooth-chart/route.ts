//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { ToothChart, connectDB, Patient } from "@/lib/db-server"
import { verifyToken, verifyPatientToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get("patientId")

    let payload = verifyToken(token)
    let isPatient = false

    if (!payload) {
      // Try patient token (base64-encoded patient ID)
      const decodedPatientId = verifyPatientToken(token)
      if (decodedPatientId) {
        isPatient = true
        payload = {
          userId: decodedPatientId,
          email: "",
          role: "patient" as any,
          name: "",
        }
      }
    }

    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Only restrict patient access to their own data
    if (isPatient && patientId && patientId !== payload.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const queryPatientId = patientId || payload.userId
    const charts = await ToothChart.find({
      patientId: queryPatientId.toString(),
    }).sort({ createdAt: -1 })

    console.log("  Tooth chart query result:", {
      patientId: queryPatientId,
      found: charts.length > 0,
    })
    return NextResponse.json({
      success: true,
      toothChart: charts[0] || null,
      chartHistory: charts,
    })
  } catch (error) {
    console.error("  Tooth chart API error:", error)
    return NextResponse.json({ error: "Failed to fetch tooth charts", details: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let payload = verifyToken(token)
    let isPatient = false

    if (!payload) {
      const decodedPatientId = verifyPatientToken(token)
      if (decodedPatientId) {
        isPatient = true
        payload = {
          userId: decodedPatientId,
          email: "",
          role: "patient" as any,
          name: "",
        }
      }
    }

    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Patients cannot create tooth charts
    if (isPatient) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (payload.role === "receptionist") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { patientId, teeth, procedures } = await request.json()
    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 })
    }

    const patient = await Patient.findById(patientId)
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    const newChart = await ToothChart.create({
      patientId: patientId.toString(),
      doctorId: payload.userId,
      teeth: teeth || {},
      procedures: procedures || [],
      lastReview: new Date(),
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true, chart: newChart })
  } catch (error) {
    console.error("  Tooth chart creation error:", error)
    return NextResponse.json({ error: "Failed to create tooth chart" }, { status: 500 })
  }
}
