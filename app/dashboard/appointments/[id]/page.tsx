"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/components/auth-context"
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Clock,
  User,
  Stethoscope,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { toast } from "react-hot-toast"

export default function AppointmentDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { token } = useAuth()
  const [appointment, setAppointment] = useState<any>(null)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token && id) {
      fetchAppointmentDetails()
    }
  }, [token, id])

  const fetchAppointmentDetails = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setAppointment(data.appointment)
      } else {
        try {
          const errorData = await res.json()
          toast.error(errorData.error || "Failed to fetch appointment details")
        } catch {
          toast.error(`Error: ${res.status} ${res.statusText}`)
        }
        router.push("/dashboard/appointments")
      }
    } catch (error) {
      toast.error("Error fetching appointment")
      router.push("/dashboard/appointments")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (appointment?._id || appointment?.id) {
      fetchReportDetails()
    }
  }, [appointment])

  const fetchReportDetails = async () => {
    try {
      const res = await fetch(`/api/appointment-reports?appointmentId=${appointment._id || appointment.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.reports && data.reports.length > 0) {
          setReport(data.reports[0])
        }
      }
    } catch (error) {
      console.error("Failed to fetch report:", error)
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return { color: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: CheckCircle2, label: "Completed" }
      case "cancelled":
        return { color: "bg-red-50 border-red-200 text-red-700", icon: AlertCircle, label: "Cancelled" }
      case "confirmed":
        return { color: "bg-blue-50 border-blue-200 text-blue-700", icon: Calendar, label: "Confirmed" }
      case "closed":
        return { color: "bg-purple-50 border-purple-200 text-purple-700", icon: CheckCircle2, label: "Closed" }
      default:
        return { color: "bg-amber-50 border-amber-200 text-amber-700", icon: AlertCircle, label: "Pending" }
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <main className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  if (!appointment) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <main className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Appointment not found</p>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  const statusConfig = getStatusConfig(appointment.status)
  const StatusIcon = statusConfig.icon

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto md:pt-0 pt-16">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => router.push("/dashboard/appointments")}
                className="flex items-center gap-2 text-primary hover:text-primary/80 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back to Appointments</span>
              </button>

              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-bold text-foreground mb-2">{appointment.patientName}</h1>
                  <p className="text-muted-foreground">Appointment Details & Medical Record</p>
                </div>
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border font-medium text-sm ${statusConfig.color}`}
                >
                  <StatusIcon className="w-4 h-4" />
                  {statusConfig.label}
                </div>
              </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Appointment Info Card */}
                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Appointment Information
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Doctor */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Stethoscope className="w-4 h-4" />
                          <span>Doctor</span>
                        </div>
                        <p className="text-lg font-semibold text-foreground">{appointment.doctorName}</p>
                      </div>

                      {/* Type */}
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-sm font-medium">Appointment Type</p>
                        <p className="text-lg font-semibold text-foreground">{appointment.type}</p>
                      </div>

                      {/* Date */}
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-sm font-medium">Date</p>
                        <p className="text-lg font-semibold text-foreground">
                          {new Date(appointment.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>

                      {/* Time */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Clock className="w-4 h-4" />
                          <span>Time</span>
                        </div>
                        <p className="text-lg font-semibold text-foreground">{appointment.time}</p>
                      </div>

                      {/* Duration */}
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-sm font-medium">Duration</p>
                        <p className="text-lg font-semibold text-foreground">{appointment.duration} minutes</p>
                      </div>

                      {/* Room */}
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-sm font-medium">Room Number</p>
                        <p className="text-lg font-semibold text-foreground">{appointment.roomNumber}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Report Section */}
                {report && (
                  <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                    <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4 border-b border-border">
                      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Medical Report
                      </h2>
                    </div>
                    <div className="p-6 space-y-6">
                      {/* Procedures */}
                      {report.procedures && report.procedures.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
                            Procedures Performed
                          </h3>
                          <div className="space-y-3">
                            {report.procedures.map((procedure: any, idx: number) => (
                              <div key={idx} className="flex gap-4 p-3 bg-muted/50 rounded-lg border border-border/50">
                                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground">
                                    {typeof procedure === "string" ? procedure : procedure.name}
                                  </p>
                                  {typeof procedure === "object" && procedure.description && (
                                    <p className="text-sm text-muted-foreground mt-1">{procedure.description}</p>
                                  )}
                                  {typeof procedure === "object" && procedure.tooth && (
                                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                                      Tooth #{procedure.tooth}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Findings */}
                      {report.findings && (
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                            Findings
                          </h3>
                          <div className="bg-muted/50 border border-border/50 rounded-lg p-4">
                            <p className="text-foreground leading-relaxed">{report.findings}</p>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {report.notes && (
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                            Clinical Notes
                          </h3>
                          <div className="bg-muted/50 border border-border/50 rounded-lg p-4">
                            <p className="text-foreground leading-relaxed">{report.notes}</p>
                          </div>
                        </div>
                      )}

                      {/* Follow-up */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                        {report.nextVisit && (
                          <div>
                            <p className="text-sm text-muted-foreground font-medium mb-2">Next Visit</p>
                            <p className="text-foreground font-semibold">
                              {new Date(report.nextVisit).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        )}
                        {report.followUpDetails && (
                          <div>
                            <p className="text-sm text-muted-foreground font-medium mb-2">Follow-up Instructions</p>
                            <p className="text-foreground text-sm">{report.followUpDetails}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!report && appointment.status !== "cancelled" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      No medical report has been created for this appointment yet.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                {/* Patient Info Card */}
                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4 border-b border-border">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Patient Information
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                        Patient ID
                      </p>
                      <p className="text-sm font-mono text-foreground break-all bg-muted/50 p-2 rounded">
                        {appointment.patientId}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                        Doctor ID
                      </p>
                      <p className="text-sm font-mono text-foreground break-all bg-muted/50 p-2 rounded">
                        {appointment.doctorId}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                        Appointment ID
                      </p>
                      <p className="text-sm font-mono text-foreground break-all bg-muted/50 p-2 rounded">
                        {appointment._id || appointment.id}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Summary */}
                <div className={`rounded-xl shadow-sm border p-6 ${statusConfig.color}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <StatusIcon className="w-6 h-6" />
                    <h3 className="font-semibold">Status Summary</h3>
                  </div>
                  <p className="text-sm opacity-90">
                    {appointment.status === "completed" &&
                      "This appointment has been completed and the report is available."}
                    {appointment.status === "confirmed" && "This appointment is confirmed and scheduled."}
                    {appointment.status === "cancelled" && "This appointment has been cancelled."}
                    {appointment.status === "closed" && "This appointment has been closed by the doctor."}
                    {!["completed", "confirmed", "cancelled", "closed"].includes(appointment.status) &&
                      "This appointment is pending."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
