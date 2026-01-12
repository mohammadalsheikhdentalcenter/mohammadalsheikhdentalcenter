//@ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { User, Download, Eye } from "lucide-react"
import { toast } from "react-hot-toast"
import { generateReportPDF } from "@/lib/pdf-generator"

interface AppointmentReportsViewProps {
  appointmentId: string
  patientId: string
  token: string
  currentDoctorId: string
  isReferred: boolean
}

export function AppointmentReportsView({
  appointmentId,
  patientId,
  token,
  currentDoctorId,
  isReferred,
}: AppointmentReportsViewProps) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)

  useEffect(() => {
    fetchReports()
  }, [appointmentId])

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/appointment-reports?appointmentId=${appointmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setReports(data.reports || [])
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading reports...</div>
  }

  if (reports.length === 0) {
    return <div className="text-sm text-muted-foreground">No reports created yet</div>
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm">Medical Reports ({reports.length})</h4>
      {reports.map((report, index) => (
        <div key={report._id} className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">{report.doctorName}</p>
                <p className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <span
              className={`text-xs font-semibold px-2 py-1 rounded ${
                report.doctorRole === "referred" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
              }`}
            >
              {report.doctorRole === "referred" ? "Referred Doctor" : "Original Doctor"}
            </span>
          </div>

          <div className="space-y-2 mb-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Procedures</p>
              <ul className="text-sm text-foreground space-y-1">
                {report.procedures?.map((proc, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    {proc.name}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Findings</p>
              <p className="text-sm text-foreground">{report.findings}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Notes</p>
              <p className="text-sm text-foreground">{report.notes}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedReport(report)}
              className="flex items-center gap-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1 rounded transition-colors"
            >
              <Eye className="w-3 h-3" />
              View
            </button>
            <button
              onClick={() => {
                generateReportPDF(report)
                toast.success("Downloading PDF...")
              }}
              className="flex items-center gap-1 text-xs bg-muted hover:bg-muted/80 text-muted-foreground px-3 py-1 rounded transition-colors"
            >
              <Download className="w-3 h-3" />
              Download
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
