import { type NextRequest, NextResponse } from "next/server"
import { Inventory, connectDB } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
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

    if (payload.role !== "admin" && payload.role !== "hr") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const inventory = await Inventory.find({})

    return NextResponse.json({ success: true, inventory })
  } catch (error) {
    console.error("  Get inventory error:", error)
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 })
  }
}

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

    if (payload.role !== "admin" && payload.role !== "hr") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { name, quantity, minStock, unit, supplier } = await request.json()

    const newItem = await Inventory.create({
      name,
      quantity,
      minStock,
      unit,
      supplier,
      lastRestocked: new Date(),
    })

    return NextResponse.json({ success: true, item: newItem })
  } catch (error) {
    console.error("  Add inventory error:", error)
    return NextResponse.json({ error: "Failed to add inventory item" }, { status: 500 })
  }
}
