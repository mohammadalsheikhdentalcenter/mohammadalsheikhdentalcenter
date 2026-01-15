"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/components/auth-context"
import { toast } from "react-hot-toast"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export function StandalonePaymentModal({ patientId, isOpen, onClose, onSuccess }: any) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    cash: "",
    card: "",
    bankTransfer: "",
    other: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  })

  const totalPayment =
    (Number(formData.cash) || 0) +
    (Number(formData.card) || 0) +
    (Number(formData.bankTransfer) || 0) +
    (Number(formData.other) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (totalPayment <= 0) {
      toast.error("Please enter at least one payment amount")
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`/api/billing/${patientId}/standalone-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentMethods: {
            cash: Number(formData.cash) || 0,
            card: Number(formData.card) || 0,
            bankTransfer: Number(formData.bankTransfer) || 0,
            other: Number(formData.other) || 0,
          },
          totalAmount: totalPayment,
          description: formData.description,
          date: formData.date,
        }),
      })

      if (res.ok) {
        onClose()
        onSuccess()
        setFormData({
          cash: "",
          card: "",
          bankTransfer: "",
          other: "",
          description: "",
          date: new Date().toISOString().split("T")[0],
        })
        toast.success("Payment recorded successfully")
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to record payment")
      }
    } catch (error) {
      console.error("Failed to add payment:", error)
      toast.error("Error recording payment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-lg sm:text-xl">Add Standalone Payment</DialogTitle>
          <DialogDescription className="sr-only">Record a payment without creating debt</DialogDescription>
        </DialogHeader>

        <div className="bg-accent/5 border border-accent/20 p-4 rounded-lg mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Note</p>
          <p className="text-sm text-muted-foreground">
            This payment is recorded independently without creating or affecting debt entries.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Methods */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground text-sm">Payment Methods</h4>

            {[
              { label: "Cash", key: "cash" },
              { label: "Card", key: "card" },
              { label: "Bank Transfer", key: "bankTransfer" },
              { label: "Other", key: "other" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-sm text-muted-foreground mb-1 block">{label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={(formData as any)[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total and Description */}
          <div className="bg-accent/5 border border-accent/20 p-3 rounded-lg my-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Total Payment:</span>
              <span className="text-lg font-bold text-accent">${totalPayment.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Description (Optional)</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Direct payment from patient..."
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || totalPayment <= 0}
              className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Record Payment
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-muted hover:bg-muted/80 text-muted-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
