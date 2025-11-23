"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { toast } from "react-hot-toast"

interface AddBillingRequestModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  patientName: string
  token: string
  onSuccess: () => void
}

export function AddBillingRequestModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  token,
  onSuccess,
}: AddBillingRequestModalProps) {
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState(patientId)
  const [selectedPatientName, setSelectedPatientName] = useState(patientName)
  const [formData, setFormData] = useState({
    treatment: "",
    amount: "",
    reason: "",
  })

  useEffect(() => {
    if (isOpen) {
      fetchPatients()
    }
  }, [isOpen])

  const fetchPatients = async () => {
    setLoadingPatients(true)
    try {
      const res = await fetch("/api/patients", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPatients(data.patients || [])
      } else {
        toast.error("Failed to fetch patients list")
      }
    } catch (error) {
      console.error("[v0] Error fetching patients:", error)
      toast.error("Error fetching patients")
    } finally {
      setLoadingPatients(false)
    }
  }

  const handlePatientChange = (newPatientId: string) => {
    setSelectedPatientId(newPatientId)
    const selected = patients.find((p) => p._id === newPatientId)
    if (selected) {
      setSelectedPatientName(selected.name)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPatientId || !formData.treatment || !formData.amount) {
      toast.error("Please fill in all required fields")
      return
    }

    const amount = Number.parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/billing/${selectedPatientId}/extra-charges`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          treatment: formData.treatment,
          amount: amount.toString(),
          reason: formData.reason,
          patientName: selectedPatientName,
        }),
      })

      if (res.ok) {
        toast.success("Billing request submitted successfully")
        setFormData({ treatment: "", amount: "", reason: "" })
        onClose()
        onSuccess()
      } else {
        const error = await res.json().catch(() => ({}))
        toast.error(error.error || "Failed to submit billing request")
      }
    } catch (error) {
      console.error("[v0] Error submitting billing request:", error)
      toast.error("Error submitting billing request")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Billing Request</DialogTitle>
          <DialogDescription>Request additional charges for a patient</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Patient *</label>
            <select
              value={selectedPatientId}
              onChange={(e) => handlePatientChange(e.target.value)}
              disabled={loading || loadingPatients}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-pointer disabled:cursor-not-allowed"
              required
            >
              <option value="">{loadingPatients ? "Loading patients..." : "Select a patient"}</option>
              {patients.map((patient) => (
                <option key={patient._id} value={patient._id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Treatment/Service *</label>
            <input
              type="text"
              value={formData.treatment}
              onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
              placeholder="e.g., Root Canal, Crown, Cleaning"
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text disabled:cursor-not-allowed"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Amount ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="e.g., 500.00"
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text disabled:cursor-not-allowed"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Reason/Notes</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Add any additional details or justification..."
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text disabled:cursor-not-allowed"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading || loadingPatients}
              className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Request
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
      </DialogContent>
    </Dialog>
  )
}
