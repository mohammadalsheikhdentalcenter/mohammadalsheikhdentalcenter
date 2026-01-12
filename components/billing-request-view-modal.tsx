"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, User, DollarSign, FileText, Calendar, CheckCircle, Clock, XCircle } from "lucide-react"
import { useState } from "react"

interface BillingRequestViewModalProps {
  isOpen: boolean
  onClose: () => void
  request: any
  userRole?: string
  onApprove?: (billingId: string) => void
  onReject?: (billingId: string) => void
  processingId?: string | null
}

export function BillingRequestViewModal({
  isOpen,
  onClose,
  request,
  userRole,
  onApprove,
  onReject,
  processingId,
}: BillingRequestViewModalProps) {
  if (!request) return null

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          icon: <Clock className="w-5 h-5" />,
          bg: "bg-yellow-100 dark:bg-yellow-900/30",
          text: "text-yellow-800 dark:text-yellow-300",
          border: "border-yellow-300 dark:border-yellow-700",
          label: "Pending Review",
        }
      case "approved":
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          bg: "bg-green-100 dark:bg-green-900/30",
          text: "text-green-800 dark:text-green-300",
          border: "border-green-300 dark:border-green-700",
          label: "Approved",
        }
      case "rejected":
        return {
          icon: <XCircle className="w-5 h-5" />,
          bg: "bg-red-100 dark:bg-red-900/30",
          text: "text-red-800 dark:text-red-300",
          border: "border-red-300 dark:border-red-700",
          label: "Rejected",
        }
      default:
        return {
          icon: <Clock className="w-5 h-5" />,
          bg: "bg-gray-100 dark:bg-gray-900/30",
          text: "text-gray-800 dark:text-gray-300",
          border: "border-gray-300 dark:border-gray-700",
          label: "Unknown",
        }
    }
  }

  const statusConfig = getStatusConfig(request.extraChargesRequested?.status || "pending")
 const requestDate =
  request.extraChargesRequested?.createdAt ||
  request.extraChargesRequested?.requestedAt ||
  request.createdAt

const formattedDate = requestDate
  ? new Date(requestDate).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    })
  : "N/A"


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Billing Request Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status Badge */}
          <div
            className={`flex items-center gap-3 p-4 rounded-lg border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
          >
            {statusConfig.icon}
            <div>
              <p className="text-sm font-medium">Status</p>
              <p className="text-lg font-bold">{statusConfig.label}</p>
            </div>
          </div>

          {/* Patient Information */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Patient Information</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium text-foreground">{request.patientName || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patient ID:</span>
                <span className="font-medium text-foreground font-mono text-sm">
                  {request.patientId || "N/A"}
                </span>
              </div>
              {request.paymentPercentage !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Status:</span>
                  <span
                    className={`font-semibold ${
                      request.paymentPercentage >= 100
                        ? "text-green-600 dark:text-green-400"
                        : request.paymentPercentage >= 50
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {request.paymentPercentage.toFixed(1)}% Paid
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Doctor Information (only for admin) */}
          {userRole !== "doctor" && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-semibold text-foreground">Requested By</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Doctor:</span>
                  <span className="font-medium text-foreground">{request.doctorName || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Request Date:</span>
                  <span className="font-medium text-foreground">{formattedDate}</span>
                </div>
              </div>
            </div>
          )}

          {/* Charge Details */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="text-lg font-semibold text-foreground">Charge Details</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Amount:</span>
                <span className="text-2xl font-bold text-primary">
                  ${request.extraChargesRequested?.amount?.toFixed(2) || "0.00"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-2">Reason:</span>
                <p className="text-foreground bg-muted p-3 rounded-lg text-sm leading-relaxed">
                  {request.extraChargesRequested?.reason || "No reason provided"}
                </p>
              </div>
            </div>
          </div>

          {/* Request Date for Doctor View */}
          {userRole === "doctor" && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Request Information</h3>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submitted:</span>
                <span className="font-medium text-foreground">{formattedDate}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            {userRole !== "doctor" && request.extraChargesRequested?.status === "pending" && onApprove && onReject ? (
              <>
                <button
                  onClick={() => {
                    onApprove(request._id)
                    onClose()
                  }}
                  disabled={processingId === request._id}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-5 h-5" />
                  Approve Request
                </button>
                <button
                  onClick={() => {
                    onReject(request._id)
                    onClose()
                  }}
                  disabled={processingId === request._id}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                  Reject Request
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="w-full bg-muted hover:bg-muted/80 text-foreground px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
