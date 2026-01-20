import { connectDB } from "@/lib/db-server"
import { Billing } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    if (!["admin", "receptionist"].includes(payload.role)) {
      return NextResponse.json({ error: "Only admin and receptionist can view pending count" }, { status: 403 })
    }

    await connectDB()

    // More efficient query using MongoDB aggregation
    const result = await Billing.aggregate([
      { $unwind: "$extraChargesRequested" },
      { $match: { "extraChargesRequested.status": "pending" } },
      { $count: "pendingCount" }
    ])

    const pendingCount = result.length > 0 ? result[0].pendingCount : 0

    return NextResponse.json({ pendingCount })
  } catch (error) {
    console.error("[v0] Error fetching pending count:", error)
    return NextResponse.json({ error: "Failed to fetch pending count" }, { status: 500 })
  }
}
