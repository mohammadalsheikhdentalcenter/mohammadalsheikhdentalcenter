import { connectDB, WhatsAppMessage, WhatsAppChat, User, Patient } from "@/lib/db-server"
import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || ""
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || ""
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ""
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || ""

// Helper to upload media to WhatsApp Media API (official flow)
async function uploadMediaToWhatsApp(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  phoneNumberId: string,
): Promise<string | null> {
  try {
    const blob = new Blob([buffer], { type: mimeType })
    const formData = new FormData()
    formData.append("file", blob, fileName)
    formData.append("type", mimeType)
    formData.append("messaging_product", "whatsapp")

    const mediaUrl = `${WHATSAPP_API_URL.replace("/messages", "")}/media`
    const response = await fetch(mediaUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || "Media upload failed")
    }

    const data = await response.json()
    return data.id || null // Return the media ID
  } catch (error) {
    console.error("[v0] WhatsApp media upload error:", error)
    return null
  }
}

// Helper to upload media to Cloudinary (for images display)
async function uploadToCloudinary(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string | null> {
  try {
    const blob = new Blob([buffer], { type: mimeType })
    const formData = new FormData()
    formData.append("file", blob, fileName)
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
      {
        method: "POST",
        body: formData,
      },
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || "Upload failed")
    }

    const data = await response.json()
    return data.secure_url || null
  } catch (error) {
    console.error("[v0] Cloudinary upload error:", error)
    return null
  }
}

// ============================
// GET MESSAGES
// ============================
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

    await WhatsAppMessage.updateMany(
      { chatId, senderType: "patient", status: { $in: ["sent", "delivered"] } },
      { status: "read", statusChangedAt: new Date() },
    )

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

