//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { ToothChart, connectDB } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const chart = await ToothChart.findById(params.id)
    if (!chart) return NextResponse.json({ error: "Tooth chart not found" }, { status: 404 })

    return NextResponse.json({ success: true, chart })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch tooth chart" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const chart = await ToothChart.findById(params.id)
    if (!chart) return NextResponse.json({ error: "Tooth chart not found" }, { status: 404 })

    if (payload.role === "doctor") {
      const { Patient } = await import("@/lib/db-server")
      const patient = await Patient.findById(chart.patientId)
      if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    const body = await request.json()
    const { action, procedure, procedureId } = body

    console.log("[v0] API PUT - Action:", action)

    // Handle procedure-specific actions
    if (action === "addProcedure" && procedure) {
      console.log("[v0] Adding new procedure for tooth:", procedure.toothNumber)
      console.log("[v0] Procedure data received in API:", procedure)
      const mongoose = await import("mongoose")
      const newProcedure = {
        _id: new mongoose.Types.ObjectId(),
        ...procedure,
        createdBy: payload.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      console.log("[v0] New procedure object to be saved:", newProcedure)

      // Use atomic $push operation to avoid race conditions
      const updatedChart = await ToothChart.findByIdAndUpdate(
        params.id,
        {
          $push: { procedures: newProcedure },
          $set: { lastReview: new Date(), doctorId: payload.userId }
        },
        { new: true, runValidators: true }
      )

      if (!updatedChart) {
        return NextResponse.json({ error: "Failed to update chart" }, { status: 500 })
      }

      console.log("[v0] Procedure added. Total procedures:", updatedChart.procedures?.length || 0)
      return NextResponse.json({ success: true, chart: updatedChart })
    } else if (action === "updateProcedure" && procedureId && procedure) {
      console.log("[v0] Updating procedure:", procedureId)
      if (Array.isArray(chart.procedures)) {
        const index = chart.procedures.findIndex(p => p._id.toString() === procedureId)
        if (index !== -1) {
          chart.procedures[index] = {
            ...chart.procedures[index],
            ...procedure,
            updatedAt: new Date(),
          }
          console.log("[v0] Procedure updated at index:", index)
        } else {
          return NextResponse.json({ error: "Procedure not found" }, { status: 404 })
        }
      }
    } else if (action === "deleteProcedure" && procedureId) {
      console.log("[v0] Deleting procedure:", procedureId)
      if (Array.isArray(chart.procedures)) {
        const initialLength = chart.procedures.length
        chart.procedures = chart.procedures.filter(
          p => p._id.toString() !== procedureId
        )
        console.log(
          "[v0] Procedures before delete:",
          initialLength,
          "after delete:",
          chart.procedures.length,
        )

        if (chart.procedures.length === initialLength) {
          return NextResponse.json({ error: "Procedure not found" }, { status: 404 })
        }
      }
    } else if (body.teeth || body.procedures) {
      // Handle bulk updates (legacy support)
      console.log("[v0] Handling bulk update")
      if (body.procedures && Array.isArray(body.procedures)) {
        chart.procedures = body.procedures
      }
      if (body.teeth) {
        chart.teeth = body.teeth
      }
    }

    chart.lastReview = new Date()
    chart.doctorId = payload.userId
    await chart.save()

    console.log("[v0] Chart saved successfully")
    return NextResponse.json({ success: true, chart })
  } catch (error) {
    console.error("[v0] Error in PUT:", error)
    return NextResponse.json({ error: "Failed to update tooth chart" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    if (payload.role === "receptionist" || payload.role === "patient") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const chart = await ToothChart.findById(params.id)
    if (!chart) return NextResponse.json({ error: "Tooth chart not found" }, { status: 404 })

    await ToothChart.findByIdAndDelete(params.id)

    return NextResponse.json({ success: true, message: "Tooth chart deleted successfully" })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete tooth chart" }, { status: 500 })
  }
}
