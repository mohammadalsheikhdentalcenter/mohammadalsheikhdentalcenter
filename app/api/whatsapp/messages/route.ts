import { connectDB, WhatsAppMessage, WhatsAppChat, User } from "@/lib/db-server"
import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || ""
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || ""



// GET /api/whatsapp/messages?chatId=xxx - Get messages for a chat
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url)
    const chatId = searchParams.get("chatId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required" }, { status: 400 })
    }

    const total = await WhatsAppMessage.countDocuments({ chatId })
    const messages = await WhatsAppMessage.find({ chatId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    // Mark messages as read
    await WhatsAppMessage.updateMany(
      { chatId, senderType: "patient", status: { $in: ["sent", "delivered"] } },
      { status: "read", statusChangedAt: new Date() },
    )

    // Update chat unread count
    const unreadCount = await WhatsAppMessage.countDocuments({
      chatId,
      senderType: "patient",
      status: { $in: ["sent", "delivered"] },
    })

    await WhatsAppChat.findByIdAndUpdate(chatId, { unreadCount })

    return NextResponse.json({
      success: true,
      messages: messages.reverse(),
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error("[v0] WhatsApp GET messages error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/whatsapp/messages - Send message to patient via WhatsApp Cloud API
export async function POST(req: NextRequest) {
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

  const user = verifyToken(token!)

    const {
      chatId,
      patientId,
      patientPhone,
      message,
      messageType = "text",
      whatsappBusinessPhoneNumberId,
    } = await req.json()

    if (!chatId || !patientPhone || !message || !whatsappBusinessPhoneNumberId) {
      return NextResponse.json(
        { error: "Missing required fields: chatId, patientPhone, message, whatsappBusinessPhoneNumberId" },
        { status: 400 },
      )
    }

    // Check 24-hour window
    const chat = await WhatsAppChat.findById(chatId)
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    const now = new Date()
    const window24HourValid = !chat.window24HourEndsAt || now < new Date(chat.window24HourEndsAt)

    // Save message to database FIRST
    const messageDoc = await WhatsAppMessage.create({
      chatId,
      patientId,
      patientPhone,
      senderType: "business",
      senderName: user.name,
      messageType,
      body: message,
      sentBy: user._id,
      sentByName: user.name,
      window24HourValid,
      status: "sent",
      createdAt: new Date(),
    })

    // Send via WhatsApp Cloud API
    try {
      const payload = {
        messaging_product: "whatsapp",
        to: patientPhone,
        type: "text",
        text: {
          preview_url: true,
          body: message,
        },
      }

      const response = await fetch(WHATSAPP_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok && data.messages?.[0]?.id) {
        const whatsappMessageId = data.messages[0].id

        // Update message with WhatsApp ID
        await WhatsAppMessage.findByIdAndUpdate(messageDoc._id, {
          whatsappMessageId,
          status: "sent",
        })

        // Update chat
        await WhatsAppChat.findByIdAndUpdate(chatId, {
          lastMessage: message,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })

        return NextResponse.json(
          {
            success: true,
            message: {
              ...messageDoc.toObject(),
              whatsappMessageId,
            },
          },
          { status: 201 },
        )
      } else {
        // Update message status to failed
        await WhatsAppMessage.findByIdAndUpdate(messageDoc._id, {
          status: "failed",
          errorMessage: data.error?.message || "Failed to send message",
          statusChangedAt: new Date(),
        })

        return NextResponse.json(
          {
            success: false,
            error: data.error?.message || "Failed to send message via WhatsApp",
            message: messageDoc,
          },
          { status: 400 },
        )
      }
    } catch (error) {
      console.error("[v0] WhatsApp API error:", error)

      // Update message status to failed
      await WhatsAppMessage.findByIdAndUpdate(messageDoc._id, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Network error",
        statusChangedAt: new Date(),
      })

      return NextResponse.json(
        {
          success: false,
          error: "Failed to send message",
          message: messageDoc,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] WhatsApp POST message error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
