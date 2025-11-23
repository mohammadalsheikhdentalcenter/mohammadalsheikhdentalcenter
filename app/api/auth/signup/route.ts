import { type NextRequest, NextResponse } from "next/server"
import { User, connectDB } from "@/lib/db-server"
import { generateToken } from "@/lib/auth"
import { validateEmail, validatePassword } from "@/lib/validation"
import { sendAccountConfirmation } from "@/lib/whatsapp-service"

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const { username, email, password, name, role, phone, specialty } = await request.json()

    if (role === "admin" || role === "hr") {
      return NextResponse.json(
        {
          error: "Admin and HR accounts cannot be created through signup. Contact system administrator.",
        },
        { status: 403 },
      )
    }

    // Validation
    if (!username || !email || !password || !name || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters with 1 uppercase letter, 1 number, and 1 special character (@$!%*?&)",
        },
        { status: 400 },
      )
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    })

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    const newUser = await User.create({
      username,
      email,
      password,
      name,
      role: role as "doctor" | "receptionist",
      phone,
      specialty: role === "doctor" ? specialty : undefined,
      active: true,
    })

    // Generate token
    const token = generateToken({
      userId: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
    })

    if (phone) {
      const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://dentalcare.app"}/verify?token=${token}`
      const whatsappResult = await sendAccountConfirmation(phone, name, verificationLink)

      if (!whatsappResult.success) {
        console.warn("  WhatsApp notification failed for signup:", whatsappResult.error)
        // Don't fail the signup if WhatsApp fails - log and continue
      } else {
        console.log("  WhatsApp account confirmation sent:", whatsappResult.messageId)
      }
    }

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    })
  } catch (error) {
    console.error("  Signup error:", error)
    return NextResponse.json({ error: "Signup failed" }, { status: 500 })
  }
}
