"use client"

import React from "react"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/components/auth-context"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { AlertCircle, Send, ArrowLeft, Clock } from "lucide-react"
import Link from "next/link"

interface Message {
  _id: string
  senderType: "patient" | "business"
  senderName: string
  body: string
  status: "sent" | "delivered" | "read" | "failed"
  window24HourValid: boolean
  createdAt: string
}

interface Chat {
  _id: string
  patientName: string
  patientPhone: string
  lastMessageAt: string
  window24HourEndsAt: string | null
}

export default function ChatThreadPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const chatId = params?.chatId as string

  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [messageText, setMessageText] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "admin" && user.role !== "receptionist"))) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!authLoading && user && chatId) {
      fetchMessages()
      const interval = setInterval(() => {
        fetchMessages()
      }, 3000) // Poll every 3 seconds for new messages

      return () => clearInterval(interval)
    }
  }, [authLoading, user, chatId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const token = sessionStorage.getItem("token")
      const response = await fetch(`/api/whatsapp/messages?chatId=${chatId}&limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error("Failed to fetch messages")

      const data = await response.json()
      setMessages(data.messages || [])

      // Fetch chat info
      const chatsResponse = await fetch(`/api/whatsapp/chats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (chatsResponse.ok) {
        const chatsData = await chatsResponse.json()
        const foundChat = chatsData.chats?.find((c: Chat) => c._id === chatId)
        if (foundChat) {
          setChat(foundChat)
        }
      }

      setError("")
    } catch (err) {
      console.error("[v0] Error fetching messages:", err)
      if (!messages.length) {
        setError(err instanceof Error ? err.message : "Failed to load messages")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!messageText.trim() || !chat) return

    try {
      setSending(true)
      setError("")

      const token = sessionStorage.getItem("token")
      const response = await fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatId,
          patientId: chat.patientName, // Use name as placeholder
          patientPhone: chat.patientPhone,
          message: messageText,
          messageType: "text",
          whatsappBusinessPhoneNumberId: "default",
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || "Failed to send message")
      }

      const data = await response.json()
      setMessages([...messages, data.message])
      setMessageText("")
      scrollToBottom()
    } catch (err) {
      console.error("[v0] Error sending message:", err)
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const isWindow24HourValid = chat?.window24HourEndsAt ? new Date(chat.window24HourEndsAt) > new Date() : false

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    )
  }

  if (!chat) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">Chat not found</p>
            <Link href="/dashboard/inbox">
              <Button variant="outline">Back to Inbox</Button>
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <Link href="/dashboard/inbox">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>

        <div className="flex-1 ml-4">
          <h2 className="text-lg font-semibold text-foreground">{chat.patientName}</h2>
          <p className="text-sm text-muted-foreground">{chat.patientPhone}</p>
        </div>

        {/* 24-hour window indicator */}
        {!isWindow24HourValid && (
          <div className="flex items-center gap-2 text-warning bg-warning/10 px-3 py-1 rounded">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">Outside 24h</span>
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg._id}
              className={`flex ${msg.senderType === "business" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.senderType === "business"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-muted text-foreground rounded-bl-none"
                }`}
              >
                <p className="text-sm mb-1">{msg.body}</p>

                <div className={`flex items-center gap-2 ${msg.senderType === "business" ? "justify-end" : ""}`}>
                  <p className="text-xs opacity-75">{formatTime(msg.createdAt)}</p>

                  {msg.senderType === "business" && (
                    <p className="text-xs opacity-75">
                      {msg.status === "read" && "✓✓"}
                      {msg.status === "delivered" && "✓✓"}
                      {msg.status === "sent" && "✓"}
                      {msg.status === "failed" && "✗"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {!isWindow24HourValid && messages.some((m) => m.senderType === "patient") && (
        <div className="bg-warning/10 border-t border-warning/20 p-3">
          <p className="text-xs text-warning font-medium">
            Outside 24-hour window. Only template messages are allowed.
          </p>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="bg-card border-t border-border p-4 flex gap-2">
        <Input
          placeholder="Type your message..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          disabled={sending}
          className="flex-1"
        />

        <Button type="submit" disabled={sending || !messageText.trim()} size="icon">
          {sending ? <Spinner /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  )
}
