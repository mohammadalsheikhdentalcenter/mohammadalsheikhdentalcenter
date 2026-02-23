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

    // Enrich chart data with patient and doctor names
    const chartObj = chart.toObject ? chart.toObject() : chart

    // Get patient name if not already set
    if (!chartObj.patientName && chartObj.patientId) {
      const { Patient } = await import("@/lib/db-server")
      const patient = await Patient.findById(chartObj.patientId)
      if (patient) {
        chartObj.patientName = patient.name || patient.email
      }
    }

    // Get doctor name if not already set
    if (!chartObj.doctorName && chartObj.doctorId) {
      const { User } = await import("@/lib/db-server")
      const doctor = await User.findById(chartObj.doctorId)
      if (doctor) {
        chartObj.doctorName = doctor.name || doctor.email
      }
    }

    // Enrich procedures with doctor names
    if (chartObj.procedures && Array.isArray(chartObj.procedures)) {
      chartObj.procedures = await Promise.all(chartObj.procedures.map(async (proc) => {
        if (proc.createdBy && !proc.createdByName) {
          const { User } = await import("@/lib/db-server")
          const doctor = await User.findById(proc.createdBy)
          if (doctor) {
            proc.createdByName = doctor.name || doctor.email
          }
        }
        return proc
      }))
    }

    // Enrich general procedures with doctor names
    if (chartObj.generalProcedures && Array.isArray(chartObj.generalProcedures)) {
      chartObj.generalProcedures = await Promise.all(chartObj.generalProcedures.map(async (proc) => {
        if (proc.createdBy && !proc.createdByName) {
          const { User } = await import("@/lib/db-server")
          const doctor = await User.findById(proc.createdBy)
          if (doctor) {
            proc.createdByName = doctor.name || doctor.email
          }
        }
        return proc
      }))
    }

    return NextResponse.json({ success: true, chart: chartObj })
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
      
      // Get doctor name for display
      const { User, Patient } = await import("@/lib/db-server")
      const doctor = await User.findById(payload.userId)
      const doctorName = doctor?.name || doctor?.email || payload.name
      
      // Get patient name for display
      const patient = await Patient.findById(chart.patientId)
      const patientName = patient?.name || patient?.email || "Unknown"
      
      const newProcedure = {
        _id: new mongoose.Types.ObjectId(),
        ...procedure,
        createdBy: payload.userId,
        createdByName: doctorName, // Store doctor name for easier access
        patientName: patientName, // Store patient name for easier access
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      console.log("[v0] New procedure object to be saved:", newProcedure)

      // Use atomic $push operation to avoid race conditions
      const updatedChart = await ToothChart.findByIdAndUpdate(
        params.id,
        {
          $push: { procedures: newProcedure },
          $set: { 
            lastReview: new Date(), 
            doctorId: payload.userId,
            doctorName: doctorName,
          }
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
    } else if (action === "addGeneralProcedure" && body.generalProcedure) {
      // Handle general procedures (apply to whole mouth)
      console.log("[v0] Adding general procedure:", body.generalProcedure.name)
      const mongoose = await import("mongoose")
      const { User } = await import("@/lib/db-server")
      const doctor = await User.findById(payload.userId)
      const doctorName = doctor?.name || doctor?.email || payload.name

      const newGeneralProcedure = {
        _id: new mongoose.Types.ObjectId(),
        name: body.generalProcedure.name,
        date: body.generalProcedure.date || new Date(),
        notes: body.generalProcedure.notes,
        createdBy: payload.userId,
        createdByName: doctorName,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedChart = await ToothChart.findByIdAndUpdate(
        params.id,
        {
          $push: { generalProcedures: newGeneralProcedure },
          $set: { lastReview: new Date(), doctorId: payload.userId, doctorName: doctorName }
        },
        { new: true, runValidators: true }
      )

      if (!updatedChart) {
        return NextResponse.json({ error: "Failed to update chart" }, { status: 500 })
      }

      console.log("[v0] General procedure added. Total:", updatedChart.generalProcedures?.length || 0)
      return NextResponse.json({ success: true, chart: updatedChart })
    } else if (action === "deleteGeneralProcedure" && body.procedureId) {
      // Delete general procedure
      console.log("[v0] Deleting general procedure:", body.procedureId)
      
      const updatedChart = await ToothChart.findByIdAndUpdate(
        params.id,
        {
          $pull: { generalProcedures: { _id: body.procedureId } }
        },
        { new: true, runValidators: true }
      )

      if (!updatedChart) {
        return NextResponse.json({ error: "Failed to update chart" }, { status: 500 })
      }

      console.log("[v0] General procedure deleted")
      return NextResponse.json({ success: true, chart: updatedChart })
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
