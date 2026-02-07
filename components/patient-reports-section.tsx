"use client"

import { useState, useEffect } from "react"
import { Calendar, User, FileText, Loader2, Download, ChevronLeft, ChevronRight, Filter, Clock, Stethoscope, AlertCircle, FileEdit, ArrowRight, Phone } from "lucide-react"
import { toast } from "react-hot-toast"
import { generateReportPDF } from "@/lib/pdf-generator"

interface PatientReportsSectionProps {
  patientId: string
  token: string
  isDoctor: boolean
  currentDoctorId?: string
}

interface Doctor {
  id: string
  name: string
  email: string
  role: string
  specialty?: string
}

interface Patient {
  _id: string
  name: string
  email?: string
  phones?: Array<{
    number: string
    isPrimary: boolean
  }>
  dob?: string
  address?: string
  assignedDoctorId?: string
}

const REPORTS_PER_PAGE = 3

export function PatientReportsSection({ patientId, token, isDoctor, currentDoctorId }: PatientReportsSectionProps) {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [filterDoctor, setFilterDoctor] = useState<string>("all")
  const [uniqueDoctors, setUniqueDoctors] = useState<{ id: string; name: string }[]>([])
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([])
  const [patientDetails, setPatientDetails] = useState<Patient | null>(null)
  const [patientLoading, setPatientLoading] = useState(false)

  useEffect(() => {
    if (patientId && token) {
      fetchPatientDetails()
      fetchDoctors()
      fetchReportsAndAppointments()
    }
  }, [patientId, token])

  // Fetch patient details from API
  const fetchPatientDetails = async () => {
    if (!patientId || !token) return
    
    setPatientLoading(true)
    try {
      const patientRes = await fetch(`/api/patients/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (patientRes.ok) {
        const patientData = await patientRes.json()
        console.log("✅ Patient data fetched successfully:", patientData)
        if (patientData.patient) {
          setPatientDetails(patientData.patient)
        }
      } else {
        console.error("❌ Failed to fetch patient details:", patientRes.status, patientRes.statusText)
        
        // If we get 403, try to get patient info from reports as fallback
        if (patientRes.status === 403) {
          console.warn("Access denied to patient endpoint, trying to get patient info from reports...")
          await getPatientFromReportsFallback()
        }
      }
    } catch (error) {
      console.error("❌ Failed to fetch patient details:", error)
      // Try fallback
      await getPatientFromReportsFallback()
    } finally {
      setPatientLoading(false)
    }
  }

  // Fallback: Try to get patient info from the first report
  const getPatientFromReportsFallback = async () => {
    if (reports.length > 0) {
      const firstReport = reports[0]
      // Try to extract patient info from report
      const fallbackPatient: Patient = {
        _id: patientId,
        name: firstReport.patientName || firstReport.patientId?.name || "Unknown Patient",
        email: firstReport.patientEmail || firstReport.patientId?.email || "",
        phones: firstReport.patientPhone ? [{ number: firstReport.patientPhone, isPrimary: true }] : [],
        dob: firstReport.patientDOB || "",
        address: firstReport.patientAddress || ""
      }
      setPatientDetails(fallbackPatient)
      console.log("✅ Using fallback patient data from report:", fallbackPatient)
    }
  }

  // Fetch all doctors to get their names
  const fetchDoctors = async () => {
    try {
      const doctorsRes = await fetch("/api/users?role=doctor", {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (doctorsRes.ok) {
        const doctorsData = await doctorsRes.json()
        setAllDoctors(doctorsData.users || [])
      }
    } catch (error) {
      console.error("Failed to fetch doctors:", error)
    }
  }

  useEffect(() => {
    // Create a map of doctor IDs to names
    const doctorMap = new Map()
    allDoctors.forEach(doctor => {
      doctorMap.set(doctor.id, { id: doctor.id, name: doctor.name })
    })
    
    // Extract unique doctors from reports
    const doctorsFromReports = Array.from(
      new Map(
        reports.map((r) => {
          const doctorId = r.doctorId?._id || r.doctorId
          const doctorName = r.doctorId?.name || 
                            (doctorId ? doctorMap.get(doctorId)?.name : null) || 
                            "Unknown Doctor"
          return [doctorId || doctorName, { id: doctorId || "", name: doctorName }]
        }),
      ).values(),
    )
    setUniqueDoctors(doctorsFromReports)
  }, [reports, allDoctors])

  const fetchReportsAndAppointments = async () => {
    setLoading(true)
    try {
      // Fetch reports
      const reportsRes = await fetch(`/api/appointment-reports?patientId=${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      // Fetch appointments
      const appointmentsRes = await fetch("/api/appointments", {
        headers: { Authorization: `Bearer ${token}` },
      })

      let reportsData: any[] = []
      if (reportsRes.ok) {
        const data = await reportsRes.json()
        console.log("📋 Reports data:", data)
        reportsData = data.reports || []
      } else {
        console.error("Failed to fetch reports:", reportsRes.status)
      }

      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json()
        const patientAppointments = appointmentsData.appointments?.filter(
          (apt: any) => String(apt.patientId) === String(patientId),
        )
        setAppointments(patientAppointments || [])
      }

      // Enrich reports with doctor names
      const enrichedReports = reportsData.map((report: any) => {
        let doctorName = "Unknown Doctor"
        
        // Try to get doctor name from report data first
        if (report.doctorId?.name) {
          doctorName = report.doctorId.name
        } else if (report.doctorName) {
          doctorName = report.doctorName
        } else if (report.doctorId?._id || report.doctorId) {
          // Find doctor in allDoctors array
          const doctorId = report.doctorId?._id || report.doctorId
          const doctor = allDoctors.find(d => d.id === doctorId)
          doctorName = doctor ? doctor.name : "Unknown Doctor"
        }
        
        return {
          ...report,
          doctorName,
          doctorId: report.doctorId?._id || report.doctorId
        }
      })
      
      console.log("✨ Enriched reports:", enrichedReports)
      setReports(enrichedReports)
      setCurrentPage(1)
      
    } catch (error) {
      console.error("Failed to fetch reports:", error)
      toast.error("Error loading reports")
    } finally {
      setLoading(false)
    }
  }

  // Get doctor name by ID
  const getDoctorNameById = (doctorId: string) => {
    if (!doctorId) return "Unknown Doctor"
    const doctor = allDoctors.find(d => d.id === doctorId)
    return doctor ? doctor.name : "Unknown Doctor"
  }

  const getAppointmentDetails = (appointmentId: string) => {
    return appointments.find((apt) => String(apt._id || apt.id) === String(appointmentId))
  }

  const handleDownloadReport = async (report: any) => {
    try {
      // Get primary phone from patient details or fallback
      const primaryPhone = patientDetails?.phones?.find(phone => phone.isPrimary)?.number || 
                          patientDetails?.phones?.[0]?.number || 
                          report.patientPhone ||
                          "N/A"
      
      // Get patient email
      const patientEmail = patientDetails?.email || report.patientEmail || "N/A"
      
      // Format date of birth
      const patientDOB = patientDetails?.dob || report.patientDOB || ""
      
      // Get patient name - try multiple sources
      const patientName = patientDetails?.name || 
                         report.patientName || 
                         report.patientId?.name || 
                         "N/A"
      
      // Ensure report has all patient details for PDF generation
      const enrichedReport = {
        ...report,
        patientId: {
          name: patientName,
          email: patientEmail,
          phone: primaryPhone,
          dateOfBirth: patientDOB,
          address: patientDetails?.address || report.patientAddress || "",
          phones: patientDetails?.phones || (primaryPhone !== "N/A" ? [{ number: primaryPhone, isPrimary: true }] : [])
        },
        doctorId: {
          ...report.doctorId,
          name: report.doctorName || getDoctorNameById(report.doctorId),
          specialty: report.doctorId?.specialty || "General Dentistry"
        }
      }
      
      console.log("📄 Enriched report for PDF:", enrichedReport)
      generateReportPDF(enrichedReport)
      toast.success("Report downloaded successfully")
    } catch (error) {
      console.error("Failed to generate PDF:", error)
      toast.error("Failed to download report")
    }
  }

  const filteredReports =
    filterDoctor === "all" ? reports : reports.filter((r) => (r.doctorId || r.doctorName) === filterDoctor)

  const totalPages = Math.ceil(filteredReports.length / REPORTS_PER_PAGE)
  const startIndex = (currentPage - 1) * REPORTS_PER_PAGE
  const endIndex = startIndex + REPORTS_PER_PAGE
  const paginatedReports = filteredReports.slice(startIndex, endIndex)

  // Get primary phone number
  const primaryPhone = patientDetails?.phones?.find(phone => phone.isPrimary)?.number || 
                      patientDetails?.phones?.[0]?.number

  const isLoading = loading || patientLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center space-y-2">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading medical reports...</p>
        </div>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
        <FileText className="w-10 h-10 text-muted-foreground/60" />
        <div>
          <p className="text-muted-foreground">No medical reports found</p>
          <p className="text-xs text-muted-foreground mt-0.5">Reports will appear here after appointments are completed</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Patient Summary Card */}
      {/* {patientDetails && (
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">{patientDetails.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                    {patientDetails.email && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium">Email:</span> {patientDetails.email}
                      </span>
                    )}
                    {primaryPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span className="font-medium">Phone:</span> {primaryPhone}
                      </span>
                    )}
                    {patientDetails.dob && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium">DOB:</span> 
                        {new Date(patientDetails.dob).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium">Total Reports:</span>
                <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                  {reports.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )} */}

      {/* Rest of the component remains the same... */}
      {/* Filter Section */}
      {uniqueDoctors.length > 1 && (
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">Filter Reports</h3>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="doctor-filter" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Select Doctor:
            </label>
            <select
              id="doctor-filter"
              value={filterDoctor}
              onChange={(e) => {
                setFilterDoctor(e.target.value)
                setCurrentPage(1)
              }}
              className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="all">All Doctors ({uniqueDoctors.length})</option>
              {uniqueDoctors.map((doc) => (
                <option key={doc.id || doc.name} value={doc.id || doc.name}>
                 {doc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* No Reports for Filter */}
      {filteredReports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 bg-card border border-border rounded-lg p-6">
          <FileText className="w-12 h-12 text-muted-foreground/40" />
          <div>
            <p className="text-foreground font-medium">No reports found</p>
            <p className="text-sm text-muted-foreground mt-1">Try selecting a different doctor or filter</p>
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="space-y-4">
        {paginatedReports.map((report) => {
          const appointment = getAppointmentDetails(report.appointmentId?._id || report.appointmentId)
          const appointmentDate = appointment ? new Date(appointment.date) : new Date(report.createdAt)
          
          // Get doctor name (now properly populated)
          const doctorName = report.doctorName || getDoctorNameById(report.doctorId)

          return (
            <div
              key={report._id}
              className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-all duration-200"
            >
              {/* Report Header */}
              <div className="bg-gradient-to-r from-primary/5 to-primary/2 border-b border-border/60 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                          <Calendar className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {appointmentDate.toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {appointmentDate.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="h-4 w-px bg-border"></div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">{doctorName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20">
                      Report #{report._id?.substring(0, 9)  || "N/A"}....
                    </span>
                  </div>
                </div>
              </div>

              {/* Report Content */}
              <div className="p-4 space-y-4">
                {/* Procedures Section */}
                {report.procedures && report.procedures.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-primary/10 rounded">
                        <Stethoscope className="w-4 h-4 text-primary" />
                      </div>
                      <h4 className="font-bold text-sm text-foreground uppercase tracking-wide">Procedures Performed</h4>
                    </div>
                    <div className="ml-7">
                      <ul className="space-y-2">
                        {report.procedures.slice(0, 4).map((proc: any, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                            <span className="text-sm text-foreground">{typeof proc === "string" ? proc : proc.name || proc}</span>
                          </li>
                        ))}
                        {report.procedures.length > 4 && (
                          <li className="text-xs text-muted-foreground font-medium">
                            +{report.procedures.length - 4} more procedures
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Findings Section */}
                {report.findings && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-amber-500/10 rounded">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      </div>
                      <h4 className="font-bold text-sm text-foreground uppercase tracking-wide">Clinical Findings</h4>
                    </div>
                    <div className="ml-7">
                      <div className="bg-muted/30 border border-border/50 rounded-lg p-3">
                        <p className="text-sm text-foreground leading-relaxed">{report.findings}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Clinical Notes Section */}
                {report.notes && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-blue-500/10 rounded">
                        <FileEdit className="w-4 h-4 text-blue-600" />
                      </div>
                      <h4 className="font-bold text-sm text-foreground uppercase tracking-wide">Doctor's Notes</h4>
                    </div>
                    <div className="ml-7">
                      <div className="bg-blue-50/30 border border-blue-200/50 rounded-lg p-3">
                        <p className="text-sm text-foreground leading-relaxed">{report.notes}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Follow-up and Next Visit */}
                {(report.followUpDetails || report.nextVisit) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Follow-up Instructions */}
                    {report.followUpDetails && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-green-500/10 rounded">
                            <Clock className="w-4 h-4 text-green-600" />
                          </div>
                          <h4 className="font-bold text-sm text-foreground uppercase tracking-wide">Follow-up Plan</h4>
                        </div>
                        <div className="ml-7">
                          <div className="bg-green-50/30 border border-green-200/50 rounded-lg p-3">
                            <p className="text-sm text-foreground leading-relaxed">{report.followUpDetails}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Next Visit */}
                    {report.nextVisit && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-purple-500/10 rounded">
                            <ArrowRight className="w-4 h-4 text-purple-600" />
                          </div>
                          <h4 className="font-bold text-sm text-foreground uppercase tracking-wide">Next Appointment</h4>
                        </div>
                        <div className="ml-7">
                          <div className="bg-purple-50/30 border border-purple-200/50 rounded-lg p-3">
                            <p className="text-sm font-medium text-foreground">
                              {new Date(report.nextVisit).toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(report.nextVisit).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border/60 bg-muted/20 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    <span className="ml-2">Created: {new Date(report.createdAt).toLocaleDateString()}</span>
                  </div>
                  <button
                    onClick={() => handleDownloadReport(report)}
                    className="flex items-center gap-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors cursor-pointer font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download 
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-sm text-foreground">
              <span className="font-semibold">Showing {startIndex + 1}-{Math.min(endIndex, filteredReports.length)}</span>
              <span className="text-muted-foreground"> of {filteredReports.length} reports</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-lg transition-colors border border-border"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = idx + 1
                  } else if (currentPage <= 3) {
                    pageNum = idx + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + idx
                  } else {
                    pageNum = currentPage - 2 + idx
                  }

                  if (pageNum < 1 || pageNum > totalPages) return null

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center text-sm rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-lg transition-colors border border-border"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Page <span className="font-semibold text-foreground">{currentPage}</span> of <span className="font-semibold text-foreground">{totalPages}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
