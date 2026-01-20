//@ts-nocheck
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

    // Create new debt entry with remainingBalance initialized to totalAmount
    const newDebt = await Billing.create({
      patientId,
      totalAmount: amount,
      paidAmount: 0,
      remainingBalance: amount, // Initialize remaining balance to total amount since nothing is paid yet
      treatments: [{ name: description || "Debt", cost: amount, quantity: 1 }],
      paymentStatus: "Pending",
      notes: description || "",
      paymentDate: date ? new Date(date) : new Date(),
      createdBy: payload.userId,
    })

    console.log("[v0] New debt created with remaining balance:", {
      patientId,
      totalAmount: amount,
      remainingBalance: amount,
      paidAmount: 0,
    })

    return NextResponse.json({ success: true, debt: newDebt })
  } catch (error) {
    console.error("[Add Debt POST] Error:", error)
    return NextResponse.json({ error: "Failed to add debt" }, { status: 500 })
  }
}

/**
 * PUT: Update the total debt and/or remaining balance for a billing record
 * This allows staff to adjust both the debt amount and outstanding balance when discounts or adjustments apply
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    if (payload.role === "doctor") return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const { id: billingId } = params
    const { totalDebt, remainingBalance, adjustmentReason } = await request.json()

    console.log("[Debt PUT] Request received:", { billingId, totalDebt, remainingBalance, adjustmentReason })

    // Get the billing record
    const billing = await Billing.findById(billingId)
    if (!billing) {
      console.log("[Debt PUT] Billing not found:", billingId)
      return NextResponse.json({ error: "Billing record not found" }, { status: 404 })
    }

    console.log("[Debt PUT] Current billing state:", {
      totalAmount: billing.totalAmount,
      remainingBalance: billing.remainingBalance,
      paidAmount: billing.paidAmount,
    })

    // Ensure at least one field is being updated
    if (totalDebt === undefined && remainingBalance === undefined) {
      return NextResponse.json({ error: "At least one field (totalDebt or remainingBalance) must be provided" }, { status: 400 })
    }

    const updateData: any = {}

    // Update total debt if provided
    if (totalDebt !== undefined && totalDebt !== null) {
      const newTotalDebt = Number(totalDebt)
      if (newTotalDebt < 0) {
        return NextResponse.json({ error: "Total debt cannot be negative" }, { status: 400 })
      }
      updateData.totalAmount = newTotalDebt

      // If remaining balance would exceed new total, adjust it
      if (remainingBalance === undefined || remainingBalance === null) {
        // No remaining balance change, so adjust it if it exceeds new total
        const currentRemaining = billing.remainingBalance || 0
        if (currentRemaining > newTotalDebt) {
          updateData.remainingBalance = newTotalDebt
        }
      }
    }

    // Update remaining balance if provided
    if (remainingBalance !== undefined && remainingBalance !== null) {
      const newRemainingBalance = Number(remainingBalance)
      if (newRemainingBalance < 0) {
        return NextResponse.json({ error: "Remaining balance cannot be negative" }, { status: 400 })
      }

      // Check against total debt (use updated total if provided, otherwise current)
      const totalForValidation = updateData.totalAmount !== undefined ? updateData.totalAmount : billing.totalAmount

      if (newRemainingBalance > totalForValidation) {
        return NextResponse.json({
          error: `Remaining balance cannot exceed total amount ($${totalForValidation})`,
        }, { status: 400 })
      }

      updateData.remainingBalance = newRemainingBalance
      // Calculate paid amount
      updateData.paidAmount = totalForValidation - newRemainingBalance
    }

    // Calculate payment status
    const finalTotal = updateData.totalAmount !== undefined ? updateData.totalAmount : billing.totalAmount
    const finalRemaining =
      updateData.remainingBalance !== undefined ? updateData.remainingBalance : billing.remainingBalance || 0
    const finalPaid = updateData.paidAmount !== undefined ? updateData.paidAmount : billing.paidAmount || 0

    updateData.paymentStatus = finalRemaining === 0 ? "Paid" : finalPaid > 0 ? "Partially Paid" : "Pending"
    updateData.adjustmentNotes = adjustmentReason || `Adjustment by ${payload.userName || payload.userId}`
    updateData.lastAdjustedBy = payload.userId
    updateData.lastAdjustedAt = new Date()

    // Update the billing record
    const updatedBilling = await Billing.findByIdAndUpdate(billingId, updateData, { new: true })

    console.log("[Debt PUT] Updated billing record:", billingId, {
      totalDebt: finalTotal,
      remainingBalance: finalRemaining,
      paidAmount: finalPaid,
      paymentStatus: updateData.paymentStatus,
      adjustedBy: payload.userName || payload.userId,
    })

    return NextResponse.json({
      success: true,
      message: "Billing amounts updated successfully",
      billing: updatedBilling,
    })
  } catch (error) {
    console.error("[Debt PUT] Error:", error)
    return NextResponse.json({ error: "Failed to update billing amounts" }, { status: 500 })
  }
}
