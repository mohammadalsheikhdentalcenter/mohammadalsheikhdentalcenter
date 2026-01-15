"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { toast } from "react-hot-toast"
import { Loader2, Calendar, User, FileText, Stethoscope } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export function ProceduresFindingsModal({ patientId, isOpen, onClose, selectedAppointmentId = null }: any) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [proceduresData, setProceduresData] = useState<any[]>([])

  useEffect(() => {
    if (isOpen && patientId) {
      fetchProceduresAndFindings()
    }
  }, [isOpen, patientId])

  const fetchProceduresAndFindings = async () => {
    setLoading(true)
    try {
      const url = new URL(`/api/billing/${patientId}/procedures-findings`, window.location.origin)
      if (selectedAppointmentId) {
        url.searchParams.append("appointmentId", selectedAppointmentId)
      }

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setProceduresData(data.proceduresAndFindings || [])
      } else {
        toast.error("Failed to load procedures and findings")
      }
    } catch (error) {
      console.error("Failed to fetch procedures:", error)
      toast.error("Error loading procedures and findings")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full p-4 sm:p-6 max-h-[85vh] overflow-y-auto !scrollbar-hidden">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            Procedures & Findings
          </DialogTitle>
          <DialogDescription className="sr-only">View all procedures and findings from appointments</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-muted-foreground">Loading procedures and findings...</p>
          </div>
        ) : proceduresData.length > 0 ? (
          <div className="space-y-4 max-h-[600px]  overflow-y-auto scrollbar-hidden pr-2">
            {proceduresData.map((item: any, index: number) => (
              <div
                key={index}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors"
              >
                {/* Header with date and doctor */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-4 border-b border-border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{formatDate(item.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{item.doctorName || "Unknown Doctor"}</span>
                    </div>
                  </div>
                </div>

                {/* Procedures Section */}
                {item.procedures && item.procedures.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-primary" />
                      Procedures
                    </h4>
                    <div className="space-y-2">
                      {item.procedures.map((proc: any, idx: number) => (
                        <div key={idx} className="bg-muted/50 rounded p-3">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <span className="font-medium text-foreground text-sm">{proc.name || "Procedure"}</span>
                            {proc.tooth && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                Tooth: {proc.tooth}
                              </span>
                            )}
                          </div>
                          {proc.description && <p className="text-sm text-muted-foreground">{proc.description}</p>}
                          {proc.status && (
                            <div className="text-xs mt-2">
                              <span
                                className={`px-2 py-1 rounded ${
                                  proc.status === "completed"
                                    ? "bg-accent/10 text-accent"
                                    : proc.status === "pending"
                                      ? "bg-warning/10 text-warning"
                                      : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {proc.status}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Findings Section */}
                {item.findings && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Findings
                    </h4>
                    <div className="bg-muted/50 rounded p-3 text-sm text-muted-foreground">{item.findings}</div>
                  </div>
                )}

                {/* Notes Section */}
                {item.notes && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-foreground text-sm mb-2">Notes</h4>
                    <div className="bg-muted/50 rounded p-3 text-sm text-muted-foreground">{item.notes}</div>
                  </div>
                )}

                {/* Follow-up Details */}
                {item.followUpDetails && (
                  <div>
                    <h4 className="font-semibold text-foreground text-sm mb-2">Follow-up Details</h4>
                    <div className="bg-accent/5 border border-accent/20 rounded p-3 text-sm text-muted-foreground">
                      {item.followUpDetails}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No procedures or findings recorded yet</p>
          </div>
        )}

        <div className="flex gap-3 pt-4 mt-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 bg-muted hover:bg-muted/80 text-muted-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
