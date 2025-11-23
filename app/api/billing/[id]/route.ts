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

    if (updateData.totalAmount) updateData.totalAmount = Number(updateData.totalAmount)
    if (updateData.paidAmount) updateData.paidAmount = Number(updateData.paidAmount)
    if (updateData.treatments) updateData.treatments = updateData.treatments.map((t: any) => ({ name: t.name || t }))

    const updatedBilling = await Billing.findByIdAndUpdate(id, updateData, { new: true })

    if (!updatedBilling) return NextResponse.json({ error: "Billing record not found" }, { status: 404 })

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
