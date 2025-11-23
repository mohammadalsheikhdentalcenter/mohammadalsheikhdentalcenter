import { type NextRequest, NextResponse } from "next/server"
import { Inventory, connectDB } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"
import { Types } from "mongoose"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { id } = params
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    const item = await Inventory.findById(id)
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 })

    return NextResponse.json({ item })
  } catch (error) {
    console.error("Get inventory item error:", error)
    return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload || (payload.role !== "admin" && payload.role !== "hr")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { id } = params
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    const { name, quantity, minStock, unit, supplier } = await request.json()

    // Validate required fields
    if (!name || quantity === undefined || minStock === undefined) {
      return NextResponse.json({ error: "Name, quantity, and minStock are required" }, { status: 400 })
    }

    const updatedItem = await Inventory.findByIdAndUpdate(
      id,
      {
        name,
        quantity: Number.parseInt(quantity),
        minStock: Number.parseInt(minStock),
        unit,
        supplier,
      },
      { new: true, runValidators: true },
    )

    if (!updatedItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
    })
  } catch (error) {
    console.error("Update inventory error:", error)
    return NextResponse.json(
      {
        error: "Failed to update item: " + (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload || (payload.role !== "admin" && payload.role !== "hr")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { id } = params
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    const deletedItem = await Inventory.findByIdAndDelete(id)
    if (!deletedItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Item deleted successfully",
    })
  } catch (error) {
    console.error("Delete inventory error:", error)
    return NextResponse.json(
      {
        error: "Failed to delete item: " + (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 },
    )
  }
}
