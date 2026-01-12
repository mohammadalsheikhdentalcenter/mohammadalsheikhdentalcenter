//@ts-nocheck
import { connectDB } from "@/lib/db-server"
import { Billing } from "@/lib/db-server"
import { Patient } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"
import { type NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    if (!["admin", "receptionist", "doctor"].includes(payload.role)) {
      return NextResponse.json(
        { error: "Only admin, receptionist and doctor can view billing requests" },
        { status: 403 },
      )
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")

    let query: any = {}
    if (status && status !== "all") {
      query = { "extraChargesRequested.status": status }
    }

    const billings = await Billing.find(query).lean()

    console.log("[v0] Found billings with status", status, ":", billings.length)

    const formattedRequests: any[] = []

    for (const billing of billings) {
      const patient = await Patient.findById(new mongoose.Types.ObjectId(billing.patientId))
      const patientName = patient?.name || "Unknown Patient"

      const allPatientBillings = await Billing.find({ patientId: billing.patientId }).lean()
      const totalPaid = allPatientBillings.reduce((sum, b) => sum + (b.paidAmount || 0), 0)
      const totalDebt = allPatientBillings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
      const paymentPercentage = totalDebt > 0 ? Math.round((totalPaid / totalDebt) * 100 * 100) / 100 : 0

      if (billing.extraChargesRequested && Array.isArray(billing.extraChargesRequested)) {
        billing.extraChargesRequested.forEach((charge: any) => {
          if (!status || status === "all" || charge.status === status) {
            if (payload.role === "doctor" && charge.requestedBy !== payload.name) {
              return
            }

            formattedRequests.push({
              _id: billing._id,
              billingId: billing._id.toString(),
              patientId: billing.patientId,
              patientName: patientName,
              doctorName: charge.requestedBy || "Unknown Doctor",
              extraChargesRequested: charge,
              totalAmount: billing.totalAmount,
              paymentPercentage, // Added payment percentage
            })
          }
        })
      }
    }

    console.log("[v0] Formatted requests:", formattedRequests.length)

    return NextResponse.json({ requests: formattedRequests })
  } catch (error) {
    console.error("[v0] Error fetching billing requests:", error)
    return NextResponse.json({ error: "Failed to fetch billing requests" }, { status: 500 })
  }
}
