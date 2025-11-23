"use client"

import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Download, X } from "lucide-react"

interface AppointmentReportViewProps {
  reportId: string
  token: string
  onClose: () => void
}

export function AppointmentReportView({ reportId, token, onClose }: AppointmentReportViewProps) {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReport()
  }, [reportId])

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/appointment-reports/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setReport(data.report)
      } else {
        toast.error("Failed to fetch report")
      }
    } catch (error) {
      console.error("Error fetching report:", error)
      toast.error("Error fetching report")
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-card rounded-lg shadow-xl border border-border p-6 max-w-2xl w-full">
          <div className="text-center py-8 text-muted-foreground">Loading report...</div>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-card rounded-lg shadow-xl border border-border p-6 max-w-2xl w-full">
          <div className="text-center py-8 text-muted-foreground">Report not found</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:bg-white print:p-0">
      <div className="bg-card rounded-lg shadow-xl border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto print:rounded-none print:border-none print:shadow-none">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card print:border-b print:pb-4">
          <h2 className="text-2xl font-bold text-foreground">Appointment Report</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 rounded-lg transition-colors text-sm font-medium print:hidden"
            >
              <Download className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-lg print:hidden"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 print:p-8">
          {/* Patient & Doctor Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Patient</p>
              <p className="text-foreground font-medium mt-1">{report.patientId?.name}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Doctor</p>
              <p className="text-foreground font-medium mt-1">{report.doctorId?.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{report.doctorId?.specialty}</p>
            </div>
          </div>

          {/* Appointment Info */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Appointment Details</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="text-foreground font-medium">
                  {new Date(report.appointmentId?.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Time</p>
                <p className="text-foreground font-medium">{report.appointmentId?.time}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="text-foreground font-medium">{report.appointmentId?.type}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Report Date</p>
                <p className="text-foreground font-medium">{new Date(report.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Procedures */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Procedures Performed</h3>
            <div className="space-y-2">
              {report.procedures && report.procedures.length > 0 ? (
                report.procedures.map((proc: any, idx: number) => (
                  <div key={idx} className="bg-muted/50 rounded-lg p-3 border border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{proc.name}</p>
                        {proc.description && <p className="text-sm text-muted-foreground mt-1">{proc.description}</p>}
                      </div>
                      {proc.tooth && (
                        <span className="bg-primary/20 text-primary px-2 py-1 rounded text-xs font-medium">
                          Tooth {proc.tooth}
                        </span>
                      )}
                    </div>
                    {proc.status && <p className="text-xs text-muted-foreground mt-2">Status: {proc.status}</p>}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No procedures recorded</p>
              )}
            </div>
          </div>

          {/* Findings */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Clinical Findings</h3>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-foreground whitespace-pre-wrap">{report.findings}</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Notes</h3>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-foreground whitespace-pre-wrap">{report.notes}</p>
            </div>
          </div>

          {/* Follow-up */}
          <div className="grid grid-cols-2 gap-4">
            {report.nextVisit && (
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Next Visit</p>
                <p className="text-foreground font-medium mt-1">{new Date(report.nextVisit).toLocaleDateString()}</p>
              </div>
            )}
            {report.followUpDetails && (
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Follow-up Details</p>
                <p className="text-foreground text-sm mt-1">{report.followUpDetails}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/30 print:border-t print:pt-4">
          <p className="text-xs text-muted-foreground text-center">
            Report generated on {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}
