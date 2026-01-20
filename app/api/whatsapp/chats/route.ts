import { connectDB, WhatsAppChat, User } from "@/lib/db-server"
import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

// Verify user is admin or receptionist
async function verifyAuth(req: NextRequest) {
  const token = req.headers.get("Authorization")?.split(" ")[1]
  if (!token) return null

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const user = await User.findById(decoded.id)
    if (user && (user.role === "admin" || user.role === "receptionist")) {
      return user
    }
    return null
  } catch {
    return null
  }
}

// GET /api/whatsapp/chats - List all chats for inbox
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || "active"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search")

    let query: any = { status }

    if (search) {
      query = {
        ...query,
        $or: [
          { patientName: { $regex: search, $options: "i" } },
          { patientPhone: { $regex: search, $options: "i" } },
        ],
      }
    }

    const total = await WhatsAppChat.countDocuments(query)
    const chats = await WhatsAppChat.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("patientId", "name phones email")

    return NextResponse.json({
      success: true,
      chats,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("[v0] WhatsApp GET chats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/whatsapp/chats - Create new chat (when first message from patient arrives)
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()

    const { patientId, patientPhone, patientName, whatsappBusinessPhoneNumberId } = await req.json()

    if (!patientId || !patientPhone || !patientName || !whatsappBusinessPhoneNumberId) {
      return NextResponse.json(
        { error: "Missing required fields: patientId, patientPhone, patientName, whatsappBusinessPhoneNumberId" },
        { status: 400 },
      )
    }

    // Check if chat already exists
    let chat = await WhatsAppChat.findOne({ patientId, patientPhone })

    if (!chat) {
      chat = await WhatsAppChat.create({
        patientId,
        patientPhone,
        patientName,
        whatsappBusinessPhoneNumberId,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    return NextResponse.json({ success: true, chat }, { status: 201 })
  } catch (error) {
    console.error("[v0] WhatsApp POST chat error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