// ============================
// POST SEND MESSAGE
// ============================
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

    const user = payload

    // Handle both JSON and FormData
    let chatId: string = ""
    let patientPhone: string = ""
    let message: string = ""
    let messageType: string = "text"
    let whatsappBusinessPhoneNumberId: string = ""
    let mediaType: string | null = null
    let mediaBuffer: Buffer | null = null

    const contentType = req.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      const body = await req.json()
      chatId = body.chatId || ""
      patientPhone = body.patientPhone || ""
      message = body.message || ""
      messageType = body.messageType || "text"
      whatsappBusinessPhoneNumberId = body.whatsappBusinessPhoneNumberId || ""
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      chatId = formData.get("chatId")?.toString() || ""
      patientPhone = formData.get("patientPhone")?.toString() || ""
      message = formData.get("message")?.toString() || ""
      whatsappBusinessPhoneNumberId = formData.get("whatsappBusinessPhoneNumberId")?.toString() || ""
      mediaType = formData.get("mediaType")?.toString() || null

      const mediaFile = formData.get("media") as File | null
      if (mediaFile) {
        messageType = "media"
        mediaBuffer = Buffer.from(await mediaFile.arrayBuffer())
        
        // Auto-detect PDF as document type
        if (mediaFile.type === "application/pdf" || mediaFile.name?.endsWith(".pdf")) {
          mediaType = "document"
        } else if (mediaFile.type.startsWith("image/")) {
          mediaType = "image"
        }
      }
    } else {
      return NextResponse.json({ error: "Invalid content type" }, { status: 400 })
    }

    // Validate required fields - message is optional for media
    if (!chatId || !patientPhone || !whatsappBusinessPhoneNumberId) {
      return NextResponse.json(
        { error: "Missing required fields: chatId, patientPhone, whatsappBusinessPhoneNumberId" },
        { status: 400 },
      )
    }

    // Message is required only for text messages
    if (messageType === "text" && !message) {
      return NextResponse.json(
        { error: "Message text is required for text messages" },
        { status: 400 },
      )
    }

    const chat = await WhatsAppChat.findById(chatId)
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    const normalizedPhone = patientPhone.startsWith("+")
      ? patientPhone
      : `+${patientPhone}`

    // ============================
    // RESOLVE PATIENT SAFELY
    // ============================
    let resolvedPatientId = chat.patientId || null

    if (!resolvedPatientId) {
      const patient = await Patient.findOne({
        "phones.number": normalizedPhone,
      })

      if (patient) {
        resolvedPatientId = patient._id

        await WhatsAppChat.findByIdAndUpdate(chatId, {
          patientId: patient._id,
          patientName: patient.name,
        })
      }
    }

    const now = new Date()
    const window24HourValid = !chat.window24HourEndsAt || now < new Date(chat.window24HourEndsAt)

    // ============================
    // SAVE MESSAGE FIRST
    // ============================
    // Upload media first if present
    let displayMediaUrl: string | null = null
    let whatsappMediaId: string | null = null
    const phoneNumberId = whatsappBusinessPhoneNumberId // Declare phoneNumberId here

    if (mediaBuffer && mediaType) {
      const fileName = `whatsapp-${Date.now()}.${mediaType === "document" ? "pdf" : mediaType}`
      const mimeType = mediaType === "document" ? "application/pdf" : `${mediaType}/*`

      // For images, upload to Cloudinary for display
      if (mediaType === "image") {
        displayMediaUrl = await uploadToCloudinary(mediaBuffer, fileName, mimeType)
      }

      // For documents, upload to WhatsApp Media API following official flow
      if (mediaType === "document") {
        whatsappMediaId = await uploadMediaToWhatsApp(mediaBuffer, fileName, mimeType, phoneNumberId)
        if (whatsappMediaId) {
          displayMediaUrl = whatsappMediaId // Store media ID for retrieval
        }
      }
    }

    // For media-only messages, use a space to satisfy MongoDB requirement
    const messageBody = message || " "

    const messageData: any = {
      chatId,
      patientId: resolvedPatientId,
      patientPhone: normalizedPhone,
      senderType: "business",
      senderName: user.name,
      messageType,
      body: messageBody,
      mediaType,
      mediaUrl: displayMediaUrl,
      mediaData: mediaBuffer || undefined,
      sentBy: user.userId,
      sentByName: user.name,
      window24HourValid,
      status: "sent",
      createdAt: new Date(),
    }

    const messageDoc = await WhatsAppMessage.create(messageData)

    // ============================
    // SEND TO WHATSAPP
    // ============================
    try {
      let payload: any = {
        messaging_product: "whatsapp",
        to: normalizedPhone.replace("+", ""),
        type: "text",
        text: {
          preview_url: true,
          body: message,
        },
      }

      // Handle media messages - send actual media to WhatsApp
      if (messageType === "media" && mediaBuffer && mediaType) {
        // For images with Cloudinary URL
        if (mediaType === "image" && displayMediaUrl) {
          payload = {
            messaging_product: "whatsapp",
            to: normalizedPhone.replace("+", ""),
            type: "image",
            image: {
              link: displayMediaUrl,
              ...(message && { caption: message }),
            },
          }
        }
        // For documents with WhatsApp media ID
        else if (mediaType === "document" && whatsappMediaId) {
          payload = {
            messaging_product: "whatsapp",
            to: normalizedPhone.replace("+", ""),
            type: "document",
            document: {
              id: whatsappMediaId,
              ...(message && { caption: message }),
            },
          }
        }
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
        const cloudinaryUrl = displayMediaUrl // Declare cloudinaryUrl here

        await WhatsAppMessage.findByIdAndUpdate(messageDoc._id, {
          whatsappMessageId,
          mediaUrl: cloudinaryUrl,
          status: "sent",
        })

        await WhatsAppChat.findByIdAndUpdate(chatId, {
          lastMessage: message || `[${mediaType} sent]`,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })

        const updatedMessage = await WhatsAppMessage.findById(messageDoc._id)

        return NextResponse.json(
          {
            success: true,
            message: updatedMessage,
          },
          { status: 201 },
        )
      } else {
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
