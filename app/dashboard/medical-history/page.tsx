//@ts-nocheck
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { toast } from "react-hot-toast"
import {
  Loader2,
  Plus,
  Eye,
  Trash2,
  Calendar,
  User,
  Stethoscope,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

export default function MedicalHistoryPage() {
  const router = useRouter()
  const { user, token } = useAuth()
  const [patients, setPatients] = useState([])
  const [medicalHistories, setMedicalHistories] = useState([])
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingHistory, setEditingHistory] = useState<any>(null)
  const [formData, setFormData] = useState({
    symptoms: "",
    diagnosis: "",
    treatment: "",
    notes: "",
    dateOfVisit: new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    if (token) {
      fetchPatients()
      if (user?.role === "doctor") {
        fetchMedicalHistories()
      }
    }
  }, [token, user?.role])

  const fetchPatients = async () => {
    try {
      const res = await fetch("/api/patients", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPatients(data.patients || [])
      } else {
        toast.error("Failed to fetch patients")
      }
    } catch (error) {
      toast.error("Error fetching patients")
    }
  }

  const fetchMedicalHistories = async () => {
    try {
      const res = await fetch("/api/medical-history", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setMedicalHistories(data.histories || [])
      }
    } catch (error) {
      toast.error("Error fetching medical histories")
    } finally {
      setLoading(false)
    }
  }

  const filteredHistories = medicalHistories.filter((history) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      history.patientId?.name?.toLowerCase().includes(searchLower) ||
      history.patientId?.idNumber?.toLowerCase().includes(searchLower) ||
      history.diagnosis?.toLowerCase().includes(searchLower)
    )
  })

  const totalPages = Math.ceil(filteredHistories.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentHistories = filteredHistories.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, itemsPerPage])

  const handleAddHistory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) {
      toast.error("Please select a patient")
      return
    }

    if (!formData.symptoms.trim() || !formData.diagnosis.trim() || !formData.treatment.trim()) {
      toast.error("Please fill in all required fields (Symptoms, Diagnosis, Treatment)")
      return
    }

    try {
      const res = await fetch("/api/medical-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: selectedPatient._id,
          entry: {
            notes: formData.notes,
            findings: formData.symptoms,
            treatment: formData.treatment,
            medications: [], // Can be enhanced later
          },
          diagnosis: formData.diagnosis,
          dateOfVisit: formData.dateOfVisit,
        }),
      })

      const responseData = await res.json()
      console.log("[v0] API Response:", responseData)

      if (res.ok) {
        setMedicalHistories([...medicalHistories, responseData.history])
        setShowAddForm(false)
        setFormData({
          symptoms: "",
          diagnosis: "",
          treatment: "",
          notes: "",
          dateOfVisit: new Date().toISOString().split("T")[0],
        })
        setSelectedPatient(null)
        toast.success("Medical history added successfully")
      } else {
        console.log("[v0] Error Response:", responseData)
        toast.error(responseData.error || "Failed to add medical history")
      }
    } catch (error) {
      console.log("[v0] Fetch Error:", error)
      toast.error("Error adding medical history")
    }
  }

  const handleDeleteHistory = async (historyId: string) => {
    if (!window.confirm("Are you sure you want to delete this medical history record?")) return

    try {
      const res = await fetch(`/api/medical-history/${historyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setMedicalHistories(medicalHistories.filter((h) => h._id !== historyId))
        toast.success("Medical history deleted successfully")
      } else {
        toast.error("Failed to delete medical history")
      }
    } catch (error) {
      toast.error("Error deleting medical history")
    }
  }

  const handleViewPatientDetails = (patientId: string) => {
    if (!patientId) {
      toast.error("Invalid patient ID")
      return
    }
    router.push(`/dashboard/patients/${patientId}?tab=medical-history`)
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto md:pt-0 pt-16">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Medical History Management</h1>
                <p className="text-muted-foreground text-sm mt-1">Track and manage patient medical history records</p>
              </div>
              {user?.role === "doctor" && (
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors text-sm sm:text-base font-medium cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {showAddForm ? "Cancel" : "Add History"}
                </button>
              )}
            </div>

            {/* Add Form */}
            {showAddForm && user?.role === "doctor" && (
              <div className="bg-card rounded-lg shadow-md border border-border p-6 mb-8">
                <h2 className="text-lg font-bold mb-6 text-foreground">Add Medical History</h2>
                <form onSubmit={handleAddHistory} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Patient *</label>
                    <select
                      value={selectedPatient?._id || ""}
                      onChange={(e) => {
                        const patient = patients.find((p) => p._id === e.target.value)
                        setSelectedPatient(patient || null)
                      }}
                      className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      required
                    >
                      <option value="">Select a patient</option>
                      {patients.map((patient) => (
                        <option key={patient._id} value={patient._id}>
                          {patient.name} ({patient.idNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Date of Visit *</label>
                    <input
                      type="date"
                      value={formData.dateOfVisit}
                      onChange={(e) => setFormData({ ...formData, dateOfVisit: e.target.value })}
                      className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Symptoms *</label>
                    <textarea
                      value={formData.symptoms}
                      onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                      placeholder="Patient symptoms"
                      className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Diagnosis *</label>
                    <textarea
                      value={formData.diagnosis}
                      onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                      placeholder="Clinical diagnosis"
                      className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Treatment *</label>
                    <textarea
                      value={formData.treatment}
                      onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                      placeholder="Treatment provided"
                      className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes"
                      className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add Record
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="bg-muted hover:bg-muted/80 text-muted-foreground px-4 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Search */}
            <div className="bg-card rounded-lg shadow-md border border-border p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by patient name, ID, or diagnosis..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="itemsPerPage" className="text-sm text-muted-foreground whitespace-nowrap">
                    Rows:
                  </label>
                  <select
                    id="itemsPerPage"
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-2 py-1 bg-input border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary text-foreground text-sm"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Medical History Table */}
            <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground">Patient</th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                        Date
                      </th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                        Diagnosis
                      </th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground hidden lg:table-cell">
                        Doctor
                      </th>
                      <th className="text-left px-4 sm:px-6 py-3 font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 sm:px-6 py-8 text-center">
                          <div className="flex justify-center items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-muted-foreground text-sm">Loading medical histories...</span>
                          </div>
                        </td>
                      </tr>
                    ) : currentHistories.length > 0 ? (
                      currentHistories.map((history) => (
                        <tr key={history._id} className="border-b border-border hover:bg-muted/50 transition-colors">
                          <td className="px-4 sm:px-6 py-3 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{history.patientId?.name}</p>
                                <p className="text-xs text-muted-foreground">{history.patientId?.idNumber}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-muted-foreground hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {new Date(history.dateOfVisit).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-muted-foreground hidden md:table-cell">
                            <p className="truncate">{history.diagnosis}</p>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-muted-foreground hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <Stethoscope className="w-4 h-4" />
                              {history.doctorId?.name || "Unknown"}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const id = history.patientId?._id || history.patientId
                                  handleViewPatientDetails(id)
                                }}
                                className="text-primary hover:text-primary/80 transition-colors cursor-pointer"
                                title="View Patient"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {user?.role === "doctor" && (
                                <button
                                  onClick={() => handleDeleteHistory(history._id)}
                                  className="text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 sm:px-6 py-8 text-center text-muted-foreground">
                          {searchTerm
                            ? "No medical histories found matching your search"
                            : "No medical histories found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredHistories.length > 0 && (
                <div className="px-4 sm:px-6 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{filteredHistories.length === 0 ? 0 : startIndex + 1}</span>{" "}
                    to <span className="font-medium">{Math.min(endIndex, filteredHistories.length)}</span> of{" "}
                    <span className="font-medium">{filteredHistories.length}</span> results
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                        .map((page, index, array) => {
                          const showEllipsis = index < array.length - 1 && array[index + 1] - page > 1
                          return (
                            <div key={page} className="flex items-center">
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`min-w-[2rem] h-8 px-2 rounded text-sm font-medium transition-colors ${
                                  currentPage === page
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background text-foreground hover:bg-muted border border-border"
                                }`}
                              >
                                {page}
                              </button>
                              {showEllipsis && <span className="px-1 text-muted-foreground">...</span>}
                            </div>
                          )
                        })}
                    </div>

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="p-2 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
