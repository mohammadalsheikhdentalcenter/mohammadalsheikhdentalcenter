//@ts-nocheck
"use client"
import { createPortal } from "react-dom"
import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/components/auth-context"
import { useState, useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import { Plus, Loader2, FileText, CheckCircle, X, Edit, Trash2, Eye } from "lucide-react"
import { AppointmentActionModal } from "@/components/appointment-action-modal"
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal"
import { SearchableDropdown } from "@/components/searchable-dropdown"
import { useRouter } from "next/navigation"
import { StatCard } from "@/components/appointment-stats-card"
import { Calendar, Clock, CheckCircle2, XCircle } from "lucide-react"
import { PatientReferralModal } from "@/components/patient-referral-modal"
import { ReferAppointmentModal } from "@/components/refer-appointment-modal"

// Separate ActionDropdown component
function ActionDropdown({
  appointment,
  hasReport,
  userRole,
  userId,
  loading,
  onEdit,
  onDelete,
  onCreateReport,
  onViewReport,
  onClose,
  onCancel,
  canCloseAppointment,
  onReferAppointment,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)
  const appointmentId = appointment._id || appointment.id

  // Calculate position and close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    const updatePosition = () => {
      if (buttonRef.current && isOpen) {
        const rect = buttonRef.current.getBoundingClientRect()
        // Position ABOVE the button instead of below
        setPosition({
          top: rect.top + window.scrollY - 100, // 10px above the button
          left: rect.left + window.scrollX - 200, // Adjust to left side
        })
      }
    }

    if (isOpen) {
      updatePosition()
      document.addEventListener("mousedown", handleClickOutside)
      window.addEventListener("resize", updatePosition)
      window.addEventListener("scroll", updatePosition)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition)
    }
  }, [isOpen])

  const toggleDropdown = (e) => {
    e.stopPropagation()

    if (!isOpen) {
      const rect = e.currentTarget.getBoundingClientRect()
      // Position ABOVE the button
      setPosition({
        top: rect.top + window.scrollY - 10, // 10px above the button
        left: rect.left + window.scrollX - 180, // Move to left side to avoid right edge cutoff
      })
    }

    setIsOpen(!isOpen)
  }

  const handleAction = (action) => {
    action()
    setIsOpen(false)
  }

  const getActionItems = () => {
    const items = []

    const isOriginalDoctorWithReferral =
      userRole === "doctor" && appointment.originalDoctorId === userId && appointment.isReferred === true

    const isReferredDoctor = userRole === "doctor" && appointment.doctorId === userId && appointment.isReferred === true

    // Edit action
    if (appointment.status !== "completed" && appointment.status !== "closed" && userRole !== "doctor") {
      items.push({
        label: "Edit",
        icon: <Edit className="w-4 h-4" />,
        onClick: () => onEdit(appointment),
        disabled: loading.addAppointment || loading.updateAppointment || loading.deleteAppointment,
        className: "text-blue-600",
      })
    }

    // Delete action - Only for non-doctors
    if (userRole !== "doctor") {
      items.push({
        label: "Delete",
        icon: <Trash2 className="w-4 h-4" />,
        onClick: () => onDelete(appointment),
        disabled: loading.deleteAppointment,
        className: "text-red-600",
      })
    }

    // View Details action
    if (userRole !== "doctor") {
      items.push({
        label: "View Details",
        icon: <Eye className="w-4 h-4" />,
        onClick: () => (window.location.href = `/dashboard/appointments/${appointmentId}`),
        disabled: loading.appointments,
        className: "text-blue-600",
      })
    }
    // Doctor-specific actions
    if (
      userRole === "doctor" &&
      appointment.status !== "cancelled" &&
      appointment.status !== "completed" &&
      appointment.status !== "closed"
    ) {
      if (!isOriginalDoctorWithReferral) {
        items.push({
          label: hasReport ? "View Report" : "Create Report",
          icon: <FileText className="w-4 h-4" />,
          onClick: hasReport ? () => onViewReport() : () => onCreateReport(appointment),
          disabled: loading.createReport,
          className: "text-blue-600",
        })
      }

      if (!appointment.isReferred) {
        items.push({
          label: "Refer to Doctor",
          icon: <FileText className="w-4 h-4" />,
          onClick: () => onReferAppointment(appointment),
          disabled: false,
          className: "text-purple-600",
        })
      }

      if (!isOriginalDoctorWithReferral && !isReferredDoctor) {
        items.push({
          label: "Close Appointment",
          icon: <CheckCircle className="w-4 h-4" />,
          onClick: () => onClose(appointmentId),
          disabled: loading.completeAppointment || !canCloseAppointment(appointmentId),
          className: canCloseAppointment(appointmentId) ? "text-green-600" : "text-gray-400 cursor-not-allowed",
        })
      }

      if (!isOriginalDoctorWithReferral && !isReferredDoctor) {
        items.push({
          label: "Cancel Appointment",
          icon: <X className="w-4 h-4" />,
          onClick: () => onCancel(appointmentId),
          disabled: loading.cancelAppointment,
          className: "text-red-600",
        })
      }
    }

    return items
  }

  const actionItems = getActionItems()

  return (
    <>
      <div className="relative inline-block">
        <button
          ref={buttonRef}
          onClick={toggleDropdown}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors bg-white"
          title="Actions"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>
      </div>

      {/* Portal the dropdown to body - positioned ABOVE the button */}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: `${position.top}px`,
              left: `${position.left}px`,
              zIndex: 9999,
            }}
            className="w-56 bg-white border border-gray-300 rounded-lg shadow-2xl py-2"
          >
            {actionItems.map((item, index) => (
              <button
                key={index}
                onClick={() => !item.disabled && handleAction(item.onClick)}
                disabled={item.disabled}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  item.disabled ? "opacity-50 cursor-not-allowed text-gray-400" : `${item.className} hover:bg-blue-50`
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}

// Appointments Table View Component
function AppointmentsTableView({
  appointments,
  userRole,
  userId,
  appointmentReports,
  loading,
  onEdit,
  onDelete,
  onCreateReport,
  onViewReport,
  onClose,
  onCancel,
  canCloseAppointment,
  onReferAppointment,
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "closed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Filter appointments for doctors to only show their own appointments
  const filteredAppointments =
    userRole === "doctor"
      ? appointments.filter((apt) => {
          const isCurrentDoctor = String(apt.doctorId) === String(userId)
          const isOriginalDoctor = String(apt.originalDoctorId) === String(userId)
          return isCurrentDoctor || isOriginalDoctor
        })
      : appointments

  return (
    <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 font-medium text-foreground">Patient</th>
              <th className="text-left p-4 font-medium text-foreground">Doctor</th>
              <th className="text-left p-4 font-medium text-foreground">Date & Time</th>
              <th className="text-left p-4 font-medium text-foreground">Type</th>
              <th className="text-left p-4 font-medium text-foreground">Room</th>
              <th className="text-left p-4 font-medium text-foreground">Status</th>
              <th className="text-left p-4 font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.map((appointment) => {
              const hasReport = appointmentReports[appointment._id || appointment.id]
              const appointmentId = appointment._id || appointment.id

              return (
                <tr key={appointmentId} className="border-b border-border hover:bg-muted/50">
                  <td className="p-4 text-foreground">{appointment.patientName}</td>
                  <td className="p-4 text-foreground">{appointment.doctorName}</td>
                  <td className="p-4 text-foreground">
                    <div>{formatDate(appointment.date)}</div>
                    <div className="text-sm text-muted-foreground">{appointment.time}</div>
                    {appointment.isReferred && (
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {appointment.originalDoctorId === userId
                            ? `Referred to ${appointment.doctorName}`
                            : "Referred In"}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-foreground">{appointment.type}</td>
                  <td className="p-4 text-foreground">{appointment.roomNumber}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}
                    >
                      {appointment.status}
                    </span>
                    {userRole === "doctor" && appointment.status !== "cancelled" && appointment.status !== "closed" && (
                      <div className="mt-1">
                        {hasReport ? (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Report ready
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            No report
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <ActionDropdown
                      key={`${appointmentId}-${hasReport ? "with-report" : "no-report"}`}
                      appointment={appointment}
                      hasReport={hasReport}
                      userRole={userRole}
                      userId={userId}
                      loading={loading}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onCreateReport={onCreateReport}
                      onViewReport={onViewReport}
                      onClose={onClose}
                      onCancel={onCancel}
                      canCloseAppointment={canCloseAppointment}
                      onReferAppointment={onReferAppointment}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredAppointments.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No appointments found</div>
        )}
      </div>
    </div>
  )
}

// Helper function to convert time string to minutes
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

export default function AppointmentsTablePage() {
  const { user, token } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [showReportForm, setShowReportForm] = useState(false)
  const [appointmentReports, setAppointmentReports] = useState<Record<string, boolean>>({})
  const [appointmentActionModal, setAppointmentActionModal] = useState<{
    isOpen: boolean
    action: "close" | "cancel" | null
    appointmentId: string | null
  }>({
    isOpen: false,
    action: null,
    appointmentId: null,
  })
  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    doctorId: "",
    doctorName: "",
    date: "",
    time: "",
    type: "Consultation",
    roomNumber: "",
    duration: 30,
  })
  const [reportData, setReportData] = useState({
    procedures: [],
    findings: "",
    notes: "",
    nextVisit: "",
    followUpDetails: "",
  })
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [reportErrors, setReportErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState({
    appointments: false,
    patients: false,
    doctors: false,
    addAppointment: false,
    updateAppointment: false,
    deleteAppointment: false,
    cancelAppointment: false,
    completeAppointment: false,
    createReport: false,
  })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [appointmentToDelete, setAppointmentToDelete] = useState<any>(null)
  const router = useRouter()

  const [showReferralModal, setShowReferralModal] = useState(false)

  const [showReferModal, setShowReferModal] = useState(false)
  const [selectedAppointmentForReferral, setSelectedAppointmentForReferral] = useState<any>(null)

  const checkAppointmentReports = async () => {
    try {
      const reportChecks: Record<string, boolean> = {}

      // Check each appointment for a report
      for (const apt of appointments) {
        const appointmentId = apt._id || apt.id
        try {
          const res = await fetch(`/api/appointment-reports?appointmentId=${appointmentId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const data = await res.json()
            reportChecks[appointmentId] = data.reports && data.reports.length > 0
          } else {
            reportChecks[appointmentId] = false
          }
        } catch (error) {
          console.error(`Failed to check report for appointment ${appointmentId}:`, error)
          reportChecks[appointmentId] = false
        }
      }

      setAppointmentReports(reportChecks)
    } catch (error) {
      console.error("Failed to check appointment reports:", error)
    }
  }

  useEffect(() => {
    if (token) {
      fetchAppointments()
      fetchPatients()
      if (user?.role !== "doctor") {
        fetchDoctors()
      }
      // Call checkAppointmentReports on initial load
      fetchAppointmentReports()
      checkAppointmentReports()
    }
  }, [token, user])

  const fetchAppointments = async () => {
    setLoading((prev) => ({ ...prev, appointments: true }))
    try {
      const res = await fetch("/api/appointments", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setAppointments(data.appointments || [])
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error)
      toast.error("Failed to fetch appointments")
    } finally {
      setLoading((prev) => ({ ...prev, appointments: false }))
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
      }
    } catch (error) {
      console.error("Failed to fetch patients:", error)
      toast.error("Failed to fetch patients")
    } finally {
      setLoading((prev) => ({ ...prev, patients: false }))
    }
  }

  const fetchDoctors = async () => {
    setLoading((prev) => ({ ...prev, doctors: true }))
    try {
      const res = await fetch("/api/users?role=doctor", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setDoctors(data.users || [])
      }
    } catch (error) {
      console.error("Failed to fetch doctors:", error)
      toast.error("Failed to fetch doctors")
    } finally {
      setLoading((prev) => ({ ...prev, doctors: false }))
    }
  }

  const fetchAppointmentReports = async () => {
    try {
      const res = await fetch("/api/appointment-reports", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const reportsMap: Record<string, boolean> = {}
        data.reports?.forEach((report: any) => {
          reportsMap[report.appointmentId] = true
        })
        setAppointmentReports(reportsMap)
      }
    } catch (error) {
      console.error("Failed to fetch appointment reports:", error)
    }
  }

  const getSelectedPatient = () => {
    return formData.patientId ? patients.find((p) => p._id === formData.patientId) : null
  }

  const getSelectedDoctor = () => {
    return formData.doctorId ? doctors.find((d) => d.id === formData.doctorId) : null
  }

  const handlePatientSelect = (patient: any) => {
    if (patient) {
      setFormData({
        ...formData,
        patientId: patient._id,
        patientName: patient.name,
      })
      setFormErrors({ ...formErrors, patientId: "" })
    } else {
      setFormData({
        ...formData,
        patientId: "",
        patientName: "",
      })
    }
  }

  const handleDoctorSelect = (doctor: any) => {
    if (doctor) {
      setFormData({
        ...formData,
        doctorId: doctor.id,
        doctorName: doctor.name,
      })
      setFormErrors({ ...formErrors, doctorId: "" })
    } else {
      setFormData({
        ...formData,
        doctorId: "",
        doctorName: "",
      })
    }
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    setLoading((prev) => ({ ...prev, deleteAppointment: true }))
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setAppointments(appointments.filter((a) => a._id !== appointmentId && a.id !== appointmentId))
        toast.success("Appointment deleted successfully")
      } else {
        toast.error("Failed to delete appointment")
      }
    } catch (error) {
      console.error("Failed to delete appointment:", error)
      toast.error("Error deleting appointment")
    } finally {
      setLoading((prev) => ({ ...prev, deleteAppointment: false }))
    }
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    setLoading((prev) => ({ ...prev, cancelAppointment: true }))
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "cancelled" }),
      })

      if (res.ok) {
        const data = await res.json()
        setAppointments(
          appointments.map((a) => (a._id === appointmentId || a.id === appointmentId ? data.appointment : a)),
        )
        toast.success("Appointment cancelled successfully")
        setAppointmentActionModal({ isOpen: false, action: null, appointmentId: null })
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Failed to cancel appointment")
      }
    } catch (error) {
      console.error("Failed to cancel appointment:", error)
      toast.error("Error cancelling appointment")
    } finally {
      setLoading((prev) => ({ ...prev, cancelAppointment: false }))
    }
  }

  const handleCompleteAppointment = async (appointmentId: string) => {
    setLoading((prev) => ({ ...prev, completeAppointment: true }))
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "completed" }),
      })

      if (res.ok) {
        const data = await res.json()
        setAppointments(
          appointments.map((a) => (a._id === appointmentId || a.id === appointmentId ? data.appointment : a)),
        )
        toast.success("Appointment marked as completed")
        setAppointmentActionModal({ isOpen: false, action: null, appointmentId: null })
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Failed to complete appointment")
      }
    } catch (error) {
      console.error("Failed to complete appointment:", error)
      toast.error("Error completing appointment")
    } finally {
      setLoading((prev) => ({ ...prev, completeAppointment: false }))
    }
  }

  const handleEditAppointment = (appointment: any) => {
    if (user?.role === "doctor" && appointment.doctorId !== user.userId) {
      toast.error("You can only edit your own appointments")
      return
    }

    setEditingId(appointment._id || appointment.id)
    setFormData({
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName,
      date: appointment.date,
      time: appointment.time,
      type: appointment.type,
      roomNumber: appointment.roomNumber,
      duration: appointment.duration && !isNaN(appointment.duration) ? appointment.duration : 30,
    })
    setShowForm(true)
  }

  const validateAppointmentForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.patientId.trim()) {
      errors.patientId = "Patient is required"
    }

    // Only validate doctorId if user is not a doctor
    if (user?.role !== "doctor" && (!formData.doctorId || !String(formData.doctorId).trim())) {
      errors.doctorId = "Doctor is required"
    }

    if (!formData.date || !formData.date.trim()) {
      errors.date = "Date is required"
    } else {
      const selectedDate = new Date(formData.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate < today) {
        errors.date = "Cannot schedule appointments in the past"
      }
    }
    if (!formData.time || !formData.time.trim()) {
      errors.time = "Time is required"
    }
    if (!formData.roomNumber || !formData.roomNumber.trim()) {
      errors.roomNumber = "Room Number is required"
    }
    if (formData.duration <= 0) {
      errors.duration = "Duration must be greater than 0"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }
  useEffect(() => {
    if (appointments.length > 0 && token) {
      checkAppointmentReports()
    }
  }, [appointments, token])
  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAppointmentForm()) {
      toast.error("Please fix the errors in the form")
      return
    }

    const finalDoctorId = user?.role === "doctor" ? String(user?.id) : formData.doctorId
    const finalDoctorName = user?.role === "doctor" ? user?.name : formData.doctorName

    console.log("[v0] Doctor ID Debug - role:", user?.role, "id:", user?.id, "finalDoctorId:", finalDoctorId)

    if (user?.role !== "doctor" && (!finalDoctorId || !String(finalDoctorId).trim())) {
      toast.error("Doctor is required")
      setFormErrors({ ...formErrors, doctorId: "Doctor is required" })
      return
    }

    if (!finalDoctorId) {
      toast.error("Doctor information is missing. Please try logging in again.")
      return
    }

    const submissionData = {
      patientId: formData.patientId,
      patientName: formData.patientName,
      doctorId: finalDoctorId,
      doctorName: finalDoctorName,
      date: formData.date,
      time: formData.time,
      type: formData.type,
      roomNumber: formData.roomNumber,
      duration: formData.duration || 30,
    }

    const timeConflict = appointments.some((apt) => {
      if (editingId && (apt._id === editingId || apt.id === editingId)) {
        return false
      }
      if (apt.status === "cancelled" || apt.status === "closed" || apt.status === "completed") {
        return false
      }

      if (apt.doctorId !== submissionData.doctorId || apt.date !== formData.date) {
        return false
      }

      const aptStartMin = timeToMinutes(apt.time)
      const aptDuration = apt.duration || 30
      const aptEndMin = aptStartMin + aptDuration

      const newStartMin = timeToMinutes(formData.time)
      const newDuration = formData.duration || 30
      const newEndMin = newStartMin + newDuration

      return newStartMin < aptEndMin && aptStartMin < newEndMin
    })

    if (timeConflict) {
      const conflictingApt = appointments.find((apt) => {
        if (editingId && (apt._id === editingId || apt.id === editingId)) {
          return false
        }
        if (apt.status === "cancelled" || apt.status === "closed" || apt.status === "completed") {
          return false
        }
        if (apt.doctorId !== submissionData.doctorId || apt.date !== formData.date) {
          return false
        }

        const aptStartMin = timeToMinutes(apt.time)
        const aptDuration = apt.duration || 30
        const aptEndMin = aptStartMin + aptDuration

        const newStartMin = timeToMinutes(formData.time)
        const newDuration = formData.duration || 30
        const newEndMin = newStartMin + newDuration

        return newStartMin < aptEndMin && aptStartMin < newEndMin
      })

      if (conflictingApt) {
        const aptStartMin = timeToMinutes(conflictingApt.time)
        const aptDuration = conflictingApt.duration || 30
        const aptEndMin = aptStartMin + aptDuration

        const aptEndHours = Math.floor(aptEndMin / 60)
        const aptEndMins = aptEndMin % 60
        const aptEndTime = `${String(aptEndHours).padStart(2, "0")}:${String(aptEndMins).padStart(2, "0")}`

        const newStartMin = timeToMinutes(formData.time)
        const newDuration = formData.duration || 30
        const newEndMin = newStartMin + newDuration

        const newEndHours = Math.floor(newEndMin / 60)
        const newEndMins = newEndMin % 60
        const newEndTime = `${String(newEndHours).padStart(2, "0")}:${String(newEndMins).padStart(2, "0")}`

        toast.error(
          `Doctor ${submissionData.doctorName} has another appointment from ${conflictingApt.time} to ${aptEndTime} on ${formData.date}. Please choose a different time.`,
        )
      }
      return
    }

    const loadingKey = editingId ? "updateAppointment" : "addAppointment"
    setLoading((prev) => ({ ...prev, [loadingKey]: true }))

    try {
      const method = editingId ? "PUT" : "POST"
      const url = editingId ? `/api/appointments/${editingId}` : "/api/appointments"

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submissionData),
      })

      if (res.ok) {
        const data = await res.json()
        if (editingId) {
          setAppointments(appointments.map((a) => (a._id === editingId || a.id === editingId ? data.appointment : a)))
          toast.success("Appointment updated successfully")
          setEditingId(null)
        } else {
          setAppointments([...appointments, data.appointment])
          toast.success("Appointment scheduled successfully")
        }
        setShowForm(false)
        setFormErrors({})
        setFormData({
          patientId: "",
          patientName: "",
          doctorId: "",
          doctorName: "",
          date: "",
          time: "",
          type: "Consultation",
          roomNumber: "",
          duration: 30,
        })
      } else {
        const errorData = await res.json()
        if (res.status === 409) {
          toast.error(errorData.error || "Time slot is already booked for this doctor")
        } else {
          toast.error(errorData.error || "Failed to save appointment")
        }
      }
    } catch (error) {
      console.error("Failed to add appointment:", error)
      toast.error("Error saving appointment")
    } finally {
      setLoading((prev) => ({ ...prev, [loadingKey]: false }))
    }
  }

  const validateReportForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!reportData.procedures || reportData.procedures.length === 0) {
      errors.procedures = "At least one procedure is required"
    }
    if (!reportData.findings.trim()) {
      errors.findings = "Findings are required"
    }
    if (!reportData.notes.trim()) {
      errors.notes = "Notes are required"
    }

    setReportErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAppointment) return

    if (!validateReportForm()) {
      toast.error("Please fix the errors in the form")
      return
    }

    setLoading((prev) => ({ ...prev, createReport: true }))
    try {
      const proceduresArray = Array.isArray(reportData.procedures)
        ? reportData.procedures.filter((p) => p && p.trim())
        : reportData.procedures
            .split("\n")
            .map((p) => p.trim())
            .filter(Boolean)

      const res = await fetch("/api/appointment-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appointmentId: selectedAppointment._id || selectedAppointment.id,
          patientId: selectedAppointment.patientId,
          procedures: proceduresArray,
          findings: reportData.findings.trim(),
          notes: reportData.notes.trim(),
          nextVisit: reportData.nextVisit || null,
          followUpDetails: reportData.followUpDetails || "",
        }),
      })

      const responseData = await res.json()

      if (res.ok) {
        toast.success("Report created successfully")

        // Update the appointmentReports state immediately
        const appointmentId = selectedAppointment._id || selectedAppointment.id
        setAppointmentReports((prev) => ({
          ...prev,
          [appointmentId]: true,
        }))

        // Also refresh the complete list
        await checkAppointmentReports()

        setShowReportForm(false)
        setReportErrors({})
        setReportData({
          procedures: [],
          findings: "",
          notes: "",
          nextVisit: "",
          followUpDetails: "",
        })
        setSelectedAppointment(null)
      } else {
        console.error("[v0] Report creation error:", responseData)
        toast.error(responseData.error || "Failed to create report")
      }
    } catch (error) {
      console.error("[v0] Failed to create report:", error)
      toast.error("Error creating report")
    } finally {
      setLoading((prev) => ({ ...prev, createReport: false }))
    }
  }

  // Function to check if appointment can be closed
  const canCloseAppointment = (appointmentId: string) => {
    return appointmentReports[appointmentId] === true
  }

  // Handler to open the referral modal
  const handleOpenReferModal = (appointment: any) => {
    setSelectedAppointmentForReferral(appointment)
    setShowReferModal(true)
  }

  const totalAppointments = appointments.length
  const confirmedAppointments = appointments.filter((apt) => apt.status === "confirmed").length
  const completedAppointments = appointments.filter((apt) => apt.status === "completed").length
  const cancelledAppointments = appointments.filter((apt) => apt.status === "cancelled").length

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto md:pt-0 pt-16">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Appointments Table</h1>
                <p className="text-muted-foreground text-sm mt-1">View and manage all appointments</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Appointments" value={totalAppointments} icon={<Calendar className="w-6 h-6" />} />
              <StatCard
                label="Confirmed"
                value={confirmedAppointments}
                icon={<Clock className="w-6 h-6" />}
                variant="default"
              />
              <StatCard
                label="Completed"
                value={completedAppointments}
                icon={<CheckCircle2 className="w-6 h-6" />}
                variant="success"
              />
              <StatCard
                label="Cancelled"
                value={cancelledAppointments}
                icon={<XCircle className="w-6 h-6" />}
                variant="error"
              />
            </div>

            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setEditingId(null)
                    setShowForm(!showForm)
                    setFormErrors({})
                    if (user?.role === "doctor") {
                      setFormData({
                        patientId: "",
                        patientName: "",
                        doctorId: user.id,
                        doctorName: user.name,
                        date: "",
                        time: "",
                        type: "Consultation",
                        roomNumber: "",
                        duration: 30,
                      })
                    }
                  }}
                  disabled={loading.appointments || loading.patients || loading.doctors}
                  className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading.appointments || loading.patients || loading.doctors ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  New Appointment
                </button>

                {user?.role === "doctor" && (
                  <button
                    onClick={() => setShowReferralModal(true)}
                    disabled={loading.appointments}
                    className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/90 disabled:bg-secondary/50 text-secondary-foreground px-4 py-2 rounded-lg transition-colors font-medium cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    Refer Unassigned Patient
                  </button>
                )}
              </div>

              <AppointmentsTableView
                appointments={appointments}
                userRole={user?.role || ""}
                userId={user?.id || ""}
                appointmentReports={appointmentReports}
                loading={loading}
                onEdit={handleEditAppointment}
                onDelete={(apt) => {
                  setAppointmentToDelete(apt)
                  setShowDeleteModal(true)
                }}
                onCreateReport={(apt) => {
                  setSelectedAppointment(apt)
                  setShowReportForm(true)
                  setReportErrors({})
                }}
                onViewReport={() => router.push("/dashboard/medical-reports")}
                onClose={(appointmentId) => {
                  if (!canCloseAppointment(appointmentId)) {
                    toast.error("You cannot close this appointment. Please create a medical report first.")
                    return
                  }
                  setAppointmentActionModal({
                    isOpen: true,
                    action: "close",
                    appointmentId,
                  })
                }}
                onCancel={(appointmentId) =>
                  setAppointmentActionModal({
                    isOpen: true,
                    action: "cancel",
                    appointmentId,
                  })
                }
                canCloseAppointment={canCloseAppointment}
                onReferAppointment={handleOpenReferModal}
              />
            </div>

            {showForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-card rounded-lg shadow-lg border border-border p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                  <h2 className="text-xl font-bold mb-4 text-foreground">
                    {editingId ? "Edit Appointment" : "Schedule Appointment"}
                  </h2>
                  <form onSubmit={handleAddAppointment} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Patient *</label>
                      <SearchableDropdown
                        items={patients.map((p) => ({ ...p, id: p._id }))}
                        selectedItem={getSelectedPatient()}
                        onSelect={handlePatientSelect}
                        placeholder="Select Patient..."
                        searchPlaceholder="Search patients..."
                        disabled={loading.addAppointment || loading.updateAppointment}
                        error={formErrors.patientId}
                        required={true}
                        clearable={true}
                      />
                    </div>

                    {user?.role !== "doctor" && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Doctor *</label>
                        <SearchableDropdown
                          items={doctors}
                          selectedItem={getSelectedDoctor()}
                          onSelect={handleDoctorSelect}
                          placeholder="Select Doctor..."
                          searchPlaceholder="Search doctors..."
                          disabled={loading.addAppointment || loading.updateAppointment}
                          error={formErrors.doctorId}
                          required={true}
                          clearable={true}
                        />
                      </div>
                    )}

                    {user?.role === "doctor" && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Doctor</label>
                        <input
                          type="text"
                          value={user.name}
                          disabled
                          className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground text-sm cursor-not-allowed"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Date *</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => {
                          setFormData({ ...formData, date: e.target.value })
                          setFormErrors({ ...formErrors, date: "" })
                        }}
                        disabled={loading.addAppointment || loading.updateAppointment}
                        className={`w-full px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm cursor-pointer disabled:cursor-not-allowed ${
                          formErrors.date ? "border-destructive" : "border-border"
                        }`}
                      />
                      {formErrors.date && <p className="text-xs text-destructive mt-1">{formErrors.date}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Time *</label>
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => {
                          setFormData({ ...formData, time: e.target.value })
                          setFormErrors({ ...formErrors, time: "" })
                        }}
                        disabled={loading.addAppointment || loading.updateAppointment}
                        className={`w-full px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm cursor-pointer disabled:cursor-not-allowed ${
                          formErrors.time ? "border-destructive" : "border-border"
                        }`}
                      />
                      {formErrors.time && <p className="text-xs text-destructive mt-1">{formErrors.time}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        disabled={loading.addAppointment || loading.updateAppointment}
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm cursor-pointer disabled:cursor-not-allowed"
                      >
                        <option value="Consultation">Consultation</option>
                        <option value="Cleaning">Cleaning</option>
                        <option value="Filling">Filling</option>
                        <option value="Root Canal">Root Canal</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Room Number *</label>
                      <input
                        type="text"
                        placeholder="Room Number (e.g., Room 1)"
                        value={formData.roomNumber}
                        onChange={(e) => {
                          setFormData({ ...formData, roomNumber: e.target.value })
                          setFormErrors({ ...formErrors, roomNumber: "" })
                        }}
                        disabled={loading.addAppointment || loading.updateAppointment}
                        className={`w-full px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-pointer disabled:cursor-not-allowed ${
                          formErrors.roomNumber ? "border-destructive" : "border-border"
                        }`}
                      />
                      {formErrors.roomNumber && (
                        <p className="text-xs text-destructive mt-1">{formErrors.roomNumber}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Duration (minutes)</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.duration || 30}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            duration: Number.parseInt(e.target.value) || 30,
                          })
                        }
                        disabled={loading.addAppointment || loading.updateAppointment}
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm cursor-pointer disabled:cursor-not-allowed"
                      />
                      {formErrors.duration && <p className="text-xs text-destructive mt-1">{formErrors.duration}</p>}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading.addAppointment || loading.updateAppointment}
                        className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm disabled:cursor-not-allowed cursor-pointer"
                      >
                        {(loading.addAppointment || loading.updateAppointment) && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        {editingId ? "Update" : "Schedule"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false)
                          setEditingId(null)
                          setFormErrors({})
                        }}
                        disabled={loading.addAppointment || loading.updateAppointment}
                        className="flex-1 bg-muted hover:bg-muted/80 disabled:bg-muted/50 text-muted-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showReportForm && user?.role === "doctor" && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-card rounded-lg shadow-lg border border-border p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                  <h2 className="text-xl font-bold mb-4 text-foreground">Create Appointment Report</h2>
                  <form onSubmit={handleCreateReport} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Procedures *</label>
                      <textarea
                        placeholder="List procedures performed (one per line)..."
                        value={reportData.procedures.join("\n")}
                        onChange={(e) => {
                          setReportData({
                            ...reportData,
                            procedures: e.target.value.split("\n").filter(Boolean),
                          })
                          setReportErrors({ ...reportErrors, procedures: "" })
                        }}
                        disabled={loading.createReport}
                        className={`w-full px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-pointer disabled:cursor-not-allowed ${
                          reportErrors.procedures ? "border-destructive" : "border-border"
                        }`}
                        rows={3}
                      />
                      {reportErrors.procedures && (
                        <p className="text-xs text-destructive mt-1">{reportErrors.procedures}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Findings *</label>
                      <textarea
                        placeholder="Clinical findings..."
                        value={reportData.findings}
                        onChange={(e) => {
                          setReportData({
                            ...reportData,
                            findings: e.target.value,
                          })
                          setReportErrors({ ...reportErrors, findings: "" })
                        }}
                        disabled={loading.createReport}
                        className={`w-full px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-pointer disabled:cursor-not-allowed ${
                          reportErrors.findings ? "border-destructive" : "border-border"
                        }`}
                        rows={3}
                      />
                      {reportErrors.findings && (
                        <p className="text-xs text-destructive mt-1">{reportErrors.findings}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Notes *</label>
                      <textarea
                        placeholder="Additional notes..."
                        value={reportData.notes}
                        onChange={(e) => {
                          setReportData({
                            ...reportData,
                            notes: e.target.value,
                          })
                          setReportErrors({ ...reportErrors, notes: "" })
                        }}
                        disabled={loading.createReport}
                        className={`w-full px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-pointer disabled:cursor-not-allowed ${
                          reportErrors.notes ? "border-destructive" : "border-border"
                        }`}
                        rows={2}
                      />
                      {reportErrors.notes && <p className="text-xs text-destructive mt-1">{reportErrors.notes}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Next Visit</label>
                      <input
                        type="date"
                        value={reportData.nextVisit}
                        onChange={(e) =>
                          setReportData({
                            ...reportData,
                            nextVisit: e.target.value,
                          })
                        }
                        disabled={loading.createReport}
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm cursor-pointer disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Follow-up Details</label>
                      <textarea
                        placeholder="Follow-up details..."
                        value={reportData.followUpDetails}
                        onChange={(e) =>
                          setReportData({
                            ...reportData,
                            followUpDetails: e.target.value,
                          })
                        }
                        disabled={loading.createReport}
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm cursor-pointer disabled:cursor-not-allowed"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading.createReport}
                        className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm disabled:cursor-not-allowed cursor-pointer"
                      >
                        {loading.createReport && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loading.createReport ? "Creating..." : "Create Report"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowReportForm(false)
                          setReportErrors({})
                          setSelectedAppointment(null)
                        }}
                        disabled={loading.createReport}
                        className="flex-1 bg-muted hover:bg-muted/80 disabled:bg-muted/50 text-muted-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showReferralModal && user?.role === "doctor" && (
              <PatientReferralModal
                isOpen={showReferralModal}
                onClose={() => setShowReferralModal(false)}
                onSuccess={() => {
                  // Optionally refresh data if needed
                }}
                token={token}
                doctoName={user?.name || ""}
              />
            )}

            {/* Referral Modal JSX */}
            {showReferModal && selectedAppointmentForReferral && (
              <ReferAppointmentModal
                isOpen={showReferModal}
                onClose={() => {
                  setShowReferModal(false)
                  setSelectedAppointmentForReferral(null)
                }}
                onSuccess={() => {
                  fetchAppointments()
                }}
                appointmentId={selectedAppointmentForReferral._id || selectedAppointmentForReferral.id}
                patientName={selectedAppointmentForReferral.patientName}
                token={token}
              />
            )}

            <AppointmentActionModal
              isOpen={appointmentActionModal.isOpen}
              action={appointmentActionModal.action}
              appointmentPatientName={
                appointments.find((a) => (a._id || a.id) === appointmentActionModal.appointmentId)?.patientName
              }
              onConfirm={() => {
                if (appointmentActionModal.action === "close") {
                  handleCompleteAppointment(appointmentActionModal.appointmentId!)
                } else if (appointmentActionModal.action === "cancel") {
                  handleCancelAppointment(appointmentActionModal.appointmentId!)
                }
              }}
              onCancel={() =>
                setAppointmentActionModal({
                  isOpen: false,
                  action: null,
                  appointmentId: null,
                })
              }
              isLoading={loading.completeAppointment || loading.cancelAppointment}
            />

            <ConfirmDeleteModal
              isOpen={showDeleteModal}
              title="Delete Appointment"
              description="Are you sure you want to delete this appointment? This action cannot be undone."
              itemName={
                appointmentToDelete ? `${appointmentToDelete.patientName} - ${appointmentToDelete.date}` : undefined
              }
              onConfirm={() => {
                handleDeleteAppointment(appointmentToDelete._id || appointmentToDelete.id)
                setShowDeleteModal(false)
                setAppointmentToDelete(null)
              }}
              onCancel={() => {
                setShowDeleteModal(false)
                setAppointmentToDelete(null)
              }}
              isLoading={loading.deleteAppointment}
            />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
