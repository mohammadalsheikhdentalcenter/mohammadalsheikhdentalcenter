//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { ToothChart, connectDB } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

// GET - Fetch a single general procedure
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params
    const procedure = chart.generalProcedures?.find(
      (p) => p._id.toString() === id
    )

    if (!procedure) {
      return NextResponse.json({ error: "Procedure not found" }, { status: 404 })
    }

    // Enrich with doctor name
    if (procedure.createdBy && !procedure.createdByName) {
      const { User } = await import("@/lib/db-server")
      const doctor = await User.findById(procedure.createdBy)
      if (doctor) {
        procedure.createdByName = doctor.name || doctor.email
      }
    }

    return NextResponse.json({
      success: true,
      procedure,
    })
  } catch (error) {
    console.error("[v0] Error fetching general procedure:", error)
    return NextResponse.json(
      { error: "Failed to fetch general procedure" },
      { status: 500 }
    )
  }
}

// PUT - Update a general procedure
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { chartId, name, date, comments } = body

    if (!chartId) {
      return NextResponse.json({ error: "Chart ID is required" }, { status: 400 })
    }

    const chart = await ToothChart.findById(chartId)
    if (!chart) {
      return NextResponse.json({ error: "Tooth chart not found" }, { status: 404 })
    }

    const { id } = await params
    const procedureIndex = chart.generalProcedures?.findIndex(
      (p) => p._id.toString() === id
    )

    if (procedureIndex === undefined || procedureIndex === -1) {
      return NextResponse.json({ error: "Procedure not found" }, { status: 404 })
    }

    // Update procedure fields
    if (name !== undefined) chart.generalProcedures[procedureIndex].name = name
    if (date !== undefined) chart.generalProcedures[procedureIndex].date = new Date(date)
    if (comments !== undefined) chart.generalProcedures[procedureIndex].comments = comments
    chart.generalProcedures[procedureIndex].updatedAt = new Date()

    await chart.save()

    return NextResponse.json({
      success: true,
      procedure: chart.generalProcedures[procedureIndex],
    })
  } catch (error) {
    console.error("Error updating general procedure:", error)
    return NextResponse.json(
      { error: "Failed to update general procedure: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

// DELETE - Delete a general procedure
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const chartId = request.nextUrl.searchParams.get("chartId")
    if (!chartId) {
      return NextResponse.json({ error: "Chart ID is required" }, { status: 400 })
    }

    const chart = await ToothChart.findById(chartId)
    if (!chart) {
      return NextResponse.json({ error: "Tooth chart not found" }, { status: 404 })
    }

    const initialLength = chart.generalProcedures?.length || 0

    const { id } = await params
    chart.generalProcedures = chart.generalProcedures?.filter(
      (p) => p._id.toString() !== id
    ) || []

    if (chart.generalProcedures.length === initialLength) {
      return NextResponse.json({ error: "Procedure not found" }, { status: 404 })
    }

    await chart.save()

    return NextResponse.json({
      success: true,
      message: "Procedure deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting general procedure:", error)
    return NextResponse.json(
      { error: "Failed to delete general procedure: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
