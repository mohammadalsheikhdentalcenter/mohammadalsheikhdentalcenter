//@ts-nocheck
"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/components/auth-context"
import { useEffect, useState } from "react"
import {
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  UserPlus,
  ArrowRightLeft,
  Eye,
  Clock,
  CheckCircle,
  X,
  FileText,
  User,
  ArrowRight,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"

interface PatientReferral {
  _id: string
  doctorId: string
  doctorName: string
  patientName: string
  patientPhone: string
  referralReason: string
  status: "pending" | "in-progress" | "completed" | "rejected"
  createdAt: string
  updatedAt: string
}

interface AppointmentReferral {
  _id: string
  id: string
  appointmentId: string
  patientId: string
  patientName: string
  fromDoctorId: string
  fromDoctorName: string
  toDoctorId: string
  toDoctorName: string
  referralReason: string
  status: "pending" | "accepted" | "completed" | "referred_back" | "rejected"
  notes: string
  createdAt: string
  updatedAt: string
}

export default function DashboardPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    appointments: 0,
    patients: 0,
    lowStock: 0,
    revenue: 0,
    pendingRequests: 0,
    patientReferrals: 0,
    appointmentReferrals: 0,
  })
  const [appointments, setAppointments] = useState([])
  const [doctorRequests, setDoctorRequests] = useState([])
  const [recentPatientReferrals, setRecentPatientReferrals] = useState<PatientReferral[]>([])
  const [referrals, setReferrals] = useState<PatientReferral[]>([])
  const [recentAppointmentReferrals, setRecentAppointmentReferrals] = useState<AppointmentReferral[]>([])
  const [selectedReferral, setSelectedReferral] = useState<AppointmentReferral | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionNotes, setActionNotes] = useState("")
  const [selectedPatientReferral, setSelectedPatientReferral] = useState<PatientReferral | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [showExtraChargesModal, setShowExtraChargesModal] = useState(false)
  const [selectedBillingForCharges, setSelectedBillingForCharges] = useState<any>(null)
  const [extraChargesForm, setExtraChargesForm] = useState({
    amount: "",
    reason: "",
  })
  const [extraChargesLoading, setExtraChargesLoading] = useState(false)

  const isToday = (dateString: string) => {
    const appointmentDate = new Date(dateString)
    const today = new Date()
    return (
      appointmentDate.getFullYear() === today.getFullYear() &&
      appointmentDate.getMonth() === today.getMonth() &&
      appointmentDate.getDate() === today.getDate()
    )
  }

  useEffect(() => {
    if (token) {
      fetchDashboardData()
    }
  }, [token])

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const [
        appointmentsRes,
        patientsRes,
        inventoryRes,
        billingRes,
        referralsRes,
        patientReferralsRes,
        appointmentReferralsForAdminRes,
        patientReferralsForAdminRes,
      ] = await Promise.allSettled([
        fetch("/api/appointments", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/patients", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/inventory", {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        fetch("/api/billing", {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        user?.role === "doctor"
          ? fetch("/api/appointment-referrals?type=all", {
              headers: { Authorization: `Bearer ${token}` },
            })
          : Promise.resolve(null),
        user?.role === "doctor"
          ? fetch("/api/patient-referrals", {
              headers: { Authorization: `Bearer ${token}` },
            })
          : Promise.resolve(null),
        user?.role === "admin" || user?.role === "receptionist"
          ? fetch("/api/appointment-referrals?type=all", {
              headers: { Authorization: `Bearer ${token}` },
            })
          : Promise.resolve(null),
        user?.role === "admin" || user?.role === "receptionist"
          ? fetch("/api/patient-referrals", {
              headers: { Authorization: `Bearer ${token}` },
            })
          : Promise.resolve(null),
      ])

      let appointmentCount = 0
      let patientCount = 0
      let lowStockCount = 0
      let totalRevenue = 0
      let pendingRequestsCount = 0
      let patientReferralsCount = 0
      let appointmentReferralsCount = 0

      if (appointmentsRes.status === "fulfilled" && appointmentsRes.value.ok) {
        const data = await appointmentsRes.value.json()
        const todayAppointments = (data.appointments || []).filter((apt: any) => isToday(apt.date))
        setAppointments(todayAppointments)
        appointmentCount = todayAppointments.length
      }

      if (patientsRes.status === "fulfilled" && patientsRes.value.ok) {
        const data = await patientsRes.value.json()
        patientCount = data.patients?.length || 0
      }

      if (inventoryRes?.status === "fulfilled" && inventoryRes.value?.ok) {
        const data = await inventoryRes.value.json()
        lowStockCount = data.inventory?.filter((item: any) => item.quantity < item.minStock).length || 0
      }

      if (billingRes?.status === "fulfilled" && billingRes.value?.ok) {
        const data = await billingRes.value.json()
        totalRevenue = data.billing?.reduce((sum: number, b: any) => sum + b.totalAmount, 0) || 0
      }

      if (user?.role === "doctor" && referralsRes?.status === "fulfilled" && referralsRes.value?.ok) {
        const data = await referralsRes.value.json()
        setDoctorRequests(data.referrals || [])
        appointmentReferralsCount = (data.referrals || []).length
        pendingRequestsCount = (data.referrals || []).filter(
          (r: any) => r.status === "pending" || r.status === "accepted",
        ).length
        const allAppointmentReferrals = data.referrals || []
        const recent = allAppointmentReferrals
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3)
        setRecentAppointmentReferrals(recent)
      }

      if (user?.role === "doctor" && patientReferralsRes?.status === "fulfilled" && patientReferralsRes.value?.ok) {
        const data = await patientReferralsRes.value.json()
        patientReferralsCount = (data.referrals || []).length
        const allPatientReferrals = data.referrals || []
        const recent = allPatientReferrals
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3)
        setRecentPatientReferrals(recent)
      }

      if (
        (user?.role === "admin" || user?.role === "receptionist") &&
        appointmentReferralsForAdminRes?.status === "fulfilled" &&
        appointmentReferralsForAdminRes.value?.ok
      ) {
        const data = await appointmentReferralsForAdminRes.value.json()
        setDoctorRequests(data.referrals || [])
        appointmentReferralsCount = (data.referrals || []).length
        const allAppointmentReferrals = data.referrals || []
        const recent = allAppointmentReferrals
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
        setRecentAppointmentReferrals(recent)
      }

      //  Fixed patient referrals fetching for admin/receptionist
      if (
        (user?.role === "admin" || user?.role === "receptionist") &&
        patientReferralsForAdminRes?.status === "fulfilled" &&
        patientReferralsForAdminRes.value?.ok
      ) {
        const data = await patientReferralsForAdminRes.value.json()
        console.log("[v0] Patient referrals API response:", data)

        if (data.referrals && Array.isArray(data.referrals)) {
          const allPatientReferrals = data.referrals
          console.log("[v0] Total patient referrals found:", allPatientReferrals.length)
          console.log("[v0] Patient referrals data:", allPatientReferrals)

          const recent = allPatientReferrals
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)

          console.log("[v0] Setting recent patient referrals:", recent)
          setRecentPatientReferrals(recent)
        } else {
          console.log("[v0] No referrals array in response")
          setRecentPatientReferrals([])
        }
      }

      setStats({
        appointments: appointmentCount,
        patients: patientCount,
        lowStock: lowStockCount,
        revenue: totalRevenue,
        pendingRequests: pendingRequestsCount,
        patientReferrals: patientReferralsCount,
        appointmentReferrals: appointmentReferralsCount,
      })
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const requestExtraCharges = async () => {
    if (!selectedBillingForCharges || !extraChargesForm.amount || !extraChargesForm.reason) {
      toast.error("Please fill in all fields")
      return
    }

    setExtraChargesLoading(true)
    try {
      const res = await fetch(`/api/billing/${selectedBillingForCharges._id}/extra-charges`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(extraChargesForm.amount),
          reason: extraChargesForm.reason,
        }),
      })

      if (res.ok) {
        toast.success("Extra charges request sent to admin and receptionist for approval")
        setShowExtraChargesModal(false)
        setExtraChargesForm({ amount: "", reason: "" })
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to request extra charges")
      }
    } catch (error) {
      console.error("Failed to request extra charges:", error)
      toast.error("Error requesting extra charges")
    } finally {
      setExtraChargesLoading(false)
    }
  }

  const handleAction = async (
    referralId: string,
    action: "accept" | "reject" | "refer_back" | "complete",
    notes?: string,
  ) => {
    console.log(`[FRONTEND] Action triggered:`, { referralId, action, notes })
    setActionLoading(true)
    try {
      const res = await fetch(`/api/appointment-referrals/${referralId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, notes }),
      })

      console.log(`[FRONTEND] Response status:`, res.status)
      const data = await res.json()
      console.log(`[FRONTEND] Response data:`, data)

      if (res.ok) {
        // Update the local state immediately
        setRecentAppointmentReferrals((prev) => prev.map((r) => (r._id === referralId ? data.referral : r)))

        // Also update doctorRequests if it contains this referral
        setDoctorRequests((prev) => prev.map((r) => (r._id === referralId ? data.referral : r)))

        const actionMessages = {
          accept: "✓ Referral accepted! You can now proceed with the treatment.",
          reject: "✗ Referral rejected.",
          refer_back: "↶ Appointment referred back to the original doctor.",
          complete: "✓ Treatment completed and referred back.",
        }

        toast.success(actionMessages[action as keyof typeof actionMessages])
        setSelectedReferral(null)
        setActionNotes("")

        // Refresh dashboard data to ensure everything is in sync
        await fetchDashboardData(true)
      } else {
        console.error(`[FRONTEND] Failed to ${action} referral:`, data.error)
        toast.error(data.error || `Failed to ${action} referral`)
      }
    } catch (error) {
      console.error("[FRONTEND] Failed to update referral:", error)
      toast.error("Network error updating referral")
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800 border border-amber-300"
      case "accepted":
        return "bg-blue-100 text-blue-800 border border-blue-300"
      case "completed":
        return "bg-green-100 text-green-800 border border-green-300"
      case "referred_back":
        return "bg-purple-100 text-purple-800 border border-purple-300"
      case "rejected":
        return "bg-red-100 text-red-800 border border-red-300"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-3 h-3" />
      case "accepted":
        return <CheckCircle className="w-3 h-3" />
      case "completed":
        return <CheckCircle className="w-3 h-3" />
      case "referred_back":
        return <ArrowRight className="w-3 h-3" />
      case "rejected":
        return <X className="w-3 h-3" />
      default:
        return null
    }
  }

  const isSentReferral = (referral: AppointmentReferral) => {
    return String(referral.fromDoctorId) === String(user?.userId || user?.id)
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <main className="flex-1 overflow-auto lg:ml-0 m-auto">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto lg:ml-0 mt-12 sm:mt-3">
          <div className="p-6 sm:p-4 md:p-6 lg:p-8">
            {/* Dashboard Header with Refresh Button */}
            <div className="dashboard-header flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-start sm:items-center mb-4 sm:mb-6 lg:mb-8 ">
              <div className="flex-1">
                <h1 className="dashboard-title text-xl sm:text-2xl lg:text-3xl">Welcome back, {user?.name}!</h1>
                <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                  Here's what's happening at your clinic today
                </p>
              </div>
              <button
                onClick={() => fetchDashboardData(true)}
                disabled={refreshing}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-3 sm:px-4 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span className="hidden xs:inline">{refreshing ? "Refreshing..." : "Refresh"}</span>
                <span className="inline xs:hidden">{refreshing ? "..." : "Refresh"}</span>
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 lg:mb-8">
              {refreshing ? (
                // Loading state for stats
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="stat-card">
                    <div className="stat-icon bg-muted">
                      <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                    </div>
                    <p className="stat-label">Loading...</p>
                    <p className="stat-value">-</p>
                  </div>
                ))
              ) : (
                <>
                  <div className="stat-card">
                    <div className="stat-icon bg-gradient-to-br from-primary/20 to-primary/10">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <p className="stat-label">Today's Appointments</p>
                    <p className="stat-value">{stats.appointments}</p>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon bg-gradient-to-br from-accent/20 to-accent/10">
                      <Users className="w-6 h-6 text-accent" />
                    </div>
                    <p className="stat-label">Active Patients</p>
                    <p className="stat-value">{stats.patients}</p>
                  </div>

                  {user?.role === "doctor" && (
                    <>
                      <Link
                        href="/dashboard/request-status"
                        className="stat-card hover:shadow-lg transition-shadow cursor-pointer"
                      >
                        <div className="stat-icon bg-gradient-to-br from-indigo-100 to-indigo-50">
                          <ArrowRightLeft className="w-6 h-6 text-indigo-600" />
                        </div>
                        <p className="stat-label">Appointment Forwards</p>
                        <p className="stat-value">{stats.appointmentReferrals}</p>
                        <p className="text-xs text-muted-foreground mt-1">Appointments forwarded to/from doctors</p>
                      </Link>

                      <Link
                        href="/dashboard/request-status"
                        className="stat-card hover:shadow-lg transition-shadow cursor-pointer"
                      >
                        <div className="stat-icon bg-gradient-to-br from-emerald-100 to-emerald-50">
                          <UserPlus className="w-6 h-6 text-emerald-600" />
                        </div>
                        <p className="stat-label">New Patient Requests</p>
                        <p className="stat-value">{stats.patientReferrals}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Unregistered patients sent to reception for appointment
                        </p>
                      </Link>
                    </>
                  )}

                  {user?.role !== "doctor" && (
                    <>
                      <div className="stat-card">
                        <div className="stat-icon bg-gradient-to-br from-destructive/20 to-destructive/10">
                          <AlertCircle className="w-6 h-6 text-destructive" />
                        </div>
                        <p className="stat-label">Low Stock Items</p>
                        <p className="stat-value">{stats.lowStock}</p>
                      </div>

                      <div className="stat-card">
                        <div className="stat-icon bg-gradient-to-br from-secondary/20 to-secondary/10">
                          <TrendingUp className="w-6 h-6 text-secondary" />
                        </div>
                        <p className="stat-label">Total Revenue</p>
                        <p className="stat-value">${stats.revenue.toFixed(0)}</p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {(user?.role === "admin" || user?.role === "receptionist") && recentPatientReferrals.length > 0 && (
              <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden mb-4 sm:mb-6 lg:mb-8">
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-emerald-600" />
                    Recent Patient Referral Requests
                  </h2>
                  <Link
                    href="/dashboard/forwarded-requests"
                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    View All →
                  </Link>
                </div>
                {refreshing ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted border-b border-border">
                        <tr>
                          <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground">Patient</th>
                          <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                            Phone
                          </th>
                          <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                            Referred By
                          </th>
                          <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                            Reason
                          </th>
                          <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground">Status</th>
                          <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentPatientReferrals.map((referral) => (
                          <tr key={referral._id} className="border-b border-border hover:bg-muted/50 transition-colors">
                            <td className="px-4 sm:px-6 py-3 font-medium text-foreground">{referral.patientName}</td>
                            <td className="px-4 sm:px-6 py-3 text-muted-foreground hidden sm:table-cell text-sm">
                              {referral.patientPhone}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-muted-foreground hidden sm:table-cell text-sm">
                              Dr. {referral.doctorName}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-muted-foreground hidden md:table-cell text-sm truncate max-w-xs">
                              {referral.referralReason}
                            </td>
                            <td className="px-4 sm:px-6 py-3">
                              <span
                                className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium ${
                                  referral.status === "pending"
                                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                                    : referral.status === "in-progress"
                                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                                      : referral.status === "completed"
                                        ? "bg-green-100 text-green-800 border border-green-300"
                                        : "bg-red-100 text-red-800 border border-red-300"
                                }`}
                              >
                                {getStatusIcon(referral.status)}
                                {referral.status.charAt(0).toUpperCase() + referral.status.slice(1).replace("-", " ")}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-3">
                              {(referral.status === "pending" || referral.status === "in-progress") && (
                                <button
                                  onClick={() => router.push("/dashboard/forwarded-requests")}
                                  className="text-xs text-primary hover:underline cursor-pointer font-medium inline-flex items-center gap-1"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Process Request
                                </button>
                              )}
                              {(referral.status === "completed" || referral.status === "rejected") && (
                                <button
                                  onClick={() => setSelectedPatientReferral(referral)}
                                  className="text-xs text-muted-foreground hover:text-foreground font-medium inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  View
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Recent Patient Requests */}
            {user?.role === "doctor" && (
              <div className="stat-card mb-4 sm:mb-6 lg:mb-8">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-emerald-600" />
                    Recent Patient Requests
                  </h2>
                  <Link
                    href="/dashboard/request-status"
                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    View All →
                  </Link>
                </div>
                {refreshing ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : recentPatientReferrals.length > 0 ? (
                  <div className="table-responsive overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-muted-foreground">
                            Patient Name
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-muted-foreground">
                            Phone
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-muted-foreground">
                            Referred By
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-muted-foreground">
                            Status
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-muted-foreground hidden sm:table-cell">
                            Date
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-muted-foreground">
                            Reason
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-muted-foreground">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentPatientReferrals.map((req: any) => (
                          <tr key={req._id} className="border-b border-border hover:bg-muted/50 transition-colors">
                            <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium">{req.patientName}</td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-muted-foreground">{req.patientPhone}</td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-muted-foreground">Dr. {req.doctorName}</td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4">
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  req.status === "pending"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                    : req.status === "in-progress"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                      : req.status === "completed"
                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                }`}
                              >
                                {req.status}
                              </span>
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 hidden sm:table-cell text-muted-foreground">
                              {new Date(req.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-muted-foreground truncate max-w-xs">
                              {req.referralReason}
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4">
                              <button
                                onClick={() => setSelectedPatientReferral(req)}
                                className="flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors text-xs cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8 text-sm">No patient requests found</p>
                )}
              </div>
            )}

            {/* Recent Appointment Forwards */}
            {user?.role === "doctor" && (
              <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden mb-4 sm:mb-6 lg:mb-8">
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                    Recent Appointment Forwards
                  </h2>
                  <Link
                    href="/dashboard/request-status"
                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    View All →
                  </Link>
                </div>
                {refreshing ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : recentAppointmentReferrals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted border-b border-border">
                        <tr>
                          <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground">Patient</th>
                          <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground hidden lg:table-cell">
                            Type
                          </th>
                          <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                            Doctor
                          </th>
                          <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                            Reason
                          </th>
                          <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground">Status</th>
                          <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentAppointmentReferrals.map((referral) => (
                          <tr key={referral._id} className="border-b border-border hover:bg-muted/50 transition-colors">
                            <td className="px-4 sm:px-6 py-3 font-medium text-foreground">{referral.patientName}</td>
                            <td className="px-4 sm:px-6 py-3 hidden lg:table-cell">
                              {isSentReferral(referral) ? (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-teal-100 text-teal-800 border border-teal-300">
                                  <ArrowRight className="w-3 h-3" />
                                  Sent
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-indigo-100 text-indigo-800 border border-indigo-300">
                                  <ArrowRight className="w-3 h-3 rotate-180" />
                                  Received
                                </span>
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-muted-foreground hidden sm:table-cell text-sm">
                              {isSentReferral(referral) ? referral.toDoctorName : referral.fromDoctorName}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-muted-foreground hidden md:table-cell text-sm truncate max-w-xs">
                              {referral.referralReason}
                            </td>
                            <td className="px-4 sm:px-6 py-3">
                              <span
                                className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium ${getStatusBadgeColor(
                                  referral.status,
                                )}`}
                              >
                                {getStatusIcon(referral.status)}
                                {referral.status.charAt(0).toUpperCase() + referral.status.slice(1).replace("_", " ")}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-3">
                              <button
                                onClick={() => setSelectedReferral(referral)}
                                className="text-xs text-primary hover:underline cursor-pointer font-medium inline-flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8 text-sm">No appointment forwards found</p>
                )}
              </div>
            )}

            {/* Today's Schedule */}
            <div className="stat-card mb-4 sm:mb-6 lg:mb-8">
              <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-foreground">Today's Schedule</h2>
              {refreshing ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : appointments.length > 0 ? (
                <div className="table-responsive">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-muted-foreground">
                          Time
                        </th>
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-muted-foreground">
                          Patient
                        </th>
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-muted-foreground hidden sm:table-cell">
                          Doctor
                        </th>
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-muted-foreground hidden md:table-cell">
                          Type
                        </th>
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.slice(0, 5).map((apt) => (
                        <tr key={apt.id} className="table-row">
                          <td className="py-2 sm:py-3 px-2 sm:px-4">{apt.time}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium">{apt.patientName}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 hidden sm:table-cell">{apt.doctorName}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 hidden md:table-cell">{apt.type}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            <span className="badge-success">{apt.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8 text-sm">No appointments scheduled for today</p>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Patient Referral Modal */}
      <Dialog open={!!selectedPatientReferral} onOpenChange={(open) => !open && setSelectedPatientReferral(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              Patient Request Details
            </DialogTitle>
            <DialogDescription>View patient referral information and status</DialogDescription>
          </DialogHeader>

          {selectedPatientReferral && (
            <div className="space-y-6">
              {/* Patient Information */}
              <div className="border-b border-border pb-4">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Patient Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Patient Name</p>
                    <p className="text-foreground font-medium">{selectedPatientReferral.patientName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Phone Number</p>
                    <p className="text-foreground font-medium">{selectedPatientReferral.patientPhone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Referred By</p>
                    <p className="text-foreground font-medium">{selectedPatientReferral.doctorName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Status</p>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${
                        selectedPatientReferral.status === "pending"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : selectedPatientReferral.status === "in-progress"
                            ? "bg-blue-100 text-blue-800 border border-blue-300"
                            : selectedPatientReferral.status === "completed"
                              ? "bg-green-100 text-green-800 border border-green-300"
                              : "bg-red-100 text-red-800 border border-red-300"
                      }`}
                    >
                      {selectedPatientReferral.status.charAt(0).toUpperCase() +
                        selectedPatientReferral.status.slice(1).replace("-", " ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Referral Details */}
              <div className="border-b border-border pb-4">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Referral Reason
                </h3>
                <p className="text-foreground text-sm bg-muted p-3 rounded-lg">
                  {selectedPatientReferral.referralReason}
                </p>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Timeline
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Created</p>
                    <p className="text-foreground">
                      {new Date(selectedPatientReferral.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Last Updated</p>
                    <p className="text-foreground">
                      {new Date(selectedPatientReferral.updatedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => setSelectedPatientReferral(null)}
                className="w-full bg-muted hover:bg-muted/80 text-muted-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Appointment Referral Modal */}
      <Dialog open={!!selectedReferral} onOpenChange={(open) => !open && setSelectedReferral(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Referral Details & Actions
              {selectedReferral &&
                (isSentReferral(selectedReferral) ? (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-teal-100 text-teal-800 border border-teal-300">
                    <ArrowRight className="w-3 h-3" />
                    Sent
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-indigo-100 text-indigo-800 border border-indigo-300">
                    <ArrowRight className="w-3 h-3 rotate-180" />
                    Received
                  </span>
                ))}
            </DialogTitle>
            <DialogDescription>
              {selectedReferral && isSentReferral(selectedReferral)
                ? "View the status of your referral request"
                : "Manage the referral request with complete control"}
            </DialogDescription>
          </DialogHeader>

          {selectedReferral && (
            <div className="space-y-6">
              {/* Referral Flow Timeline */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-900 mb-3">REFERRAL FLOW</p>
                <div className="flex items-center justify-between text-xs">
                  <div className="text-center">
                    <div className="font-semibold text-blue-900">{selectedReferral.fromDoctorName}</div>
                    <div className="text-blue-700">(Referred From)</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                  <div className="text-center">
                    <div className="font-semibold text-blue-900">{selectedReferral.toDoctorName}</div>
                    <div className="text-blue-700">(Referred To)</div>
                  </div>
                  {selectedReferral.status === "referred_back" && (
                    <>
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                      <div className="text-center">
                        <div className="font-semibold text-green-900">{selectedReferral.fromDoctorName}</div>
                        <div className="text-green-700">(Returned)</div>
                      </div>
                    </>
                  )}
                  {selectedReferral.status === "rejected" && (
                    <>
                      <X className="w-4 h-4 text-red-600" />
                      <div className="text-center">
                        <div className="font-semibold text-red-900">Rejected</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Patient & Doctor Info */}
              <div className="border-b border-border pb-4">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Request Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Patient</p>
                    <p className="text-foreground font-medium">{selectedReferral.patientName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">From Doctor</p>
                    <p className="text-foreground font-medium">{selectedReferral.fromDoctorName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">To Doctor</p>
                    <p className="text-foreground font-medium">{selectedReferral.toDoctorName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Current Status</p>
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium ${getStatusBadgeColor(
                        selectedReferral.status,
                      )}`}
                    >
                      {getStatusIcon(selectedReferral.status)}
                      {selectedReferral.status.charAt(0).toUpperCase() +
                        selectedReferral.status.slice(1).replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">
                      {isSentReferral(selectedReferral) ? "Sent Date" : "Received Date"}
                    </p>
                    <p className="text-foreground">
                      {new Date(selectedReferral.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Referral Reason */}
              <div className="border-b border-border pb-4">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Referral Reason
                </h3>
                <p className="text-foreground text-sm bg-muted p-3 rounded-lg">{selectedReferral.referralReason}</p>
              </div>

              {/* Notes (if any) */}
              {selectedReferral.notes && (
                <div className="border-b border-border pb-4">
                  <h3 className="font-semibold text-foreground mb-2">Treatment Notes</h3>
                  <p className="text-foreground text-sm bg-green-50 border border-green-200 p-3 rounded-lg">
                    {selectedReferral.notes}
                  </p>
                </div>
              )}

              <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-border">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-3">
                  {isSentReferral(selectedReferral) ? "Referral Status" : "Actions"}
                </p>

                {isSentReferral(selectedReferral) ? (
                  // Doctor who SENT the referral - VIEW ONLY
                  <>
                    {selectedReferral.status === "pending" && (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <p className="text-sm text-amber-800">
                          <strong>Pending:</strong> Waiting for {selectedReferral.toDoctorName} to accept or reject this
                          referral.
                        </p>
                      </div>
                    )}

                    {selectedReferral.status === "accepted" && (
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <p className="text-sm text-blue-800">
                          <strong>Accepted:</strong> {selectedReferral.toDoctorName} has accepted this referral and is
                          currently treating the patient.
                        </p>
                      </div>
                    )}

                    {selectedReferral.status === "completed" && (
                      <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <p className="text-sm text-green-800">
                          <strong>Completed:</strong> This referral has been completed and returned to you.
                        </p>
                      </div>
                    )}

                    {selectedReferral.status === "referred_back" && (
                      <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg flex items-center gap-2">
                        <ArrowRight className="w-5 h-5 text-purple-600 flex-shrink-0" />
                        <p className="text-sm text-purple-800">
                          <strong>Referred Back:</strong> The appointment has been returned to you by{" "}
                          {selectedReferral.toDoctorName}. You can now continue treatment.
                        </p>
                      </div>
                    )}

                    {selectedReferral.status === "rejected" && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2">
                        <X className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-sm text-red-800">
                          <strong>Rejected:</strong> {selectedReferral.toDoctorName} has rejected this referral request.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  // Doctor who RECEIVED the referral - ACTIONABLE
                  <>
                    {selectedReferral.status === "pending" && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">ℹ Accept or reject this referral request</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleAction(selectedReferral._id, "accept")}
                            disabled={actionLoading}
                            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 py-3 rounded-lg transition-colors font-medium text-sm disabled:cursor-not-allowed cursor-pointer"
                          >
                            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            <CheckCircle className="w-4 h-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleAction(selectedReferral._id, "reject")}
                            disabled={actionLoading}
                            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white px-4 py-3 rounded-lg transition-colors font-medium text-sm disabled:cursor-not-allowed cursor-pointer"
                          >
                            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            <X className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedReferral.status === "accepted" && (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                          ℹ Add optional notes and refer the appointment back to the original doctor
                        </p>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Notes (Optional)</label>
                          <textarea
                            placeholder="Add any notes before referring back..."
                            value={actionNotes}
                            onChange={(e) => setActionNotes(e.target.value)}
                            disabled={actionLoading}
                            className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                            rows={3}
                          />
                        </div>
                        <button
                          onClick={() => handleAction(selectedReferral._id, "refer_back", actionNotes)}
                          disabled={actionLoading}
                          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm disabled:cursor-not-allowed cursor-pointer"
                        >
                          {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                          <ArrowRight className="w-4 h-4" />
                          Refer Back
                        </button>
                      </div>
                    )}

                    {selectedReferral.status === "completed" && (
                      <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <p className="text-sm text-green-800">
                          <strong>Completed:</strong> You have completed this referral and returned it to{" "}
                          {selectedReferral.fromDoctorName}.
                        </p>
                      </div>
                    )}

                    {selectedReferral.status === "referred_back" && (
                      <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg flex items-center gap-2">
                        <ArrowRight className="w-5 h-5 text-purple-600 flex-shrink-0" />
                        <p className="text-sm text-purple-800">
                          <strong>Referred Back:</strong> You have returned this appointment to{" "}
                          {selectedReferral.fromDoctorName}.
                        </p>
                      </div>
                    )}

                    {selectedReferral.status === "rejected" && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2">
                        <X className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-sm text-red-800">
                          <strong>Rejected:</strong> You have rejected this referral request from{" "}
                          {selectedReferral.fromDoctorName}.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={() => setSelectedReferral(null)}
                className="w-full bg-muted hover:bg-muted/80 text-muted-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* add modal dialog for extra charges at the end before closing ProtectedRoute */}
      <Dialog open={showExtraChargesModal} onOpenChange={setShowExtraChargesModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Extra Charges</DialogTitle>
            <DialogDescription>
              Request additional charges for this billing record. Requires approval from admin or receptionist.
            </DialogDescription>
          </DialogHeader>

          {selectedBillingForCharges && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Current Bill Amount:</p>
                <p className="text-xl font-bold text-foreground">${selectedBillingForCharges.totalAmount.toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Additional Amount ($)</label>
                <input
                  type="number"
                  value={extraChargesForm.amount}
                  onChange={(e) => setExtraChargesForm({ ...extraChargesForm, amount: e.target.value })}
                  placeholder="Enter amount"
                  step="0.01"
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Reason for Extra Charges</label>
                <textarea
                  value={extraChargesForm.reason}
                  onChange={(e) => setExtraChargesForm({ ...extraChargesForm, reason: e.target.value })}
                  placeholder="Explain why additional charges are needed..."
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-text resize-none"
                  rows={3}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  This request will be sent to admin and receptionist for review and approval.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={requestExtraCharges}
                  disabled={extraChargesLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:cursor-not-allowed"
                >
                  {extraChargesLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Request
                </button>
                <button
                  onClick={() => setShowExtraChargesModal(false)}
                  disabled={extraChargesLoading}
                  className="flex-1 bg-muted hover:bg-muted/80 text-muted-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
