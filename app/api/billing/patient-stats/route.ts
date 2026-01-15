import { type NextRequest, NextResponse } from "next/server"
import { connectDB, Billing, Patient } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    // Get all patients and their billing info
    const patients = await Patient.find({}).sort({ name: 1 })
    const billings = await Billing.find({}).sort({ createdAt: -1 })

    // Calculate stats for each patient
    const patientStats = patients.map((patient: any) => {
      const patientBillings = billings.filter((b: any) => b.patientId === patient._id.toString())
      const totalPaid = patientBillings.reduce((sum: number, b: any) => sum + (b.paidAmount || 0), 0)
      const totalDebt = patientBillings.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0)
      const remainingBalance = Math.max(0, totalDebt - totalPaid)

      const paymentPercentage = totalDebt > 0 ? Math.min(100, (totalPaid / totalDebt) * 100) : 0

      return {
        patientId: patient._id,
        name: patient.name,
        phone: patient.phone,
        totalPaid,
        totalDebt,
        remainingBalance,
        paymentPercentage: Math.round(paymentPercentage * 100) / 100, // Round to 2 decimal places
      }
    })

    return NextResponse.json({ success: true, patients: patientStats })
  } catch (error) {
    console.error("[Patient Stats GET] Error:", error)
    return NextResponse.json({ error: "Failed to fetch patient stats" }, { status: 500 })
  }
}
