"use client"

import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface ChatListItemProps {
  chatId: string
  patientName: string
  patientPhone: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  profileImage?: string
  isSelected?: boolean
  whatsappProfilePictureUrl?: string | null
  whatsappDisplayName?: string | null
}

export default function WhatsAppChatListItem({
  chatId,
  patientName,
  patientPhone,
  lastMessage,
  lastMessageAt,
  unreadCount,
  profileImage,
  isSelected,
  whatsappProfilePictureUrl,
  whatsappDisplayName,
}: ChatListItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffMinutes < 1) return "Now"
    if (diffMinutes < 60) return `${diffMinutes}m`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`
    if (diffMinutes < 10080) return `${Math.floor(diffMinutes / 1440)}d`

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const displayName = whatsappDisplayName || patientName || "Customer"
  const profileUrl = whatsappProfilePictureUrl || profileImage

  return (
    <Link href={`/dashboard/inbox/${chatId}`}>
      <div
        className={`px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
          isSelected ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 flex-shrink-0 border-2 border-gray-200">
            <AvatarImage 
              src={profileUrl || ""} 
              alt={displayName}
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
            />
            <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-sm">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className={`font-semibold text-sm truncate ${unreadCount > 0 ? "text-gray-900" : "text-gray-700"}`}>
                {displayName}
              </h3>
              <span className="text-xs text-gray-500 flex-shrink-0">{formatDate(lastMessageAt)}</span>
            </div>

            <div className="flex items-center gap-2">
              <p
                className={`text-xs truncate ${
                  unreadCount > 0 ? "font-medium text-gray-900" : "text-gray-600"
                }`}
              >
                {lastMessage || "No messages"}
              </p>
              {unreadCount > 0 && (
                <Badge className="bg-blue-500 text-white text-xs py-0 px-1.5 flex-shrink-0">
                  {unreadCount}
                </Badge>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-1">{patientPhone}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
