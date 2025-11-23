"use client"

import { AlertCircle, CheckCircle } from "lucide-react"

interface AppointmentActionModalProps {
  isOpen: boolean
  action: "close" | "cancel" | null
  appointmentPatientName?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function AppointmentActionModal({
  isOpen,
  action,
  appointmentPatientName,
  onConfirm,
  onCancel,
  isLoading = false,
}: AppointmentActionModalProps) {
  if (!isOpen || !action) return null

  const isClose = action === "close"
  const title = isClose ? "Close Appointment" : "Cancel Appointment"
  const description = isClose
    ? "Mark this appointment as completed. This action cannot be undone."
    : "Cancel this appointment. The patient will need to reschedule."
  const confirmText = isClose ? "Close" : "Cancel"
  const confirmColor = isClose
    ? "bg-green-600 hover:bg-green-700 text-white"
    : "bg-destructive hover:bg-destructive/90 text-white"
  const icon = isClose ? CheckCircle : AlertCircle
  const Icon = icon
  const iconBgColor = isClose ? "bg-green-100" : "bg-red-100"
  const iconColor = isClose ? "text-green-600" : "text-red-600"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-card rounded-lg shadow-xl border border-border p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 rounded-lg ${iconBgColor}`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
          {appointmentPatientName && (
            <div className="bg-muted px-3 py-2 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1">Patient</p>
              <p className="text-sm font-medium text-foreground">{appointmentPatientName}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:opacity-50"
          >
            Keep Appointment
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:opacity-50 ${confirmColor}`}
          >
            {isLoading ? `${confirmText}ing...` : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
