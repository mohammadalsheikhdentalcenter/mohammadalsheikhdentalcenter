"use client"

import React, { useState } from "react"
import { Check, CheckCheck, AlertCircle, Download } from "lucide-react"
import Image from "next/image"

interface MessageBubbleProps {
  type: "sent" | "received"
  text: string
  timestamp: Date
  status?: "sent" | "delivered" | "read" | "failed"
  mediaType?: string | null
  mediaUrl?: string | null
  quotedMessageBody?: string | null
  quotedMediaUrl?: string | null
  quotedMediaType?: string | null
  messageId?: string
  onQuotedMessageClick?: (messageId: string) => void
}

export default function WhatsAppMessageBubble({
  type,
  text,
  timestamp,
  status = "read",
  mediaType,
  mediaUrl,
  quotedMessageBody,
  quotedMediaUrl,
  quotedMediaType,
  messageId,
  onQuotedMessageClick,
}: MessageBubbleProps) {
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [mediaError, setMediaError] = useState(false)
  const [isHighlighted, setIsHighlighted] = useState(false)

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const isOwn = type === "sent"
  const bgColor = isOwn ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
  const bubbleAlign = isOwn ? "justify-end" : "justify-start"

  const getStatusIcon = () => {
    switch (status) {
      case "sent":
        return <Check className="w-4 h-4" />
      case "delivered":
      case "read":
        return <CheckCheck className="w-4 h-4" />
      case "failed":
        return <AlertCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  const getProxiedMediaUrl = (url: string, type: string) => {
    if (!url) return "";
    // If it's already a proxied URL, return as is
    if (url.includes("/api/whatsapp/media-proxy")) return url;
    // Pass the full WhatsApp media URL with auth token to proxy
    return `/api/whatsapp/media-proxy?url=${encodeURIComponent(url)}&type=${type}`;
  };

  return (
    <div className={`flex ${bubbleAlign} mb-2`} id={messageId ? `message-${messageId}` : undefined}>
      <div
        className={`max-w-2xl rounded-2xl px-4 py-2.5 ${bgColor} shadow-sm transition-all duration-300 ${
          isOwn ? "rounded-br-none" : "rounded-bl-none"
        } ${isHighlighted ? "ring-2 ring-yellow-400 scale-105" : ""}`}
      >
        {/* Quoted Message */}
        {quotedMessageBody && (
          <div
            className={`mb-2 pb-2 border-l-2 pl-2 cursor-pointer hover:opacity-100 transition-opacity ${isOwn ? "border-blue-300 opacity-75 hover:border-blue-200" : "border-gray-300 opacity-75 hover:border-gray-400"}`}
            onClick={() => {
              if (quotedMessageBody && onQuotedMessageClick) {
                onQuotedMessageClick(quotedMessageBody)
              }
            }}
          >
            <p className="text-xs font-medium mb-1">Replying to:</p>
            
            {/* Quoted Media Preview */}
            {quotedMediaType && quotedMediaUrl && (
              <div className="mb-1 rounded overflow-hidden bg-black/10 max-w-xs">
                {quotedMediaType === "image" && (
                  <img
                    src={quotedMediaUrl || "/placeholder.svg"}
                    alt="Quoted image"
                    className="max-w-full max-h-32 rounded object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                )}
                {quotedMediaType === "audio" && (
                  <div className="text-xs px-2 py-1">🎙️ Audio message</div>
                )}
                {quotedMediaType === "video" && (
                  <div className="text-xs px-2 py-1">🎬 Video message</div>
                )}
              </div>
            )}
            
            <p className="text-xs line-clamp-2">{quotedMessageBody}</p>
          </div>
        )}

        {/* Media Content */}
        {mediaType && mediaUrl && (
          <div className="mb-2">
            {mediaType === "image" && (
              <div className="relative rounded-lg overflow-hidden bg-black/5">
                {loadingMedia && (
                  <div className="h-48 w-80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
                {!mediaError ? (
                  <img
                    src={getProxiedMediaUrl(mediaUrl, "image") || "/placeholder.svg"}
                    alt="Message image"
                    className="max-w-full max-h-96 rounded-lg"
                    onLoad={() => setLoadingMedia(false)}
                    onError={() => {
                      setLoadingMedia(false)
                      setMediaError(true)
                    }}
                    onLoadingCapture={() => setLoadingMedia(true)}
                  />
                ) : (
                  <div className="w-80 h-48 flex flex-col items-center justify-center text-gray-400">
                    <AlertCircle className="w-8 h-8 mb-2" />
                    <p className="text-xs">Unable to load image</p>
                  </div>
                )}
              </div>
            )}

            {mediaType === "video" && (
              <div className="relative rounded-lg overflow-hidden bg-black/5">
                <video
                  src={getProxiedMediaUrl(mediaUrl, "video")}
                  controls
                  className="max-w-full max-h-96 rounded-lg"
                  onLoadStart={() => setLoadingMedia(true)}
                  onCanPlay={() => setLoadingMedia(false)}
                  onError={() => {
                    setLoadingMedia(false)
                    setMediaError(true)
                  }}
                />
              </div>
            )}

            {mediaType === "audio" && (
              <div className="flex items-center gap-2 bg-black/5 rounded-lg px-3 py-2">
                <audio 
                  src={getProxiedMediaUrl(mediaUrl, "audio")} 
                  controls 
                  className="flex-1 h-6" 
                  onError={() => setMediaError(true)} 
                />
              </div>
            )}

            {mediaType === "document" && (
              <div className="flex items-center gap-2 bg-black/5 rounded-lg px-3 py-2">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                  <span className="text-xs font-semibold text-blue-700">DOC</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{text}</p>
                </div>
                <a 
                  href={getProxiedMediaUrl(mediaUrl, "document")} 
                  download 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex-shrink-0"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Text Content - Only show if it's actual text with content */}
        {text && text.trim() && text.trim() !== " " && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{text}</p>
        )}

        {/* Timestamp and Status */}
        <div className={`flex items-center gap-1 mt-1 text-xs ${isOwn ? "text-blue-100 justify-end" : "text-gray-500"}`}>
          <span>{formatTime(new Date(timestamp))}</span>
          {isOwn && getStatusIcon()}
        </div>
      </div>
    </div>
  )
}
