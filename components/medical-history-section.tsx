// @ts-nocheck
import type React from "react"
import { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, X, Pill, FileText, Stethoscope, User, ChevronLeft, ChevronRight, Calendar, MessageSquare, Activity, Droplets } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ConfirmDeleteModal } from "./confirm-delete-modal"

interface MedicalEntry {
  _id?: string
  date: string
  notes: string
  findings: string
  treatment: string
  medications: string[]
  doctorId?: string
  createdById?: string
  doctorName?: string
  doctorEmail?: string
}

interface MedicalHistorySectionProps {
  patientId: string
  token: string
  isDoctor: boolean
  currentDoctorId?: string
}

export function MedicalHistorySection({ patientId, token, isDoctor, currentDoctorId }: MedicalHistorySectionProps) {
  const { toast } = useToast()
  const [history, setHistory] = useState<any>(null)
  const [doctors, setDoctors] = useState<Record<string, { name: string; email?: string }>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterYear, setFilterYear] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    notes: "",
    findings: "",
    treatment: "",
    medications: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchMedicalHistory()
  }, [patientId, token])

  const fetchMedicalHistory = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/medical-history?patientId=${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setHistory(data.history)
        
        // Extract unique doctor IDs from entries
        const doctorIds = new Set<string>()
        if (data.history?.entries) {
          data.history.entries.forEach((entry: MedicalEntry) => {
            if (entry.doctorId) doctorIds.add(entry.doctorId)
            if (entry.createdById) doctorIds.add(entry.createdById)
          })
        }
        
        // Fetch doctor details if there are doctor IDs
        if (doctorIds.size > 0) {
          fetchDoctors(Array.from(doctorIds))
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to load medical history",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error loading medical history",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchDoctors = async (doctorIds: string[]) => {
    try {
      const res = await fetch(`/api/doctors?ids=${doctorIds.join(",")}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const doctorsMap: Record<string, { name: string; email?: string }> = {}
        data.doctors.forEach((doctor: any) => {
          doctorsMap[doctor._id] = {
            name: doctor.name || doctor.fullName || "Unknown Doctor",
            email: doctor.email
          }
        })
        setDoctors(doctorsMap)
      }
    } catch (error) {
      console.error("Failed to fetch doctor details:", error)
    }
  }

  const getDoctorName = (entry: MedicalEntry) => {
    // First check if entry has doctorName directly
    if (entry.doctorName) return entry.doctorName
    
    // Check createdById
    if (entry.createdById && doctors[entry.createdById]) {
      return doctors[entry.createdById].name
    }
    
    // Check doctorId
    if (entry.doctorId && doctors[entry.doctorId]) {
      return doctors[entry.doctorId].name
    }
    
    // Fallback
    if (entry.doctorId || entry.createdById) {
      return "Doctor"
    }
    
    return "Unknown Doctor"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return ""
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.notes.trim()) newErrors.notes = "Notes are required"
    if (!formData.findings.trim()) newErrors.findings = "Findings are required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }
    
    setSaving(true)

    try {
      if (editingId && history && history._id) {
        const res = await fetch(`/api/medical-history/${history._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            entryId: editingId,
            entry: {
              notes: formData.notes,
              findings: formData.findings,
              treatment: formData.treatment,
              medications: formData.medications
                .split(",")
                .map((m) => m.trim())
                .filter((m) => m),
              date: new Date().toISOString(),
              doctorName: currentDoctorId && doctors[currentDoctorId]?.name
            },
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setHistory(data.history)
          toast({
            title: "Success",
            description: "Medical history entry updated",
          })
          setEditingId(null)
        } else {
          const error = await res.json()
          toast({
            title: "Error",
            description: error.error || "Failed to update entry",
            variant: "destructive",
          })
        }
      } else {
        const res = await fetch("/api/medical-history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            patientId,
            entry: {
              notes: formData.notes,
              findings: formData.findings,
              treatment: formData.treatment,
              medications: formData.medications
                .split(",")
                .map((m) => m.trim())
                .filter((m) => m),
              date: new Date().toISOString(),
              doctorName: currentDoctorId && doctors[currentDoctorId]?.name
            },
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setHistory(data.history)
          toast({
            title: "Success",
            description: "Medical history entry added",
          })
        } else {
          const error = await res.json()
          toast({
            title: "Error",
            description: error.error || "Failed to add entry",
            variant: "destructive",
          })
        }
      }

      setShowForm(false)
      setFormData({ notes: "", findings: "", treatment: "", medications: "" })
      setErrors({})
      setCurrentPage(1)
      setExpandedEntryId(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Error saving medical history entry",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getFilteredEntries = () => {
    if (!history?.entries) return []
    
    let entries = [...history.entries].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    if (filterYear === "all") return entries

    return entries.filter((entry) => {
      const entryYear = new Date(entry.date).getFullYear().toString()
      return entryYear === filterYear
    })
  }

  const getAvailableYears = () => {
    if (!history?.entries) return []
    const years = new Set(history.entries.map((entry: MedicalEntry) => 
      new Date(entry.date).getFullYear().toString()
    ))
    return Array.from(years).sort().reverse()
  }

  const handleEditEntry = (entryId: string) => {
    const entry = history.entries.find((e: MedicalEntry) => e._id === entryId)
    if (entry) {
      setFormData({
        notes: entry.notes || "",
        findings: entry.findings || "",
        treatment: entry.treatment || "",
        medications: entry.medications?.join(", ") || "",
      })
      setEditingId(entryId)
      setShowForm(true)
      setErrors({})
      setExpandedEntryId(null)
    }
  }

  const handleDeleteClick = (entryId: string) => {
    const entry = history.entries.find((e: MedicalEntry) => e._id === entryId)
    if (entry) {
      const doctorName = getDoctorName(entry)
      const date = formatDate(entry.date)
      
      setEntryToDelete(entryId)
      setDeleteModalOpen(true)
    }
  }

  const handleDeleteEntry = async () => {
    if (!history || !history._id || !entryToDelete) {
      setDeleteModalOpen(false)
      return
    }

    setDeleting(true)

    try {
      const res = await fetch(`/api/medical-history/${history._id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ entryId: entryToDelete }),
      })

      if (res.ok) {
        const data = await res.json()
        setHistory(data.history)
        toast({
          title: "Success",
          description: "Medical history entry deleted",
        })
        setCurrentPage(1)
        if (expandedEntryId === entryToDelete) {
          setExpandedEntryId(null)
        }
      } else {
        const error = await res.json()
        toast({
          title: "Error",
          description: error.error || "Failed to delete entry",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error deleting medical history entry",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteModalOpen(false)
      setEntryToDelete(null)
    }
  }

  const canEditEntry = (entry: MedicalEntry) => {
    const entryCreatorId = String(entry.createdById || entry.doctorId || "")
    const currentDoctorIdStr = String(currentDoctorId || "")
    return isDoctor && entryCreatorId === currentDoctorIdStr
  }

  // Pagination logic
  const filteredEntries = getFilteredEntries()
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEntries = filteredEntries.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const toggleEntryExpansion = (entryId: string) => {
    setExpandedEntryId(expandedEntryId === entryId ? null : entryId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading medical history...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Medical History</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {history?.entries?.length || 0} medical entries
            </p>
          </div>
          {isDoctor && (
            <button
              onClick={() => {
                setEditingId(null)
                setFormData({ notes: "", findings: "", treatment: "", medications: "" })
                setErrors({})
                setShowForm(!showForm)
              }}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors text-sm font-medium w-fit cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {showForm ? "Cancel" : "Add Medical Entry"}
            </button>
          )}
        </div>

        {/* Form for adding/editing entries */}
        {showForm && isDoctor && (
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {editingId ? "Edit Medical Entry" : "Add Medical Entry"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Notes Field */}
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-1 mb-2">
                    <MessageSquare className="w-4 h-4" />
                    Notes *
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => {
                      setFormData({ ...formData, notes: e.target.value })
                      setErrors({ ...errors, notes: "" })
                    }}
                    placeholder="Clinical notes..."
                    className={`w-full px-3 py-2.5 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm ${
                      errors.notes ? "border-destructive" : "border-border"
                    }`}
                    rows={3}
                  />
                  {errors.notes && <p className="text-xs text-destructive mt-1">{errors.notes}</p>}
                </div>

                {/* Findings Field */}
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-1 mb-2">
                    <Activity className="w-4 h-4" />
                    Findings *
                  </label>
                  <textarea
                    value={formData.findings}
                    onChange={(e) => {
                      setFormData({ ...formData, findings: e.target.value })
                      setErrors({ ...errors, findings: "" })
                    }}
                    placeholder="Findings..."
                    className={`w-full px-3 py-2.5 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm ${
                      errors.findings ? "border-destructive" : "border-border"
                    }`}
                    rows={3}
                  />
                  {errors.findings && <p className="text-xs text-destructive mt-1">{errors.findings}</p>}
                </div>

                {/* Treatment Field */}
                <div>
                  <label className="text-sm font-semibold text-foreground flex items-center gap-1 mb-2">
                    <Stethoscope className="w-4 h-4" />
                    Treatment
                  </label>
                  <textarea
                    value={formData.treatment}
                    onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                    placeholder="Treatment..."
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                    rows={2}
                  />
                </div>

                {/* Medications Field */}
                <div>
                  <label className="text-sm font-semibold text-foreground flex items-center gap-1 mb-2">
                    <Pill className="w-4 h-4" />
                    Medications (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.medications}
                    onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                    placeholder="e.g., Amoxicillin, Ibuprofen"
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-4 py-3 rounded-lg transition-colors text-sm font-medium mt-4 cursor-pointer"
              >
                {saving ? "Saving..." : editingId ? "Update Entry" : "Add Entry"}
              </button>
            </form>
          </div>
        )}

        {/* Filter Controls */}
        {(history?.entries?.length || 0) > 0 ? (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Filter by Year:</span>
                <select
                  value={filterYear}
                  onChange={(e) => {
                    setFilterYear(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="px-3 py-1.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Years</option>
                  {getAvailableYears().map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : null}

        {/* Medical Entries List - Compact Cards */}
        <div>
          {paginatedEntries.length > 0 ? (
            <div className="space-y-3">
              {paginatedEntries.map((entry: MedicalEntry) => {
                const doctorName = getDoctorName(entry)
                const isExpanded = expandedEntryId === entry._id
                const hasMedications = entry.medications && entry.medications.length > 0
                
                return (
                  <div 
                    key={entry._id}
                    className="bg-card border border-border rounded-lg hover:border-border/80 transition-all duration-200 cursor-pointer"
                    onClick={() => toggleEntryExpansion(entry._id!)}
                  >
                    {/* Compact Header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                                Medical Entry
                              </span>
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {doctorName}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(entry.date)}
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {truncateText(entry.notes, 60)}
                            </div>
                          </div>

                          {/* Quick Stats */}
                          <div className="flex items-center gap-4">
                            {entry.findings && (
                              <div className="flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-xs text-muted-foreground">Findings</span>
                              </div>
                            )}
                            {hasMedications && (
                              <div className="flex items-center gap-1.5">
                                <Pill className="w-3.5 h-3.5 text-green-500" />
                                <span className="text-xs text-muted-foreground">
                                  {entry.medications.length} med{entry.medications.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                            {entry.treatment && (
                              <div className="flex items-center gap-1.5">
                                <Droplets className="w-3.5 h-3.5 text-purple-500" />
                                <span className="text-xs text-muted-foreground">Treatment</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons (only show on hover or when expanded) */}
                        {canEditEntry(entry) && (
                          <div 
                            className="flex gap-1 flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditEntry(entry._id!)
                              }}
                              className="text-primary hover:text-primary/80 transition-colors p-1.5 hover:bg-primary/10 rounded cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteClick(entry._id!)
                              }}
                              className="text-destructive hover:text-destructive/80 transition-colors p-1.5 hover:bg-destructive/10 rounded cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Expand/Collapse indicator */}
                      <div className="flex justify-center mt-3 pt-3 border-t border-border">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          {isExpanded ? 'Click to collapse' : 'Click to expand details'}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-border pt-4 space-y-4 animate-in fade-in">
                        {/* Notes */}
                        {entry.notes && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-muted-foreground" />
                              <p className="text-xs font-medium text-muted-foreground">Notes</p>
                            </div>
                            <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md">
                              {entry.notes}
                            </p>
                          </div>
                        )}
                        
                        {/* Findings */}
                        {entry.findings && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Activity className="w-4 h-4 text-muted-foreground" />
                              <p className="text-xs font-medium text-muted-foreground">Findings</p>
                            </div>
                            <p className="text-sm text-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
                              {entry.findings}
                            </p>
                          </div>
                        )}
                        
                        {/* Treatment */}
                        {entry.treatment && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Droplets className="w-4 h-4 text-muted-foreground" />
                              <p className="text-xs font-medium text-muted-foreground">Treatment</p>
                            </div>
                            <p className="text-sm text-foreground bg-green-50 dark:bg-green-950/20 p-3 rounded-md">
                              {entry.treatment}
                            </p>
                          </div>
                        )}
                        
                        {/* Medications */}
                        {hasMedications && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Pill className="w-4 h-4 text-muted-foreground" />
                              <p className="text-xs font-medium text-muted-foreground">Medications</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {entry.medications.map((med: string, idx: number) => (
                                <span 
                                  key={idx} 
                                  className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20"
                                >
                                  {med}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-lg bg-muted/20">
              <Stethoscope className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No medical history entries yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isDoctor 
                  ? "Add medical entries using the button above" 
                  : "Medical history will appear here as doctors add entries"
                }
              </p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min(startIndex + 1, filteredEntries.length)}-
              {Math.min(endIndex, filteredEntries.length)} of {filteredEntries.length} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground rounded-lg transition-colors"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        title="Delete Medical Entry"
        description="Are you sure you want to delete this medical history entry? This action cannot be undone."
        itemName={`Medical entry by ${history?.entries?.find((e: MedicalEntry) => e._id === entryToDelete)?.doctorName || 'Unknown'} on ${formatDate(history?.entries?.find((e: MedicalEntry) => e._id === entryToDelete)?.date || '')}`}
        onConfirm={handleDeleteEntry}
        onCancel={() => {
          setDeleteModalOpen(false)
          setEntryToDelete(null)
        }}
        isLoading={deleting}
        isDangerous={true}
      />
    </>
  )
}
