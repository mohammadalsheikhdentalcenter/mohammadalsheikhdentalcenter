import { connectDB, WhatsAppMessage, WhatsAppChat, WhatsAppWebhookLog, Patient } from "@/lib/db-server"
import { NextRequest, NextResponse } from "next/server"

const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "your-webhook-verify-token"

// GET /api/whatsapp/webhook - Verify webhook endpoint
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const mode = searchParams.get("hub.mode")
    const token = searchParams.get("hub.verify_token")
    const challenge = searchParams.get("hub.challenge")

    if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
      console.log("[v0] WhatsApp Webhook verified successfully")
      return new NextResponse(challenge, { status: 200 })
    }

    console.warn("[v0] WhatsApp Webhook verification failed - invalid token")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  } catch (error) {
    console.error("[v0] WhatsApp webhook GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/whatsapp/webhook - Handle incoming messages and status updates
export async function POST(req: NextRequest) {
  try {
    await connectDB()

    const body = await req.json()
    console.log("[v0] WhatsApp Webhook received:", JSON.stringify(body, null, 2))

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ success: true }, { status: 200 })
    }

    const entries = body.entry || []

    for (const entry of entries) {
      const changes = entry.changes || []

      for (const change of changes) {
        const value = change.value || {}
        const messages = value.messages || []
        const statuses = value.statuses || []

        for (const message of messages) {
          await handleIncomingMessage(message, value)
        }

        for (const status of statuses) {
          await handleStatusUpdate(status)
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[v0] WhatsApp webhook POST error:", error)
    return NextResponse.json({ success: true }, { status: 200 })
  }
}

async function handleIncomingMessage(message: any, valueContext: any) {
  try {
    const messageId = message.id
    const timestamp = message.timestamp
    const from = message.from
    const type = message.type

    console.log("[v0] Processing incoming message:", {
      messageId,
      from,
      type,
    })

    // Prevent duplicates
    const exists = await WhatsAppMessage.findOne({ whatsappMessageId: messageId })
    if (exists) {
      console.log("[v0] Duplicate message ignored:", messageId)
      return
    }

    let messageBody = ""
    let mediaUrl = null
    let mediaType = null

    if (type === "text") {
      messageBody = message.text?.body || ""
    } else if (type === "image") {
      mediaUrl = message.image?.link || ""
      mediaType = "image"
      messageBody = message.image?.caption || "[Image received]"
    } else if (type === "document") {
      mediaUrl = message.document?.link || ""
      mediaType = "document"
      messageBody = message.document?.filename || "[Document received]"
    } else if (type === "audio") {
      mediaUrl = message.audio?.link || ""
      mediaType = "audio"
      messageBody = "[Audio message received]"
    } else if (type === "video") {
      mediaUrl = message.video?.link || ""
      mediaType = "video"
      messageBody = message.video?.caption || "[Video received]"
    } else {
      messageBody = `[${type} message received]`
    }

    // Find or create chat (ONLY CHANGE HERE)
    let chat = await WhatsAppChat.findOne({ patientPhone: from })

if (!chat) {
  console.log(`[v0] Creating new chat for phone ${from}`)

  const normalizedPhone = from.startsWith("+") ? from : `+${from}`

  const patient = await Patient.findOne({
    "phones.number": normalizedPhone,
  })

  chat = await WhatsAppChat.create({
    patientPhone: normalizedPhone,
    patientId: patient?._id || null,
    patientName: patient?.name || "Unknown Patient",
    whatsappBusinessPhoneNumberId:
      valueContext.metadata?.phone_number_id || "unknown",

    unreadCount: 0,
    lastMessage: "",
    lastMessageAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}


    const messageDoc = await WhatsAppMessage.create({
      chatId: chat._id,
      patientId: chat.patientId,
      patientPhone: from,
      senderType: "patient",
      messageType: type,
      body: messageBody,
      mediaUrl,
      mediaType,
      whatsappMessageId: messageId,
      status: "delivered",
      createdAt: new Date(parseInt(timestamp) * 1000),
    })

    await WhatsAppChat.findByIdAndUpdate(chat._id, {
      lastMessage: messageBody.substring(0, 100),
      lastMessageAt: new Date(),
      unreadCount: (chat.unreadCount || 0) + 1,
      updatedAt: new Date(),
    })

    const now = new Date()
    const window24HourEndsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    await WhatsAppChat.findByIdAndUpdate(chat._id, {
      window24HourEndsAt,
      lastTemplateMessageAt: now,
    })

    await WhatsAppWebhookLog.create({
      event: "message_received",
      patientPhone: from,
      whatsappMessageId: messageId,
      payload: message,
      processed: true,
      processedAt: new Date(),
    })

    console.log("[v0] Incoming message processed:", {
      chatId: chat._id,
      messageId,
      from,
    })
  } catch (error) {
    console.error("[v0] Error handling incoming message:", error)
  }
}

async function handleStatusUpdate(status: any) {
  try {
    const messageId = status.id
    const statusValue = status.status
    const timestamp = status.timestamp
    const recipientId = status.recipient_id

    console.log("[v0] Processing status update:", {
      messageId,
      statusValue,
      recipientId,
    })

    const message = await WhatsAppMessage.findOneAndUpdate(
      { whatsappMessageId: messageId },
      {
        status: statusValue,
        statusChangedAt: new Date(parseInt(timestamp) * 1000),
      },
      { new: true },
    )

    if (message) {
      console.log("[v0] Message status updated:", {
        messageId,
        newStatus: statusValue,
      })

      await WhatsAppWebhookLog.create({
        event: `message_${statusValue}`,
        patientPhone: recipientId,
        whatsappMessageId: messageId,
        payload: status,
        processed: true,
        processedAt: new Date(),
      })
    } else {
      console.warn(`[v0] Message with WhatsApp ID ${messageId} not found for status update`)
    }
  } catch (error) {
    console.error("[v0] Error handling status update:", error)
  }
}
