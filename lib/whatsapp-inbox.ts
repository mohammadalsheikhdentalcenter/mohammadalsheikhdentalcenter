/**
 * WhatsApp Inbox Utility Functions
 * Handles chat and message operations for the inbox
 */

export interface WhatsAppChatData {
  patientId: string
  patientPhone: string
  patientName: string
  whatsappBusinessPhoneNumberId: string
}

export interface WhatsAppMessageData {
  chatId: string
  patientId: string
  patientPhone: string
  message: string
  messageType?: "text" | "template" | "media" | "interactive"
  whatsappBusinessPhoneNumberId: string
}

/**
 * Fetches all chats for the inbox
 */
export async function fetchChats(token: string, status = "active", search = "", page = 1) {
  const params = new URLSearchParams({
    status,
    page: page.toString(),
    limit: "50",
  })

  if (search) {
    params.append("search", search)
  }

  const response = await fetch(`/api/whatsapp/chats?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error("Failed to fetch chats")
  }

  return response.json()
}

/**
 * Fetches a specific chat with all details
 */
export async function fetchChat(token: string, chatId: string) {
  const response = await fetch(`/api/whatsapp/chats/${chatId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error("Failed to fetch chat")
  }

  return response.json()
}

/**
 * Fetches messages for a specific chat
 */
export async function fetchMessages(token: string, chatId: string, page = 1, limit = 50) {
  const params = new URLSearchParams({
    chatId,
    page: page.toString(),
    limit: limit.toString(),
  })

  const response = await fetch(`/api/whatsapp/messages?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error("Failed to fetch messages")
  }

  return response.json()
}

/**
 * Sends a message to a patient via WhatsApp
 */
export async function sendMessage(token: string, messageData: WhatsAppMessageData) {
  const response = await fetch("/api/whatsapp/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(messageData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to send message")
  }

  return response.json()
}

/**
 * Updates chat status (active, archived, closed)
 */
export async function updateChatStatus(token: string, chatId: string, status: "active" | "archived" | "closed") {
  const response = await fetch(`/api/whatsapp/chats/${chatId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    throw new Error("Failed to update chat status")
  }

  return response.json()
}

/**
 * Checks if message is within 24-hour window
 * WhatsApp allows business to send free template messages within 24 hours of last customer message
 */
export function isWithin24HourWindow(window24HourEndsAt: string | null): boolean {
  if (!window24HourEndsAt) return false
  return new Date(window24HourEndsAt) > new Date()
}

/**
 * Formats message status for display
 */
export function formatMessageStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    sent: "✓ Sent",
    delivered: "✓✓ Delivered",
    read: "✓✓ Read",
    failed: "✗ Failed",
  }
  return statusMap[status] || status
}

/**
 * Formats date for display in chat list
 */
export function formatChatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffMinutes < 1) return "Now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
  if (diffMinutes < 10080) return `${Math.floor(diffMinutes / 1440)}d ago`

  return date.toLocaleDateString()
}

/**
 * Formats phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove country code if present
  if (phone.startsWith("9")) {
    return `+92${phone}`
  }
  return phone.startsWith("+") ? phone : `+${phone}`
}

/**
 * Validates phone number format
 * Expects format like 923391415151 or +923391415151
 */
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?92\d{10}$/
  return phoneRegex.test(phone.replace(/\D/g, ""))
}

/**
 * Extracts core message content for preview
 */
export function getMessagePreview(message: string, length = 60): string {
  if (message.length <= length) return message
  return message.substring(0, length) + "..."
}

/**
 * Check if user has permission to access inbox
 */
export function canAccessInbox(userRole: string): boolean {
  return userRole === "admin" || userRole === "receptionist"
}
