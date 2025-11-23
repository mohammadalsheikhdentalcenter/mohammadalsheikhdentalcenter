//@ts-nocheck
"use client"

import type React from "react"

import { ProtectedRoute } from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/components/auth-context"
import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { AlertCircle, History, Trash2, Loader2, FileText } from "lucide-react"
import { ToothChartVisual } from "@/components/tooth-chart-visual"
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal"
import { Button } from "@/components/ui/button"
import { XrayFileUpload } from "@/components/xray-file-upload"
import { XrayDisplayViewer } from "@/components/xray-display-viewer"

export default function ClinicalToolsPage() {
  const { user, token } = useAuth()
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [toothChart, setToothChart] = useState(null)
  const [medicalHistory, setMedicalHistory] = useState(null)
  const [patientImages, setPatientImages] = useState([])
  const [loading, setLoading] = useState({
    patients: false,
    toothChart: false,
    medicalHistory: false,
    patientImages: false,
    createChart: false,
    saveChart: false,
    addMedical: false,
    uploadImage: false,
    deleteImage: false,
  })
  const [showHistory, setShowHistory] = useState(false)
  const [doctorHistory, setDoctorHistory] = useState([])
  const [activeTab, setActiveTab] = useState("tooth-chart")
  const [medicalEntry, setMedicalEntry] = useState({
    notes: "",
    findings: "",
    treatment: "",
    medications: "",
  })
  const [medicalErrors, setMedicalErrors] = useState<Record<string, string>>({})
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState({
    notes: "",
    findings: "",
    treatment: "",
    medications: "",
  })
  const [imageUpload, setImageUpload] = useState({
    type: "xray",
    title: "",
    description: "",
    imageUrl: "",
    notes: "",
  })
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({})
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<any>(null)
  const [showMedicalDeleteModal, setShowMedicalDeleteModal] = useState(false)
  const [medicalEntryToDelete, setMedicalEntryToDelete] = useState<number | null>(null)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [selectedImage, setSelectedImage] = useState<any>(null)
  const [patientSearch, setPatientSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const PATIENTS_PER_PAGE = 10

  useEffect(() => {
    if (token) {
      if (user?.role === "doctor") {
        fetchPatientsWithAppointments()
      } else {
        fetchPatients()
      }
    }
  }, [token, user])

  const fetchPatientsWithAppointments = async () => {
    setLoading((prev) => ({ ...prev, patients: true }))
    try {
      const patientsRes = await fetch("/api/patients", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (patientsRes.ok) {
        const patientsData = await patientsRes.json()
        const allPatientsList = patientsData.patients || []
        setPatients(allPatientsList)
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to fetch patients")
    } finally {
      setLoading((prev) => ({ ...prev, patients: false }))
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
      console.error(error)
      toast.error("Failed to fetch patients")
    } finally {
      setLoading((prev) => ({ ...prev, patients: false }))
    }
  }

  const handleSelectPatient = async (patientId: string) => {
    const patient = patients.find((p) => (p._id || p.id).toString() === patientId)
    setSelectedPatient(patient)
    setToothChart(null)
    setMedicalHistory(null)
    setPatientImages([])
    setDoctorHistory(patient?.doctorHistory || [])

    setLoading((prev) => ({
      ...prev,
      toothChart: true,
      medicalHistory: true,
      patientImages: true,
    }))

    try {
      const res = await fetch(`/api/tooth-chart?patientId=${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const chart = data.toothChart || (data.charts && data.charts[0])
        if (chart && chart.patientId.toString() === patientId) {
          setToothChart(chart)
          console.log("  Tooth chart loaded:", chart)
        }
      } else {
        console.log("  No tooth chart found for patient:", patientId)
      }
    } catch (error) {
      console.error("  Error fetching tooth chart:", error)
    } finally {
      setLoading((prev) => ({ ...prev, toothChart: false }))
    }

    try {
      const res = await fetch(`/api/medical-history?patientId=${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setMedicalHistory(data.history || null)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading((prev) => ({ ...prev, medicalHistory: false }))
    }

    try {
      const res = await fetch(`/api/patient-images?patientId=${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPatientImages(data.images || [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading((prev) => ({ ...prev, patientImages: false }))
    }
  }

  const handleCreateToothChart = async () => {
    if (!selectedPatient) return toast.error("Please select a patient first")
    setLoading((prev) => ({ ...prev, createChart: true }))

    try {
      const patientId = selectedPatient._id || selectedPatient.id
      const res = await fetch("/api/tooth-chart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId,
          overallNotes: "",
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setToothChart(data.chart)
        toast.success("Tooth chart created successfully!")
      } else {
        toast.error(data.error || "Failed to create tooth chart")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to create tooth chart")
    } finally {
      setLoading((prev) => ({ ...prev, createChart: false }))
    }
  }

  const handleToothClick = (toothNumber: number) => {
    if (!toothChart) return
    const statuses = ["healthy", "cavity", "filling", "implant", "missing", "root_canal", "treated", "crown"]
    const currentTeeth = toothChart.teeth || {}
    const currentStatus = currentTeeth[toothNumber]?.status || "healthy"

    const normalizedStatus = currentStatus.replace("-", "_")
    const currentIndex = statuses.indexOf(normalizedStatus)

    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % statuses.length
    const nextStatus = statuses[nextIndex]

    console.log("[v0] Tooth click debug:", {
      toothNumber,
      currentStatus,
      normalizedStatus,
      currentIndex,
      nextIndex,
      nextStatus,
      availableStatuses: statuses,
    })

    setToothChart({
      ...toothChart,
      teeth: {
        ...currentTeeth,
        [toothNumber]: {
          ...(currentTeeth[toothNumber] || {}),
          status: nextStatus,
          lastUpdated: new Date(),
        },
      },
    })
  }

  const handleSaveToothChart = async () => {
    if (!toothChart) return
    setLoading((prev) => ({ ...prev, saveChart: true }))

    try {
      const chartId = toothChart._id || toothChart.id
      const res = await fetch(`/api/tooth-chart/${chartId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teeth: toothChart.teeth,
          overallNotes: toothChart.overallNotes,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success("Tooth chart saved successfully!")
      } else {
        toast.error(data.error || "Failed to save tooth chart")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to save tooth chart")
    } finally {
      setLoading((prev) => ({ ...prev, saveChart: false }))
    }
  }

  const validateMedicalEntry = (): boolean => {
    const errors: Record<string, string> = {}

    if (!medicalEntry.notes.trim()) {
      errors.notes = "Notes are required"
    }
    if (!medicalEntry.findings.trim()) {
      errors.findings = "Findings are required"
    }
    if (!medicalEntry.treatment.trim()) {
      errors.treatment = "Treatment is required"
    }

    setMedicalErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddMedicalEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) return

    if (!validateMedicalEntry()) {
      toast.error("Please fix the errors in the form")
      return
    }

    setLoading((prev) => ({ ...prev, addMedical: true }))
    try {
      const res = await fetch("/api/medical-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: selectedPatient._id || selectedPatient.id,
          entry: {
            notes: medicalEntry.notes.trim(),
            findings: medicalEntry.findings.trim(),
            treatment: medicalEntry.treatment.trim(),
            medications: medicalEntry.medications
              .split(",")
              .map((m) => m.trim())
              .filter(Boolean),
          },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMedicalHistory(data.history)
        setMedicalEntry({
          notes: "",
          findings: "",
          treatment: "",
          medications: "",
        })
        setMedicalErrors({})
        toast.success("Medical entry added successfully")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Failed to add medical entry")
      }
    } catch (error) {
      console.error(error)
      toast.error("Error adding medical entry")
    } finally {
      setLoading((prev) => ({ ...prev, addMedical: false }))
    }
  }

  const validateImageUpload = (): boolean => {
    const errors: Record<string, string> = {}

    if (!imageUpload.title.trim()) {
      errors.title = "Image title is required"
    }
    if (!imageUpload.imageUrl.trim()) {
      errors.imageUrl = "Image URL is required"
    }

    setImageErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) return

    if (!validateImageUpload()) {
      toast.error("Please fix the errors in the form")
      return
    }

    setLoading((prev) => ({ ...prev, uploadImage: true }))
    try {
      const res = await fetch("/api/patient-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: selectedPatient._id,
          ...imageUpload,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setPatientImages([...patientImages, data.image])
        setImageUpload({
          type: "xray",
          title: "",
          description: "",
          imageUrl: "",
          notes: "",
        })
        setImageErrors({})
        toast.success("Image uploaded successfully")
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Failed to upload image")
      }
    } catch (error) {
      console.error(error)
      toast.error("Error uploading image")
    } finally {
      setLoading((prev) => ({ ...prev, uploadImage: false }))
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    setLoading((prev) => ({ ...prev, deleteImage: true }))
    try {
      const res = await fetch(`/api/patient-images/${imageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setPatientImages(patientImages.filter((img) => img._id !== imageId))
        toast.success("Image deleted successfully")
      } else {
        toast.error("Failed to delete image")
      }
    } catch (error) {
      console.error(error)
      toast.error("Error deleting image")
    } finally {
      setLoading((prev) => ({ ...prev, deleteImage: false }))
    }
  }

  const handleEditMedicalEntry = (index: number, entry: any) => {
    setEditingEntryId(index.toString())
    setEditingEntry({
      notes: entry.notes || "",
      findings: entry.findings || "",
      treatment: entry.treatment || "",
      medications: (entry.medications || []).join(", "),
    })
  }

  const refreshMedicalHistory = async () => {
    if (!selectedPatient) return
    try {
      const res = await fetch(`/api/medical-history?patientId=${selectedPatient._id || selectedPatient.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setMedicalHistory(data.history || null)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleSaveEditedEntry = async () => {
    if (editingEntryId === null || !medicalHistory) return

    if (!editingEntry.notes.trim() || !editingEntry.findings.trim() || !editingEntry.treatment.trim()) {
      toast.error("Please fill in all required fields: Notes, Findings, and Treatment")
      return
    }

    setLoading((prev) => ({ ...prev, addMedical: true }))
    try {
      const entryIndex = Number.parseInt(editingEntryId)

      console.log("[v0] Updating entry at index:", entryIndex, "Medical history ID:", medicalHistory._id)

      const res = await fetch(`/api/medical-history/${medicalHistory._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entryIndex,
          entry: {
            notes: editingEntry.notes.trim(),
            findings: editingEntry.findings.trim(),
            treatment: editingEntry.treatment.trim(),
            medications: editingEntry.medications
              .split(",")
              .map((m) => m.trim())
              .filter(Boolean),
          },
        }),
      })

      if (res.ok) {
        await refreshMedicalHistory()
        setEditingEntryId(null)
        setEditingEntry({
          notes: "",
          findings: "",
          treatment: "",
          medications: "",
        })
        toast.success("Medical entry updated successfully")
      } else {
        const errorData = await res.json()
        console.error("[v0] Update failed:", errorData)
        toast.error(errorData.error || "Failed to update medical entry")
      }
    } catch (error) {
      console.error("[v0] Error updating entry:", error)
      toast.error("Error updating medical entry")
    } finally {
      setLoading((prev) => ({ ...prev, addMedical: false }))
    }
  }

  const handleDeleteMedicalEntry = async (index: number) => {
    if (!medicalHistory) return

    setLoading((prev) => ({ ...prev, addMedical: true }))
    try {
      const res = await fetch(`/api/medical-history/${medicalHistory._id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ entryIndex: index }),
      })

      if (res.ok) {
        await refreshMedicalHistory()
        toast.success("Medical entry deleted successfully")
        setShowMedicalDeleteModal(false)
        setMedicalEntryToDelete(null)
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Failed to delete medical entry")
      }
    } catch (error) {
      console.error(error)
      toast.error("Error deleting medical entry")
    } finally {
      setLoading((prev) => ({ ...prev, addMedical: false }))
    }
  }

  const handleFileUploadSuccess = (fileUrl: string, fileName: string) => {
    setImageUpload({
      ...imageUpload,
      imageUrl: fileUrl,
      title: imageUpload.title || fileName.split(".")[0],
    })
    setShowFileUpload(false)
  }

  const filteredPatients = patients.filter((p) => p.name.toLowerCase().includes(patientSearch.toLowerCase()))

  const totalPages = Math.ceil(filteredPatients.length / PATIENTS_PER_PAGE)
  const startIndex = (currentPage - 1) * PATIENTS_PER_PAGE
  const paginatedPatients = filteredPatients.slice(startIndex, startIndex + PATIENTS_PER_PAGE)

  return (
    <ProtectedRoute allowedRoles={["admin", "doctor"]}>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto md:pt-0 pt-16">
          <div className="p-3 sm:p-4 md:p-6 lg:p-8">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Clinical Tools</h1>
              <p className="text-xs sm:text-sm mt-1 text-muted-foreground">
                Manage patient records, tooth charts, and medical history
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {/* Patients List */}
              <div className="lg:col-span-1">
                <div className="bg-card rounded-lg shadow-md border border-border p-3 sm:p-4 md:p-6">
                  <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 text-foreground">
                    Your Patients
                  </h2>
                  <input
                    type="text"
                    placeholder="Search patients..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-3 sm:px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4 cursor-text"
                  />
                  <div className="space-y-1.5 sm:space-y-2 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
                    {loading.patients ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : paginatedPatients.length === 0 ? (
                      <p className="text-muted-foreground text-xs sm:text-sm">No patients found</p>
                    ) : (
                      paginatedPatients.map((patient) => (
                        <button
                          key={patient._id || patient.id}
                          onClick={() => handleSelectPatient(patient._id || patient.id)}
                          disabled={loading.toothChart || loading.medicalHistory || loading.patientImages}
                          className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                            selectedPatient?._id === (patient._id || patient.id)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted hover:bg-muted/80 text-foreground"
                          }`}
                        >
                          <div className="truncate">{patient.name}</div>
                          <div className="text-xs opacity-75 truncate">{patient.phone}</div>
                        </button>
                      ))
                    )}
                  </div>
                  {totalPages > 1 && (
                    <div className="mt-3 sm:mt-4 flex items-center justify-between gap-2 text-xs sm:text-sm">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 bg-muted hover:bg-muted/80 disabled:bg-muted/50 text-foreground rounded transition-colors disabled:cursor-not-allowed cursor-pointer"
                      >
                        Prev
                      </button>
                      <span className="text-muted-foreground">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 bg-muted hover:bg-muted/80 disabled:bg-muted/50 text-foreground rounded transition-colors disabled:cursor-not-allowed cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-2">
                {selectedPatient ? (
                  <div className="bg-card rounded-lg shadow-md border border-border p-3 sm:p-4 md:p-6">
                    {/* Patient Info Header */}
                    <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                        <div className="min-w-0">
                          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">
                            {selectedPatient.name}
                          </h2>
                          <p className="text-xs sm:text-sm text-muted-foreground">DOB: {selectedPatient.dob}</p>
                        </div>
                        <button
                          onClick={() => setShowHistory(!showHistory)}
                          disabled={loading.toothChart || loading.medicalHistory || loading.patientImages}
                          className="flex-shrink-0 flex items-center gap-2 bg-muted hover:bg-muted/80 disabled:bg-muted/50 text-foreground px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium disabled:cursor-not-allowed cursor-pointer"
                        >
                          <History className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">History</span>
                        </button>
                      </div>

                      {showHistory && doctorHistory.length > 0 && (
                        <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-muted rounded-lg text-xs sm:text-sm">
                          <p className="font-semibold text-foreground mb-2">Doctor History:</p>
                          <div className="space-y-0.5 sm:space-y-1">
                            {doctorHistory.map((history, idx) => (
                              <div key={idx} className="text-muted-foreground text-xs sm:text-sm">
                                <span className="font-medium">{history.doctorName}</span> - From{" "}
                                {new Date(history.startDate).toLocaleDateString()}
                                {history.endDate && ` to ${new Date(history.endDate).toLocaleDateString()}`}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-border overflow-x-auto">
                      {["tooth-chart", "medical-history", "images"].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          disabled={loading.toothChart || loading.medicalHistory || loading.patientImages}
                          className={`px-2 sm:px-4 py-2 font-medium text-xs sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap ${
                            activeTab === tab
                              ? "text-primary border-b-2 border-primary"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {tab === "tooth-chart" && "Teeth"}
                          {tab === "medical-history" && "History"}
                          {tab === "images" && "Images"}
                        </button>
                      ))}
                    </div>

                    {/* Tooth Chart Tab */}
                    {activeTab === "tooth-chart" && (
                      <>
                        {loading.toothChart ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : !toothChart ? (
                          <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                              No tooth chart created yet
                            </p>
                            <button
                              onClick={handleCreateToothChart}
                              disabled={loading.createChart}
                              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 sm:px-6 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {loading.createChart && <Loader2 className="w-4 h-4 animate-spin" />}
                              {loading.createChart ? "Creating..." : "Create Tooth Chart"}
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                ⚠️ Save after updating tooth status
                              </p>
                              <button
                                onClick={handleSaveToothChart}
                                disabled={loading.saveChart}
                                className="flex-shrink-0 inline-flex items-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground px-3 sm:px-6 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                {loading.saveChart && <Loader2 className="w-4 h-4 animate-spin" />}
                                {loading.saveChart ? "Saving..." : "Save Chart"}
                              </button>
                            </div>

                            <ToothChartVisual teeth={toothChart.teeth || {}} onToothClick={handleToothClick} />

                            <div className="mt-4 sm:mt-6">
                              <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">
                                Overall Notes
                              </label>
                              <textarea
                                value={toothChart.overallNotes || ""}
                                onChange={(e) =>
                                  setToothChart({
                                    ...toothChart,
                                    overallNotes: e.target.value,
                                  })
                                }
                                disabled={loading.saveChart}
                                className="w-full px-3 sm:px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                rows={4}
                                placeholder="Add clinical notes..."
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {/* Medical History Tab */}
                    {activeTab === "medical-history" && (
                      <div className="space-y-4 sm:space-y-6">
                        {loading.medicalHistory ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : medicalHistory && medicalHistory.entries && medicalHistory.entries.length > 0 ? (
                          <div className="space-y-3">
                            <h3 className="font-semibold text-foreground text-sm sm:text-base">
                              Medical History Entries
                            </h3>
                            {medicalHistory.entries.map((entry, idx) => {
                              const canEdit =
                                user?.role === "doctor" &&
                                entry.createdById &&
                                String(entry.createdById) === String(user.id)
                              console.log(`[v0] Entry ${idx}:`, {
                                entryCreatedById: entry.createdById,
                                userId: user?.id,
                                userRole: user?.role,
                                canEdit,
                                entryCreatedByIdType: typeof entry.createdById,
                                userIdType: typeof user?.id,
                              })

                              return (
                                <div key={idx} className="p-3 sm:p-4 bg-muted rounded-lg border border-border">
                                  {editingEntryId === idx.toString() ? (
                                    <div className="space-y-3 sm:space-y-4">
                                      <div>
                                        <label className="block text-xs font-semibold text-foreground mb-1 sm:mb-2">
                                          Notes *
                                        </label>
                                        <textarea
                                          value={editingEntry.notes}
                                          onChange={(e) =>
                                            setEditingEntry({
                                              ...editingEntry,
                                              notes: e.target.value,
                                            })
                                          }
                                          disabled={loading.addMedical}
                                          className="w-full px-3 py-2 bg-input border border-border rounded-md text-xs sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                          rows={2}
                                          placeholder="Enter clinical notes..."
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-semibold text-foreground mb-1 sm:mb-2">
                                          Findings *
                                        </label>
                                        <textarea
                                          value={editingEntry.findings}
                                          onChange={(e) =>
                                            setEditingEntry({
                                              ...editingEntry,
                                              findings: e.target.value,
                                            })
                                          }
                                          disabled={loading.addMedical}
                                          className="w-full px-3 py-2 bg-input border border-border rounded-md text-xs sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                          rows={2}
                                          placeholder="Enter findings..."
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-semibold text-foreground mb-1 sm:mb-2">
                                          Treatment *
                                        </label>
                                        <textarea
                                          value={editingEntry.treatment}
                                          onChange={(e) =>
                                            setEditingEntry({
                                              ...editingEntry,
                                              treatment: e.target.value,
                                            })
                                          }
                                          disabled={loading.addMedical}
                                          className="w-full px-3 py-2 bg-input border border-border rounded-md text-xs sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                          rows={2}
                                          placeholder="Enter treatment..."
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-semibold text-foreground mb-1 sm:mb-2">
                                          Medications
                                        </label>
                                        <input
                                          type="text"
                                          value={editingEntry.medications}
                                          onChange={(e) =>
                                            setEditingEntry({
                                              ...editingEntry,
                                              medications: e.target.value,
                                            })
                                          }
                                          disabled={loading.addMedical}
                                          className="w-full px-3 py-2 bg-input border border-border rounded-md text-xs sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                          placeholder="Comma-separated medications"
                                        />
                                      </div>
                                      <div className="flex gap-2 sm:gap-3 pt-1 sm:pt-2">
                                        <Button
                                          onClick={handleSaveEditedEntry}
                                          disabled={loading.addMedical}
                                          variant="default"
                                          size="sm"
                                          className="flex-1 cursor-pointer text-xs sm:text-sm"
                                        >
                                          {loading.addMedical ? (
                                            <>
                                              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                              Saving...
                                            </>
                                          ) : (
                                            "Save Changes"
                                          )}
                                        </Button>
                                        <Button
                                          onClick={() => setEditingEntryId(null)}
                                          disabled={loading.addMedical}
                                          variant="outline"
                                          size="sm"
                                          className="flex-1 cursor-pointer text-xs sm:text-sm"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex justify-between items-start mb-2 sm:mb-3">
                                        <p className="text-xs text-muted-foreground font-medium">
                                          {new Date(entry.date).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </p>
                                        {canEdit && (
                                          <div className="flex gap-1 sm:gap-2">
                                            <Button
                                              onClick={() => handleEditMedicalEntry(idx, entry)}
                                              disabled={loading.addMedical}
                                              variant="outline"
                                              size="sm"
                                              className="h-6 px-2 text-xs cursor-pointer"
                                            >
                                              Edit
                                            </Button>
                                            <Button
                                              onClick={() => {
                                                setMedicalEntryToDelete(idx)
                                                setShowMedicalDeleteModal(true)
                                              }}
                                              disabled={loading.addMedical}
                                              variant="destructive"
                                              size="sm"
                                              className="h-6 px-2 text-xs cursor-pointer"
                                            >
                                              Delete
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                      {entry.notes && (
                                        <div className="mb-1 sm:mb-2">
                                          <p className="text-xs font-semibold text-foreground mb-0.5 sm:mb-1">Notes:</p>
                                          <p className="text-xs sm:text-sm text-foreground">{entry.notes}</p>
                                        </div>
                                      )}
                                      {entry.findings && (
                                        <div className="mb-1 sm:mb-2">
                                          <p className="text-xs font-semibold text-foreground mb-0.5 sm:mb-1">
                                            Findings:
                                          </p>
                                          <p className="text-xs sm:text-sm text-foreground">{entry.findings}</p>
                                        </div>
                                      )}
                                      {entry.treatment && (
                                        <div className="mb-1 sm:mb-2">
                                          <p className="text-xs font-semibold text-foreground mb-0.5 sm:mb-1">
                                            Treatment:
                                          </p>
                                          <p className="text-xs sm:text-sm text-foreground">{entry.treatment}</p>
                                        </div>
                                      )}
                                      {entry.medications && entry.medications.length > 0 && (
                                        <div>
                                          <p className="text-xs font-semibold text-foreground mb-0.5 sm:mb-1">
                                            Medications:
                                          </p>
                                          <p className="text-xs sm:text-sm text-foreground">
                                            {entry.medications.join(", ")}
                                          </p>
                                        </div>
                                      )}
                                      {entry.createdByName && (
                                        <div className="mt-1 sm:mt-2 pt-1 border-t border-border">
                                          <p className="text-xs text-muted-foreground">by Dr. {entry.createdByName}</p>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-xs sm:text-sm">No medical history entries yet</p>
                        )}
                        {user?.role === "doctor" && (
                          <form
                            onSubmit={handleAddMedicalEntry}
                            className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-muted rounded-lg border border-border"
                          >
                            <h3 className="font-semibold text-foreground text-sm sm:text-base">Add Medical Entry</h3>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-1 sm:mb-2">Notes *</label>
                              <textarea
                                placeholder="Clinical notes..."
                                value={medicalEntry.notes}
                                onChange={(e) => {
                                  setMedicalEntry({
                                    ...medicalEntry,
                                    notes: e.target.value,
                                  })
                                  setMedicalErrors({
                                    ...medicalErrors,
                                    notes: "",
                                  })
                                }}
                                disabled={loading.addMedical}
                                className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                                  medicalErrors.notes ? "border-destructive" : "border-border"
                                }`}
                                rows={2}
                              />
                              {medicalErrors.notes && (
                                <p className="text-xs text-destructive mt-1">{medicalErrors.notes}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-1 sm:mb-2">
                                Findings *
                              </label>
                              <textarea
                                placeholder="Findings..."
                                value={medicalEntry.findings}
                                onChange={(e) => {
                                  setMedicalEntry({
                                    ...medicalEntry,
                                    findings: e.target.value,
                                  })
                                  setMedicalErrors({
                                    ...medicalErrors,
                                    findings: "",
                                  })
                                }}
                                disabled={loading.addMedical}
                                className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                                  medicalErrors.findings ? "border-destructive" : "border-border"
                                }`}
                                rows={2}
                              />
                              {medicalErrors.findings && (
                                <p className="text-xs text-destructive mt-1">{medicalErrors.findings}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-1 sm:mb-2">
                                Treatment *
                              </label>
                              <textarea
                                placeholder="Treatment..."
                                value={medicalEntry.treatment}
                                onChange={(e) => {
                                  setMedicalEntry({
                                    ...medicalEntry,
                                    treatment: e.target.value,
                                  })
                                  setMedicalErrors({
                                    ...medicalErrors,
                                    treatment: "",
                                  })
                                }}
                                disabled={loading.addMedical}
                                className={`w-full px-4 py-2 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                                  medicalErrors.treatment ? "border-destructive" : "border-border"
                                }`}
                                rows={2}
                              />
                              {medicalErrors.treatment && (
                                <p className="text-xs text-destructive mt-1">{medicalErrors.treatment}</p>
                              )}
                            </div>
                            <input
                              type="text"
                              placeholder="Medications (comma-separated)"
                              value={medicalEntry.medications}
                              onChange={(e) =>
                                setMedicalEntry({
                                  ...medicalEntry,
                                  medications: e.target.value,
                                })
                              }
                              disabled={loading.addMedical}
                              className="w-full px-4 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <Button
                              type="submit"
                              disabled={loading.addMedical}
                              variant="default"
                              size="sm"
                              className="w-full cursor-pointer text-sm"
                            >
                              {loading.addMedical && <Loader2 className="w-4 h-4 animate-spin" />}
                              {loading.addMedical ? "Adding..." : "Add Entry"}
                            </Button>
                          </form>
                        )}
                      </div>
                    )}

                    {/* Images Tab */}
                    {activeTab === "images" && (
                      <div className="space-y-4 sm:space-y-6">
                        {loading.patientImages ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : patientImages.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {patientImages.map((image) => {
                              const isPdf = image.imageUrl?.toLowerCase().includes(".pdf")
                              const canDeleteImage = () => {
                                if (user?.role !== "doctor") return false
                                if (!image.uploadedBy) return false
                                const uploadedById = String(image.uploadedBy._id || image.uploadedBy)
                                const currentUserId = String(user.id)
                                return uploadedById === currentUserId
                              }

                              return (
                                <div
                                  key={image._id}
                                  className="p-3 sm:p-4 bg-muted rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                                  onClick={() => setSelectedImage(image)}
                                >
                                  {isPdf ? (
                                    <div className="w-full h-32 sm:h-40 bg-gradient-to-br from-muted to-muted/50 rounded-lg mb-2 sm:mb-3 flex items-center justify-center">
                                      <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-destructive/50" />
                                    </div>
                                  ) : (
                                    <img
                                      src={image.imageUrl || "/placeholder.svg"}
                                      alt={image.title}
                                      className="w-full h-32 sm:h-40 object-cover rounded-lg mb-2 sm:mb-3"
                                    />
                                  )}
                                  <p className="font-semibold text-foreground text-xs sm:text-sm truncate">
                                    {image.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{image.type.toUpperCase()}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                                    {new Date(image.uploadedAt).toLocaleDateString()}
                                  </p>
                                  {image.notes && (
                                    <p className="text-xs text-foreground mt-1.5 sm:mt-2">{image.notes}</p>
                                  )}
                                  {canDeleteImage() && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setImageToDelete(image)
                                        setShowDeleteModal(true)
                                      }}
                                      disabled={loading.deleteImage}
                                      className="mt-2 sm:mt-3 text-xs text-destructive hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Delete
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-xs sm:text-sm">No images uploaded yet</p>
                        )}
                        <form
                          onSubmit={handleUploadImage}
                          className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-muted rounded-lg border border-border"
                        >
                          <h3 className="font-semibold text-foreground text-sm sm:text-base">Upload X-Ray or Image</h3>

                          {!imageUpload.imageUrl && (
                            <div className="mb-3 sm:mb-4">
                              <h4 className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3">
                                Step 1: Upload File
                              </h4>
                              <XrayFileUpload
                                onUploadSuccess={handleFileUploadSuccess}
                                isLoading={loading.uploadImage}
                              />
                            </div>
                          )}

                          {imageUpload.imageUrl && (
                            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-accent/10 border border-accent rounded-lg">
                              <p className="text-xs sm:text-sm text-foreground">
                                <span className="font-medium">File uploaded:</span> {imageUpload.title}
                              </p>
                              <button
                                onClick={() => setImageUpload({ ...imageUpload, imageUrl: "", title: "" })}
                                className="text-xs text-accent hover:underline mt-1 sm:mt-2 cursor-pointer"
                              >
                                Change file
                              </button>
                            </div>
                          )}

                          <select
                            value={imageUpload.type}
                            onChange={(e) =>
                              setImageUpload({
                                ...imageUpload,
                                type: e.target.value,
                              })
                            }
                            disabled={loading.uploadImage}
                            className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="xray">X-Ray</option>
                            <option value="photo">Photo</option>
                            <option value="scan">Scan</option>
                          </select>
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-foreground mb-1">
                              Image Title *
                            </label>
                            <input
                              type="text"
                              placeholder="Image title"
                              value={imageUpload.title}
                              onChange={(e) => {
                                setImageUpload({
                                  ...imageUpload,
                                  title: e.target.value,
                                })
                                setImageErrors({ ...imageErrors, title: "" })
                              }}
                              disabled={loading.uploadImage}
                              className={`w-full px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                                imageErrors.title ? "border-destructive" : "border-border"
                              }`}
                            />
                            {imageErrors.title && <p className="text-xs text-destructive mt-1">{imageErrors.title}</p>}
                          </div>
                          <textarea
                            placeholder="Notes..."
                            value={imageUpload.notes}
                            onChange={(e) =>
                              setImageUpload({
                                ...imageUpload,
                                notes: e.target.value,
                              })
                            }
                            disabled={loading.uploadImage}
                            className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            rows={2}
                          />
                          <button
                            type="submit"
                            disabled={loading.uploadImage || !imageUpload.imageUrl}
                            className="flex items-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground px-3 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {loading.uploadImage && <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />}
                            {loading.uploadImage ? "Uploading..." : "Upload Image"}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-card rounded-lg shadow-md border border-border p-6 sm:p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm sm:text-base">
                      Select a patient to view their clinical records
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        {selectedImage && (
          <XrayDisplayViewer
            imageUrl={selectedImage.imageUrl}
            title={selectedImage.title || "Document"}
            type={selectedImage.type}
            description={selectedImage.description}
            notes={selectedImage.notes}
            uploadedBy={selectedImage.uploadedBy?.name}
            uploadedAt={selectedImage.uploadedAt}
            onClose={() => setSelectedImage(null)}
          />
        )}
        <ConfirmDeleteModal
          isOpen={showMedicalDeleteModal}
          title="Delete Medical Entry"
          description="Are you sure you want to delete this medical history entry? This action cannot be undone."
          itemName={
            medicalHistory?.entries?.[medicalEntryToDelete || 0]?.notes?.substring(0, 50) + "..." || "Medical Entry"
          }
          onConfirm={() => {
            if (medicalEntryToDelete !== null) {
              handleDeleteMedicalEntry(medicalEntryToDelete)
            }
          }}
          onCancel={() => {
            setShowMedicalDeleteModal(false)
            setMedicalEntryToDelete(null)
          }}
          isLoading={loading.addMedical}
        />
        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          title="Delete Image"
          description="Are you sure you want to delete this image? This action cannot be undone."
          itemName={imageToDelete?.title || "Untitled Image"}
          onConfirm={() => {
            handleDeleteImage(imageToDelete._id)
            setShowDeleteModal(false)
            setImageToDelete(null)
          }}
          onCancel={() => {
            setShowDeleteModal(false)
            setImageToDelete(null)
          }}
          isLoading={loading.deleteImage}
        />
      </div>
    </ProtectedRoute>
  )
}
