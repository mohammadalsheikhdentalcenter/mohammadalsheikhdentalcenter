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

    const billings = await Billing.find({ patientId })
    let remainingPayment = totalAmount
    const updates = []

    for (const billing of billings) {
      if (remainingPayment <= 0) break

      const amountOwed = billing.totalAmount - billing.paidAmount
      if (amountOwed > 0) {
        const paymentAmount = Math.min(remainingPayment, amountOwed)
        const newPaidAmount = billing.paidAmount + paymentAmount
        const newStatus =
          newPaidAmount >= billing.totalAmount ? "Paid" : newPaidAmount > 0 ? "Partially Paid" : "Pending"

        const paymentSplitsArray = Object.entries(paymentMethods)
          .filter(([_, val]: [string, any]) => val > 0)
          .map(([method, methodAmount]: [string, any]) => {
            const proportion = methodAmount / totalAmount
            const proportionalAmount = paymentAmount * proportion
            return {
              paymentType: method,
              amount: proportionalAmount,
            }
          })

        updates.push({
          id: billing._id,
          paidAmount: newPaidAmount,
          paymentStatus: newStatus,
          paymentSplitsArray,
          paymentDate: date ? new Date(date) : new Date(),
          notes: description,
        })

        remainingPayment -= paymentAmount
      }
    }

    for (const update of updates) {
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

      const newTransaction = {
        transactionId,
        paymentStatus: update.paymentStatus,
        paymentSplits: update.paymentSplitsArray,
        totalAmount: update.paymentSplitsArray.reduce((sum: number, split: any) => sum + (split.amount || 0), 0),
        date: update.paymentDate,
        notes: update.notes,
      }

      await Billing.findByIdAndUpdate(update.id, {
        $set: {
          paidAmount: update.paidAmount,
          paymentStatus: update.paymentStatus,
          paymentDate: update.paymentDate,
        },
        $push: {
          transactions: newTransaction,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully",
      appliedToCount: updates.length,
    })
  } catch (error) {
    console.error("[Add Payment POST] Error:", error)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
