# WhatsApp Inbox - Code Examples

## Common Operations

### 1. Fetch All Chats

**Frontend Code:**
\`\`\`typescript
import { fetchChats } from "@/lib/whatsapp-inbox"

async function loadChats() {
  try {
    const token = sessionStorage.getItem("token")
    const data = await fetchChats(token, "active", "", 1)
    console.log("Chats loaded:", data.chats)
  } catch (error) {
    console.error("Error:", error.message)
  }
}
\`\`\`

**cURL:**
\`\`\`bash
curl -X GET "http://localhost:3000/api/whatsapp/chats?status=active&page=1&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
\`\`\`

### 2. Send Message to Patient

**Frontend Code:**
\`\`\`typescript
import { sendMessage } from "@/lib/whatsapp-inbox"

async function sendPatientMessage(chatId: string) {
  try {
    const token = sessionStorage.getItem("token")
    
    const result = await sendMessage(token, {
      chatId,
      patientId: "patient_id",
      patientPhone: "+923391415151",
      message: "Your appointment is confirmed for tomorrow at 10 AM",
      messageType: "text",
      whatsappBusinessPhoneNumberId: "102345678901234567",
    })
    
    console.log("Message sent:", result.message)
  } catch (error) {
    console.error("Error:", error.message)
  }
}
\`\`\`

**cURL:**
\`\`\`bash
curl -X POST "http://localhost:3000/api/whatsapp/messages" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "60d5ec49c1234567890abcde",
    "patientId": "60d5ec49c1234567890abcdf",
    "patientPhone": "+923391415151",
    "message": "Your appointment is confirmed for tomorrow at 10 AM",
    "messageType": "text",
    "whatsappBusinessPhoneNumberId": "102345678901234567"
  }'
\`\`\`

### 3. Fetch Chat Messages

**Frontend Code:**
\`\`\`typescript
import { fetchMessages } from "@/lib/whatsapp-inbox"

async function loadMessages(chatId: string) {
  try {
    const token = sessionStorage.getItem("token")
    const data = await fetchMessages(token, chatId, 1, 50)
    
    console.log(`Total messages: ${data.total}`)
    data.messages.forEach(msg => {
      console.log(`${msg.senderType}: ${msg.body}`)
    })
  } catch (error) {
    console.error("Error:", error.message)
  }
}
\`\`\`

**cURL:**
\`\`\`bash
curl -X GET "http://localhost:3000/api/whatsapp/messages?chatId=60d5ec49c1234567890abcde&page=1&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
\`\`\`

### 4. Create New Chat

**Frontend Code:**
\`\`\`typescript
async function createChat(token: string, patientData: any) {
  try {
    const response = await fetch("/api/whatsapp/chats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        patientId: patientData._id,
        patientPhone: patientData.phones[0].number,
        patientName: patientData.name,
        whatsappBusinessPhoneNumberId: "102345678901234567",
      }),
    })

    const data = await response.json()
    console.log("Chat created:", data.chat._id)
    return data.chat
  } catch (error) {
    console.error("Error:", error)
  }
}
\`\`\`

**cURL:**
\`\`\`bash
curl -X POST "http://localhost:3000/api/whatsapp/chats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "60d5ec49c1234567890abcde",
    "patientPhone": "923391415151",
    "patientName": "Ahmed Khan",
    "whatsappBusinessPhoneNumberId": "102345678901234567"
  }'
\`\`\`

### 5. Update Chat Status

**Frontend Code:**
\`\`\`typescript
import { updateChatStatus } from "@/lib/whatsapp-inbox"

async function archiveChat(chatId: string) {
  try {
    const token = sessionStorage.getItem("token")
    const result = await updateChatStatus(token, chatId, "archived")
    console.log("Chat archived:", result.chat)
  } catch (error) {
    console.error("Error:", error.message)
  }
}

async function closeChat(chatId: string) {
  try {
    const token = sessionStorage.getItem("token")
    const result = await updateChatStatus(token, chatId, "closed")
    console.log("Chat closed:", result.chat)
  } catch (error) {
    console.error("Error:", error.message)
  }
}
\`\`\`

**cURL:**
\`\`\`bash
curl -X PATCH "http://localhost:3000/api/whatsapp/chats/60d5ec49c1234567890abcde" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "archived"}'
\`\`\`

### 6. Get Chat Details

**Frontend Code:**
\`\`\`typescript
import { fetchChat } from "@/lib/whatsapp-inbox"

async function getChatDetails(chatId: string) {
  try {
    const token = sessionStorage.getItem("token")
    const data = await fetchChat(token, chatId)
    
    console.log("Chat details:", {
      name: data.chat.patientName,
      phone: data.chat.patientPhone,
      messages: data.chat.messageCount,
      unread: data.chat.unreadCount,
      window24HourValid: data.chat.window24HourValid,
    })
  } catch (error) {
    console.error("Error:", error.message)
  }
}
\`\`\`

**cURL:**
\`\`\`bash
curl -X GET "http://localhost:3000/api/whatsapp/chats/60d5ec49c1234567890abcde" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
\`\`\`

## React Component Examples

### Chat List Component

\`\`\`typescript
"use client"

import { useEffect, useState } from "react"
import { fetchChats } from "@/lib/whatsapp-inbox"
import { useAuth } from "@/components/auth-context"

export function ChatList() {
  const { user } = useAuth()
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadChats = async () => {
      try {
        const token = sessionStorage.getItem("token")
        const data = await fetchChats(token, "active")
        setChats(data.chats)
      } catch (error) {
        console.error("Error loading chats:", error)
      } finally {
        setLoading(false)
      }
    }

    loadChats()
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadChats, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div>Loading chats...</div>

  return (
    <div className="space-y-2">
      {chats.map((chat) => (
        <div key={chat._id} className="p-4 border rounded-lg hover:bg-gray-50">
          <h3 className="font-semibold">{chat.patientName}</h3>
          <p className="text-sm text-gray-600">{chat.patientPhone}</p>
          <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
          {chat.unreadCount > 0 && (
            <span className="inline-block mt-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
              {chat.unreadCount} unread
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
\`\`\`

### Message Input Component

\`\`\`typescript
"use client"

import { useState } from "react"
import { sendMessage } from "@/lib/whatsapp-inbox"

export function MessageInput({ chatId, patientId, patientPhone }: any) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) return

    try {
      setSending(true)
      const token = sessionStorage.getItem("token")

      await sendMessage(token, {
        chatId,
        patientId,
        patientPhone,
        message,
        whatsappBusinessPhoneNumberId: "102345678901234567",
      })

      setMessage("")
      console.log("Message sent!")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Type your message..."
        disabled={sending}
        className="flex-1 p-2 border rounded-lg"
      />
      <button
        onClick={handleSend}
        disabled={sending || !message.trim()}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send"}
      </button>
    </div>
  )
}
\`\`\`

## Webhook Handler Example

\`\`\`typescript
// Handle incoming message from patient
async function handleIncomingMessage(message: any, valueContext: any) {
  const messageId = message.id
  const from = message.from
  const body = message.text?.body || ""

  // Find existing chat or create new one
  let chat = await WhatsAppChat.findOne({ patientPhone: from })

  if (!chat) {
    // Create new chat
    chat = await WhatsAppChat.create({
      patientPhone: from,
      patientName: `Patient ${from}`, // You might fetch from patient DB
      whatsappBusinessPhoneNumberId: valueContext.phone_number_id,
      messageCount: 0,
      unreadCount: 0,
    })
  }

  // Save message
  const messageDoc = await WhatsAppMessage.create({
    chatId: chat._id,
    patientPhone: from,
    senderType: "patient",
    body,
    whatsappMessageId: messageId,
    status: "delivered",
  })

  // Update chat
  await WhatsAppChat.findByIdAndUpdate(chat._id, {
    lastMessage: body.substring(0, 100),
    lastMessageAt: new Date(),
    unreadCount: (chat.unreadCount || 0) + 1,
    window24HourEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })

  console.log(`[v0] Message received from ${from}: ${body}`)
}
\`\`\`

## Database Queries

### Find all unread messages

\`\`\`javascript
db.whatsappmessages.find({
  senderType: "patient",
  status: { $in: ["sent", "delivered"] }
})
\`\`\`

### Get chat statistics

\`\`\`javascript
db.whatsappmessages.aggregate([
  {
    $group: {
      _id: "$chatId",
      messageCount: { $sum: 1 },
      lastMessage: { $max: "$createdAt" }
    }
  }
])
\`\`\`

### Find failed messages

\`\`\`javascript
db.whatsappmessages.find({
  status: "failed"
}).sort({ createdAt: -1 })
\`\`\`

### List chats outside 24-hour window

\`\`\`javascript
db.whatsappchat.find({
  window24HourEndsAt: { $lt: new Date() }
})
\`\`\`

## Error Handling

\`\`\`typescript
async function sendMessageSafely(chatId: string, message: string) {
  try {
    const token = sessionStorage.getItem("token")
    
    const result = await sendMessage(token, {
      chatId,
      patientId: "...",
      patientPhone: "...",
      message,
      whatsappBusinessPhoneNumberId: "...",
    })

    if (!result.success) {
      throw new Error(result.error || "Failed to send message")
    }

    return result.message
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Unauthorized")) {
        // Redirect to login
        window.location.href = "/login"
      } else if (error.message.includes("24-hour")) {
        // Show warning about window
        console.warn("Message sent outside 24-hour window - using template messaging")
      } else {
        console.error("Error:", error.message)
      }
    }
  }
}
\`\`\`

## Testing

### Unit Test Example

\`\`\`typescript
import { describe, it, expect, beforeEach } from "vitest"
import { fetchChats, sendMessage } from "@/lib/whatsapp-inbox"

describe("WhatsApp Inbox", () => {
  let token: string

  beforeEach(() => {
    token = "test-token-123"
  })

  it("should fetch chats", async () => {
    const result = await fetchChats(token, "active")
    expect(result.chats).toBeDefined()
    expect(Array.isArray(result.chats)).toBe(true)
  })

  it("should send message", async () => {
    const result = await sendMessage(token, {
      chatId: "test-chat-id",
      patientId: "test-patient-id",
      patientPhone: "+923391415151",
      message: "Test message",
      whatsappBusinessPhoneNumberId: "123456",
    })
    expect(result.success).toBe(true)
  })
})
\`\`\`

## Performance Tips

### 1. Implement Pagination in Chat List
\`\`\`typescript
const limit = 20 // Load 20 chats at a time
const page = 1
const response = await fetch(
  `/api/whatsapp/chats?limit=${limit}&page=${page}`
)
\`\`\`

### 2. Cache Message List
\`\`\`typescript
const [messagesCache, setMessagesCache] = useState({})

async function getMessages(chatId: string) {
  if (messagesCache[chatId]) {
    return messagesCache[chatId]
  }
  const data = await fetchMessages(token, chatId)
  setMessagesCache(prev => ({...prev, [chatId]: data}))
  return data
}
\`\`\`

### 3. Debounce Search
\`\`\`typescript
import { useCallback } from "react"

const debouncedSearch = useCallback(
  debounce((query: string) => {
    searchChats(query)
  }, 300),
  []
)
\`\`\`
