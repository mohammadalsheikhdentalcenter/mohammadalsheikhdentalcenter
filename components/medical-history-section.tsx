//@ts-nocheck
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, X, Calendar, FileText, Pill, Stethoscope } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MedicalEntry {
  date: string
  notes: string
  findings: string
  treatment: string
  medications: string[]
  doctorId?: string
  createdById?: string
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
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [filterYear, setFilterYear] = useState<string>("all")
  const [formData, setFormData] = useState({
    notes: "",
    findings: "",
    treatment: "",
    medications: "",
  })

  useEffect(() => {
    fetchMedicalHistory()
  }, [patientId, token])

  const fetchMedicalHistory = async () => {
    setLoading(true)
    try {
      console.log("[v0] Fetching medical history for patient:", patientId)
      const res = await fetch(`/api/medical-history?patientId=${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        console.log("[v0] Medical history response:", data)
        setHistory(data.history)
      } else {
        console.error("[v0] Failed to fetch medical history:", res.status)
        const errorData = await res.json().catch(() => ({}))
        console.error("[v0] Error details:", errorData)
        toast({
          title: "Error",
          description: "Failed to load medical history",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching medical history:", error)
      toast({
        title: "Error",
        description: "Error loading medical history",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault()
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
    } catch (error) {
      toast({
        title: "Error",
        description: "Error saving medical history entry",
        variant: "destructive",
      })
      console.error("[v0] Error:", error)
    } finally {
      setSaving(false)
    }
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
  }

  const handleDeleteEntry = async (index: number) => {
    if (!history || !history._id) return

    if (!confirm("Are you sure you want to delete this entry?")) return

    try {
      const res = await fetch(`/api/medical-history/${history._id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ entryIndex: index }),
      })

      if (res.ok) {
        const data = await res.json()
        setHistory(data.history)
        toast({
          title: "Success",
          description: "Medical history entry deleted",
        })
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
      console.error("[v0] Error:", error)
    }
  }

  const canEditEntry = (entry: MedicalEntry) => {
    const entryCreatorId = String(entry.createdById || entry.doctorId || "")
    const currentDoctorIdStr = String(currentDoctorId || "")
    return isDoctor && entryCreatorId === currentDoctorIdStr
  }

  const getFilteredEntries = () => {
    if (!history?.entries) return []
    if (filterYear === "all") return history.entries

    return history.entries.filter((entry: MedicalEntry) => {
      const entryYear = new Date(entry.date).getFullYear().toString()
      return entryYear === filterYear
    })
  }

  const filteredEntries = getFilteredEntries()

  const getAvailableYears = () => {
    if (!history?.entries) return []
    const years = new Set(history.entries.map((entry: MedicalEntry) => new Date(entry.date).getFullYear().toString()))
    return Array.from(years).sort().reverse()
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading medical history...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Medical History Tracking</h2>
          <p className="text-sm text-muted-foreground mt-1">{history?.entries?.length || 0} entries recorded</p>
        </div>
        {isDoctor && (
          <button
            onClick={() => {
              setEditingIndex(null)
              setFormData({ notes: "", findings: "", treatment: "", medications: "" })
              setShowForm(!showForm)
            }}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors text-sm font-medium w-fit"
          >
            <Plus className="w-4 h-4" />
            {showForm ? "Cancel" : "Add New Entry"}
          </button>
        )}
      </div>

      {/* Form Section */}
      {showForm && isDoctor && (
        <form onSubmit={handleAddEntry} className="bg-accent/5 border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground text-lg">
              {editingIndex !== null ? "Edit Medical History Entry" : "Add New Medical History Entry"}
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingIndex(null)
                setFormData({ notes: "", findings: "", treatment: "", medications: "" })
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-foreground block mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Clinical Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter clinical observations and patient complaints..."
                className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                rows={2}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-foreground block mb-2 flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                Examination Findings
              </label>
              <textarea
                value={formData.findings}
                onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                placeholder="Document examination results and clinical observations..."
                className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                rows={2}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-foreground block mb-2">Treatment Provided</label>
              <textarea
                value={formData.treatment}
                onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                placeholder="Describe treatment procedures and interventions..."
                className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                rows={2}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-foreground block mb-2 flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Medications (comma-separated)
              </label>
              <input
                type="text"
                value={formData.medications}
                onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                placeholder="e.g., Amoxicillin 500mg, Ibuprofen 200mg"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-accent-foreground px-4 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            {saving ? "Saving..." : editingIndex !== null ? "Update Entry" : "Save Entry"}
          </button>
        </form>
      )}

      {/* Filter Section */}
      {history?.entries && history.entries.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Filter by Year:</span>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
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
          {filteredEntries.length !== history.entries.length && (
            <p className="text-xs text-muted-foreground">
              Showing {filteredEntries.length} of {history.entries.length} entries
            </p>
          )}
        </div>
      )}

      {/* Entries List */}
      {history && history.entries && history.entries.length > 0 ? (
        <div className="space-y-4">
          <div className="grid gap-4">
            {filteredEntries.length > 0 ? (
              filteredEntries.map((entry: MedicalEntry, idx: number) => {
                const actualIndex = history.entries.indexOf(entry)
                return (
                  <div
                    key={idx}
                    className="bg-card border border-border rounded-lg p-5 space-y-3 hover:border-border/80 transition-colors"
                  >
                    {/* Entry Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <p className="text-sm font-medium">{new Date(entry.date).toLocaleString()}</p>
                      </div>
                      {canEditEntry(entry) && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditEntry(actualIndex)}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="Edit entry"
                            aria-label="Edit entry"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(actualIndex)}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            title="Delete entry"
                            aria-label="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Entry Content Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {entry.notes && (
                        <div className="sm:col-span-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Notes
                          </p>
                          <p className="text-sm text-foreground bg-muted/20 p-2 rounded">{entry.notes}</p>
                        </div>
                      )}
                      {entry.findings && (
                        <div className="sm:col-span-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Findings
                          </p>
                          <p className="text-sm text-foreground bg-muted/20 p-2 rounded">{entry.findings}</p>
                        </div>
                      )}
                      {entry.treatment && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Treatment
                          </p>
                          <p className="text-sm text-foreground bg-muted/20 p-2 rounded">{entry.treatment}</p>
                        </div>
                      )}
                      {entry.medications && entry.medications.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Medications
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {entry.medications.map((med, medIdx) => (
                              <span
                                key={medIdx}
                                className="inline-block bg-accent/20 text-accent-foreground text-xs px-2 py-1 rounded"
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
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No medical history entries for {filterYear === "all" ? "any year" : filterYear}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-muted/20 border border-dashed border-border rounded-lg p-12 text-center">
          <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground font-medium">No medical history entries yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isDoctor ? "Add an entry to start tracking patient medical history" : "Awaiting doctor entries"}
          </p>
        </div>
      )}
    </div>
  )
}
