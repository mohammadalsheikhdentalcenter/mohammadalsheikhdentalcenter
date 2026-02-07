import { type NextRequest, NextResponse } from "next/server"
import { connectDB, Billing } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const patientId = params.id
    console.log("[v0] Fetching transactions for patientId:", patientId)

    const billings = await Billing.find({ patientId }).sort({ createdAt: -1 })
    console.log("[v0] Found billings count:", billings.length)

    // Calculate totals
    const totalPaid = billings.reduce((sum: number, b: any) => sum + (b.paidAmount || 0), 0)
    const totalDebt = billings.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0)
    
    // Calculate remaining unpaid debt across all records
    const remainingBalance = billings.reduce((sum: number, b: any) => {
      const unpaidOnThisRecord = Math.max(0, (b.totalAmount || 0) - (b.paidAmount || 0))
      return sum + unpaidOnThisRecord
    }, 0)
    const totalPaid2 = totalDebt - remainingBalance
    // Calculate payment percentage
    const paymentPercentage = totalDebt > 0 ? 
    Math.min(100, (totalPaid2 / totalDebt) * 100) : 0
    
    console.log("[v0] Calculated stats:", { 
      totalPaid, 
      totalDebt, 
      remainingBalance, 
      paymentPercentage 
    })

    return NextResponse.json({
      success: true,
      billings,
      stats: {
        totalPaid,
        totalDebt,
        remainingBalance,
       paymentPercentage: Math.round(paymentPercentage * 100) / 100, // Round to 2 decimal places
      },
    })
  } catch (error) {
    console.error("[Patient Transactions GET] Error:", error)
    return NextResponse.json({ error: "Failed to fetch patient transactions" }, { status: 500 })
  }
}
