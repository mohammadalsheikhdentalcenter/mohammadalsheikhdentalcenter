"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { toast } from "react-hot-toast"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export function EditRemainingBalanceModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  currentBalance = 0,
  totalDebt = 0,
  billingId,
}: any) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState<"debt" | "balance">("balance")
  const [formData, setFormData] = useState({
    totalDebt: totalDebt,
    remainingBalance: currentBalance,
    adjustmentReason: "",
  })

  useEffect(() => {
    if (isOpen) {
      setFormData({
        totalDebt: totalDebt,
        remainingBalance: currentBalance,
        adjustmentReason: "",
      })
      setEditMode("balance")
    }
  }, [isOpen, currentBalance, totalDebt])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log("[v0] Form submitted with mode:", editMode, formData)
    
    // Validation for debt
    if (editMode === "debt") {
      if (formData.totalDebt < 0) {
        toast.error("Total debt cannot be negative")
        return
      }
      if (formData.remainingBalance > formData.totalDebt) {
        toast.error(`Remaining balance cannot exceed new total debt ($${formData.totalDebt.toFixed(2)})`)
        return
      }
    }
    
    // Validation for remaining balance
    if (editMode === "balance") {
      if (formData.remainingBalance < 0) {
        toast.error("Remaining balance cannot be negative")
        return
      }

      if (formData.remainingBalance > formData.totalDebt) {
        toast.error(`Remaining balance cannot exceed total debt ($${formData.totalDebt.toFixed(2)})`)
        return
      }
    }

    if (!billingId) {
      toast.error("Billing ID is missing")
      return
    }

    setLoading(true)

    try {
      const requestBody: any = {
        adjustmentReason: formData.adjustmentReason || `${editMode} adjustment`,
      }
      
      // Only send the fields that are being changed
      if (editMode === "debt") {
        requestBody.totalDebt = Number(formData.totalDebt)
      } else if (editMode === "balance") {
        requestBody.remainingBalance = Number(formData.remainingBalance)
      }
      
      console.log("[v0] Sending request body to /api/billing/${billingId}/debt:", requestBody)
      console.log("[v0] Billing ID:", billingId)
      console.log("[v0] Token present:", !!token)

      const res = await fetch(`/api/billing/${billingId}/debt`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      })

      console.log("[v0] Response status:", res.status)
      
      const responseData = await res.json()
      console.log("[v0] Response data:", responseData)

      if (res.ok) {
        console.log("[v0] Update successful, closing modal")
        onClose()
        onSuccess()
        toast.success(`${editMode === "debt" ? "Total debt" : "Remaining balance"} updated successfully`)
      } else {
        console.log("[v0] Update failed:", responseData.error)
        toast.error(responseData.error || `Failed to update ${editMode}`)
      }
    } catch (error) {
      console.error("[v0] Failed to update:", error)
      toast.error(`Error updating ${editMode}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg sm:text-xl">Edit Billing Amounts</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            Adjust the debt and balance for this patient. These are used for discounts or adjustments.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4 border border-border rounded-lg p-1 bg-muted/50">
          <button
            type="button"
            onClick={() => setEditMode("debt")}
            className={`flex-1 px-3 py-2 rounded transition-colors text-sm font-medium cursor-pointer ${
              editMode === "debt"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Edit Debt
          </button>
          <button
            type="button"
            onClick={() => setEditMode("balance")}
            className={`flex-1 px-3 py-2 rounded transition-colors text-sm font-medium cursor-pointer ${
              editMode === "balance"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Edit Balance
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto pr-4" style={{ scrollBehavior: 'smooth' }}>
          <style>{`
            div::-webkit-scrollbar {
              width: 8px;
            }
            div::-webkit-scrollbar-track {
              background: transparent;
            }
            div::-webkit-scrollbar-thumb {
              background: hsl(var(--primary) / 0.4);
              border-radius: 4px;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: hsl(var(--primary) / 0.6);
            }
          `}</style>
          <form id="edit-balance-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Summary Info */}
          <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm space-y-2">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Total Debt:</span>
              <span className="font-semibold text-foreground">${formData.totalDebt.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Remaining Balance:</span>
              <span className="font-semibold text-foreground">${formData.remainingBalance.toFixed(2)}</span>
            </div>
            {formData.totalDebt > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Paid Amount:</span>
                <span className="font-semibold text-accent">${(formData.totalDebt - formData.remainingBalance).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Edit Debt Section */}
          {editMode === "debt" && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">New Total Debt *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                <input
                  type="number"
                  value={formData.totalDebt}
                  onChange={(e) => {
                    const newDebt = Number(e.target.value)
                    setFormData({ 
                      ...formData, 
                      totalDebt: newDebt,
                      remainingBalance: Math.min(formData.remainingBalance, newDebt)
                    })
                  }}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                  className="w-full pl-8 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Note: If new debt is lower than remaining balance, the remaining balance will be adjusted automatically.
              </p>
            </div>
          )}

          {/* Edit Remaining Balance Section */}
          {editMode === "balance" && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">New Remaining Balance *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                <input
                  type="number"
                  value={formData.remainingBalance}
                  onChange={(e) => setFormData({ ...formData, remainingBalance: Number(e.target.value) })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max={formData.totalDebt}
                  required
                  className="w-full pl-8 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum: ${formData.totalDebt.toFixed(2)}
              </p>
            </div>
          )}

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Reason for Adjustment (Optional)</label>
              <textarea
                value={formData.adjustmentReason}
                onChange={(e) => setFormData({ ...formData, adjustmentReason: e.target.value })}
                placeholder={`e.g., ${editMode === "debt" ? "Debt correction, Billing adjustment..." : "Discount applied, Insurance adjustment..."}`}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground resize-none h-20"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
              <p className="text-blue-900 dark:text-blue-100">
                <span className="font-semibold">Note:</span> The paid amount will be automatically calculated as: Total Debt - Remaining Balance
              </p>
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="flex gap-3 pt-4 border-t border-border mt-4">
          <button
            type="submit"
            form="edit-balance-form"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Update {editMode === "debt" ? "Debt" : "Balance"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-muted hover:bg-muted/80 text-muted-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
