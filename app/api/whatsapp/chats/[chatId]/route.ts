import { connectDB, WhatsAppChat, WhatsAppMessage, User } from "@/lib/db-server"
import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"


// Verify user is admin or receptionist


// GET /api/whatsapp/chats/[chatId] - Get specific chat with all details
export async function GET(req: NextRequest, { params }: { params: { chatId: string } }) {
  try {
    await connectDB()
        const token = req.headers.get("authorization")?.split(" ")[1]
    
        if (!token) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
    
        const payload = verifyToken(token)
        if (!payload) {
          return NextResponse.json({ error: "Invalid token" }, { status: 401 })
        }
    
        if (payload.role !== "admin" && payload.role !== "receptionist") {
          return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }

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
     await connectDB()
        const token = req.headers.get("authorization")?.split(" ")[1]
    
        if (!token) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
    
        const payload = verifyToken(token)
        if (!payload) {
          return NextResponse.json({ error: "Invalid token" }, { status: 401 })
        }
    
        if (payload.role !== "admin" && payload.role !== "receptionist") {
          return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }


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
