"use client"
import { useState } from "react"
import { ChevronDown, Edit2, Trash2, FileText, CheckCircle, X, Search } from "lucide-react"

interface Appointment {
  _id?: string
  id?: string
  patientName: string
  doctorName: string
  date: string
  time: string
  status: string
  type: string
  roomNumber: string
  duration: number
  patientId: string
  doctorId: string
}

interface AppointmentsTableViewProps {
  appointments: Appointment[]
  userRole: string
  loading: {
    deleteAppointment: boolean
    cancelAppointment: boolean
    completeAppointment: boolean
    createReport: boolean
  }
  onEdit: (appointment: Appointment) => void
  onDelete: (appointment: Appointment) => void
  onCreateReport: (appointment: Appointment) => void
  onClose: (appointmentId: string) => void
  onCancel: (appointmentId: string) => void
}

export function AppointmentsTableView({
  appointments,
  userRole,
  loading,
  onEdit,
  onDelete,
  onCreateReport,
  onClose,
  onCancel,
}: AppointmentsTableViewProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterDoctor, setFilterDoctor] = useState("all")
  const [filterDate, setFilterDate] = useState("")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const uniqueDoctors = Array.from(new Set(appointments.map((apt) => apt.doctorName)))
  const uniqueStatuses = Array.from(new Set(appointments.map((apt) => apt.status)))

  const filteredAppointments = appointments
    .filter((apt) => {
      const matchesSearch =
        apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.type.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = filterStatus === "all" || apt.status === filterStatus
      const matchesDoctor = filterDoctor === "all" || apt.doctorName === filterDoctor
      const matchesDate = !filterDate || apt.date === filterDate

      return matchesSearch && matchesStatus && matchesDoctor && matchesDate
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy as keyof Appointment]
      let bValue: any = b[sortBy as keyof Appointment]

      if (sortBy === "date") {
        aValue = new Date(a.date + " " + a.time).getTime()
        bValue = new Date(b.date + " " + b.time).getTime()
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
      return 0
    })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg shadow-md border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patient, doctor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm cursor-pointer"
          >
            <option value="all">All Status</option>
            {uniqueStatuses.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>

          {/* Doctor Filter */}
          <select
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
            className="px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm cursor-pointer"
          >
            <option value="all">All Doctors</option>
            {uniqueDoctors.map((doctor) => (
              <option key={doctor} value={doctor}>
                {doctor}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm cursor-pointer"
          />

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm("")
              setFilterStatus("all")
              setFilterDoctor("all")
              setFilterDate("")
            }}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors text-sm font-medium cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  <button
                    onClick={() => handleSort("patientName")}
                    className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer"
                  >
                    Patient Name
                    {sortBy === "patientName" && (
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  <button
                    onClick={() => handleSort("doctorName")}
                    className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer"
                  >
                    Doctor Name
                    {sortBy === "doctorName" && (
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  <button
                    onClick={() => handleSort("date")}
                    className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer"
                  >
                    Date & Time
                    {sortBy === "date" && (
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Room</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  <button
                    onClick={() => handleSort("status")}
                    className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer"
                  >
                    Status
                    {sortBy === "status" && (
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No appointments found
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => (
                  <tr key={apt._id || apt.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground font-medium">{apt.patientName}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{apt.doctorName}</td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {new Date(apt.date).toLocaleDateString()} at {apt.time}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{apt.type}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{apt.roomNumber}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(apt.status)}`}>
                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2 flex-wrap">
                        {userRole !== "doctor" && (
                          <>
                            {apt.status !== "completed" && apt.status !== "closed" && (
                              <button
                                onClick={() => onEdit(apt)}
                                disabled={loading.deleteAppointment || loading.cancelAppointment}
                                className="text-primary hover:underline disabled:text-primary/50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-xs"
                              >
                                <Edit2 className="w-3 h-3" />
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => onDelete(apt)}
                              disabled={loading.deleteAppointment}
                              className="text-destructive hover:underline disabled:text-destructive/50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </>
                        )}
                        {userRole === "doctor" && apt.status !== "cancelled" && apt.status !== "completed" && (
                          <>
                            <button
                              onClick={() => onCreateReport(apt)}
                              disabled={loading.createReport}
                              className="text-primary hover:underline disabled:text-primary/50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-xs"
                            >
                              <FileText className="w-3 h-3" />
                              Report
                            </button>
                            <button
                              onClick={() => onClose(apt._id || apt.id || "")}
                              disabled={loading.completeAppointment}
                              className="text-green-600 hover:underline disabled:text-green-600/50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-xs"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Close
                            </button>
                            <button
                              onClick={() => onCancel(apt._id || apt.id || "")}
                              disabled={loading.cancelAppointment}
                              className="text-destructive hover:underline disabled:text-destructive/50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-xs"
                            >
                              <X className="w-3 h-3" />
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredAppointments.length} of {appointments.length} appointments
      </div>
    </div>
  )
}
