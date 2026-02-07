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
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState(patientId)
  const [selectedPatientName, setSelectedPatientName] = useState(patientName)
  const [patientStats, setPatientStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [formData, setFormData] = useState({
    treatment: "",
    amount: "",
    reason: "",
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && mounted) {
      fetchPatients()
    }
  }, [isOpen, mounted])

  useEffect(() => {
    if (selectedPatientId && token && mounted) {
      fetchPatientStats(selectedPatientId)
    }
  }, [selectedPatientId, token, mounted])

  if (!mounted) return null

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

 const fetchPatientStats = async (id: string) => {
  setLoadingStats(true)
  try {
    const res = await fetch(`/api/billing/${id}/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      const stats = data.stats || { totalPaid: 0, totalDebt: 0, remainingBalance: 0 }
      
      // Calculate percentage and cap at 100%
      let paymentPercentage = 0
      if (stats.totalDebt > 0) {
        paymentPercentage = (stats.totalPaid / stats.totalDebt) * 100
        // Cap at 100%
        if (paymentPercentage > 100) {
          paymentPercentage = 100
        }
      }
      
      setPatientStats({
        ...stats,
        paymentPercentage: Math.round(paymentPercentage * 10) / 10, // Round to 1 decimal place
      })
    } else {
      setPatientStats(null)
    }
  } catch (error) {
    console.error("[v0] Error fetching patient stats:", error)
    setPatientStats(null)
  } finally {
    setLoadingStats(false)
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
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 overflow-y-auto">
        <div className="p-3 pb-2">
          <DialogHeader>
            <DialogTitle>Add Billing Request</DialogTitle>
            <DialogDescription>Request additional charges for a patient</DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-3 pt-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Patient *</label>
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
                    {patient.name} ({patient.idNumber})
                  </option>
                ))}
              </select>
            </div>

            {selectedPatientId && patientStats && (
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Patient Billing Summary</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                      Total Debt
                    </p>
                    <p className="text-base font-bold text-foreground">${patientStats.totalDebt.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                      Total Paid
                    </p>
                    <p className="text-base font-bold text-accent">${patientStats.totalPaid.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                      Remaining
                    </p>
                    <p
                      className={`text-base font-bold ${patientStats.remainingBalance > 0 ? "text-destructive" : "text-accent"}`}
                    >
                      ${patientStats.remainingBalance.toFixed(2)}
                    </p>
                  </div>
                 {/* <div>
  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
    Payment %
  </p>
  <p
    className={`text-base font-bold ${
      (patientStats.paymentPercentage || 0) >= 100
        ? "text-accent"
        : (patientStats.paymentPercentage || 0) >= 50
          ? "text-yellow-600 dark:text-yellow-400"
          : "text-destructive"
    }`}
  >
    
    {patientStats.paymentPercentage.toFixed(1)}%
  </p>
</div> */}
                </div>
              </div>
            )}

            {selectedPatientId && loadingStats && (
              <div className="bg-muted/50 rounded-lg p-4 border border-border flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-primary animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading patient billing info...</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Treatment/Service *</label>
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
              <label className="block text-sm font-semibold text-foreground mb-2">Amount ($) *</label>
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
              <label className="block text-sm font-semibold text-foreground mb-2">Reason/Notes</label>
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
