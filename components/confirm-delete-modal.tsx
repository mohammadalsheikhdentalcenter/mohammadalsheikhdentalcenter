"use client"

import { AlertTriangle } from "lucide-react"

interface ConfirmDeleteModalProps {
  isOpen: boolean
  title: string
  description: string
  itemName?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
  isDangerous?: boolean
}

export function ConfirmDeleteModal({
  isOpen,
  title,
  description,
  itemName,
  onConfirm,
  onCancel,
  isLoading = false,
  isDangerous = true,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg shadow-xl border border-border p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 rounded-lg ${isDangerous ? "bg-destructive/10" : "bg-warning/10"}`}>
            <AlertTriangle className={`w-6 h-6 ${isDangerous ? "text-destructive" : "text-warning"}`} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">{description}</p>
          {itemName && <p className="text-sm font-medium text-foreground bg-muted px-3 py-2 rounded-lg">{itemName}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:opacity-50 ${
              isDangerous
                ? "bg-destructive hover:bg-destructive/90 text-white"
                : "bg-warning hover:bg-warning/90 text-white"
            }`}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  )
}
