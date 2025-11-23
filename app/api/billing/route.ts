import { type NextRequest, NextResponse } from "next/server"
import { connectDB, Billing } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

export async function GET() {
  try {
    await connectDB()
    const billing = await Billing.find({}).sort({ createdAt: -1 })
    return NextResponse.json({ success: true, billing })
  } catch (error) {
    console.error("[Billing GET] Error:", error)
    return NextResponse.json({ error: "Failed to fetch billing" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    if (payload.role === "doctor") return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const { patientId, treatments, totalAmount, paidAmount, paymentStatus, notes, paymentSplits } = await request.json()
    if (!patientId || !totalAmount)
      return NextResponse.json({ error: "Patient and total amount required" }, { status: 400 })

    const newBilling = await Billing.create({
      patientId,
      treatments: treatments || [],
      totalAmount,
      paidAmount: paidAmount || 0,
      paymentSplits: paymentSplits || [],
      paymentStatus: paymentStatus || "Pending",
      notes: notes || "",
      createdBy: payload.userId,
    })

    return NextResponse.json({ success: true, billing: newBilling })
  } catch (error) {
    console.error("[Billing POST] Error:", error)
    return NextResponse.json({ error: "Failed to create billing" }, { status: 500 })
  }
}
