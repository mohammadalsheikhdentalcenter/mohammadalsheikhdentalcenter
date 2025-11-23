import { NextResponse } from "next/server"
import { User, connectDB } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { sendStaffCredentials } from "@/lib/email"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB()

    const token = request.headers.get("authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || (payload.role !== "admin" && payload.role !== "hr")) {
      return NextResponse.json({ error: "Unauthorized - Admin or HR access required" }, { status: 403 })
    }

    const { id } = params

    // Find the staff member
    const staffMember = await User.findById(id)
    if (!staffMember) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 })
    }

    // Generate a new random password
    const newPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10).toUpperCase()
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update the password
    staffMember.password = hashedPassword
    await staffMember.save()

    // Send the new credentials via email
    try {
      await sendStaffCredentials(staffMember.email, staffMember.name, staffMember.role, newPassword)
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError)
      return NextResponse.json(
        {
          error: "Password reset but failed to send email. Please check email configuration.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. New credentials sent to staff member's email.",
    })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
  }
}
