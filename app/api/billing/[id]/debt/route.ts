import { type NextRequest, NextResponse } from "next/server"
import { connectDB, Billing } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    if (payload.role === "doctor") return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const { id: patientId } = params
    const { amount, description, date } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })
    }

    // Create new debt entry
    const newDebt = await Billing.create({
      patientId,
      totalAmount: amount,
      paidAmount: 0,
      treatments: [{ name: description || "Debt", cost: amount, quantity: 1 }],
      paymentStatus: "Pending",
      notes: description || "",
      paymentDate: date ? new Date(date) : new Date(),
      createdBy: payload.userId,
    })

    return NextResponse.json({ success: true, debt: newDebt })
  } catch (error) {
    console.error("[Add Debt POST] Error:", error)
    return NextResponse.json({ error: "Failed to add debt" }, { status: 500 })
  }
}
