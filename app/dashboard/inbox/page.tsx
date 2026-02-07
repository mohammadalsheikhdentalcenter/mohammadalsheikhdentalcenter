"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-context"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { AlertCircle, MessageCircle } from "lucide-react"
import WhatsAppChatSidebar from "@/components/whatsapp-chat-sidebar"

interface Chat {
  _id: string
  patientName: string
  patientPhone: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

export default function InboxPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "admin" && user.role !== "receptionist"))) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!authLoading && user) {
      fetchChats()
      const interval = setInterval(fetchChats, 5000)
      return () => clearInterval(interval)
    }
  }, [authLoading, user, search])

  const fetchChats = async () => {
    try {
      setLoading(true)
      setError("")

      const token = sessionStorage.getItem("token")
      const params = new URLSearchParams({
        status: "active",
        page: "1",
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

      const data = await response.json()
      setChats(data.chats || [])
    } catch (err) {
      console.error("[v0] Error fetching chats:", err)
      if (!chats.length) {
        setError(err instanceof Error ? err.message : "Failed to load chats")
      }
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <WhatsAppChatSidebar
        chats={chats}
        onSearchChange={setSearch}
        searchValue={search}
        loading={loading}
      />

      {/* Main Area */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-gray-50">
        {error ? (
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">{error}</p>
          </div>
        ) : (
          <div className="text-center">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">WhatsApp Messages</h2>
            <p className="text-gray-400">Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  )
}
