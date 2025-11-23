//@ts-nocheck
"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/components/auth-context"
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import { AlertCircle, Loader2, Search, Eye, Menu } from "lucide-react" // Added Menu icon for mobile
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ReferRequestsTab } from "@/components/refer-requests-tab"

interface PatientReferral {
  _id: string
  id: string
  doctorId: string
  doctorName: string
  patientName: string
  patientPhone: string
  patientEmail: string
  patientDob: string
  patientIdNumber: string
  patientAddress: string
  patientAllergies: string[]
  patientMedicalConditions: string[]
  referralReason: string
  status: "pending" | "in-progress" | "completed" | "rejected"
  pictureUrl?: string
  pictureSavedBy?: string
  appointmentId?: string
  notes: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

export default function RequestStatusPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [referrals, setReferrals] = useState<PatientReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "in-progress" | "completed" | "rejected">("all")
  const [selectedReferral, setSelectedReferral] = useState<PatientReferral | null>(null)
  const [activeTab, setActiveTab] = useState<"patient-referrals" | "appointment-referrals">("patient-referrals")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (token && user?.role === "doctor") {
      fetchReferrals()
    } else if (user?.role !== "doctor") {
      router.push("/dashboard")
    }
  }, [token, user, router])

  const fetchReferrals = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/patient-referrals", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        // Filter for current doctor's referrals
        const doctorReferrals = (data.referrals || []).filter((ref: PatientReferral) => ref.doctorId === user?.id)
        setReferrals(doctorReferrals)
      } else {
        toast.error("Failed to fetch requests")
      }
    } catch (error) {
      console.error("Failed to fetch referrals:", error)
      toast.error("Error fetching requests")
    } finally {
      setLoading(false)
    }
  }

  // Filter referrals based on search and status
  const filteredReferrals = referrals.filter((referral) => {
    const matchesSearch =
      referral.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.patientPhone.includes(searchTerm) ||
      referral.patientEmail.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === "all" || referral.status === filterStatus

    return matchesSearch && matchesStatus
  })

  // Sort by date (newest first)
  const sortedReferrals = [...filteredReferrals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800 border border-amber-300"
      case "in-progress":
        return "bg-blue-100 text-blue-800 border border-blue-300"
      case "completed":
        return "bg-green-100 text-green-800 border border-green-300"
      case "rejected":
        return "bg-red-100 text-red-800 border border-red-300"
      default:
        return "bg-gray-100 text-gray-800 border border-gray-300"
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background">
          <Sidebar />
        <main className="flex-1 overflow-auto md:pt-0 pt-16 lg:pt-0">
          <div className="p-3 sm:p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Your Request Status</h1>
              <p className="text-muted-foreground text-sm mt-1 sm:mt-2">
                Track and view the status of all your referral requests
              </p>
            </div>

            {/* Tab Navigation - Responsive */}
            <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-border overflow-x-auto">
              <button
                onClick={() => setActiveTab("patient-referrals")}
                className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm transition-colors relative whitespace-nowrap ${
                  activeTab === "patient-referrals"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Patient Referrals
                {activeTab === "patient-referrals" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("appointment-referrals")}
                className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm transition-colors relative whitespace-nowrap ${
                  activeTab === "appointment-referrals"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Refer Appointment Requests
                {activeTab === "appointment-referrals" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "patient-referrals" ? (
              <>
                {/* Filters and Search - Responsive */}
                <div className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4 mb-4 sm:mb-6">
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search requests..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                      />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                      <label htmlFor="statusFilter" className="text-sm text-muted-foreground whitespace-nowrap">
                        Status:
                      </label>
                      <select
                        id="statusFilter"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="flex-1 sm:flex-none px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Stats Cards - Responsive Grid */}
                {!loading && referrals.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
                    <div className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4">
                      <p className="text-xs text-muted-foreground font-medium uppercase">Total Requests</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mt-1 sm:mt-2">{referrals.length}</p>
                    </div>
                    <div className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4">
                      <p className="text-xs text-muted-foreground font-medium uppercase">Pending</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-amber-600 mt-1 sm:mt-2">
                        {referrals.filter((r) => r.status === "pending").length}
                      </p>
                    </div>
                    <div className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4">
                      <p className="text-xs text-muted-foreground font-medium uppercase">Completed</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 mt-1 sm:mt-2">
                        {referrals.filter((r) => r.status === "completed").length}
                      </p>
                    </div>
                    <div className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4">
                      <p className="text-xs text-muted-foreground font-medium uppercase">Rejected</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 mt-1 sm:mt-2">
                        {referrals.filter((r) => r.status === "rejected").length}
                      </p>
                    </div>
                  </div>
                )}

                {/* Content */}
                {loading ? (
                  <div className="flex items-center justify-center py-8 sm:py-12">
                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-primary" />
                  </div>
                ) : sortedReferrals.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 bg-card rounded-lg border border-border">
                    <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                    <p className="text-muted-foreground text-sm sm:text-base">
                      {searchTerm || filterStatus !== "all"
                        ? "No requests match your search criteria."
                        : "No patient requests yet."}
                    </p>
                  </div>
                ) : (
                  <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted border-b border-border">
                          <tr>
                            <th className="text-left px-3 sm:px-4 md:px-6 py-3 font-semibold text-muted-foreground text-xs sm:text-sm">
                              Patient Name
                            </th>
                            <th className="text-left px-3 sm:px-4 md:px-6 py-3 font-semibold text-muted-foreground text-xs sm:text-sm hidden xs:table-cell">
                              Phone
                            </th>
                            <th className="text-left px-3 sm:px-4 md:px-6 py-3 font-semibold text-muted-foreground text-xs sm:text-sm hidden md:table-cell">
                              Reason
                            </th>
                            <th className="text-left px-3 sm:px-4 md:px-6 py-3 font-semibold text-muted-foreground text-xs sm:text-sm">
                              Status
                            </th>
                            <th className="text-left px-3 sm:px-4 md:px-6 py-3 font-semibold text-muted-foreground text-xs sm:text-sm hidden lg:table-cell">
                              Submitted
                            </th>
                            <th className="text-left px-3 sm:px-4 md:px-6 py-3 font-semibold text-muted-foreground text-xs sm:text-sm">
                              Updated
                            </th>
                            <th className="text-left px-3 sm:px-4 md:px-6 py-3 font-semibold text-muted-foreground text-xs sm:text-sm">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedReferrals.map((referral) => (
                            <tr
                              key={referral._id}
                              className="border-b border-border hover:bg-muted/50 transition-colors"
                            >
                              <td className="px-3 sm:px-4 md:px-6 py-3 font-medium text-foreground text-xs sm:text-sm">
                                {referral.patientName}
                              </td>
                              <td className="px-3 sm:px-4 md:px-6 py-3 text-muted-foreground hidden xs:table-cell text-xs sm:text-sm">
                                {referral.patientPhone}
                              </td>
                              <td className="px-3 sm:px-4 md:px-6 py-3 text-muted-foreground hidden md:table-cell text-xs sm:text-sm truncate max-w-[120px] md:max-w-xs">
                                {referral.referralReason}
                              </td>
                              <td className="px-3 sm:px-4 md:px-6 py-3">
                                <div className="flex flex-col gap-1">
                                  <span
                                    className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${getStatusBadgeColor(referral.status)}`}
                                  >
                                    {referral.status.charAt(0).toUpperCase() + referral.status.slice(1).replace("-", " ")}
                                  </span>
                                  {referral.status === "rejected" && (
                                    <button
                                      onClick={() => setSelectedReferral(referral)}
                                      className="text-xs text-primary hover:underline cursor-pointer font-medium text-left"
                                      title="View rejection details"
                                    >
                                      View Detail
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 sm:px-4 md:px-6 py-3 text-muted-foreground hidden lg:table-cell text-xs sm:text-sm">
                                {new Date(referral.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-3 sm:px-4 md:px-6 py-3 text-muted-foreground text-xs sm:text-sm">
                                {new Date(referral.updatedAt).toLocaleDateString()}
                              </td>
                              <td className="px-3 sm:px-4 md:px-6 py-3">
                                <button
                                  onClick={() => setSelectedReferral(referral)}
                                  className="flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors text-xs cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span className="hidden xs:inline">View</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  
                    <div className="px-3 sm:px-4 md:px-6 py-3 border-t border-border flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                      <div>
                        Showing <span className="font-medium">{sortedReferrals.length}</span> of{" "}
                        <span className="font-medium">{referrals.length}</span> requests
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <ReferRequestsTab token={token} />
            )}
          </div>
        </main>

        {/* Patient Referral Details Modal */}
        <Dialog open={!!selectedReferral} onOpenChange={(open) => !open && setSelectedReferral(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Request Details</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                View complete details of the patient referral request
              </DialogDescription>
            </DialogHeader>

            {selectedReferral && (
              <div className="space-y-4 sm:space-y-6">
                {/* Patient Information */}
                <div className="border-b border-border pb-3 sm:pb-4">
                  <h3 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">Patient Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Patient Name</p>
                      <p className="text-foreground text-sm sm:text-base">{selectedReferral.patientName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Phone</p>
                      <p className="text-foreground text-sm sm:text-base">{selectedReferral.patientPhone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Email</p>
                      <p className="text-foreground text-sm sm:text-base">{selectedReferral.patientEmail}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Date of Birth</p>
                      <p className="text-foreground text-sm sm:text-base">{selectedReferral.patientDob}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-1">ID Number</p>
                      <p className="text-foreground text-sm sm:text-base">{selectedReferral.patientIdNumber}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Address</p>
                      <p className="text-foreground text-sm sm:text-base">{selectedReferral.patientAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Request Information */}
                <div className="border-b border-border pb-3 sm:pb-4">
                  <h3 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">Request Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Status</p>
                      <span
                        className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${getStatusBadgeColor(
                          selectedReferral.status,
                        )}`}
                      >
                        {selectedReferral.status.charAt(0).toUpperCase() + selectedReferral.status.slice(1).replace("-", " ")}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Submitted Date</p>
                      <p className="text-foreground text-sm sm:text-base">{new Date(selectedReferral.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Updated Date</p>
                      <p className="text-foreground text-sm sm:text-base">{new Date(selectedReferral.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Referral Reason */}
                <div className="border-b border-border pb-3 sm:pb-4">
                  <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">Referral Reason</h3>
                  <p className="text-foreground text-sm bg-muted p-2 sm:p-3 rounded-lg">{selectedReferral.referralReason}</p>
                </div>

                {/* Medical Conditions and Allergies */}
                <div className="border-b border-border pb-3 sm:pb-4">
                  <h3 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">Medical Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Medical Conditions</p>
                      <div className="space-y-1">
                        {selectedReferral.patientMedicalConditions &&
                        selectedReferral.patientMedicalConditions.length > 0 ? (
                          selectedReferral.patientMedicalConditions.map((condition, idx) => (
                            <p key={idx} className="text-foreground text-sm">
                              • {condition}
                            </p>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm">None</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Allergies</p>
                      <div className="space-y-1">
                        {selectedReferral.patientAllergies && selectedReferral.patientAllergies.length > 0 ? (
                          selectedReferral.patientAllergies.map((allergy, idx) => (
                            <p key={idx} className="text-foreground text-sm">
                              • {allergy}
                            </p>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm">None</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rejection Reason */}
                {selectedReferral.status === "rejected" && selectedReferral.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                    <h3 className="font-semibold text-red-900 mb-2 text-sm sm:text-base">Rejection Reason</h3>
                    <p className="text-red-800 text-sm">{selectedReferral.rejectionReason}</p>
                  </div>
                )}

                {/* Notes */}
                {selectedReferral.notes && (
                  <div className="border-t border-border pt-3 sm:pt-4">
                    <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">Notes</h3>
                    <p className="text-foreground text-sm bg-muted p-2 sm:p-3 rounded-lg">{selectedReferral.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}