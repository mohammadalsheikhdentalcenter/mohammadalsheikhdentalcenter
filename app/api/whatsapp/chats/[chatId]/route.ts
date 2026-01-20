import { connectDB, WhatsAppChat, WhatsAppMessage, User } from "@/lib/db-server"
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

// GET /api/whatsapp/chats/[chatId] - Get specific chat with all details
export async function GET(req: NextRequest, { params }: { params: { chatId: string } }) {
  try {
    const user = await verifyAuth(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()

    const { chatId } = params

    const chat = await WhatsAppChat.findById(chatId).populate("patientId", "name phones email")

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    // Get message statistics
    const messageCount = await WhatsAppMessage.countDocuments({ chatId })
    const unreadCount = await WhatsAppMessage.countDocuments({
      chatId,
      senderType: "patient",
      status: { $in: ["sent", "delivered"] },
    })

    // Get 24-hour window status
    const now = new Date()
    const window24HourValid = !chat.window24HourEndsAt || new Date(chat.window24HourEndsAt) > now

    return NextResponse.json({
      success: true,
      chat: {
        ...chat.toObject(),
        messageCount,
        unreadCount,
        window24HourValid,
        window24HourEndsAt: chat.window24HourEndsAt,
      },
    })
  } catch (error) {
    console.error("[v0] WhatsApp GET chat detail error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/whatsapp/chats/[chatId] - Update chat status
export async function PATCH(req: NextRequest, { params }: { params: { chatId: string } }) {
  try {
    const user = await verifyAuth(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()

    const { chatId } = params
    const { status } = await req.json()

    if (!status || !["active", "archived", "closed"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: active, archived, closed" },
        { status: 400 },
      )
    }

    const chat = await WhatsAppChat.findByIdAndUpdate(chatId, { status }, { new: true })

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      chat,
    })
  } catch (error) {
    console.error("[v0] WhatsApp PATCH chat error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
