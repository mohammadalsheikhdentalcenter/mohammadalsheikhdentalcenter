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
    <div className="flex h-screen bg-muted/40">
      <Sidebar />

      <main className="flex-1 overflow-auto pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* Header */}
          <div className="mb-10">
            <button
              onClick={() => router.push("/dashboard/appointments")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Appointments
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-foreground">
                  {appointment.patientName}
                </h1>
                <p className="text-muted-foreground text-sm">
                  Appointment details & medical record
                </p>
              </div>

              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-sm ${statusConfig.color}`}
              >
                <StatusIcon className="w-4 h-4" />
                {statusConfig.label}
              </div>
            </div>
          </div>

          {/* Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left */}
            <div className="lg:col-span-2 space-y-8">

              {/* Appointment Card */}
              <div className="bg-background rounded-2xl shadow-md">
                <div className="px-6 py-4 border-b">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <Calendar className="w-5 h-5 text-primary" />
                    Appointment Information
                  </h2>
                </div>

                <div className="p-6 grid sm:grid-cols-2 gap-6">
                  {[
                    ["Doctor", appointment.doctorName, Stethoscope],
                    ["Type", appointment.type],
                    ["Date", new Date(appointment.date).toDateString()],
                    ["Time", appointment.time, Clock],
                    ["Duration", `${appointment.duration} minutes`],
                    ["Room", appointment.roomNumber],
                  ].map(([label, value, Icon]: any, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        {Icon && <Icon className="w-4 h-4" />}
                        {label}
                      </div>
                      <p className="text-base font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Report */}
              {report && (
                <div className="bg-background rounded-2xl shadow-md">
                  <div className="px-6 py-4 border-b">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                      <FileText className="w-5 h-5 text-primary" />
                      Medical Report
                    </h2>
                  </div>

                  <div className="p-6 space-y-6">

                    {report.procedures?.length > 0 && (
                      <section>
                        <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                          Procedures
                        </h3>
                        <div className="space-y-3">
                          {report.procedures.map((p: any, i: number) => (
                            <div
                              key={i}
                              className="p-4 rounded-xl bg-muted/50"
                            >
                              <p className="font-medium">
                                {typeof p === "string" ? p : p.name}
                              </p>
                              {p.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {p.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {report.findings && (
                      <section>
                        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                          Findings
                        </h3>
                        <p className="leading-relaxed">
                          {report.findings}
                        </p>
                      </section>
                    )}

                    {report.notes && (
                      <section>
                        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                          Clinical Notes
                        </h3>
                        <p className="leading-relaxed">
                          {report.notes}
                        </p>
                      </section>
                    )}
                  </div>
                </div>
              )}

              {!report && appointment.status !== "cancelled" && (
                <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
                  No medical report has been created yet.
                </div>
              )}
            </div>

            {/* Right */}
            <div className="space-y-6">

              <div className="bg-background rounded-2xl shadow-md p-6">
                <h3 className="flex items-center gap-2 font-semibold mb-4">
                  <User className="w-5 h-5 text-primary" />
                  Patient Info
                </h3>

                {[
                  ["Patient ID", appointment.patientId],
                  ["Doctor ID", appointment.doctorId],
                  ["Appointment ID", appointment._id || appointment.id],
                ].map(([label, value], i) => (
                  <div key={i} className="mb-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      {label}
                    </p>
                    <p className="text-xs font-mono bg-muted/50 p-2 rounded-lg">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className={`rounded-2xl p-6 shadow-md ${statusConfig.color}`}>
                <div className="flex items-center gap-3 mb-2">
                  <StatusIcon className="w-5 h-5" />
                  <h3 className="font-semibold">Status</h3>
                </div>
                <p className="text-sm opacity-90">
                  {appointment.status}
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
