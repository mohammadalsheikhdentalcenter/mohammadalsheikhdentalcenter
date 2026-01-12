//@ts-nocheck
"use client"
import { Suspense } from "react"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/components/auth-context"
import { useState, useEffect, useMemo } from "react"
import { toast } from "react-hot-toast"
import {
  Check,
  X,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Plus,
} from "lucide-react"
import { AddBillingRequestModal } from "@/components/add-billing-request-modal"
import { BillingRequestViewModal } from "@/components/billing-request-view-modal"

function BillingRequestsContent() {
  const { user, token } = useAuth()
  const [requests, setRequests] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [loading, setLoading] = useState({
    requests: false,
    approve: false,
    reject: false,
    patients: false,
    extraCharges: false,
  })
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [processingId, setProcessingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showExtraChargesModal, setShowExtraChargesModal] = useState(false)

  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)

  useEffect(() => {
    if (token) {
      fetchBillingRequests()
      if (user?.role === "doctor") {
        fetchPatients()
      }
    }
  }, [token, statusFilter, user?.role])

  const fetchBillingRequests = async () => {
    setLoading((prev) => ({ ...prev, requests: true }))
    try {
      const statusQuery = statusFilter === "all" ? "" : `?status=${statusFilter}`
      const res = await fetch(`/api/billing/requests${statusQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const requestsWithUniqueKeys = (data.requests || []).map((request, index) => ({
          ...request,
          uniqueKey: `${request._id || "no-id"}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }))
        setRequests(requestsWithUniqueKeys)
      } else {
        const error = await res.json().catch(() => ({}))
        toast.error(error.error || "Failed to fetch billing requests")
      }
    } catch (error) {
      toast.error("Error fetching billing requests")
    } finally {
      setLoading((prev) => ({ ...prev, requests: false }))
    }
  }

  const fetchPatients = async () => {
    setLoading((prev) => ({ ...prev, patients: true }))
    try {
      const res = await fetch("/api/patients", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPatients(data.patients || [])
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to fetch patients")
      }
    } catch (error) {
      toast.error("Error fetching patients")
    } finally {
      setLoading((prev) => ({ ...prev, patients: false }))
    }
  }

  const handleApprove = async (billingId: string) => {
    setProcessingId(billingId)
    setLoading((prev) => ({ ...prev, approve: true }))
    try {
      const res = await fetch(`/api/billing/${billingId}/extra-charges`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "approve" }),
      })

      if (res.ok) {
        toast.success("Extra charges approved and added to bill")
        fetchBillingRequests()
        setIsModalOpen(false)
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to approve charges")
      }
    } catch (error) {
      toast.error("Error approving charges")
    } finally {
      setProcessingId(null)
      setLoading((prev) => ({ ...prev, approve: false }))
    }
  }

  const handleReject = async (billingId: string) => {
    setProcessingId(billingId)
    setLoading((prev) => ({ ...prev, reject: true }))
    try {
      const res = await fetch(`/api/billing/${billingId}/extra-charges`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "reject" }),
      })

      if (res.ok) {
        toast.success("Extra charges request rejected")
        fetchBillingRequests()
        setIsModalOpen(false)
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to reject charges")
      }
    } catch (error) {
      toast.error("Error rejecting charges")
    } finally {
      setProcessingId(null)
      setLoading((prev) => ({ ...prev, reject: false }))
    }
  }

  const openModal = (request) => {
    setSelectedRequest(request)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setSelectedRequest(null)
    setIsModalOpen(false)
  }

  const { filteredRequests, currentRequests, startIndex, endIndex, totalPages } = useMemo(() => {
    const filtered = requests.filter((request) => {
      if (!searchTerm) return true
      const searchLower = searchTerm.toLowerCase()
      return (
        request.patientName?.toLowerCase().includes(searchLower) ||
        request.doctorName?.toLowerCase().includes(searchLower) ||
        request.billingId?.toLowerCase().includes(searchLower) ||
        request.extraChargesRequested?.reason?.toLowerCase().includes(searchLower)
      )
    })

    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const current = filtered.slice(startIndex, endIndex)

    return {
      filteredRequests: filtered,
      currentRequests: current,
      startIndex,
      endIndex,
      totalPages,
    }
  }, [requests, searchTerm, currentPage, itemsPerPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        )
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        )
      default:
        return null
    }
  }

  const generateStableKey = (request) => {
    if (!request) return `request-${Date.now()}-${Math.random()}`

    const content = JSON.stringify({
      id: request._id,
      patient: request.patientName,
      doctor: request.doctorName,
      amount: request.extraChargesRequested?.amount,
      reason: request.extraChargesRequested?.reason,
      status: request.extraChargesRequested?.status,
    })

    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }

    return `request-${request._id || "no-id"}-${hash}`
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto md:pt-0 pt-16">
        <div className="p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 md:mb-8">
            <div>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground">Billing Requests</h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                {user?.role === "doctor"
                  ? "View the status of your billing requests"
                  : "Review and approve/reject extra charge requests from doctors"}
              </p>
            </div>

            {user?.role === "doctor" && (
              <button
                onClick={() => setShowExtraChargesModal(true)}
                disabled={loading.requests || loading.patients}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium cursor-pointer disabled:cursor-not-allowed"
              >
                {loading.extraCharges ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Extra Charges Request
              </button>
            )}
          </div>

          <div className="bg-card rounded-lg shadow-md border border-border p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder={
                    user?.role === "doctor"
                      ? "Search by patient or reason..."
                      : "Search by patient, doctor, or reason..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-xs sm:text-sm"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                {["all", "pending", "approved", "rejected"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      statusFilter === status
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchBillingRequests}
                disabled={loading.requests}
                className="w-full sm:w-fit flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-3 sm:px-4 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm disabled:opacity-50 cursor-pointer"
              >
                <Loader2 className={`w-4 h-4 ${loading.requests ? "animate-spin" : ""}`} />
                {loading.requests ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="text-left px-2 sm:px-4 md:px-6 py-2 sm:py-3 font-semibold text-muted-foreground">
                      Patient
                    </th>
                    {user?.role !== "doctor" && (
                      <th className="text-left px-2 sm:px-4 md:px-6 py-2 sm:py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                        Doctor
                      </th>
                    )}
                    <th className="text-left px-2 sm:px-4 md:px-6 py-2 sm:py-3 font-semibold text-muted-foreground hidden md:table-cell">
                      Amount
                    </th>
                    <th className="text-left px-2 sm:px-4 md:px-6 py-2 sm:py-3 font-semibold text-muted-foreground hidden lg:table-cell">
                      Payment %
                    </th>
                    <th className="text-left px-2 sm:px-4 md:px-6 py-2 sm:py-3 font-semibold text-muted-foreground hidden lg:table-cell">
                      Reason
                    </th>
                    <th className="text-left px-2 sm:px-4 md:px-6 py-2 sm:py-3 font-semibold text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left px-2 sm:px-4 md:px-6 py-2 sm:py-3 font-semibold text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading.requests ? (
                    <tr>
                      <td
                        colSpan={user?.role === "doctor" ? 6 : 7}
                        className="px-2 sm:px-4 md:px-6 py-6 sm:py-8 text-center"
                      >
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="flex justify-center items-center gap-2">
                            <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
                            <div
                              className="w-3 h-3 bg-primary rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="w-3 h-3 bg-primary rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                          <span className="text-muted-foreground text-xs sm:text-sm">Loading requests...</span>
                        </div>
                      </td>
                    </tr>
                  ) : currentRequests.length > 0 ? (
                    currentRequests.map((request, index) => (
                      <tr
                        key={generateStableKey(request)}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 font-medium text-foreground">
                          <div>
                            <div className="sm:hidden text-xs text-muted-foreground mb-1">Patient</div>
                            <p className="text-xs sm:text-sm truncate">{request.patientName}</p>
                          </div>
                        </td>
                        {user?.role !== "doctor" && (
                          <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-muted-foreground hidden sm:table-cell">
                            <div>
                              <div className="md:hidden text-xs text-muted-foreground mb-1">Doctor</div>
                              <p className="text-xs sm:text-sm truncate">{request.doctorName}</p>
                            </div>
                          </td>
                        )}
                        <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 font-semibold text-primary hidden md:table-cell">
                          <div>
                            <div className="lg:hidden text-xs text-muted-foreground mb-1">Amount</div>
                            <p className="text-xs sm:text-sm">${request.extraChargesRequested?.amount || 0}</p>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 hidden lg:table-cell">
                          <div>
                            <p
                              className={`text-xs sm:text-sm font-semibold ${
                                request.paymentPercentage >= 100
                                  ? "text-green-600 dark:text-green-400"
                                  : request.paymentPercentage >= 50
                                    ? "text-yellow-600 dark:text-yellow-400"
                                    : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {request.paymentPercentage?.toFixed(1) || 0}%
                            </p>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-muted-foreground hidden lg:table-cell max-w-xs truncate">
                          <p className="text-xs sm:text-sm">
                            {request.extraChargesRequested?.reason || "No reason provided"}
                          </p>
                        </td>
                        <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3">
                          <div>
                            <div className="sm:hidden text-xs text-muted-foreground mb-1">Status</div>
                            {getStatusBadge(request.extraChargesRequested?.status)}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openModal(request)}
                              className="text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {user?.role !== "doctor" && request.extraChargesRequested?.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleApprove(request._id)}
                                  disabled={processingId === request._id}
                                  className="text-green-600 hover:text-green-700 disabled:text-green-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                                  title="Approve"
                                >
                                  {processingId === request._id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleReject(request._id)}
                                  disabled={processingId === request._id}
                                  className="text-red-600 hover:text-red-700 disabled:text-red-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                                  title="Reject"
                                >
                                  {processingId === request._id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <X className="w-4 h-4" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={user?.role === "doctor" ? 6 : 7}
                        className="px-2 sm:px-4 md:px-6 py-6 sm:py-8 text-center text-muted-foreground text-xs sm:text-sm"
                      >
                        {searchTerm ? "No requests found matching your search" : "No billing requests"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredRequests.length > 0 && (
              <div className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Showing <span className="font-medium">{filteredRequests.length === 0 ? 0 : startIndex + 1}</span> to{" "}
                  <span className="font-medium">{Math.min(endIndex, filteredRequests.length)}</span> of{" "}
                  <span className="font-medium">{filteredRequests.length}</span>
                </div>

                <div className="flex items-center gap-1 flex-wrap justify-center">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 sm:p-2 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-0.5 sm:gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                      .map((page, index, array) => {
                        const showEllipsis = index < array.length - 1 && array[index + 1] - page > 1
                        return (
                          <div key={`page-${page}`} className="flex items-center">
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`min-w-[1.75rem] sm:min-w-[2rem] h-7 sm:h-8 px-1.5 sm:px-2 rounded text-xs sm:text-sm font-medium transition-colors ${
                                currentPage === page
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-background text-foreground hover:bg-muted border border-border"
                              }`}
                            >
                              {page}
                            </button>
                            {showEllipsis && <span className="px-0.5 sm:px-1 text-muted-foreground text-xs">...</span>}
                          </div>
                        )
                      })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1.5 sm:p-2 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <AddBillingRequestModal
        isOpen={showExtraChargesModal}
        onClose={() => setShowExtraChargesModal(false)}
        token={token}
        onSuccess={fetchBillingRequests}
        patientId=""
        patientName=""
      />
      <BillingRequestViewModal
        isOpen={isModalOpen}
        onClose={closeModal}
        request={selectedRequest}
        userRole={user?.role}
        onApprove={handleApprove}
        onReject={handleReject}
        processingId={processingId}
      />
    </div>
  )
}

export default function BillingRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-background items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <BillingRequestsContent />
    </Suspense>
  )
}
