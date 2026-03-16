"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/components/auth-context"
import { toast } from "react-hot-toast"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export function AddPaymentModal({ patientId, remainingBalance, isOpen, onClose, onSuccess }: any) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [withoutDebt, setWithoutDebt] = useState(false)
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
      const endpoint = withoutDebt
        ? `/api/billing/${patientId}/standalone-payment`
        : `/api/billing/${patientId}/payment`

      const res = await fetch(endpoint, {
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
        console.log("[v0] Add Payment: Update successful, invoking onSuccess callback")
        toast.success("Payment recorded successfully")
        
        // Reset form first
        setFormData({
          cash: "",
          card: "",
          bankTransfer: "",
          other: "",
          description: "",
          date: new Date().toISOString().split("T")[0],
        })
        setWithoutDebt(false)
        
        // Call onSuccess to refresh data first
        if (onSuccess) {
          console.log("[v0] Add Payment: Calling onSuccess callback")
          onSuccess()
        } else {
          console.warn("[v0] Add Payment: onSuccess callback not provided")
        }
        
        // Close modal after refresh completes
        setTimeout(() => {
          console.log("[v0] Add Payment: Closing modal after refresh")
          onClose()
        }, 100)
      } else {
        const data = await res.json()
        console.log("[v0] Add Payment: Error response:", data.error)
        toast.error(data.error || "Failed to record payment")
      }
    } catch (error) {
      console.error("[v0] Add Payment: Failed to add payment:", error)
      toast.error("Error recording payment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg sm:text-xl">Add Payment</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            {withoutDebt
              ? "Record a payment without creating or affecting debt entries"
              : "Record a payment against existing debt"}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-6 p-3 bg-muted rounded-lg border border-border">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={withoutDebt}
              onChange={(e) => setWithoutDebt(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 rounded border-border cursor-pointer accent-accent"
            />
            <span className="text-sm font-medium text-foreground">Record without creating debt</span>
          </label>
          <p className="text-xs text-muted-foreground mt-2 ml-7">
            Check this if the patient is making a direct payment without any outstanding debt
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
                    disabled={loading}
                    className="w-full pl-8 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-foreground disabled:opacity-50"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total Amount */}
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
              placeholder="e.g., Payment for routine checkup..."
              disabled={loading}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-foreground placeholder-muted-foreground disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-foreground disabled:opacity-50"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || totalPayment <= 0}
              className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Record Payment
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-muted hover:bg-muted/80 disabled:opacity-50 text-muted-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
