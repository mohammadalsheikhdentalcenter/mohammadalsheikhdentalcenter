"use client"

import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ChatHeaderProps {
  patientName: string
  patientPhone: string
  profileImage?: string
  isOnline?: boolean
  onBack?: () => void
  whatsappProfilePictureUrl?: string | null
  whatsappDisplayName?: string | null
}

export default function WhatsAppChatHeader({
  patientName,
  patientPhone,
  profileImage,
  isOnline = false,
  whatsappProfilePictureUrl,
  whatsappDisplayName,
}: ChatHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3 flex-1">
        <Link href="/dashboard/inbox">
          <Button variant="ghost" size="icon" className="md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12 border-2 border-gray-200">
              <AvatarImage 
                src={whatsappProfilePictureUrl || profileImage || ""} 
                alt={whatsappDisplayName || patientName}
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                }}
              />
              <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                {getInitials(whatsappDisplayName || patientName)}
              </AvatarFallback>
            </Avatar>
            {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
          </div>

          <div className="flex flex-col">
            <h2 className="font-semibold text-gray-900 text-sm">{whatsappDisplayName || patientName}</h2>
            <p className="text-xs text-gray-500">{patientPhone}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
