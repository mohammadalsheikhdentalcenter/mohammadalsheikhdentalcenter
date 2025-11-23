//@ts-nocheck
"use client"

import type React from "react"

import { ProtectedRoute } from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/components/auth-context"
import { useState, useEffect, useMemo } from "react"
import { toast } from "react-hot-toast"
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  Camera,
  X,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  Stethoscope,
  XCircle,
  Search,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { validateAppointmentScheduling } from "@/lib/appointment-validation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

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
  createdAt: string
  updatedAt: string
}

const ITEMS_PER_PAGE = 10

export default function ForwardedRequestsPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [referrals, setReferrals] = useState<PatientReferral[]>([])
  const [loading, setLoading] = useState({
    fetch: false,
    upload: false,
    createAppointment: false,
    reject: false, // add reject loading state
  })
  const [selectedReferral, setSelectedReferral] = useState<PatientReferral | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [pictureFile, setPictureFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [formData, setFormData] = useState({
    appointmentDate: "",
    appointmentTime: "",
    appointmentType: "Consultation",
    roomNumber: "",
    duration: 30,
    notes: "",
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<"patient" | "appointment">("patient")

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (token && (user?.role === "receptionist" || user?.role === "admin")) {
      fetchReferrals()
    }
  }, [token, user])

  const fetchReferrals = async () => {
    setLoading((prev) => ({ ...prev, fetch: true }))
    try {
      const res = await fetch("/api/patient-referrals", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setReferrals(data.referrals || [])
      } else {
        toast.error("Failed to fetch forwarded requests")
      }
    } catch (error) {
      console.error("Failed to fetch referrals:", error)
      toast.error("Error fetching requests")
    } finally {
      setLoading((prev) => ({ ...prev, fetch: false }))
    }
  }

  const filteredReferrals = useMemo(() => {
    return referrals.filter((referral) => {
      const matchesSearch =
        referral.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referral.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referral.patientPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referral.patientEmail.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = selectedStatus === "all" || referral.status === selectedStatus

      return matchesSearch && matchesStatus
    })
  }, [referrals, searchTerm, selectedStatus])

  const totalPages = Math.ceil(filteredReferrals.length / ITEMS_PER_PAGE)
  const paginatedReferrals = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredReferrals.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredReferrals, currentPage])

  const handlePictureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB")
        return
      }
      setPictureFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadPicture = async () => {
    if (!pictureFile || !selectedReferral) {
      toast.error("No picture selected")
      return
    }

    setLoading((prev) => ({ ...prev, upload: true }))
    try {
      const formDataObj = new FormData()
      formDataObj.append("file", pictureFile)

      const uploadRes = await fetch("/api/cloudinary/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataObj,
      })

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json()
        toast.error(errorData.error || "Failed to upload picture")
        return
      }

      const uploadData = await uploadRes.json()
      const pictureUrl = uploadData.secure_url

      // Update referral with picture
      const updateRes = await fetch(`/api/patient-referrals/${selectedReferral._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pictureUrl,
          pictureSavedBy: user?.name || "Staff",
          status: "in-progress",
        }),
      })

      if (updateRes.ok) {
        toast.success("Picture uploaded successfully")
        setPictureFile(null)
        setPreviewUrl("")
        // Refresh the referral data
        const updated = await updateRes.json()
        setSelectedReferral(updated.referral)
        setReferrals(referrals.map((r) => (r._id === selectedReferral._id ? updated.referral : r)))
      } else {
        const errorData = await updateRes.json()
        toast.error(errorData.error || "Failed to update referral")
      }
    } catch (error) {
      console.error("Failed to upload picture:", error)
      toast.error("Error uploading picture")
    } finally {
      setLoading((prev) => ({ ...prev, upload: false }))
    }
  }

  const validateAppointmentForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.appointmentDate) {
      errors.appointmentDate = "Date is required"
    } else {
      const selectedDate = new Date(formData.appointmentDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate < today) {
        errors.appointmentDate = "Cannot schedule appointments in the past"
      }
    }

    if (!formData.appointmentTime) {
      errors.appointmentTime = "Time is required"
    }

    if (!formData.roomNumber.trim()) {
      errors.roomNumber = "Room Number is required"
    }

    if (formData.duration <= 0) {
      errors.duration = "Duration must be greater than 0"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const createAppointmentAndCompleteReferral = async () => {
    if (!selectedReferral || !validateAppointmentForm()) {
      toast.error("Please fix the errors in the form")
      return
    }

    // Validate and format the date of birth
    const patientDob = selectedReferral.patientDob
    if (!patientDob) {
      toast.error("Patient date of birth is required")
      return
    }

    let formattedDob
    try {
      const dobDate = new Date(patientDob)
      if (isNaN(dobDate.getTime())) {
        toast.error("Invalid date of birth format")
        return
      }
      formattedDob = dobDate.toISOString().split("T")[0]
    } catch (error) {
      toast.error("Invalid date of birth")
      return
    }

    console.log("[v0] Validating appointment time conflict for doctor:", selectedReferral.doctorId)
    const validation = await validateAppointmentScheduling(
      selectedReferral.doctorId,
      formData.appointmentDate,
      formData.appointmentTime,
      formData.duration || 30,
      token,
      undefined,
    )

    if (!validation.isValid) {
      toast.error(validation.error || "Time conflict detected. Please choose another time.")
      return
    }

    setLoading((prev) => ({ ...prev, createAppointment: true }))
    try {
      // Prepare patient data with ALL required fields from backend
      const patientData = {
        name: selectedReferral.patientName,
        phone: selectedReferral.patientPhone,
        email: selectedReferral.patientEmail || "",
        dob: formattedDob,
        idNumber: selectedReferral.patientIdNumber || "N/A",
        address: selectedReferral.patientAddress || "",
        insuranceProvider: "",
        insuranceNumber: "",
        allergies: selectedReferral.patientAllergies || [],
        medicalConditions: selectedReferral.patientMedicalConditions || [],
        assignedDoctorId: selectedReferral.doctorId,
        photoUrl: selectedReferral.pictureUrl || null,
      }

      console.log("Sending patient data to API:", patientData)

      const patientRes = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patientData),
      })

      console.log("Patient API response status:", patientRes.status)

      let patientId

      if (patientRes.ok) {
        const patientResponse = await patientRes.json()
        patientId = patientResponse.patient._id
        console.log("Patient created successfully, ID:", patientId)
      } else if (patientRes.status === 409) {
        // Handle email conflict error properly
        const errorData = await patientRes.json()
        console.error("Email conflict error:", errorData)

        // Show detailed error message
        toast.error(
          <div className="text-center">
            <div className="font-semibold">Email Conflict Detected</div>
            <div className="text-sm mt-1">
              {errorData.error || "Email already exists in staff records. Please use a different email."}
            </div>
          </div>,
          {
            duration: 3000,
            icon: "❌",
          },
        )

        // Auto-reject the forward request if email conflict
        await rejectForwardRequest("Email conflict: " + (errorData.error || "Email already exists in staff records"))

        // Stop further execution
        setLoading((prev) => ({ ...prev, createAppointment: false }))
        return
      } else {
        // Handle other errors
        const errorData = await patientRes.json() // Corrected from res.json()
        console.error("Patient creation failed:", errorData)
        toast.error(errorData.error || `Failed to create patient: ${patientRes.status}`)
        setLoading((prev) => ({ ...prev, createAppointment: false }))
        return
      }

      // Create the appointment (only if patient was created successfully)
      const appointmentRes = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId,
          patientName: selectedReferral.patientName,
          doctorId: selectedReferral.doctorId,
          doctorName: selectedReferral.doctorName,
          date: formData.appointmentDate,
          time: formData.appointmentTime,
          type: formData.appointmentType,
          roomNumber: formData.roomNumber,
          duration: formData.duration,
        }),
      })

      if (appointmentRes.ok) {
        const appointmentData = await appointmentRes.json()
        const appointmentId = appointmentData.appointment._id

        // Update referral as completed
        const updateRes = await fetch(`/api/patient-referrals/${selectedReferral._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: "completed",
            appointmentId,
            notes: formData.notes,
          }),
        })

        if (updateRes.ok) {
          toast.success("Patient registered and appointment booked successfully")
          setShowDetailModal(false)
          setSelectedReferral(null)
          setPictureFile(null)
          setPreviewUrl("")
          setFormData({
            appointmentDate: "",
            appointmentTime: "",
            appointmentType: "Consultation",
            roomNumber: "",
            duration: 30,
            notes: "",
          })
          setFormErrors({})
          setCurrentPage(1)
          fetchReferrals()
        } else {
          const errorData = await updateRes.json()
          toast.error(errorData.error || "Failed to update referral status")
        }
      } else {
        const errorData = await appointmentRes.json()
        toast.error(errorData.error || "Failed to create appointment")
      }
    } catch (error) {
      console.error("Failed to create appointment:", error)
      toast.error("Error creating appointment")
    } finally {
      setLoading((prev) => ({ ...prev, createAppointment: false }))
    }
  }

  const rejectForwardRequest = async (reason?: string) => {
    if (!selectedReferral) return

    setLoading((prev) => ({ ...prev, reject: true })) // add loading state

    try {
      const updateRes = await fetch(`/api/patient-referrals/${selectedReferral._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "rejected",
          rejectionReason: reason || rejectReason,
        }),
      })

      if (updateRes.ok) {
        toast.success("Forward request rejected successfully")
        setShowDetailModal(false)
        setShowRejectModal(false)
        setSelectedReferral(null)
        setRejectReason("")
        setCurrentPage(1)
        fetchReferrals()
      } else {
        const errorData = await updateRes.json()
        toast.error(errorData.error || "Failed to reject request")
      }
    } catch (error) {
      console.error("Failed to reject request:", error)
      toast.error("Error rejecting request")
    } finally {
      setLoading((prev) => ({ ...prev, reject: false })) // remove loading state
    }
  }

  const handleOpenReferral = (referral: PatientReferral) => {
    setSelectedReferral(referral)
    setShowDetailModal(true)
    setPictureFile(null)
    setPreviewUrl(referral.pictureUrl || "")
    setFormData({
      appointmentDate: "",
      appointmentTime: "",
      appointmentType: "Consultation",
      roomNumber: "",
      duration: 30,
      notes: referral.notes || "",
    })
    setFormErrors({})
    setActiveTab("patient")
    setShowRejectModal(false)
    setRejectReason("")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (user?.role !== "receptionist" && user?.role !== "admin") {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <main className="flex-1 overflow-auto md:pt-0 pt-16">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
                <p className="text-muted-foreground">Only receptionist and admin can view forwarded requests.</p>
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
        <main className="flex-1 overflow-auto md:pt-0 pt-16">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Forwarded Patient Requests</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Review and process patient referral requests from doctors
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {/* Search bar */}
              <div className="flex items-center gap-2 bg-card rounded-lg border border-border p-3">
                <Search className="w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by patient name, doctor name, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="flex-1 bg-transparent outline-none text-foreground placeholder-muted-foreground text-sm"
                />
              </div>

              {/* Filter bar */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">Filter by status:</span>
                <div className="flex gap-2 flex-wrap">
                  {["all", "pending", "in-progress", "completed", "rejected"].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setSelectedStatus(status)
                        setCurrentPage(1)
                      }}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        selectedStatus === status
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results count */}
              <div className="text-sm text-muted-foreground">
                Showing {paginatedReferrals.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} to{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredReferrals.length)} of {filteredReferrals.length}{" "}
                referrals
              </div>
            </div>

            {loading.fetch ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : paginatedReferrals.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg border border-border">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {filteredReferrals.length === 0 ? "No forwarded requests found." : "No results on this page."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-card rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Patient Name</TableHead>
                        <TableHead className="font-semibold">Referred By</TableHead>
                        <TableHead className="font-semibold">Phone</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedReferrals.map((referral) => (
                        <TableRow key={referral._id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium text-foreground">{referral.patientName}</TableCell>
                          <TableCell className="text-muted-foreground">Dr. {referral.doctorName}</TableCell>
                          <TableCell className="text-muted-foreground">{referral.patientPhone}</TableCell>
                          <TableCell className="text-muted-foreground">{referral.patientEmail || "N/A"}</TableCell>
                          <TableCell>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(referral.status)}`}
                            >
                              {referral.status.charAt(0).toUpperCase() + referral.status.slice(1).replace("-", " ")}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {(referral.status === "pending" || referral.status === "in-progress") && (
                              <button
                                onClick={() => handleOpenReferral(referral)}
                                disabled={loading.createAppointment || loading.reject} // disable on any loading
                                className="inline-flex items-center gap-1 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-3 py-1 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:cursor-not-allowed"
                              >
                                {/* The original code had a check for loading.fetch here which seems incorrect.
                                    Assuming it was meant to be for loading the details or was a leftover.
                                    Removed it and added a generic loading state if it were to be applied. */}
                                {loading.fetch ? ( // Kept for consistency if fetch was meant to be here, but typically not on button click
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    Review
                                  </>
                                )}
                              </button>
                            )}
                            {referral.status === "completed" && (
                              <span className="text-xs text-green-600 font-medium">Completed</span>
                            )}
                            {referral.status === "rejected" && (
                              <span className="text-xs text-red-600 font-medium">Rejected</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        {currentPage > 1 && (
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              className="cursor-pointer"
                            />
                          </PaginationItem>
                        )}

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                        {currentPage < totalPages && (
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              className="cursor-pointer"
                            />
                          </PaginationItem>
                        )}
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            )}

            {showDetailModal && selectedReferral && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50 backdrop-blur-sm">
                <div className="bg-card rounded-lg sm:rounded-xl shadow-2xl border border-border max-w-2xl sm:max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 md:p-6 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10 gap-2">
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0">
                      <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <User className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg sm:text-2xl font-bold text-foreground truncate">
                          {selectedReferral.patientName}
                        </h2>
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                          <Stethoscope className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">Dr. {selectedReferral.doctorName}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="p-1.5 sm:p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground cursor-pointer flex-shrink-0"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="border-b border-border bg-muted/30 flex overflow-x-auto">
                    <div className="flex w-full">
                      <button
                        onClick={() => setActiveTab("patient")}
                        className={`flex-1 px-2 sm:px-4 py-2 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                          activeTab === "patient"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <User className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Patient Info</span>
                        <span className="sm:hidden">Patient</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("appointment")}
                        className={`flex-1 px-2 sm:px-4 py-2 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                          activeTab === "appointment"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Book Appointment</span>
                        <span className="sm:hidden">Appointment</span>
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
                    {activeTab === "patient" && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                        {/* Patient Details */}
                        <div className="space-y-3 sm:space-y-6">
                          <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
                            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                              <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                              Personal Info
                            </h3>
                            <div className="grid grid-cols-1 gap-2 sm:gap-4">
                              <div className="flex items-start gap-2 sm:gap-3">
                                <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground mt-1 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm text-muted-foreground">Phone</p>
                                  <p className="text-foreground font-medium text-xs sm:text-sm truncate">
                                    {selectedReferral.patientPhone}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 sm:gap-3">
                                <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground mt-1 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm text-muted-foreground">Email</p>
                                  <p className="text-foreground font-medium text-xs sm:text-sm truncate">
                                    {selectedReferral.patientEmail || "N/A"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 sm:gap-3">
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground mt-1 flex-shrink-0" />
                                <div>
                                  <p className="text-xs sm:text-sm text-muted-foreground">Date of Birth</p>
                                  <p className="text-foreground font-medium text-xs sm:text-sm">
                                    {selectedReferral.patientDob}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 sm:gap-3">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground mt-1 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm text-muted-foreground">Address</p>
                                  <p className="text-foreground font-medium text-xs sm:text-sm truncate">
                                    {selectedReferral.patientAddress || "N/A"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Medical Information */}
                          <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
                            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                              Medical Info
                            </h3>
                            <div className="space-y-3 sm:space-y-4">
                              {selectedReferral.patientAllergies.length > 0 && (
                                <div>
                                  <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1.5 sm:mb-2">
                                    Allergies
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {selectedReferral.patientAllergies.map((allergy, index) => (
                                      <span
                                        key={index}
                                        className="px-2 py-0.5 sm:py-1 bg-amber-100 text-amber-800 text-xs rounded-full font-medium"
                                      >
                                        {allergy}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {selectedReferral.patientMedicalConditions.length > 0 && (
                                <div>
                                  <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1.5 sm:mb-2">
                                    Medical Conditions
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {selectedReferral.patientMedicalConditions.map((condition, index) => (
                                      <span
                                        key={index}
                                        className="px-2 py-0.5 sm:py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium"
                                      >
                                        {condition}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div>
                                <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1 sm:mb-2">
                                  Referral Reason
                                </p>
                                <p className="text-foreground bg-primary/10 rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
                                  {selectedReferral.referralReason}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Picture Upload */}
                        <div className="space-y-3 sm:space-y-6">
                          <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
                            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                              Patient Photo
                            </h3>
                            <div className="space-y-3 sm:space-y-4">
                              <div className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 transition-colors hover:border-primary/50">
                                {previewUrl ? (
                                  <div className="text-center">
                                    <img
                                      src={previewUrl || "/placeholder.svg"}
                                      alt="Patient"
                                      className="w-32 h-32 sm:w-48 sm:h-48 object-cover rounded-lg mx-auto mb-3 sm:mb-4 shadow-md"
                                    />
                                    {!selectedReferral.pictureUrl && (
                                      <button
                                        onClick={() => {
                                          setPictureFile(null)
                                          setPreviewUrl("")
                                        }}
                                        className="text-xs sm:text-sm text-destructive hover:text-destructive/80 font-medium cursor-pointer"
                                      >
                                        Remove Photo
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
                                    <Camera className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground mb-2 sm:mb-4" />
                                    <label className="cursor-pointer">
                                      <span className="text-primary hover:underline font-medium text-sm sm:text-base">
                                        Click to upload
                                      </span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePictureSelect}
                                        className="hidden"
                                        disabled={loading.upload || selectedReferral.pictureUrl ? true : false}
                                      />
                                    </label>
                                    <p className="text-xs text-muted-foreground mt-1.5 sm:mt-2">Max 5MB</p>
                                  </div>
                                )}
                              </div>

                              {pictureFile && !selectedReferral.pictureUrl && (
                                <button
                                  onClick={uploadPicture}
                                  disabled={loading.upload || loading.createAppointment}
                                  className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors font-medium text-xs sm:text-sm cursor-pointer disabled:cursor-not-allowed"
                                >
                                  {loading.upload ? (
                                    <>
                                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                      <span className="hidden sm:inline">Uploading...</span>
                                      <span className="sm:hidden">Upload...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                                      Upload Photo
                                    </>
                                  )}
                                </button>
                              )}

                              {selectedReferral.pictureUrl && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-4">
                                  <p className="text-xs sm:text-sm text-green-800 font-medium flex items-center gap-2">
                                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                    <span>Uploaded by {selectedReferral.pictureSavedBy}</span>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
                            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                              Quick Actions
                            </h3>
                            <button
                              onClick={() => setActiveTab("appointment")}
                              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors font-medium text-xs sm:text-sm mb-2 sm:mb-3 cursor-pointer"
                            >
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                              Book Appointment
                            </button>
                            <button
                              onClick={() => setShowRejectModal(true)}
                              disabled={loading.createAppointment}
                              className="w-full flex items-center justify-center gap-2 bg-destructive hover:bg-destructive/90 disabled:bg-destructive/50 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors font-medium text-xs sm:text-sm disabled:cursor-not-allowed cursor-pointer"
                            >
                              <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "appointment" && (
                      <div className="space-y-4 sm:space-y-6">
                        <div className="bg-muted/30 rounded-lg p-3 sm:p-6">
                          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4 sm:mb-6 flex items-center gap-2">
                            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            Schedule Appointment
                          </h3>

                          <form className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-2">
                              <label className="block text-xs sm:text-sm font-medium text-foreground">Date *</label>
                              <input
                                type="date"
                                value={formData.appointmentDate}
                                onChange={(e) => {
                                  setFormData({ ...formData, appointmentDate: e.target.value })
                                  setFormErrors({ ...formErrors, appointmentDate: "" })
                                }}
                                disabled={loading.createAppointment}
                                className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-xs sm:text-sm transition-colors ${
                                  formErrors.appointmentDate ? "border-destructive" : "border-border"
                                }`}
                              />
                              {formErrors.appointmentDate && (
                                <p className="text-xs text-destructive mt-1">{formErrors.appointmentDate}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs sm:text-sm font-medium text-foreground">Time *</label>
                              <input
                                type="time"
                                value={formData.appointmentTime}
                                onChange={(e) => {
                                  setFormData({ ...formData, appointmentTime: e.target.value })
                                  setFormErrors({ ...formErrors, appointmentTime: "" })
                                }}
                                disabled={loading.createAppointment}
                                className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-xs sm:text-sm transition-colors ${
                                  formErrors.appointmentTime ? "border-destructive" : "border-border"
                                }`}
                              />
                              {formErrors.appointmentTime && (
                                <p className="text-xs text-destructive mt-1">{formErrors.appointmentTime}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs sm:text-sm font-medium text-foreground">Type</label>
                              <select
                                value={formData.appointmentType}
                                onChange={(e) => setFormData({ ...formData, appointmentType: e.target.value })}
                                disabled={loading.createAppointment}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-xs sm:text-sm transition-colors"
                              >
                                <option value="Consultation">Consultation</option>
                                <option value="Cleaning">Cleaning</option>
                                <option value="Filling">Filling</option>
                                <option value="Root Canal">Root Canal</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs sm:text-sm font-medium text-foreground">
                                Duration (min)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={formData.duration}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    duration: Number.parseInt(e.target.value) || 30,
                                  })
                                }
                                disabled={loading.createAppointment}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-xs sm:text-sm transition-colors"
                              />
                            </div>

                            <div className="md:col-span-2 space-y-2">
                              <label className="block text-xs sm:text-sm font-medium text-foreground">
                                Room Number *
                              </label>
                              <input
                                type="text"
                                placeholder="e.g., Room 1"
                                value={formData.roomNumber}
                                onChange={(e) => {
                                  setFormData({ ...formData, roomNumber: e.target.value })
                                  setFormErrors({ ...formErrors, roomNumber: "" })
                                }}
                                disabled={loading.createAppointment}
                                className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-xs sm:text-sm transition-colors ${
                                  formErrors.roomNumber ? "border-destructive" : "border-border"
                                }`}
                              />
                              {formErrors.roomNumber && (
                                <p className="text-xs text-destructive mt-1">{formErrors.roomNumber}</p>
                              )}
                            </div>

                            <div className="md:col-span-2 space-y-2">
                              <label className="block text-xs sm:text-sm font-medium text-foreground">Notes</label>
                              <textarea
                                placeholder="Any additional notes..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                disabled={loading.createAppointment}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-xs sm:text-sm transition-colors resize-none"
                                rows={3}
                              />
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer - Only on appointment tab */}
                  {activeTab === "appointment" && (
                    <div className="flex gap-2 sm:gap-3 p-3 sm:p-4 md:p-6 border-t border-border bg-muted/30">
                      <button
                        onClick={() => setShowDetailModal(false)}
                        disabled={loading.createAppointment}
                        className="flex-1 bg-muted hover:bg-muted/80 disabled:bg-muted/50 text-muted-foreground px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors font-medium text-xs sm:text-sm cursor-pointer disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={createAppointmentAndCompleteReferral}
                        disabled={loading.createAppointment}
                        className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors font-medium text-xs sm:text-sm cursor-pointer disabled:cursor-not-allowed"
                      >
                        {loading.createAppointment ? (
                          <>
                            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                            <span className="hidden sm:inline">Processing...</span>
                            <span className="sm:hidden">Processing...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Book & Complete</span>
                            <span className="sm:hidden">Complete</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showRejectModal && selectedReferral && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50 backdrop-blur-sm">
                <div className="bg-card rounded-lg sm:rounded-xl shadow-2xl border border-border max-w-md w-full">
                  <div className="p-4 sm:p-6 border-b border-border">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2 bg-destructive/10 rounded-lg">
                        <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6 text-destructive" />
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-foreground">Reject Request</h2>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Confirm rejection from Dr. {selectedReferral.doctorName}?
                    </p>

                    <div className="space-y-2">
                      <label className="block text-xs sm:text-sm font-medium text-foreground">Reason (Optional)</label>
                      <textarea
                        placeholder="Rejection reason..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive text-foreground placeholder-muted-foreground text-xs sm:text-sm transition-colors resize-none"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 sm:gap-3 p-4 sm:p-6 border-t border-border bg-muted/30">
                    <button
                      onClick={() => setShowRejectModal(false)}
                      disabled={loading.reject}
                      className="flex-1 bg-muted hover:bg-muted/80 disabled:bg-muted/50 text-muted-foreground px-3 sm:px-4 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm cursor-pointer disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => rejectForwardRequest()}
                      disabled={loading.reject}
                      className="flex-1 flex items-center justify-center gap-2 bg-destructive hover:bg-destructive/90 disabled:bg-destructive/50 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm cursor-pointer disabled:cursor-not-allowed"
                    >
                      {loading.reject ? (
                        <>
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                          Reject
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
