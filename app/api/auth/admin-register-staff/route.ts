import { type NextRequest, NextResponse } from "next/server"
import { connectDB, User } from "@/lib/db-server"
import { sendStaffCredentials } from "@/lib/email"
import { verifyToken } from "@/lib/auth"

function generateSecurePassword(length = 12): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const lowercase = "abcdefghijklmnopqrstuvwxyz"
  const numbers = "0123456789"
  const special = "!@#$%^&*"
  const all = uppercase + lowercase + numbers + special

  let password = ""
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("")
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const userId = payload.userId

    const { name, email, phone, role, specialty } = await request.json()

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 })
    }

    // Verify admin or HR authorization
    const currentUser = await User.findById(userId)
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "hr")) {
      return NextResponse.json({ error: "Unauthorized: Only admins and HR can register staff" }, { status: 403 })
    }

    // HR users cannot create admin users
    if (currentUser.role === "hr" && role === "admin") {
      return NextResponse.json({ error: "Unauthorized: HR cannot create admin users" }, { status: 403 })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    // Generate secure password
    const generatedPassword = generateSecurePassword()

    const newUser = new User({
      email,
      password: generatedPassword,
      name,
      role,
      phone: phone || "",
      specialty: specialty || "",
      active: true,
    })

    await newUser.save()

    // Send credentials email
    try {
      await sendStaffCredentials(email, name, generatedPassword, role)
      console.log("[v0] Staff credentials email sent successfully to:", email)
    } catch (emailError) {
      console.error("[v0] Failed to send staff credentials email:", emailError)
      // Don't fail the registration if email fails, but log it
      console.warn(
        "[v0] Staff registered but email delivery failed. Check EMAIL_USER and EMAIL_PASS environment variables.",
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Staff member registered successfully. Credentials sent to email.",
        user: {
          id: newUser._id,
          email: newUser.email,
          role: newUser.role,
          name: newUser.name,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] Error registering staff:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to register staff member"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
