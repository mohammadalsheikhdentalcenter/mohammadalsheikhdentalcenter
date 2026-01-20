//@ts-nocheck
import type React from "react"
import { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, X, Pill, FileText, Stethoscope, User, ChevronLeft, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ConfirmDeleteModal } from "./confirm-delete-modal" // Adjust the import path as needed

interface MedicalEntry {
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [filterYear, setFilterYear] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [formData, setFormData] = useState({
    notes: "",
    findings: "",
    treatment: "",
    medications: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null)
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
      if (editingIndex !== null && history && history._id) {
        const res = await fetch(`/api/medical-history/${history._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            entryIndex: editingIndex,
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
          setEditingIndex(null)
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

  const handleEditEntry = (index: number) => {
    const entry = history.entries[index]
    setFormData({
      notes: entry.notes || "",
      findings: entry.findings || "",
      treatment: entry.treatment || "",
      medications: entry.medications?.join(", ") || "",
    })
    setEditingIndex(index)
    setShowForm(true)
    setErrors({})
  }

  const handleDeleteClick = (index: number) => {
    const entry = history.entries[index]
    const doctorName = getDoctorName(entry)
    const date = new Date(entry.date).toLocaleDateString()
    
    setEntryToDelete(index)
    setDeleteModalOpen(true)
  }

  const handleDeleteEntry = async () => {
    if (!history || !history._id || entryToDelete === null) {
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
        body: JSON.stringify({ entryIndex: entryToDelete }),
      })

      if (res.ok) {
        const data = await res.json()
        setHistory(data.history)
        toast({
          title: "Success",
          description: "Medical history entry deleted",
        })
        setCurrentPage(1)
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

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value)
    setCurrentPage(1)
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading medical history...</div>
  }

  // Get entry details for the delete modal
  const getEntryDetails = () => {
    if (entryToDelete === null || !history?.entries[entryToDelete]) {
      return { doctorName: "", date: "" }
    }
    
    const entry = history.entries[entryToDelete]
    return {
      doctorName: getDoctorName(entry),
      date: new Date(entry.date).toLocaleDateString()
    }
  }

  const entryDetails = getEntryDetails()

  return (
    <>
      <div className="space-y-6">
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
                setEditingIndex(null)
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
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {editingIndex !== null ? "Edit Medical Entry" : "Add Medical Entry"}
            </h3>

            <form onSubmit={handleAddEntry} className="space-y-5">
              {/* Notes Field */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <label className="text-sm font-semibold text-foreground">Notes</label>
                  <span className="text-destructive text-sm">*</span>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-muted-foreground">
                    <FileText className="w-4 h-4" />
                  </div>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => {
                      setFormData({ ...formData, notes: e.target.value })
                      setErrors({ ...errors, notes: "" })
                    }}
                    placeholder="Clinical notes..."
                    className={`w-full pl-10 pr-3 py-3 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm ${
                      errors.notes ? "border-destructive" : "border-border"
                    }`}
                    rows={3}
                  />
                </div>
                {errors.notes && <p className="text-xs text-destructive mt-1 ml-1">{errors.notes}</p>}
                <div className="h-px bg-border my-3"></div>
              </div>

              {/* Findings Field */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <label className="text-sm font-semibold text-foreground">Findings</label>
                  <span className="text-destructive text-sm">*</span>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-muted-foreground">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <textarea
                    value={formData.findings}
                    onChange={(e) => {
                      setFormData({ ...formData, findings: e.target.value })
                      setErrors({ ...errors, findings: "" })
                    }}
                    placeholder="Findings..."
                    className={`w-full pl-10 pr-3 py-3 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm ${
                      errors.findings ? "border-destructive" : "border-border"
                    }`}
                    rows={3}
                  />
                </div>
                {errors.findings && <p className="text-xs text-destructive mt-1 ml-1">{errors.findings}</p>}
                <div className="h-px bg-border my-3"></div>
              </div>

              {/* Treatment Field */}
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">Treatment</label>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-muted-foreground">
                    <Pill className="w-4 h-4" />
                  </div>
                  <textarea
                    value={formData.treatment}
                    onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                    placeholder="Treatment..."
                    className="w-full pl-10 pr-3 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                    rows={3}
                  />
                </div>
                <div className="h-px bg-border my-3"></div>
              </div>

              {/* Medications Field */}
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">Medications (comma-separated)</label>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-muted-foreground">
                    <Pill className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={formData.medications}
                    onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                    placeholder="e.g., Amoxicillin, Ibuprofen"
                    className="w-full pl-10 pr-3 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-4 py-3 rounded-lg transition-colors text-sm font-medium mt-4 cursor-pointer"
              >
                {saving ? "Saving..." : editingIndex !== null ? "Update Entry" : "Add Entry"}
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

        {/* Medical Entries List */}
        <div className="max-h-[600px] overflow-y-auto pr-2">
          {paginatedEntries.length > 0 ? (
            <div className="space-y-4">
              {paginatedEntries.map((entry: MedicalEntry, index: number) => {
                const originalIndex = history.entries.findIndex((e: MedicalEntry) => e === entry)
                const doctorName = getDoctorName(entry)
                
                return (
                  <div 
                    key={`entry-${originalIndex}`}
                    className="bg-card border border-border rounded-lg p-4 space-y-3 hover:border-border/80 transition-colors"
                  >
                    {/* Entry Header with Doctor Info */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="bg-blue-100 dark:bg-blue-900 p-1.5 rounded flex-shrink-0">
                          <Stethoscope className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground truncate">Medical Entry</p>
                            <div className="flex items-center gap-1 bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs">
                              <User className="w-3 h-3" />
                              <span className="truncate">{doctorName}</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(entry.date).toLocaleDateString()} ��{" "}
                            {new Date(entry.date).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      {canEditEntry(entry) && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleEditEntry(originalIndex)}
                            className="text-primary hover:text-primary/80 transition-colors p-1 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(originalIndex)}
                            className="text-destructive hover:text-destructive/80 transition-colors p-1 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Entry Details */}
                    <div className="space-y-2.5">
                      {entry.notes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Notes</p>
                          <p className="text-sm text-foreground bg-muted/20 p-3 rounded-md border border-border/50">
                            {entry.notes}
                          </p>
                        </div>
                      )}
                      
                      {entry.findings && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Findings</p>
                          <p className="text-sm text-foreground bg-muted/20 p-3 rounded-md border border-border/50">
                            {entry.findings}
                          </p>
                        </div>
                      )}
                      
                      {entry.treatment && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Treatment</p>
                          <p className="text-sm text-foreground bg-muted/20 p-3 rounded-md border border-border/50">
                            {entry.treatment}
                          </p>
                        </div>
                      )}
                      
                      {entry.medications && entry.medications.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1">
                            <Pill className="w-3 h-3" /> Medications
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {entry.medications.map((med: string, idx: number) => (
                              <span 
                                key={idx} 
                                className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20"
                              >
                                {med}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-lg">
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
        itemName={`Entry by ${entryDetails.doctorName} on ${entryDetails.date}`}
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
