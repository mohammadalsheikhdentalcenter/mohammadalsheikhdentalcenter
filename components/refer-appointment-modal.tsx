//@ts-nocheck
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Loader2, ArrowRight, Info } from "lucide-react"
import { toast } from "react-hot-toast"
import { SearchableDropdown } from "./searchable-dropdown"

interface ReferAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  appointmentId: string
  patientName: string
  token: string
  currentDoctorName?: string
}

export function ReferAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  appointmentId,
  patientName,
  token,
  currentDoctorName,
}: ReferAppointmentModalProps) {
  const [doctors, setDoctors] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetchingDoctors, setFetchingDoctors] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchDoctors()
    }
  }, [isOpen])

  

  const fetchDoctors = async () => {
    setFetchingDoctors(true)
    try {
      const res = await fetch("/api/users?role=doctor", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setDoctors(data.users || [])
      } else {
        toast.error("Failed to fetch doctors")
      }
    } catch (error) {
      console.error("Failed to fetch doctors:", error)
      toast.error("Error fetching doctors")
    } finally {
      setFetchingDoctors(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedDoctor) {
      toast.error("Please select a doctor to refer this appointment")
      return
    }

    if (!reason.trim()) {
      toast.error("Please provide a referral reason")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/appointment-referrals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appointmentId,
          toDoctorId: selectedDoctor.id,
          referralReason: reason,
        }),
      })

      if (res.ok) {
        toast.success(`Appointment referred to ${selectedDoctor.name} successfully`)
        setReason("")
        setSelectedDoctor(null)
        onSuccess()
        onClose()
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Failed to refer appointment")
      }
    } catch (error) {
      console.error("Failed to refer appointment:", error)
      toast.error("Error referring appointment")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

 

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg shadow-lg border border-border p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Refer Appointment</h2>
            <p className="text-xs text-muted-foreground mt-1">Transfer this case to another doctor</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            <strong>Flow:</strong> {currentDoctorName} → Selected Doctor → {currentDoctorName} (after completion)
          </p>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Referring appointment for <span className="font-semibold text-foreground">{patientName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Refer to Doctor *</label>
            <SearchableDropdown
              items={doctors}
              selectedItem={selectedDoctor}
              onSelect={setSelectedDoctor}
              placeholder="Select Doctor..."
              searchPlaceholder="Search doctors..."
              disabled={loading || fetchingDoctors}
              required={true}
              clearable={true}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Referral Reason *</label>
            <textarea
              placeholder="Explain why you're referring this appointment (e.g., Scaling and polishing, Specialist consultation)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-pointer disabled:cursor-not-allowed"
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !selectedDoctor || !reason.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm disabled:cursor-not-allowed cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <ArrowRight className="w-4 h-4" />
              Refer Now
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-muted hover:bg-muted/80 disabled:bg-muted/50 text-muted-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
