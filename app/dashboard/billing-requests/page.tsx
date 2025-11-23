//@ts-nocheck
"use client"

import type React from "react"

import { ProtectedRoute } from "@/components/protected-route"
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

export default function BillingRequestsPage() {
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

  // New state for add billing request functionality
  const [showExtraChargesModal, setShowExtraChargesModal] = useState(false)
  const [extraChargesForm, setExtraChargesForm] = useState({
    amount: "",
    treatment: "",
    reason: "",
    patientId: "",
  })
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
        // Create unique keys by combining _id with index and timestamp
        const requestsWithUniqueKeys = (data.requests || []).map((request, index) => ({
          ...request,
          // Create a truly unique key by combining multiple identifiers
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
        const error = await res.json().catch(() => ({}))
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
        fetchBillingRequests() // Refresh the list
        setIsModalOpen(false) // Close modal if open
      } else {
        const error = await res.json().catch(() => ({}))
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
        fetchBillingRequests() // Refresh the list
        setIsModalOpen(false) // Close modal if open
      } else {
        const error = await res.json().catch(() => ({}))
        toast.error(error.error || "Failed to reject charges")
      }
    } catch (error) {
      toast.error("Error rejecting charges")
    } finally {
      setProcessingId(null)
      setLoading((prev) => ({ ...prev, reject: false }))
    }
  }

  // New function to handle billing request submission
  const handleExtraChargesRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!extraChargesForm.patientId || !extraChargesForm.amount || !extraChargesForm.treatment) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading((prev) => ({ ...prev, extraCharges: true }))
    try {
      const selectedPatient = patients.find((p) => p._id === extraChargesForm.patientId)

      const res = await fetch(`/api/billing/${extraChargesForm.patientId}/extra-charges`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number.parseFloat(extraChargesForm.amount),
          treatment: extraChargesForm.treatment,
          reason: extraChargesForm.reason,
          patientId: extraChargesForm.patientId,
          patientName: selectedPatient?.name,
        }),
      })

      if (res.ok) {
        toast.success("Extra charges request sent to admin for approval")
        setShowExtraChargesModal(false)
        setExtraChargesForm({
          amount: "",
          treatment: "",
          reason: "",
          patientId: "",
        })
        fetchBillingRequests() // Refresh the requests list
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to send charges request")
      }
    } catch (error) {
      toast.error("Error sending charges request")
    } finally {
      setLoading((prev) => ({ ...prev, extraCharges: false }))
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

  // Use useMemo to create stable filtered requests with unique keys and pagination data
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

  // Generate stable keys for table rows
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

    // Simple hash function
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }

    return `request-${request._id || "no-id"}-${hash}`
  }

  return (
    <ProtectedRoute requiredRoles={["admin", "receptionist", "doctor"]}>
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
                          colSpan={user?.role === "doctor" ? 5 : 6}
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
                              {/* View Details Button - Available for all roles */}
                              <button
                                onClick={() => openModal(request)}
                                className="text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Action Buttons - Only for admin/receptionist and pending requests */}
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
                          colSpan={user?.role === "doctor" ? 5 : 6}
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
                              {showEllipsis && (
                                <span className="px-0.5 sm:px-1 text-muted-foreground text-xs">...</span>
                              )}
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
      </div>

      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-card rounded-lg shadow-lg border border-border max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Request Details</h2>
                <button
                  onClick={closeModal}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Patient</label>
                    <p className="text-foreground font-medium">{selectedRequest.patientName}</p>
                  </div>
                  {user?.role !== "doctor" && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Doctor</label>
                      <p className="text-foreground font-medium">{selectedRequest.doctorName}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Amount</label>
                    <p className="text-primary font-bold">${selectedRequest.extraChargesRequested?.amount || 0}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reason</label>
                  <p className="text-foreground mt-1 bg-muted/50 p-3 rounded-lg">
                    {selectedRequest.extraChargesRequested?.reason || "No reason provided"}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.extraChargesRequested?.status)}</div>
                </div>

                {selectedRequest.extraChargesRequested?.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Additional Notes</label>
                    <p className="text-foreground mt-1 bg-muted/50 p-3 rounded-lg">
                      {selectedRequest.extraChargesRequested.notes}
                    </p>
                  </div>
                )}

                {/* Action Buttons in Modal */}
                {user?.role !== "doctor" && selectedRequest.extraChargesRequested?.status === "pending" && (
                  <div className="flex gap-3 pt-4 border-t border-border">
                    <button
                      onClick={() => handleApprove(selectedRequest._id)}
                      disabled={processingId === selectedRequest._id}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      {processingId === selectedRequest._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(selectedRequest._id)}
                      disabled={processingId === selectedRequest._id}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      {processingId === selectedRequest._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showExtraChargesModal && user?.role === "doctor" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-card rounded-xl shadow-2xl border border-border p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-4">Add Billing Request</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
              Select a patient and add a billing request
            </p>

            <form onSubmit={handleExtraChargesRequest} className="space-y-3 sm:space-y-4">
              {/* Patient selection dropdown */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Patient *</label>
                <select
                  value={extraChargesForm.patientId}
                  onChange={(e) => {
                    setExtraChargesForm({
                      ...extraChargesForm,
                      patientId: e.target.value,
                    })
                  }}
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-pointer"
                  required
                  disabled={loading.extraCharges || loading.patients}
                >
                  <option value="">Select a patient...</option>
                  {patients.map((patient) => (
                    <option key={patient._id} value={patient._id}>
                      {patient.name} ({patient.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Treatment/Service *</label>
                <input
                  type="text"
                  placeholder="e.g., Root Canal, Special Procedure"
                  value={extraChargesForm.treatment}
                  onChange={(e) =>
                    setExtraChargesForm({
                      ...extraChargesForm,
                      treatment: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                  required
                  disabled={loading.extraCharges}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Amount ($) *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={extraChargesForm.amount}
                  onChange={(e) =>
                    setExtraChargesForm({
                      ...extraChargesForm,
                      amount: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                  required
                  disabled={loading.extraCharges}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Reason for Charges</label>
                <textarea
                  placeholder="Explain why these additional charges are needed..."
                  value={extraChargesForm.reason}
                  onChange={(e) =>
                    setExtraChargesForm({
                      ...extraChargesForm,
                      reason: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                  rows={3}
                  disabled={loading.extraCharges}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowExtraChargesModal(false)
                    setExtraChargesForm({
                      amount: "",
                      treatment: "",
                      reason: "",
                      patientId: "",
                    })
                  }}
                  disabled={loading.extraCharges}
                  className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors text-sm font-medium cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading.extraCharges || !extraChargesForm.patientId}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground rounded-lg transition-colors text-sm font-medium cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading.extraCharges && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}
