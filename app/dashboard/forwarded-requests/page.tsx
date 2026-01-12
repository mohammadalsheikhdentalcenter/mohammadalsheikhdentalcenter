//@ts-nocheck
"use client"

import type React from "react"

import { ProtectedRoute } from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/components/auth-context"
import { useState, useEffect, useMemo } from "react"
import { toast } from "react-hot-toast"
import { Upload, CheckCircle, AlertCircle, Loader2, Camera, X, User, Phone, Mail, Calendar, MapPin, FileText, Stethoscope, XCircle, Search, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { validateAppointmentScheduling } from "@/lib/appointment-validation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface PatientReferral {
  _id: string
  id: string
  doctorId: string
  doctorName: string
  patientName: string
  patientPhones: { number: string; isPrimary: boolean }[]
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
    reject: false,
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
    insuranceProvider: "",
    insuranceNumber: "",
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset to first page when search changes
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

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
      const searchLower = debouncedSearchTerm.toLowerCase()
      const matchesSearch =
        referral.patientName.toLowerCase().includes(searchLower) ||
        referral.doctorName.toLowerCase().includes(searchLower) ||
        (referral.patientPhones?.some((phone) => phone.number.toLowerCase().includes(searchLower)) ?? false) ||
        referral.patientEmail.toLowerCase().includes(searchLower) ||
        referral.referralReason.toLowerCase().includes(searchLower)

      const matchesStatus = selectedStatus === "all" || referral.status === selectedStatus

      return matchesSearch && matchesStatus
    })
  }, [referrals, debouncedSearchTerm, selectedStatus])

  const totalPages = Math.max(1, Math.ceil(filteredReferrals.length / ITEMS_PER_PAGE))
  const paginatedReferrals = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredReferrals.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredReferrals, currentPage])

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)

      if (currentPage > 3) {
        pages.push("...")
      }

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push("...")
      }

      pages.push(totalPages)
    }

    return pages
  }

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
        let errorMessage = "Failed to upload picture"
        try {
          const errorText = await uploadRes.text()
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText)
              errorMessage = errorData.error || errorData.message || errorMessage
            } catch {
              errorMessage = errorText
            }
          }
        } catch (error) {
          console.error("Error reading upload response:", error)
        }
        toast.error(errorMessage)
        return
      }

      let uploadData
      try {
        uploadData = await uploadRes.json()
      } catch (error) {
        console.error("Failed to parse upload response:", error)
        toast.error("Failed to parse upload response")
        return
      }

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
        let updatedReferral
        try {
          const response = await updateRes.json()
          updatedReferral = response.referral
        } catch (error) {
          console.warn("Failed to parse update response, but request was successful:", error)
          // Even if we can't parse the response, we can still update the UI
          updatedReferral = {
            ...selectedReferral,
            pictureUrl,
            pictureSavedBy: user?.name || "Staff",
            status: "in-progress",
          }
        }

        toast.success("Picture uploaded successfully")
        setPictureFile(null)
        setPreviewUrl("")
        setSelectedReferral(updatedReferral)
        setReferrals(referrals.map((r) => (r._id === selectedReferral._id ? updatedReferral : r)))
      } else {
        let errorMessage = "Failed to update referral"
        try {
          const errorText = await updateRes.text()
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText)
              errorMessage = errorData.error || errorData.message || errorMessage
            } catch {
              errorMessage = errorText
            }
          }
        } catch (error) {
          console.error("Error reading update response:", error)
        }
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error("Failed to upload picture:", error)
      toast.error("Network error. Please check your connection and try again.")
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
      const patientData = {
        name: selectedReferral.patientName,
        phones: selectedReferral.patientPhones,
        email: selectedReferral.patientEmail || "",
        dob: formattedDob,
        idNumber: selectedReferral.patientIdNumber || "N/A",
        address: selectedReferral.patientAddress || "",
        insuranceProvider: formData.insuranceProvider || "",
        insuranceNumber: formData.insuranceNumber || "",
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
      let errorData

      if (patientRes.ok) {
        // Check if response has content
        const contentType = patientRes.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          try {
            const patientResponse = await patientRes.json()
            patientId = patientResponse.patient._id
            console.log("Patient created successfully, ID:", patientId)
          } catch (parseError) {
            console.error("Failed to parse patient response:", parseError)
            toast.error("Failed to parse server response")
            setLoading((prev) => ({ ...prev, createAppointment: false }))
            return
          }
        } else {
          toast.error("Server returned invalid response format")
          setLoading((prev) => ({ ...prev, createAppointment: false }))
          return
        }
      } else if (patientRes.status === 409) {
        // Handle email conflict error properly
        try {
          const errorText = await patientRes.text()
          if (errorText) {
            try {
              errorData = JSON.parse(errorText)
            } catch {
              errorData = { error: errorText }
            }
          } else {
            errorData = { error: "Email conflict" }
          }
        } catch (error) {
          errorData = { error: "Email already exists" }
        }

        console.error("Email conflict error:", errorData)

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
        setLoading((prev) => ({ ...prev, createAppointment: false }))
        return
      } else {
        // Handle other errors
        try {
          const errorText = await patientRes.text()
          if (errorText) {
            try {
              errorData = JSON.parse(errorText)
            } catch {
              errorData = { error: errorText }
            }
          } else {
            errorData = { error: `Failed to create patient: ${patientRes.status}` }
          }
        } catch (error) {
          errorData = { error: "Failed to create patient" }
        }

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
        try {
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
            // Parse the updated referral from the response
            let updatedReferral
            try {
              const updateData = await updateRes.json()
              updatedReferral = updateData.referral
            } catch (error) {
              console.warn("Failed to parse update response, creating local update:", error)
              // Create updated referral object manually
              updatedReferral = {
                ...selectedReferral,
                status: "completed",
                appointmentId,
                notes: formData.notes,
                updatedAt: new Date().toISOString(),
              }
            }

            toast.success("Patient registered and appointment booked successfully")
            
            // Update the local state immediately - FIXED LINE
            setReferrals(prevReferrals => 
              prevReferrals.map(r => r._id === selectedReferral._id ? updatedReferral : r)
            )
            
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
              insuranceProvider: "",
              insuranceNumber: "",
            })
            setFormErrors({})
            setShowAppointmentForm(false)
            setCurrentPage(1)
            
            // Refetch to ensure data consistency
            setTimeout(() => {
              fetchReferrals()
            }, 500)
          } else {
            let errorMessage = "Failed to update referral status"
            try {
              const errorText = await updateRes.text()
              if (errorText) {
                try {
                  const errorData = JSON.parse(errorText)
                  errorMessage = errorData.error || errorData.message || errorMessage
                } catch {
                  errorMessage = errorText
                }
              }
            } catch (error) {
              console.error("Error reading update response:", error)
            }
            toast.error(errorMessage)
          }
        } catch (error) {
          console.error("Failed to parse appointment response:", error)
          toast.error("Failed to parse appointment response")
        }
      } else {
        let errorMessage = "Failed to create appointment"
        try {
          const errorText = await appointmentRes.text()
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText)
              errorMessage = errorData.error || errorData.message || errorMessage
            } catch {
              errorMessage = errorText
            }
          }
        } catch (error) {
          console.error("Error reading appointment response:", error)
        }
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error("Failed to create appointment:", error)
      toast.error("Network error. Please check your connection and try again.")
    } finally {
      setLoading((prev) => ({ ...prev, createAppointment: false }))
    }
  }

  const rejectForwardRequest = async (reason?: string) => {
    if (!selectedReferral) return

    setLoading((prev) => ({ ...prev, reject: true }))

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

      // Check if response is OK
      if (updateRes.ok) {
        // Parse the updated referral
        let updatedReferral
        try {
          const updateData = await updateRes.json()
          updatedReferral = updateData.referral
        } catch (parseError) {
          console.warn("Failed to parse update response, creating local update:", parseError)
          updatedReferral = {
            ...selectedReferral,
            status: "rejected",
            notes: reason || rejectReason ? `Rejected: ${reason || rejectReason}` : selectedReferral.notes,
            updatedAt: new Date().toISOString(),
          }
        }

        toast.success("Forward request rejected successfully")
        
        // Update the local state immediately
        setReferrals(prevReferrals => 
          prevReferrals.map(r => r._id === selectedReferral._id ? updatedReferral : r)
        )
        
        setShowDetailModal(false)
        setShowRejectModal(false)
        setSelectedReferral(null)
        setRejectReason("")
        setShowAppointmentForm(false)
        setCurrentPage(1)
        
        // Refetch to ensure data consistency
        setTimeout(() => {
          fetchReferrals()
        }, 500)
      } else {
        // Handle non-OK responses
        let errorMessage = "Failed to reject request"

        try {
          // Try to get error message from JSON response
          const errorText = await updateRes.text()
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText)
              errorMessage = errorData.error || errorData.message || errorMessage
            } catch {
              // If not JSON, use the text as error message
              errorMessage = errorText || errorMessage
            }
          }
        } catch (error) {
          console.error("Error reading response:", error)
        }

        toast.error(errorMessage)
      }
    } catch (error) {
      console.error("Failed to reject request:", error)
      toast.error("Network error. Please check your connection and try again.")
    } finally {
      setLoading((prev) => ({ ...prev, reject: false }))
    }
  }

  const handleOpenReferral = (referral: PatientReferral) => {
    setSelectedReferral(referral)
    setShowDetailModal(true)
    setShowAppointmentForm(false)
    setPictureFile(null)
    setPreviewUrl(referral.pictureUrl || "")
    setFormData({
      appointmentDate: "",
      appointmentTime: "",
      appointmentType: "Consultation",
      roomNumber: "",
      duration: 30,
      notes: referral.notes || "",
      insuranceProvider: "",
      insuranceNumber: "",
    })
    setFormErrors({})
    setShowRejectModal(false)
    setRejectReason("")
  }

  const handleBackToPatientInfo = () => {
    setShowAppointmentForm(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800 border border-amber-200"
      case "in-progress":
        return "bg-blue-100 text-blue-800 border border-blue-200"
      case "completed":
        return "bg-green-100 text-green-800 border border-green-200"
      case "rejected":
        return "bg-red-100 text-red-800 border border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200"
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
              {/* Search bar with improved styling */}
              <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search by patient name, doctor name, phone, email, or reason..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground text-sm transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground whitespace-nowrap">Status:</span>
                    <select
                      value={selectedStatus}
                      onChange={(e) => {
                        setSelectedStatus(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="px-3 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground text-sm transition-all"
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

              {/* Results count and stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  Showing{" "}
                  <span className="font-semibold text-foreground">
                    {filteredReferrals.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-foreground">
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredReferrals.length)}
                  </span>{" "}
                  of <span className="font-semibold text-foreground">{filteredReferrals.length}</span> referrals
                  {searchTerm && (
                    <span className="ml-2">
                      for "<span className="font-medium text-foreground">{searchTerm}</span>"
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Show per page:</span>
                  <select
                    value={ITEMS_PER_PAGE}
                    onChange={(e) => {
                      // Note: ITEMS_PER_PAGE is constant, you might want to make this stateful
                    }}
                    className="text-xs px-2 py-1 bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>
            </div>

            {loading.fetch ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading forwarded requests...</p>
              </div>
            ) : paginatedReferrals.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg border border-border">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No referrals found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {filteredReferrals.length === 0
                    ? searchTerm || selectedStatus !== "all"
                      ? "No referrals match your search criteria. Try different keywords or clear filters."
                      : "No forwarded requests have been received yet."
                    : "No results on this page."}
                </p>
                {(searchTerm || selectedStatus !== "all") && (
                  <button
                    onClick={() => {
                      setSearchTerm("")
                      setSelectedStatus("all")
                    }}
                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-semibold py-3 px-4">Patient Name</TableHead>
                          <TableHead className="font-semibold py-3 px-4">Referred By</TableHead>
                          <TableHead className="font-semibold py-3 px-4">Phone</TableHead>
                          <TableHead className="font-semibold py-3 px-4">Email</TableHead>
                          <TableHead className="font-semibold py-3 px-4">Status</TableHead>
                          <TableHead className="font-semibold py-3 px-4 text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedReferrals.map((referral) => (
                          <TableRow
                            key={referral._id}
                            className="hover:bg-muted/30 transition-colors border-b border-border last:border-b-0"
                          >
                            <TableCell className="font-medium text-foreground py-3 px-4">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                {referral.patientName}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Stethoscope className="w-4 h-4 text-primary" />
                                {referral.doctorName}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                {referral.patientPhones?.find((phone) => phone.isPrimary)?.number ||
                                  referral.patientPhones?.[0]?.number ||
                                  "N/A"}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                {referral.patientEmail || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(referral.status)}`}
                              >
                                {referral.status.charAt(0).toUpperCase() + referral.status.slice(1).replace("-", " ")}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              {(referral.status === "pending" || referral.status === "in-progress") && (
                                <button
                                  onClick={() => handleOpenReferral(referral)}
                                  disabled={loading.createAppointment || loading.reject}
                                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:cursor-not-allowed"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Review
                                </button>
                              )}
                              {referral.status === "completed" && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                                  <CheckCircle className="w-4 h-4" />
                                  Completed
                                </span>
                              )}
                              {referral.status === "rejected" && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
                                  <XCircle className="w-4 h-4" />
                                  Rejected
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Enhanced Pagination */}
                {totalPages > 1 && (
                  <div className="bg-card rounded-lg border border-border p-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-muted-foreground">
                        Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
                        <span className="font-semibold text-foreground">{totalPages}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span className="text-sm font-medium">Previous</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {getPageNumbers().map((page, index) => (
                            <button
                              key={index}
                              onClick={() => typeof page === "number" && setCurrentPage(page)}
                              disabled={page === "..."}
                              className={`min-w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                                currentPage === page
                                  ? "bg-primary text-primary-foreground font-semibold"
                                  : page === "..."
                                    ? "cursor-default"
                                    : "hover:bg-muted text-foreground"
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <span className="text-sm font-medium">Next</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Go to:</span>
                        <input
                          type="number"
                          min="1"
                          max={totalPages}
                          value={currentPage}
                          onChange={(e) => {
                            const page = Math.max(1, Math.min(totalPages, Number.parseInt(e.target.value) || 1))
                            setCurrentPage(page)
                          }}
                          className="w-16 px-2 py-1.5 bg-background border border-border rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {showDetailModal && selectedReferral && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50 backdrop-blur-sm">
                <div className="bg-card rounded-lg sm:rounded-xl shadow-2xl border border-border max-w-2xl sm:max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10 gap-3">
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      {showAppointmentForm && (
                        <button
                          onClick={handleBackToPatientInfo}
                          className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground cursor-pointer flex-shrink-0 mr-1"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                      )}
                      <div className="p-2 sm:p-3 bg-primary/10 rounded-lg flex-shrink-0">
                        {showAppointmentForm ? (
                          <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        ) : (
                          <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                          {showAppointmentForm ? "Book Appointment" : selectedReferral.patientName}
                        </h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          {showAppointmentForm ? (
                            <>
                              <User className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">For {selectedReferral.patientName}</span>
                            </>
                          ) : (
                            <>
                              <Stethoscope className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">Referred by {selectedReferral.doctorName}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground cursor-pointer flex-shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content - Show patient info by default, appointment form when showAppointmentForm is true */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {!showAppointmentForm ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Patient Details */}
                        <div className="space-y-6">
                          <div className="bg-white rounded-lg border border-border p-5">
                            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                              <User className="w-5 h-5 text-primary" />
                              Personal Info
                            </h3>
                            <div className="space-y-4">
                              <div className="flex items-start gap-3">
                                <Phone className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Phone</p>
                                  <p className="text-foreground font-medium">
                                    {selectedReferral.patientPhones?.find((phone) => phone.isPrimary)?.number ||
                                      selectedReferral.patientPhones?.[0]?.number ||
                                      "N/A"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <Mail className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Email</p>
                                  <p className="text-foreground font-medium">
                                    {selectedReferral.patientEmail || "N/A"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                                  <p className="text-foreground font-medium">{selectedReferral.patientDob}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Address</p>
                                  <p className="text-foreground font-medium">
                                    {selectedReferral.patientAddress || "N/A"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Medical Information */}
                          <div className="bg-white rounded-lg border border-border p-5">
                            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                              <FileText className="w-5 h-5 text-primary" />
                              Medical Info
                            </h3>
                            <div className="space-y-4">
                              {selectedReferral.patientAllergies.length > 0 && (
                                <div>
                                  <p className="text-sm text-muted-foreground font-medium mb-2">Allergies</p>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedReferral.patientAllergies.map((allergy, index) => (
                                      <span
                                        key={index}
                                        className="px-3 py-1.5 bg-amber-50 text-amber-700 text-sm rounded-full font-medium border border-amber-200"
                                      >
                                        {allergy}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {selectedReferral.patientMedicalConditions.length > 0 && (
                                <div>
                                  <p className="text-sm text-muted-foreground font-medium mb-2">Medical Conditions</p>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedReferral.patientMedicalConditions.map((condition, index) => (
                                      <span
                                        key={index}
                                        className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full font-medium border border-blue-200"
                                      >
                                        {condition}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div>
                                <p className="text-sm text-muted-foreground font-medium mb-2">Referral Reason</p>
                                <p className="text-foreground bg-primary/5 rounded-lg p-4 text-sm border border-primary/10">
                                  {selectedReferral.referralReason}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Picture Upload and Quick Actions */}
                        <div className="space-y-6">
                          <div className="bg-white rounded-lg border border-border p-5">
                            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                              <Camera className="w-5 h-5 text-primary" />
                              Patient Photo
                            </h3>
                            <div className="space-y-4">
                              <div className="border-2 border-dashed border-border rounded-xl p-6 transition-colors hover:border-primary/50">
                                {previewUrl ? (
                                  <div className="text-center">
                                    <img
                                      src={previewUrl || "/placeholder.svg"}
                                      alt="Patient"
                                      className="w-48 h-48 object-cover rounded-lg mx-auto mb-4 shadow-md"
                                    />
                                    {!selectedReferral.pictureUrl && (
                                      <button
                                        onClick={() => {
                                          setPictureFile(null)
                                          setPreviewUrl("")
                                        }}
                                        className="text-sm text-destructive hover:text-destructive/80 font-medium cursor-pointer"
                                      >
                                        Remove Photo
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <Camera className="w-12 h-12 text-muted-foreground mb-4" />
                                    <label className="cursor-pointer">
                                      <span className="text-primary hover:underline font-medium text-base">
                                        Click to upload patient photo
                                      </span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePictureSelect}
                                        className="hidden"
                                        disabled={loading.upload || !!selectedReferral.pictureUrl}
                                      />
                                    </label>
                                    <p className="text-sm text-muted-foreground mt-2">JPG, PNG up to 5MB</p>
                                  </div>
                                )}
                              </div>

                              {pictureFile && !selectedReferral.pictureUrl && (
                                <button
                                  onClick={uploadPicture}
                                  disabled={loading.upload || loading.createAppointment}
                                  className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground px-4 py-3 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:cursor-not-allowed"
                                >
                                  {loading.upload ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4" />
                                      Upload Photo
                                    </>
                                  )}
                                </button>
                              )}

                              {selectedReferral.pictureUrl && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                  <p className="text-sm text-green-800 font-medium flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>Uploaded by {selectedReferral.pictureSavedBy}</span>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="bg-white rounded-lg border border-border p-5">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Actions</h3>
                            <button
                              onClick={() => setShowAppointmentForm(true)}
                              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 py-3 rounded-lg transition-colors font-medium text-sm mb-3 cursor-pointer disabled:cursor-not-allowed"
                            >
                              <Calendar className="w-4 h-4" />
                              Book Appointment
                            </button>
                            <button
                              onClick={() => setShowRejectModal(true)}
                              disabled={loading.createAppointment}
                              className="w-full flex items-center justify-center gap-2 bg-destructive hover:bg-destructive/90 disabled:bg-destructive/50 text-white px-4 py-3 rounded-lg transition-colors font-medium text-sm disabled:cursor-not-allowed cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject Request
                            </button>
                            {!selectedReferral.pictureUrl && (
                              <p className="text-xs text-amber-600 mt-2 text-center">
                                Please upload patient photo if you have
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Appointment Booking Form */
                      <div className="space-y-6">
                        <div className="bg-white rounded-lg border border-border p-5">
                          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            Schedule Appointment for {selectedReferral.patientName}
                          </h3>

                          <form className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-foreground">Date *</label>
                              <input
                                type="date"
                                value={formData.appointmentDate}
                                onChange={(e) => {
                                  setFormData({ ...formData, appointmentDate: e.target.value })
                                  setFormErrors({ ...formErrors, appointmentDate: "" })
                                }}
                                disabled={loading.createAppointment}
                                className={`w-full px-3 py-2.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm transition-colors ${
                                  formErrors.appointmentDate ? "border-destructive" : "border-border"
                                }`}
                              />
                              {formErrors.appointmentDate && (
                                <p className="text-sm text-destructive mt-1">{formErrors.appointmentDate}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-foreground">Time *</label>
                              <input
                                type="time"
                                value={formData.appointmentTime}
                                onChange={(e) => {
                                  setFormData({ ...formData, appointmentTime: e.target.value })
                                  setFormErrors({ ...formErrors, appointmentTime: "" })
                                }}
                                disabled={loading.createAppointment}
                                className={`w-full px-3 py-2.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm transition-colors ${
                                  formErrors.appointmentTime ? "border-destructive" : "border-border"
                                }`}
                              />
                              {formErrors.appointmentTime && (
                                <p className="text-sm text-destructive mt-1">{formErrors.appointmentTime}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-foreground">Type</label>
                              <select
                                value={formData.appointmentType}
                                onChange={(e) => setFormData({ ...formData, appointmentType: e.target.value })}
                                disabled={loading.createAppointment}
                                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm transition-colors"
                              >
                                <option value="Consultation">Consultation</option>
                                <option value="Cleaning">Cleaning</option>
                                <option value="Filling">Filling</option>
                                <option value="Root Canal">Root Canal</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-foreground">Duration (minutes)</label>
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
                                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm transition-colors"
                              />
                            </div>

                            <div className="md:col-span-2 space-y-2">
                              <label className="block text-sm font-medium text-foreground">Room Number *</label>
                              <input
                                type="text"
                                placeholder="e.g., Room 1"
                                value={formData.roomNumber}
                                onChange={(e) => {
                                  setFormData({ ...formData, roomNumber: e.target.value })
                                  setFormErrors({ ...formErrors, roomNumber: "" })
                                }}
                                disabled={loading.createAppointment}
                                className={`w-full px-3 py-2.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm transition-colors ${
                                  formErrors.roomNumber ? "border-destructive" : "border-border"
                                }`}
                              />
                              {formErrors.roomNumber && (
                                <p className="text-sm text-destructive mt-1">{formErrors.roomNumber}</p>
                              )}
                            </div>

                            {/* Insurance fields */}
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                  Insurance Provider
                                </label>
                                <input
                                  type="text"
                                  value={formData.insuranceProvider}
                                  onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                                  disabled={loading.createAppointment}
                                  className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                                  placeholder="e.g., Blue Cross"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                  Insurance Number
                                </label>
                                <input
                                  type="text"
                                  value={formData.insuranceNumber}
                                  onChange={(e) => setFormData({ ...formData, insuranceNumber: e.target.value })}
                                  disabled={loading.createAppointment}
                                  className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                                  placeholder="e.g., POL123456"
                                />
                              </div>
                            </div>

                            <div className="md:col-span-2 space-y-2">
                              <label className="block text-sm font-medium text-foreground">Notes (Optional)</label>
                              <textarea
                                placeholder="Any additional notes..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                disabled={loading.createAppointment}
                                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm transition-colors resize-none"
                                rows={4}
                              />
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer - Show different buttons based on which form is displayed */}
                  <div className="flex gap-3 p-4 sm:p-6 border-t border-border bg-muted/30">
                    {!showAppointmentForm ? (
                      <>
                        <button
                          onClick={() => setShowDetailModal(false)}
                          className="flex-1 bg-muted hover:bg-muted/80 text-muted-foreground px-4 py-3 rounded-lg transition-colors font-medium text-sm cursor-pointer"
                        >
                          Close
                        </button>
                        <button
                          onClick={() => setShowRejectModal(true)}
                          disabled={loading.createAppointment}
                          className="flex-1 flex items-center justify-center gap-2 bg-destructive hover:bg-destructive/90 disabled:bg-destructive/50 text-white px-4 py-3 rounded-lg transition-colors font-medium text-sm disabled:cursor-not-allowed cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject Request
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleBackToPatientInfo}
                          disabled={loading.createAppointment}
                          className="flex-1 flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 disabled:bg-muted/50 text-muted-foreground px-4 py-3 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:cursor-not-allowed"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Back to Patient Info
                        </button>
                        <button
                          onClick={createAppointmentAndCompleteReferral}
                          disabled={loading.createAppointment}
                          className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 py-3 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:cursor-not-allowed"
                        >
                          {loading.createAppointment ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Book Appointment & Complete
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showRejectModal && selectedReferral && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                <div className="bg-card rounded-xl shadow-2xl border border-border max-w-md w-full">
                  <div className="p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-destructive/10 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-destructive" />
                      </div>
                      <h2 className="text-xl font-bold text-foreground">Reject Request</h2>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Are you sure you want to reject the request from {selectedReferral.doctorName}?
                    </p>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground">Reason (Optional)</label>
                      <textarea
                        placeholder="Enter rejection reason..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive text-foreground placeholder-muted-foreground text-sm transition-colors resize-none"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 p-6 border-t border-border bg-muted/30">
                    <button
                      onClick={() => setShowRejectModal(false)}
                      disabled={loading.reject}
                      className="flex-1 bg-muted hover:bg-muted/80 disabled:bg-muted/50 text-muted-foreground px-4 py-3 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => rejectForwardRequest()}
                      disabled={loading.reject}
                      className="flex-1 flex items-center justify-center gap-2 bg-destructive hover:bg-destructive/90 disabled:bg-destructive/50 text-white px-4 py-3 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:cursor-not-allowed"
                    >
                      {loading.reject ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Reject Request
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