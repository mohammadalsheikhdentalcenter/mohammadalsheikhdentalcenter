//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { connectDB, AppointmentReport } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    if (payload.role === "doctor") return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const patientId = params.id
    const { appointmentId } = request.nextUrl.searchParams

    const query: any = { patientId }

    // If appointmentId is provided, get procedures for that specific appointment
    if (appointmentId) {
      query.appointmentId = appointmentId
    }

    const reports = await AppointmentReport.find(query)
      .sort({ createdAt: -1 })
      .limit(appointmentId ? 1 : 100)

    // Map the data to a more usable format
    const proceduresAndFindings = reports.map((report: any) => ({
      appointmentId: report.appointmentId,
      doctorName: report.doctorName,
      date: report.createdAt,
      procedures: report.procedures || [],
      findings: report.findings || "",
      notes: report.notes || "",
      nextVisitDate: report.nextVisitDate,
      followUpDetails: report.followUpDetails || "",
    }))

    return NextResponse.json({
      success: true,
      proceduresAndFindings,
    })
  } catch (error) {
    console.error("[Procedures & Findings GET] Error:", error)
    return NextResponse.json({ error: "Failed to fetch procedures and findings" }, { status: 500 })
  }
}
