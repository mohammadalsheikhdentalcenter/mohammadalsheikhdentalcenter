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

    const { splits } = await request.json()
    if (!splits || !Array.isArray(splits) || splits.length === 0) {
      return NextResponse.json({ error: "Splits array required" }, { status: 400 })
    }

    // Validate each split has paymentType and amount
    for (const split of splits) {
      if (!split.paymentType || !split.amount) {
        return NextResponse.json({ error: "Payment type and amount required for all splits" }, { status: 400 })
      }
    }

    const billing = await Billing.findById(params.id)
    if (!billing) return NextResponse.json({ error: "Billing not found" }, { status: 404 })

    billing.paymentSplits = splits.map((split: any) => ({
      paymentType: split.paymentType,
      amount: Number(split.amount) || 0,
    }))

    // Calculate total paid
    const totalPaid = billing.paymentSplits.reduce((sum: number, split: any) => sum + split.amount, 0)
    billing.paidAmount = totalPaid

    // Update payment status
    if (totalPaid >= billing.totalAmount) {
      billing.paymentStatus = "Paid"
    } else if (totalPaid > 0) {
      billing.paymentStatus = "Partially Paid"
    }

    await billing.save()
    return NextResponse.json({ success: true, billing })
  } catch (error) {
    console.error("[Splits POST] Error:", error)
    return NextResponse.json({ error: "Failed to add payment split" }, { status: 500 })
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

    const { splitId } = await request.json()
    if (!splitId) return NextResponse.json({ error: "Split ID required" }, { status: 400 })

    const billing = await Billing.findById(params.id)
    if (!billing) return NextResponse.json({ error: "Billing not found" }, { status: 404 })

    billing.paymentSplits = billing.paymentSplits?.filter((split: any) => split._id?.toString() !== splitId) || []

    // Recalculate total paid
    const totalPaid = billing.paymentSplits.reduce((sum: number, split: any) => sum + split.amount, 0)
    billing.paidAmount = totalPaid

    // Update payment status
    if (totalPaid >= billing.totalAmount) {
      billing.paymentStatus = "Paid"
    } else if (totalPaid > 0) {
      billing.paymentStatus = "Partially Paid"
    } else {
      billing.paymentStatus = "Pending"
    }

    await billing.save()
    return NextResponse.json({ success: true, billing })
  } catch (error) {
    console.error("[Splits DELETE] Error:", error)
    return NextResponse.json({ error: "Failed to remove payment split" }, { status: 500 })
  }
}
