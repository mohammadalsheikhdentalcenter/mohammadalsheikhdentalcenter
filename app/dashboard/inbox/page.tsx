"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { AlertCircle, Search, MessageCircle } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import Loading from "./loading"

interface Chat {
  _id: string
  patientName: string
  patientPhone: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  messageCount: number
  status: string
}

export default function InboxPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState(searchParams?.get("search") || "")
  const [filter, setFilter] = useState(searchParams?.get("status") || "active")

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "admin" && user.role !== "receptionist"))) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!authLoading && user) {
      fetchChats()
    }
  }, [authLoading, user, filter, search])

  const fetchChats = async () => {
    try {
      setLoading(true)
      setError("")

      const token = sessionStorage.getItem("token")
      const params = new URLSearchParams({
        status: filter,
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
      setError(err instanceof Error ? err.message : "Failed to load chats")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffMinutes < 1) return "Now"
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">WhatsApp Inbox</h1>
          </div>
          <p className="text-muted-foreground">Manage patient conversations via WhatsApp</p>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search patient name or phone..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            {["active", "archived", "closed"].map((status) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                onClick={() => {
                  setFilter(status)
                  setSearch("")
                }}
                className="capitalize"
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}

        {/* Chat List */}
        {!loading && chats.length === 0 && (
          <Card className="p-12 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No chats found</p>
          </Card>
        )}

        {!loading && chats.length > 0 && (
          <div className="space-y-2">
            {chats.map((chat) => (
              <Link key={chat._id} href={`/dashboard/inbox/${chat._id}`}>
                <Card className="p-4 hover:bg-accent/50 cursor-pointer transition-colors border-l-4 border-l-primary">
                  <div className="flex items-center justify-between gap-4">
                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground truncate">{chat.patientName}</h3>
                        {chat.unreadCount > 0 && (
                          <Badge className="bg-primary text-primary-foreground">{chat.unreadCount}</Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-1">{chat.patientPhone}</p>

                      <p className="text-sm text-muted-foreground truncate">{chat.lastMessage || "No messages yet"}</p>
                    </div>

                    {/* Time and Message Count */}
                    <div className="flex flex-col items-end gap-2 whitespace-nowrap">
                      <p className="text-xs text-muted-foreground">{formatDate(chat.lastMessageAt)}</p>
                      <Badge variant="outline" className="text-xs">
                        {chat.messageCount} msg
                      </Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
