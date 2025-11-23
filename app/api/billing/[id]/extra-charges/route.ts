import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { connectDB, Billing, Patient, User } from "@/lib/db-server"
import mongoose from "mongoose"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (payload.role !== "doctor") {
      return NextResponse.json({ error: "Only doctors can request charges" }, { status: 403 })
    }

    const body = await request.json()
    const { amount, treatment, reason, patientName } = body

    if (!amount || !treatment) {
      return NextResponse.json({ error: "Amount and treatment are required" }, { status: 400 })
    }

    await connectDB()

    const patient = await Patient.findById(new mongoose.Types.ObjectId(id))
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    const doctor = await User.findById(new mongoose.Types.ObjectId(payload.userId))
    const doctorName = doctor?.name || "Unknown Doctor"

    const result = await Billing.findOneAndUpdate(
      { patientId: id }, // patientId is stored as string in schema
      {
        $addToSet: {
          extraChargesRequested: {
            _id: new mongoose.Types.ObjectId(),
            amount: Number.parseFloat(amount as string),
            treatment,
            reason: reason || "",
            requestedBy: doctorName,
            status: "pending",
            requestedAt: new Date(),
          },
        },
      },
      { new: true, upsert: false },
    )

    if (!result) {
      await Billing.create({
        patientId: id, // patientId as string
        totalAmount: 0,
        paidAmount: 0,
        paymentStatus: "Pending",
        paymentSplits: [],
        extraChargesRequested: [
          {
            _id: new mongoose.Types.ObjectId(),
            amount: Number.parseFloat(amount as string),
            treatment,
            reason: reason || "",
            requestedBy: doctorName,
            status: "pending",
            requestedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    console.log("[v0] Extra charges request created successfully for patient:", id)

    return NextResponse.json({
      success: true,
      message: "Extra charges request sent for approval",
    })
  } catch (error) {
    console.error("[v0] Extra charges request error:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}

// Helper function to calculate payment status
function calculatePaymentStatus(totalAmount: number, paidAmount: number): string {
  const remainingAmount = totalAmount - paidAmount
  
  if (remainingAmount <= 0) {
    return "Paid"
  } else if (paidAmount > 0 && paidAmount < totalAmount) {
    return "Partially Paid"
  } else {
    return "Pending"
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["admin", "receptionist"].includes(payload.role)) {
      return NextResponse.json({ error: "Only admin and receptionist can manage billing requests" }, { status: 403 })
    }

    const body = await request.json()
    const { action, chargeId } = body

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be 'approve' or 'reject'" }, { status: 400 })
    }

    await connectDB()

    const billing = await Billing.findById(new mongoose.Types.ObjectId(id))
    if (!billing) {
      return NextResponse.json({ error: "Billing record not found" }, { status: 404 })
    }

    const user = await User.findById(new mongoose.Types.ObjectId(payload.userId))
    const userName = user?.name || "Unknown User"

    if (action === "approve") {
      const charge = billing.extraChargesRequested.find((c: any) => c.status === "pending")

      if (!charge) {
        return NextResponse.json({ error: "No pending charges found" }, { status: 404 })
      }

      charge.status = "approved"
      charge.approvedBy = userName
      charge.approvedAt = new Date()

      // Add the charge amount to total amount
      billing.totalAmount += charge.amount

      // Calculate payment status using helper function
      billing.paymentStatus = calculatePaymentStatus(billing.totalAmount, billing.paidAmount)

      await billing.save()

      return NextResponse.json({
        success: true,
        message: "Extra charges approved and added to bill",
        data: {
          newTotalAmount: billing.totalAmount,
          paymentStatus: billing.paymentStatus,
          remainingAmount: billing.totalAmount - billing.paidAmount
        }
      })
    } else if (action === "reject") {
      const charge = billing.extraChargesRequested.find((c: any) => c.status === "pending")

      if (!charge) {
        return NextResponse.json({ error: "No pending charges found" }, { status: 404 })
      }

      charge.status = "rejected"
      charge.approvedBy = userName
      charge.approvedAt = new Date()

      await billing.save()

      return NextResponse.json({
        success: true,
        message: "Extra charges request rejected",
      })
    }
  } catch (error) {
    console.error("[v0] Extra charges management error:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
