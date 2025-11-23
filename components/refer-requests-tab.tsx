//@ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Loader2, AlertCircle, ArrowRight, CheckCircle, Eye, Clock, User, FileText, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useAuth } from "@/components/auth-context"

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

interface ReferRequestsTabProps {
  token: string
}

export function ReferRequestsTab({ token }: ReferRequestsTabProps) {
  const { user } = useAuth()
  const currentUserId = user?.userId || user?.id

  const [referrals, setReferrals] = useState<AppointmentReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReferral, setSelectedReferral] = useState<AppointmentReferral | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionNotes, setActionNotes] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentReferral["status"]>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchReferrals()
  }, [])

  const fetchReferrals = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/appointment-referrals", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setReferrals(data.referrals || [])
      } else {
        toast.error("Failed to fetch referral requests")
      }
    } catch (error) {
      console.error("Failed to fetch referrals:", error)
      toast.error("Error fetching referral requests")
    } finally {
      setLoading(false)
    }
  }

  const filteredReferrals = referrals.filter((referral) => {
    const matchesSearch =
      referral.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      referral.fromDoctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      referral.toDoctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      referral.referralReason.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || referral.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredReferrals.length / itemsPerPage)
  const paginatedReferrals = filteredReferrals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  // In your frontend component
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
        setReferrals(referrals.map((r) => (r._id === referralId ? data.referral : r)))

        const actionMessages = {
          accept: "✓ Referral accepted! You can now proceed with the treatment.",
          reject: "✗ Referral rejected.",
          refer_back: "↶ Appointment referred back to the original doctor.",
          complete: "✓ Treatment completed and referred back.",
        }

        toast.success(actionMessages[action as keyof typeof actionMessages])
        setSelectedReferral(null)
        setActionNotes("")
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
    return String(referral.fromDoctorId) === String(currentUserId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const pendingReferrals = referrals.filter((r) => r.status === "pending")
  const acceptedReferrals = referrals.filter((r) => r.status === "accepted")
  const completedReferrals = referrals.filter((r) => r.status === "completed")
  const referredBackReferrals = referrals.filter((r) => r.status === "referred_back")
  const rejectedReferrals = referrals.filter((r) => r.status === "rejected")

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card rounded-lg shadow-md border border-amber-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Pending Requests</p>
              <p className="text-2xl font-bold text-amber-600 mt-2">{pendingReferrals.length}</p>
            </div>
            <Clock className="w-8 h-8 text-amber-200" />
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-md border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Accepted</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{acceptedReferrals.length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-md border border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Completed</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{completedReferrals.length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-200" />
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-md border border-purple-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Referred Back</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">{referredBackReferrals.length}</p>
            </div>
            <ArrowRight className="w-8 h-8 text-purple-200" />
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-md border border-red-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Rejected</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{rejectedReferrals.length}</p>
            </div>
            <X className="w-8 h-8 text-red-200" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-md border border-border p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by patient name, doctor, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === "pending"
                ? "bg-amber-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter("accepted")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === "accepted"
                ? "bg-blue-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Accepted
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === "completed"
                ? "bg-green-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setStatusFilter("referred_back")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === "referred_back"
                ? "bg-purple-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Referred Back
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === "rejected" ? "bg-red-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Rejected
          </button>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {paginatedReferrals.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
          {Math.min(currentPage * itemsPerPage, filteredReferrals.length)} of {filteredReferrals.length} referrals
        </div>
      </div>

      {/* List */}
      {filteredReferrals.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery || statusFilter !== "all"
              ? "No referral requests match your search or filter"
              : "No referral requests"}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden">
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
                {paginatedReferrals.map((referral) => (
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
                        className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium ${getStatusBadgeColor(referral.status)}`}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-muted border-t border-border">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-card text-foreground border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground border border-border hover:bg-muted"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-card text-foreground border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

    <Dialog open={!!selectedReferral} onOpenChange={(open) => !open && setSelectedReferral(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl flex items-center gap-2 flex-wrap">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
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
            <DialogDescription className="text-sm sm:text-base">
              {selectedReferral && isSentReferral(selectedReferral)
                ? "View the status of your referral request"
                : "Manage the referral request with complete control"}
            </DialogDescription>
          </DialogHeader>

          {selectedReferral && (
            <div className="space-y-4 sm:space-y-6">
              {/* Referral Flow Timeline */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <p className="text-xs font-semibold text-blue-900 mb-2 sm:mb-3">REFERRAL FLOW</p>
                <div className="flex items-center justify-between text-xs">
                  <div className="text-center">
                    <div className="font-semibold text-blue-900 text-xs sm:text-sm">{selectedReferral.fromDoctorName}</div>
                    <div className="text-blue-700 text-xs">(Referred From)</div>
                  </div>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                  <div className="text-center">
                    <div className="font-semibold text-blue-900 text-xs sm:text-sm">{selectedReferral.toDoctorName}</div>
                    <div className="text-blue-700 text-xs">(Referred To)</div>
                  </div>
                  {selectedReferral.status === "referred_back" && (
                    <>
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                      <div className="text-center">
                        <div className="font-semibold text-green-900 text-xs sm:text-sm">{selectedReferral.fromDoctorName}</div>
                        <div className="text-green-700 text-xs">(Returned)</div>
                      </div>
                    </>
                  )}
                  {selectedReferral.status === "rejected" && (
                    <>
                      <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                      <div className="text-center">
                        <div className="font-semibold text-red-900 text-xs sm:text-sm">Rejected</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Patient & Doctor Info */}
              <div className="border-b border-border pb-3 sm:pb-4">
                <h3 className="font-semibold text-foreground mb-2 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                  <User className="w-4 h-4" />
                  Request Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Patient</p>
                    <p className="text-foreground font-medium text-sm sm:text-base">{selectedReferral.patientName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">From Doctor</p>
                    <p className="text-foreground font-medium text-sm sm:text-base">{selectedReferral.fromDoctorName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">To Doctor</p>
                    <p className="text-foreground font-medium text-sm sm:text-base">{selectedReferral.toDoctorName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Current Status</p>
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 sm:px-3 py-1 rounded-full font-medium ${getStatusBadgeColor(selectedReferral.status)}`}
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
                    <p className="text-foreground text-sm sm:text-base">
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
              <div className="border-b border-border pb-3 sm:pb-4">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm sm:text-base">
                  <FileText className="w-4 h-4" />
                  Referral Reason
                </h3>
                <p className="text-foreground text-sm bg-muted p-2 sm:p-3 rounded-lg">{selectedReferral.referralReason}</p>
              </div>

              {/* Notes (if any) */}
              {selectedReferral.notes && (
                <div className="border-b border-border pb-3 sm:pb-4">
                  <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">Treatment Notes</h3>
                  <p className="text-foreground text-sm bg-green-50 border border-green-200 p-2 sm:p-3 rounded-lg">
                    {selectedReferral.notes}
                  </p>
                </div>
              )}

              <div className="space-y-3 bg-gray-50 p-3 sm:p-4 rounded-lg border border-border">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2 sm:mb-3">
                  {isSentReferral(selectedReferral) ? "Referral Status" : "Actions"}
                </p>

                {isSentReferral(selectedReferral) ? (
                  // Doctor who SENT the referral - VIEW ONLY
                  <>
                    {selectedReferral.status === "pending" && (
                      <div className="bg-amber-50 border border-amber-200 p-2 sm:p-3 rounded-lg flex items-start gap-2">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-amber-800">
                          <strong>Pending:</strong> Waiting for {selectedReferral.toDoctorName} to accept or reject this
                          referral.
                        </p>
                      </div>
                    )}

                    {selectedReferral.status === "accepted" && (
                      <div className="bg-blue-50 border border-blue-200 p-2 sm:p-3 rounded-lg flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-blue-800">
                          <strong>Accepted:</strong> {selectedReferral.toDoctorName} has accepted this referral and is
                          currently treating the patient.
                        </p>
                      </div>
                    )}

                    {selectedReferral.status === "completed" && (
                      <div className="bg-green-50 border border-green-200 p-2 sm:p-3 rounded-lg flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-green-800">
                          <strong>Completed:</strong> This referral has been completed and returned to you.
                        </p>
                      </div>
                    )}

                    {selectedReferral.status === "referred_back" && (
                      <div className="bg-purple-50 border border-purple-200 p-2 sm:p-3 rounded-lg flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-purple-800">
                          <strong>Referred Back:</strong> The appointment has been returned to you by{" "}
                          {selectedReferral.toDoctorName}. You can now continue treatment.
                        </p>
                      </div>
                    )}

                    {selectedReferral.status === "rejected" && (
                      <div className="bg-red-50 border border-red-200 p-2 sm:p-3 rounded-lg flex items-start gap-2">
                        <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-red-800">
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
                            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors font-medium text-xs sm:text-sm disabled:cursor-not-allowed cursor-pointer"
                          >
                            {actionLoading && <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />}
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleAction(selectedReferral._id, "reject")}
                            disabled={actionLoading}
                            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors font-medium text-xs sm:text-sm disabled:cursor-not-allowed cursor-pointer"
                          >
                            {actionLoading && <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />}
                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
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
                            className="w-full px-3 sm:px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                            rows={3}
                          />
                        </div>
                        <button
                          onClick={() => handleAction(selectedReferral._id, "refer_back", actionNotes)}
                          disabled={actionLoading}
                          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm disabled:cursor-not-allowed cursor-pointer"
                        >
                          {actionLoading && <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />}
                          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                          Refer Back
                        </button>
                      </div>
                    )}

                    {selectedReferral.status === "completed" && (
                      <div className="bg-green-50 border border-green-200 p-2 sm:p-3 rounded-lg flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-green-800">
                          <strong>Completed:</strong> You have completed this referral and returned it to{" "}
                          {selectedReferral.fromDoctorName}.
                        </p>
                      </div>
                    )}

                    {selectedReferral.status === "referred_back" && (
                      <div className="bg-purple-50 border border-purple-200 p-2 sm:p-3 rounded-lg flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-purple-800">
                          <strong>Referred Back:</strong> You have returned this appointment to{" "}
                          {selectedReferral.fromDoctorName}.
                        </p>
                      </div>
                    )}

                    {selectedReferral.status === "rejected" && (
                      <div className="bg-red-50 border border-red-200 p-2 sm:p-3 rounded-lg flex items-start gap-2">
                        <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-red-800">
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
                className="w-full bg-muted hover:bg-muted/80 text-muted-foreground px-3 sm:px-4 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
