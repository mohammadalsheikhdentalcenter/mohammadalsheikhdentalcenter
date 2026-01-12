//@ts-nocheck
"use client"
import { createPortal } from "react-dom"
import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/components/auth-context"
import { useState, useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import { Plus, FileText, CheckCircle, X, Edit, Trash2, Eye, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CalendarDays, User, Stethoscope, Clock, AlertCircle } from "lucide-react"
import { AppointmentActionModal } from "@/components/appointment-action-modal"
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal"
import { SearchableDropdown } from "@/components/searchable-dropdown"
import { useRouter } from "next/navigation"
import { StatCard } from "@/components/appointment-stats-card"
import { CheckCircle2, XCircle } from "lucide-react"
import { PatientReferralModal } from "@/components/patient-referral-modal"
import { ReferAppointmentModal } from "@/components/refer-appointment-modal"

// Appointment Permission Logic Functions
function useAppointmentPermissions(user, currentUserId) {
  const canCloseOrCancelAppointment = (appointment) => {
    if (user?.role !== "doctor") return false

    const isOriginalDoctor = String(appointment.originalDoctorId) === String(currentUserId)
    const isCurrentDoctor = String(appointment.doctorId) === String(currentUserId)
    const isReferred = appointment.isReferred
    const isReferBack = appointment.status === "refer_back"

    // When appointment is in refer_back status, only original doctor can manage it
    if (isReferBack) {
      return isOriginalDoctor
    }

    // Original doctor can close/cancel their own non-referred appointments
    if (isOriginalDoctor && !isReferred) return true

    // Current doctor can close/cancel their assigned appointments (non-referred)
    if (isCurrentDoctor && !isReferred) return true

    // Referred doctors CANNOT close/cancel appointments
    // Only original doctor can manage referred appointments (after refer_back)

    return false
  }

  const canCreateOrViewReport = (appointment) => {
    if (user?.role !== "doctor") return false

    const currentUserId = user?.userId || user?.id
    const isOriginalDoctor = String(appointment.originalDoctorId) === String(currentUserId)
    const isCurrentDoctor = String(appointment.doctorId) === String(currentUserId)
    const isReferred = appointment.isReferred
    const isReferBack = appointment.status === "refer_back"

    // When appointment is in refer_back status, only original doctor can create/view reports
    if (isReferBack) {
      return isOriginalDoctor
    }

    // Original doctor cannot create report when appointment is with another doctor
    if (isReferred && !isCurrentDoctor && !isReferBack) return false

    // Original doctor can create report when appointment is referred back
    if (isOriginalDoctor && isReferBack) return true

    // Current doctor can always create report
    if (isCurrentDoctor) return true

    return false
  }

  const canReferAppointment = (appointment) => {
    if (user?.role !== "doctor") return false

    const currentUserId = user?.userId || user?.id
    const isCurrentDoctor =
      String(appointment.doctorId) === String(currentUserId)
    const isOriginalDoctor =
      String(appointment.originalDoctorId) === String(currentUserId)
    const isReferred = appointment.isReferred
    const isReferBack = appointment.status === "refer_back"

    // When appointment is in refer_back status, original doctor can refer to another doctor
    if (isReferBack && isOriginalDoctor) return true
    
    if (isReferBack && !isOriginalDoctor) return false

    // Can refer if: current doctor, not already referred, not cancelled/completed/closed
    return (
      isCurrentDoctor &&
      !isReferred &&
      appointment.status !== "completed" &&
      appointment.status !== "closed" &&
      appointment.status !== "cancelled"
    )
  }

  const canEditAppointment = (appointment) => {
    const currentUserId = user?.userId || user?.id
    if (appointment.status === "cancelled" || appointment.status === "closed" || appointment.status === "completed") {
      return false
    }

    const isReferBack = appointment.status === "refer_back"
    const isOriginalDoctor = String(appointment.originalDoctorId) === String(currentUserId)
    const isCurrentDoctor = String(appointment.doctorId) === String(currentUserId)
    const isReferred = appointment.isReferred
    const isCreator = String(appointment.createdBy) === String(currentUserId)

    // When appointment is in refer_back status, only original doctor can edit
    if (isReferBack) {
      return isOriginalDoctor
    }

    // Admin/receptionist can always edit
    if (user?.role !== "doctor") return true

    // If appointment is referred AND NOT in refer_back status, hide edit button
    if (isReferred && !isReferBack) {
      return false // Hide edit button during referral process
    }

    // Doctor who created the appointment should be able to edit it
    // This handles cases where originalDoctorId is null but doctor created the appointment
    if (isCreator && !isReferred) {
      return true
    }

    // Original doctor can edit their appointments before referral
    if (isOriginalDoctor && !isReferred) {
      return true
    }

    return false
  }

  return {
    canCloseOrCancelAppointment,
    canCreateOrViewReport,
    canReferAppointment,
    canEditAppointment,
  }
}

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
  permissions,
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
        setPosition({
          top: rect.top + window.scrollY - 100,
          left: rect.left + window.scrollX - 200,
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
      setPosition({
        top: rect.top + window.scrollY - 10,
        left: rect.left + window.scrollX - 180,
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

    const isAppointmentTerminal =
      appointment.status === "completed" || appointment.status === "closed" || appointment.status === "cancelled"

    // Edit action - use permission logic from calendar page
    if (!isAppointmentTerminal && permissions.canEditAppointment(appointment)) {
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

    // View Details action - For all users
    items.push({
      label: "View Details",
      icon: <Eye className="w-4 h-4" />,
      onClick: () => (window.location.href = `/dashboard/appointments/${appointmentId}`),
      disabled: loading.appointments,
      className: "text-blue-600",
    })

    if (userRole === "doctor" && !isAppointmentTerminal) {
      // Create/View Report action - using permission logic
      if (permissions.canCreateOrViewReport(appointment)) {
        items.push({
          label: hasReport ? "View Report" : "Create Report",
          icon: <FileText className="w-4 h-4" />,
          onClick: hasReport ? () => onViewReport() : () => onCreateReport(appointment),
          disabled: loading.createReport,
          className: "text-blue-600",
        })
      }

      // Refer to Doctor action - using permission logic
      if (permissions.canReferAppointment(appointment)) {
        items.push({
          label: "Refer to Doctor",
          icon: <FileText className="w-4 h-4" />,
          onClick: () => onReferAppointment(appointment),
          disabled: false,
          className: "text-purple-600",
        })
      }

      // Close Appointment action - using permission logic
      if (permissions.canCloseOrCancelAppointment(appointment)) {
        items.push({
          label: "Close Appointment",
          icon: <CheckCircle className="w-4 h-4" />,
          onClick: () => onClose(appointmentId),
          disabled: loading.completeAppointment || !canCloseAppointment(appointmentId),
          className: canCloseAppointment(appointmentId) ? "text-green-600" : "text-gray-400 cursor-not-allowed",
        })
      }

      // Cancel Appointment action - using permission logic
      if (permissions.canCloseOrCancelAppointment(appointment)) {
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
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors bg-white shadow-xs hover:shadow-sm"
          title="Actions"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>
      </div>

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
            className="w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
          >
            {actionItems.map((item, index) => (
              <button
                key={index}
                onClick={() => !item.disabled && handleAction(item.onClick)}
                disabled={item.disabled}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                  item.disabled ? "opacity-50 cursor-not-allowed text-gray-400" : item.className
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

// Loading Skeleton Component
function TableLoadingSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <div className="w-full h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="w-32 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {Array.from({ length: 7 }).map((_, i) => (
                <th key={i} className="text-left p-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-100">
                {Array.from({ length: 7 }).map((_, cellIndex) => (
                  <td key={cellIndex} className="p-4">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-full"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="flex justify-center items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            </div>
            <span className="text-gray-500 text-sm">Loading appointments...</span>
          </div>
        </div>
      </div>
    </div>
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
  searchQuery,
  onSearchChange,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  permissions,
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 text-emerald-700 border border-emerald-100"
      case "cancelled":
        return "bg-red-50 text-red-700 border border-red-100"
      case "confirmed":
        return "bg-blue-50 text-blue-700 border border-blue-100"
      case "closed":
        return "bg-gray-100 text-gray-700 border border-gray-200"
      case "refer_back":
        return "bg-amber-50 text-amber-700 border border-amber-100"
      default:
        return "bg-yellow-50 text-yellow-700 border border-yellow-100"
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

  // Apply search filter
  const searchedAppointments = searchQuery
    ? filteredAppointments.filter(
        (apt) =>
          apt.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          apt.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          apt.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          apt.roomNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          apt.status?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : filteredAppointments

  // Apply pagination
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedAppointments = searchedAppointments.slice(startIndex, endIndex)

  if (loading.appointments) {
    return <TableLoadingSkeleton />
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-200">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search appointments by patient, doctor, type, room, or status..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="whitespace-nowrap bg-white px-3 py-1.5 rounded-lg border border-gray-200">
              <span className="font-medium">{searchedAppointments.length}</span> appointments
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-all duration-200"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-200">
              <th className="text-left p-4 font-medium text-gray-600 text-xs uppercase tracking-wider">Patient</th>
              <th className="text-left p-4 font-medium text-gray-600 text-xs uppercase tracking-wider">Doctor</th>
              <th className="text-left p-4 font-medium text-gray-600 text-xs uppercase tracking-wider">Date & Time</th>
              <th className="text-left p-4 font-medium text-gray-600 text-xs uppercase tracking-wider">Type</th>
              <th className="text-left p-4 font-medium text-gray-600 text-xs uppercase tracking-wider">Room</th>
              <th className="text-left p-4 font-medium text-gray-600 text-xs uppercase tracking-wider">Status</th>
              <th className="text-left p-4 font-medium text-gray-600 text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAppointments.map((appointment) => {
              const hasReport = appointmentReports[appointment._id || appointment.id]
              const appointmentId = appointment._id || appointment.id
              const currentUserId = userId

              return (
                <tr
                  key={appointmentId}
                  className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors duration-150 group"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{appointment.patientName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                        <Stethoscope className="w-4 h-4 text-purple-500" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{appointment.doctorName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                        <CalendarDays className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{formatDate(appointment.date)}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {appointment.time}
                        </div>
                      </div>
                    </div>
                    {appointment.isReferred && (
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor("refer_back")}`}
                        >
                          {appointment.isReferred &&
                            appointment.status !== "completed" &&
                            appointment.status !== "closed" &&
                            appointment.status !== "cancelled" && (
                              <span className="text-xs">
                                {appointment.status === "refer_back"
                                  ? ""
                                  : String(appointment.originalDoctorId) === String(currentUserId)
                                    ? `Referred to ${appointment.doctorName}`
                                    : "Referred In"}
                              </span>
                            )}
                        </span>
                      </div>
                    )}
                    {/* {appointment.status === "refer_back" && (
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor("refer_back")}`}>
                          Refer Back Pending
                        </span>
                      </div>
                    )} */}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      {appointment.type}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                      {appointment.roomNumber}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-2">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}
                      >
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                      {userRole === "doctor" &&
                        appointment.status !== "cancelled" &&
                        appointment.status !== "closed" &&
                        appointment.status !== "completed" && (
                          <div className="mt-1">
                            {hasReport ? (
                              <span className="text-xs text-emerald-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Report ready
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                No Report
                              </span>
                            )}
                          </div>
                        )}
                    </div>
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
                      permissions={permissions}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {paginatedAppointments.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-gray-300 mb-3">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-500 font-medium text-sm">No appointments found</p>
            <p className="text-gray-400 text-xs mt-1">
              {searchQuery ? "Try adjusting your search terms" : "No appointments scheduled yet"}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {searchedAppointments.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
              <span className="font-medium">{Math.min(endIndex, searchedAppointments.length)}</span> of{" "}
              <span className="font-medium">{searchedAppointments.length}</span> entries
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg border transition-all duration-200 ${
                  currentPage === 1
                    ? "border-gray-200 text-gray-400 cursor-not-allowed"
                    : "border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400 hover:shadow-xs"
                }`}
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg border transition-all duration-200 ${
                  currentPage === 1
                    ? "border-gray-200 text-gray-400 cursor-not-allowed"
                    : "border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400 hover:shadow-xs"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  if (pageNum < 1 || pageNum > totalPages) return null

                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white border border-blue-600 shadow-xs"
                          : "border border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400 hover:shadow-xs"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg border transition-all duration-200 ${
                  currentPage === totalPages
                    ? "border-gray-200 text-gray-400 cursor-not-allowed"
                    : "border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400 hover:shadow-xs"
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg border transition-all duration-200 ${
                  currentPage === totalPages
                    ? "border-gray-200 text-gray-400 cursor-not-allowed"
                    : "border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400 hover:shadow-xs"
                }`}
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
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
    nextVisitDate: "",
    nextVisitTime: "",
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
    checkingReports: false,
  })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [appointmentToDelete, setAppointmentToDelete] = useState<any>(null)
  const router = useRouter()

  const [showReferralModal, setShowReferralModal] = useState(false)
  const [showReferModal, setShowReferModal] = useState(false)
  const [selectedAppointmentForReferral, setSelectedAppointmentForReferral] = useState<any>(null)

  // Search and pagination states
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const currentUserId = user?.userId || user?.id
  const permissions = useAppointmentPermissions(user, currentUserId)

  const checkAppointmentReports = async () => {
    setLoading((prev) => ({ ...prev, checkingReports: true }))
    try {
      const reportChecks: Record<string, boolean> = {}

      for (const apt of appointments) {
        const res = await fetch(`/api/appointment-reports?appointmentId=${apt._id || apt.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          reportChecks[apt._id || apt.id] = data.reports && data.reports.length > 0
        }
      }

      setAppointmentReports(reportChecks)
    } catch (error) {
      console.error("Failed to check appointment reports:", error)
    } finally {
      setLoading((prev) => ({ ...prev, checkingReports: false }))
    }
  }

  useEffect(() => {
    if (token) {
      fetchAppointments()
      fetchPatients()
      if (user?.role !== "doctor") {
        fetchDoctors()
      }
    }
  }, [token, user])

  useEffect(() => {
    if (appointments.length > 0 && user?.role === "doctor") {
      checkAppointmentReports()
    }
  }, [appointments, user])

  useEffect(() => {
    // Reset to first page when search changes
    setCurrentPage(1)
  }, [searchQuery])

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
        const errorData = await res.json()
        toast.error(errorData.error || "Failed to delete appointment")
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
    if (!permissions.canEditAppointment(appointment)) {
      toast.error("You can only edit appointments you created")
      return
    }

    setEditingId(appointment._id || appointment.id)
    const doctorId = user?.role === "doctor" ? user.userId : appointment.doctorId
    const doctorName = user?.role === "doctor" ? user.name : appointment.doctorName

    setFormData({
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      doctorId: doctorId,
      doctorName: doctorName,
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

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAppointmentForm()) {
      toast.error("Please fix the errors in the form")
      return
    }

    const finalDoctorId = user?.role === "doctor" ? String(user?.id) : String(formData.doctorId)
    const finalDoctorName = user?.role === "doctor" ? String(user?.name) : String(formData.doctorName)

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
      createdBy: user?.id,
    }

    const timeConflict = appointments.some((apt) => {
      if (editingId && (apt._id === editingId || apt.id === editingId)) {
        return false
      }
      if (apt.status === "cancelled" || apt.status === "closed" || apt.status === "completed") {
        return false
      }

      if (apt.doctorId !== submissionData.doctorId || apt.date !== submissionData.date) {
        return false
      }

      const aptStartMin = timeToMinutes(apt.time)
      const aptDuration = apt.duration || 30
      const aptEndMin = aptStartMin + aptDuration

      const newStartMin = timeToMinutes(submissionData.time)
      const newDuration = submissionData.duration || 30
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
        if (apt.doctorId !== submissionData.doctorId || apt.date !== submissionData.date) {
          return false
        }

        const aptStartMin = timeToMinutes(apt.time)
        const aptDuration = apt.duration || 30
        const aptEndMin = aptStartMin + aptDuration

        const newStartMin = timeToMinutes(submissionData.time)
        const newDuration = submissionData.duration || 30
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

        const newStartMin = timeToMinutes(submissionData.time)
        const newDuration = submissionData.duration || 30
        const newEndMin = newStartMin + newDuration

        const newEndHours = Math.floor(newEndMin / 60)
        const newEndMins = newEndMin % 60
        const newEndTime = `${String(newEndHours).padStart(2, "0")}:${String(newEndMins).padStart(2, "0")}`

        toast.error(
          `Doctor ${submissionData.doctorName} has another appointment from ${conflictingApt.time} to ${aptEndTime} on ${submissionData.date}. Please choose a different time.`,
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
          doctorId: user?.role === "doctor" ? user.id : "",
          doctorName: user?.role === "doctor" ? user.name : "",
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
          nextVisitDate: reportData.nextVisitDate || null,
          nextVisitTime: reportData.nextVisitTime || null,
          followUpDetails: reportData.followUpDetails || "",
        }),
      })

      const responseData = await res.json()

      if (res.ok) {
        toast.success("Report created successfully")
        setShowReportForm(false)
        setReportErrors({})
        setReportData({
          procedures: [],
          findings: "",
          notes: "",
          nextVisitDate: "",
          nextVisitTime: "",
          followUpDetails: "",
        })
        setSelectedAppointment(null)
        checkAppointmentReports()
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

  // Function to check if appointment can be closed (has report)
  const canCloseAppointment = (appointmentId: string) => {
    return appointmentReports[appointmentId] === true
  }

  const handleOpenReferModal = (appointment: any) => {
    if (appointment.isReferred && String(appointment.originalDoctorId) !== String(currentUserId)) {
      toast.error("This appointment is currently referred to another doctor and cannot be referred again by you.")
      return
    }

    setSelectedAppointmentForReferral(appointment)
    setShowReferModal(true)
  }

  const totalAppointments = appointments.length
  const confirmedAppointments = appointments.filter((apt) => apt.status === "confirmed").length
  const completedAppointments = appointments.filter((apt) => apt.status === "completed").length
  const cancelledAppointments = appointments.filter((apt) => apt.status === "cancelled").length

  // Calculate total pages
  const totalPages = Math.ceil(
    appointments
      .filter((apt) => {
        if (user?.role !== "doctor") return true
        const isCurrentDoctor = String(apt.doctorId) === String(user?.id)
        const isOriginalDoctor = String(apt.originalDoctorId) === String(user?.id)
        return isCurrentDoctor || isOriginalDoctor
      })
      .filter(
        (apt) =>
          !searchQuery ||
          apt.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          apt.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          apt.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          apt.roomNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          apt.status?.toLowerCase().includes(searchQuery.toLowerCase()),
      ).length / itemsPerPage,
  )

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50/50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto md:pt-0 pt-16">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Appointments Table</h1>
                  <p className="text-gray-500 text-sm mt-1">View and manage all appointments</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                  label="Total Appointments"
                  value={totalAppointments}
                  icon={<CalendarDays className="w-5 h-5" />}
                  loading={loading.appointments}
                />
                <StatCard
                  label="Confirmed"
                  value={confirmedAppointments}
                  icon={<Clock className="w-5 h-5" />}
                  variant="default"
                  loading={loading.appointments}
                />
                <StatCard
                  label="Completed"
                  value={completedAppointments}
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  variant="success"
                  loading={loading.appointments}
                />
                <StatCard
                  label="Cancelled"
                  value={cancelledAppointments}
                  icon={<XCircle className="w-5 h-5" />}
                  variant="error"
                  loading={loading.appointments}
                />
              </div>
            </div>

            <div className="space-y-6">
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
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 text-white px-5 py-2.5 rounded-lg transition-all duration-200 font-medium cursor-pointer disabled:cursor-not-allowed shadow-xs hover:shadow-sm"
                >
                  {loading.appointments || loading.patients || loading.doctors ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="flex justify-center items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
                        <div
                          className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                      <span className="text-sm">Loading...</span>
                    </div>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      New Appointment
                    </>
                  )}
                </button>

                {user?.role === "doctor" && (
                  <button
                    onClick={() => setShowReferralModal(true)}
                    disabled={loading.appointments}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-purple-400 disabled:to-purple-500 text-white px-5 py-2.5 rounded-lg transition-all duration-200 font-medium cursor-pointer disabled:cursor-not-allowed shadow-xs hover:shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Refer Unassigned Patient
                  </button>
                )}
              </div>

              <AppointmentsTableView
                appointments={appointments}
                userRole={user?.role || ""}
                userId={currentUserId}
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
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                permissions={permissions}
              />
            </div>

            {/* New Appointment Modal */}
            {showForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      {editingId ? "Edit Appointment" : "Schedule Appointment"}
                    </h2>
                    <button
                      onClick={() => {
                        setShowForm(false)
                        setEditingId(null)
                        setFormErrors({})
                      }}
                      className="text-gray-400 hover:text-gray-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleAddAppointment} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Patient *</label>
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

                    {user?.role === "doctor" ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
                        <input
                          type="text"
                          value={user.name}
                          disabled
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 text-sm cursor-not-allowed"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Doctor *</label>
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => {
                          setFormData({ ...formData, date: e.target.value })
                          setFormErrors({ ...formErrors, date: "" })
                        }}
                        disabled={loading.addAppointment || loading.updateAppointment}
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-sm cursor-pointer disabled:cursor-not-allowed transition-all duration-200 ${
                          formErrors.date ? "border-red-300" : "border-gray-300"
                        }`}
                      />
                      {formErrors.date && <p className="text-xs text-red-600 mt-1">{formErrors.date}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => {
                          setFormData({ ...formData, time: e.target.value })
                          setFormErrors({ ...formErrors, time: "" })
                        }}
                        disabled={loading.addAppointment || loading.updateAppointment}
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-sm cursor-pointer disabled:cursor-not-allowed transition-all duration-200 ${
                          formErrors.time ? "border-red-300" : "border-gray-300"
                        }`}
                      />
                      {formErrors.time && <p className="text-xs text-red-600 mt-1">{formErrors.time}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        disabled={loading.addAppointment || loading.updateAppointment}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-sm cursor-pointer disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <option value="Consultation">Consultation</option>
                        <option value="Cleaning">Cleaning</option>
                        <option value="Filling">Filling</option>
                        <option value="Root Canal">Root Canal</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Room Number *</label>
                      <input
                        type="text"
                        placeholder="Room Number (e.g., Room 1)"
                        value={formData.roomNumber}
                        onChange={(e) => {
                          setFormData({ ...formData, roomNumber: e.target.value })
                          setFormErrors({ ...formErrors, roomNumber: "" })
                        }}
                        disabled={loading.addAppointment || loading.updateAppointment}
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 placeholder-gray-400 text-sm cursor-pointer disabled:cursor-not-allowed transition-all duration-200 ${
                          formErrors.roomNumber ? "border-red-300" : "border-gray-300"
                        }`}
                      />
                      {formErrors.roomNumber && <p className="text-xs text-red-600 mt-1">{formErrors.roomNumber}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
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
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-sm cursor-pointer disabled:cursor-not-allowed transition-all duration-200"
                      />
                      {formErrors.duration && <p className="text-xs text-red-600 mt-1">{formErrors.duration}</p>}
                    </div>

                    <div className="flex gap-2 pt-4">
                      <button
                        type="submit"
                        disabled={loading.addAppointment || loading.updateAppointment}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 text-white px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm disabled:cursor-not-allowed cursor-pointer"
                      >
                        {(loading.addAppointment || loading.updateAppointment) && (
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex justify-center items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
                              <div
                                className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                                style={{ animationDelay: "0.1s" }}
                              ></div>
                              <div
                                className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                            </div>
                            <span className="text-sm">Processing...</span>
                          </div>
                        )}
                        {!loading.addAppointment && !loading.updateAppointment && (editingId ? "Update" : "Schedule")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false)
                          setEditingId(null)
                          setFormErrors({})
                        }}
                        disabled={loading.addAppointment || loading.updateAppointment}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm cursor-pointer disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Report Creation Modal */}
            {showReportForm && user?.role === "doctor" && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Create Appointment Report</h2>
                    <button
                      onClick={() => {
                        setShowReportForm(false)
                        setReportErrors({})
                        setSelectedAppointment(null)
                      }}
                      className="text-gray-400 hover:text-gray-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateReport} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Procedures *</label>
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
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 placeholder-gray-400 text-sm cursor-pointer disabled:cursor-not-allowed transition-all duration-200 ${
                          reportErrors.procedures ? "border-red-300" : "border-gray-300"
                        }`}
                        rows={3}
                      />
                      {reportErrors.procedures && (
                        <p className="text-xs text-red-600 mt-1">{reportErrors.procedures}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Findings *</label>
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
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 placeholder-gray-400 text-sm cursor-pointer disabled:cursor-not-allowed transition-all duration-200 ${
                          reportErrors.findings ? "border-red-300" : "border-gray-300"
                        }`}
                        rows={3}
                      />
                      {reportErrors.findings && <p className="text-xs text-red-600 mt-1">{reportErrors.findings}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes *</label>
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
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 placeholder-gray-400 text-sm cursor-pointer disabled:cursor-not-allowed transition-all duration-200 ${
                          reportErrors.notes ? "border-red-300" : "border-gray-300"
                        }`}
                        rows={2}
                      />
                      {reportErrors.notes && <p className="text-xs text-red-600 mt-1">{reportErrors.notes}</p>}
                    </div>

                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Next Visit Date</label>
                        <input
                          type="date"
                          value={reportData.nextVisitDate}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              nextVisitDate: e.target.value,
                            })
                          }
                          disabled={loading.createReport}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-sm cursor-pointer disabled:cursor-not-allowed transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Next Visit Time</label>
                        <input
                          type="time"
                          value={reportData.nextVisitTime}
                          onChange={(e) =>
                            setReportData({
                              ...reportData,
                              nextVisitTime: e.target.value,
                            })
                          }
                          disabled={loading.createReport}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-sm cursor-pointer disabled:cursor-not-allowed transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Details</label>
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
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 placeholder-gray-400 text-sm cursor-pointer disabled:cursor-not-allowed transition-all duration-200"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <button
                        type="submit"
                        disabled={loading.createReport}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 text-white px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm disabled:cursor-not-allowed cursor-pointer"
                      >
                        {loading.createReport ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex justify-center items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
                              <div
                                className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                                style={{ animationDelay: "0.1s" }}
                              ></div>
                              <div
                                className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                            </div>
                            <span className="text-sm">Creating...</span>
                          </div>
                        ) : (
                          "Create Report"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowReportForm(false)
                          setReportErrors({})
                          setSelectedAppointment(null)
                        }}
                        disabled={loading.createReport}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm cursor-pointer disabled:cursor-not-allowed"
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
                onSuccess={() => {}}
                token={token}
                doctoName={user?.name || ""}
              />
            )}

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
