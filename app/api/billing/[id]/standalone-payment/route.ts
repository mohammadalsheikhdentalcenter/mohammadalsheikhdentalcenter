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
    const { paymentMethods, totalAmount, description, date } = await request.json()

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json({ error: "Total amount must be greater than 0" }, { status: 400 })
    }

    const hasPayment = Object.values(paymentMethods).some((val: any) => val && val > 0)
    if (!hasPayment) {
      return NextResponse.json({ error: "At least one payment method must be provided" }, { status: 400 })
    }

    // Create a new billing record for standalone payment with no debt
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const paymentSplitsArray = Object.entries(paymentMethods)
      .filter(([_, val]: [string, any]) => val > 0)
      .map(([method, methodAmount]: [string, any]) => {
        return {
          paymentType: method,
          amount: Number(methodAmount),
        }
      })

    const newBilling = await Billing.create({
      patientId,
      totalAmount: 0, // No debt associated
      paidAmount: totalAmount,
      paymentStatus: "Paid",
      paymentDate: date ? new Date(date) : new Date(),
      notes: description || "Standalone payment",
      transactions: [
        {
          transactionId,
          paymentStatus: "Paid",
          paymentSplits: paymentSplitsArray,
          totalAmount,
          date: date ? new Date(date) : new Date(),
          notes: description || "Standalone payment",
        },
      ],
      createdBy: payload.name,
      createdAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully",
      billing: newBilling,
    })
  } catch (error) {
    console.error("[Standalone Payment POST] Error:", error)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
