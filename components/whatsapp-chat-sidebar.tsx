"use client"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Menu, X } from "lucide-react"
import WhatsAppChatListItem from "./whatsapp-chat-list-item"

interface Chat {
  _id: string
  patientName: string
  patientPhone: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  whatsappProfilePictureUrl?: string | null
  whatsappDisplayName?: string | null
}

interface ChatSidebarProps {
  chats: Chat[]
  selectedChatId?: string
  onSearchChange: (value: string) => void
  searchValue: string
  loading: boolean
}

export default function WhatsAppChatSidebar({
  chats,
  selectedChatId,
  onSearchChange,
  searchValue,
  loading,
}: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed bottom-6 left-6 z-40 bg-blue-500 text-white hover:bg-blue-600"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Sidebar */}
      <div
        className={`fixed md:relative top-0 left-0 h-screen w-80 bg-white border-r border-gray-200 flex flex-col z-50 transform transition-transform md:transform-none ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Chats</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search chats..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-10 bg-gray-100 border-0 rounded-full focus-visible:ring-1 focus-visible:ring-blue-500"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <p className="text-sm text-gray-500">No chats yet</p>
              <p className="text-xs text-gray-400 mt-1">Messages from customers will appear here</p>
            </div>
          ) : (
            <div>
              {chats.map((chat) => (
                <div key={chat._id} onClick={() => setIsOpen(false)}>
                  <WhatsAppChatListItem
                    chatId={chat._id}
                    patientName={chat.patientName}
                    patientPhone={chat.patientPhone}
                    lastMessage={chat.lastMessage}
                    lastMessageAt={chat.lastMessageAt}
                    unreadCount={chat.unreadCount}
                    isSelected={selectedChatId === chat._id}
                    whatsappProfilePictureUrl={chat.whatsappProfilePictureUrl}
                    whatsappDisplayName={chat.whatsappDisplayName}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
