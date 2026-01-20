//@ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import { connectDB, Billing } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    if (payload.role === "doctor") return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const { id } = params
    const updateData = await request.json()

    // Convert numeric fields
    if (updateData.totalAmount !== undefined) updateData.totalAmount = Number(updateData.totalAmount)
    if (updateData.paidAmount !== undefined) updateData.paidAmount = Number(updateData.paidAmount)
    
    // Allow updating remainingBalance (debit amount) - this is the remaining/outstanding amount
    if (updateData.remainingBalance !== undefined) {
      updateData.remainingBalance = Number(updateData.remainingBalance)
      // When remaining balance is updated, also adjust paidAmount to maintain consistency
      // remainingBalance = totalAmount - paidAmount
      const billing = await Billing.findById(id)
      if (billing) {
        const newPaidAmount = billing.totalAmount - updateData.remainingBalance
        if (newPaidAmount >= 0) {
          updateData.paidAmount = newPaidAmount
        }
      }
    }
    
    if (updateData.treatments) updateData.treatments = updateData.treatments.map((t: any) => ({ name: t.name || t }))

    // Add audit trail for balance adjustments
    if (updateData.remainingBalance !== undefined || updateData.paidAmount !== undefined || updateData.notes) {
      if (!updateData.adjustmentNotes) {
        updateData.adjustmentNotes = updateData.notes || `Balance adjustment by ${payload.userName || payload.userId}`
      }
      updateData.lastAdjustedBy = payload.userId
      updateData.lastAdjustedAt = new Date()
    }

    const updatedBilling = await Billing.findByIdAndUpdate(id, updateData, { new: true })

    if (!updatedBilling) return NextResponse.json({ error: "Billing record not found" }, { status: 404 })

    console.log("[Billing PUT] Updated billing for patient:", updatedBilling.patientId, {
      remainingBalance: updatedBilling.remainingBalance,
      paidAmount: updatedBilling.paidAmount,
      totalAmount: updatedBilling.totalAmount,
    })

    return NextResponse.json({ success: true, billing: updatedBilling })
  } catch (error) {
    console.error("[Billing PUT] Error:", error)
    return NextResponse.json({ error: "Failed to update billing" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    if (payload.role === "doctor") return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const { id } = params
    const deletedBilling = await Billing.findByIdAndDelete(id)
    if (!deletedBilling) return NextResponse.json({ error: "Billing record not found" }, { status: 404 })

    return NextResponse.json({ success: true, message: "Billing record deleted" })
  } catch (error) {
    console.error("[Billing DELETE] Error:", error)
    return NextResponse.json({ error: "Failed to delete billing" }, { status: 500 })
  }
}
