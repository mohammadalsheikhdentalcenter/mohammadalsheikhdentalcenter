import { type NextRequest, NextResponse } from "next/server"
import { connectDB, Billing } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

export async function PUT(request: NextRequest, { params }: { params: { id: string; transactionId: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    if (payload.role === "doctor") return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const { id: patientId, transactionId } = params
    const { paymentMethods, totalAmount, description, date } = await request.json()

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json({ error: "Total amount must be greater than 0" }, { status: 400 })
    }

    // Find billing with transaction
    const billing = await Billing.findOne({
      patientId,
      "transactions._id": transactionId,
    })

    if (!billing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Find and update the specific transaction
    const transactionIndex = billing.transactions.findIndex((t: any) => t._id.toString() === transactionId)

    if (transactionIndex === -1) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    const oldTransaction = billing.transactions[transactionIndex]
    const oldAmount = oldTransaction.totalAmount || 0
    const amountDifference = totalAmount - oldAmount

    // Update transaction
    const paymentSplitsArray = Object.entries(paymentMethods)
      .filter(([_, val]: [string, any]) => val > 0)
      .map(([method, methodAmount]: [string, any]) => {
        const proportion = methodAmount / totalAmount
        const proportionalAmount = totalAmount * proportion
        return {
          paymentType: method,
          amount: proportionalAmount,
        }
      })

    billing.transactions[transactionIndex] = {
      ...oldTransaction.toObject(),
      transactionId: oldTransaction.transactionId, // Ensure transactionId is preserved
      paymentSplits: paymentSplitsArray,
      totalAmount,
      date: date ? new Date(date) : oldTransaction.date,
      notes: description,
    }

    // Update billing totals
    billing.paidAmount = billing.paidAmount + amountDifference
    const newStatus =
      billing.paidAmount >= billing.totalAmount ? "Paid" : billing.paidAmount > 0 ? "Partially Paid" : "Pending"
    billing.paymentStatus = newStatus
    billing.paymentDate = date ? new Date(date) : new Date()

    await billing.save()

    return NextResponse.json({
      success: true,
      message: "Payment updated successfully",
    })
  } catch (error) {
    console.error("[Edit Payment PUT] Error:", error)
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 })
  }
}
