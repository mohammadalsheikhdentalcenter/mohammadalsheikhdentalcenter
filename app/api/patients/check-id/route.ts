import { type NextRequest, NextResponse } from "next/server"
import { Patient, connectDB } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const idNumber = searchParams.get("idNumber")
    const excludeId = searchParams.get("excludeId")

    if (!idNumber) {
      return NextResponse.json({ error: "ID number is required" }, { status: 400 })
    }

    const query: any = { idNumber: idNumber.trim() }
    if (excludeId) {
      query._id = { $ne: excludeId }
    }

    const existingPatient = await Patient.findOne(query)
    return NextResponse.json({ exists: !!existingPatient })
  } catch (error) {
    console.error("GET /api/patients/check-id error:", error)
    return NextResponse.json({ error: "Failed to check ID number" }, { status: 500 })
  }
}
