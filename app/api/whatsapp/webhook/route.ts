import {
  connectDB,
  WhatsAppMessage,
  WhatsAppChat,
  WhatsAppWebhookLog,
  Patient,
} from "@/lib/db-server";
import { NextRequest, NextResponse } from "next/server";

const WEBHOOK_VERIFY_TOKEN =
  process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "your-webhook-verify-token";

// GET /api/whatsapp/webhook - Verify webhook endpoint
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
      console.log("[v0] WhatsApp Webhook verified successfully");
      return new NextResponse(challenge, { status: 200 });
    }

    console.warn("[v0] WhatsApp Webhook verification failed - invalid token");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("[v0] WhatsApp webhook GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/whatsapp/webhook - Handle incoming messages and status updates
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    console.log(
      "[v0] WhatsApp Webhook received:",
      JSON.stringify(body, null, 2),
    );

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value || {};
        const messages = value.messages || [];
        const statuses = value.statuses || [];

        for (const message of messages) {
          await handleIncomingMessage(message, value);
        }

        for (const status of statuses) {
          await handleStatusUpdate(status);
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[v0] WhatsApp webhook POST error:", error);
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

async function handleIncomingMessage(message: any, valueContext: any) {
  try {
    const messageId = message.id;
    const timestamp = message.timestamp;
    const from = message.from;
    const type = message.type;

    console.log("[v0] Processing incoming message:", {
      messageId,
      from,
      type,
    });

    // Prevent duplicates
    const exists = await WhatsAppMessage.findOne({
      whatsappMessageId: messageId,
    });
    if (exists) {
      console.log("[v0] Duplicate message ignored:", messageId);
      return;
    }

    let messageBody = "";
    let mediaUrl = null;
    let mediaType = null;
    let dbMessageType = "text";

    if (type === "text") {
      messageBody = message.text?.body || "";
      dbMessageType = "text";
    } else if (type === "image") {
      mediaUrl = message.image?.url || message.image?.link || "";
      mediaType = "image";
      // Use caption if available, otherwise use space for DB (won't display in UI)
      messageBody = message.image?.caption || " ";
      dbMessageType = "media";
    } else if (type === "document") {
      mediaUrl = message.document?.url || message.document?.link || "";
      mediaType = "document";
      messageBody = message.document?.filename || " ";
      dbMessageType = "media";
    } else if (type === "audio") {
      mediaUrl = message.audio?.url || message.audio?.link || "";
      mediaType = "audio";
      messageBody = " ";
      dbMessageType = "media";
    } else if (type === "video") {
      mediaUrl = message.video?.url || message.video?.link || "";
      mediaType = "video";
      // Use caption if available, otherwise use space for DB (won't display in UI)
      messageBody = message.video?.caption || " ";
      dbMessageType = "media";
    } else {
      messageBody = `[${type} message received]`;
    }

    // Find or create chat - phone-based, not patient-dependent
    const normalizedPhone = from.startsWith("+") ? from : `+${from}`;

    // Try to find associated patient (optional)
    const patient = await Patient.findOne({
      "phones.number": normalizedPhone,
    }).catch(() => null);

    const patientId = patient?._id || null;
    const patientName = patient?.name || valueContext.contacts?.[0]?.profile?.name || "Unknown Customer";

    // Get WhatsApp profile picture and display name from webhook context
    const whatsappContact = valueContext.contacts?.[0];
    const whatsappProfilePictureUrl = whatsappContact?.profile?.picture_url || null;
    const whatsappDisplayName = whatsappContact?.profile?.name || null;

    // Prepare update data
    const updateData: any = {
      patientId: patientId || undefined,
      patientPhone: normalizedPhone,
      patientName,
      whatsappBusinessPhoneNumberId:
        valueContext.metadata?.phone_number_id || "unknown",
      updatedAt: new Date(),
    };

    // Only add WhatsApp profile data if available
    if (whatsappProfilePictureUrl) {
      updateData.whatsappProfilePictureUrl = whatsappProfilePictureUrl;
    }
    if (whatsappDisplayName) {
      updateData.whatsappDisplayName = whatsappDisplayName;
    }

    let chat = await WhatsAppChat.findOneAndUpdate(
      { patientPhone: normalizedPhone },
      {
        $setOnInsert: {
          unreadCount: 0,
          lastMessage: "",
          lastMessageAt: null,
          createdAt: new Date(),
        },
        $set: updateData,
      },
      {
        new: true,
        upsert: true,
      },
    );

    console.log("[v0] Chat resolved:", chat._id);

    // Handle quoted/replied messages
    const quotedMessage = message.context?.id ? await WhatsAppMessage.findOne({
      whatsappMessageId: message.context.id
    }) : null;

    const messageDoc = await WhatsAppMessage.create({
      chatId: chat._id,
      patientId: chat.patientId || null,
      patientPhone: from,
      senderType: "patient",
      senderName: whatsappDisplayName || "Customer",
      messageType: dbMessageType,
      body: messageBody,
      mediaUrl,
      mediaType,
      whatsappMessageId: messageId,
      quotedMessageId: quotedMessage?._id || null,
      quotedMessageBody: quotedMessage?.body || null,
      quotedMediaUrl: quotedMessage?.mediaUrl || null,
      quotedMediaType: quotedMessage?.mediaType || null,
      status: "delivered",
      createdAt: new Date(parseInt(timestamp) * 1000),
    });

    await WhatsAppChat.findByIdAndUpdate(chat._id, {
      lastMessage: messageBody.substring(0, 100),
      lastMessageAt: new Date(),
      unreadCount: (chat.unreadCount || 0) + 1,
      updatedAt: new Date(),
    });

    const now = new Date();
    const window24HourEndsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await WhatsAppChat.findByIdAndUpdate(chat._id, {
      window24HourEndsAt,
      lastTemplateMessageAt: now,
    });

    await WhatsAppWebhookLog.create({
      event: "message_received",
      patientPhone: from,
      whatsappMessageId: messageId,
      payload: message,
      processed: true,
      processedAt: new Date(),
    });

    console.log("[v0] Incoming message processed:", {
      chatId: chat._id,
      messageId,
      from,
    });
  } catch (error) {
    console.error("[v0] Error handling incoming message:", error);
  }
}

async function handleStatusUpdate(status: any) {
  try {
    const messageId = status.id;
    const statusValue = status.status;
    const timestamp = status.timestamp;
    const recipientId = status.recipient_id;

    console.log("[v0] Processing status update:", {
      messageId,
      statusValue,
      recipientId,
    });

    const message = await WhatsAppMessage.findOneAndUpdate(
      { whatsappMessageId: messageId },
      {
        status: statusValue,
        statusChangedAt: new Date(parseInt(timestamp) * 1000),
      },
      { new: true },
    );

    if (message) {
      console.log("[v0] Message status updated:", {
        messageId,
        newStatus: statusValue,
      });

      await WhatsAppWebhookLog.create({
        event: `message_${statusValue}`,
        patientPhone: recipientId,
        whatsappMessageId: messageId,
        payload: status,
        processed: true,
        processedAt: new Date(),
      });
    } else {
      console.warn(
        `[v0] Message with WhatsApp ID ${messageId} not found for status update`,
      );
    }
  } catch (error) {
    console.error("[v0] Error handling status update:", error);
  }
}
