//@ts-nocheck
"use client"

import { useParams } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { Sidebar } from "@/components/sidebar"
import { ToothChart } from "@/components/tooth-chart"
import { PatientImagesSection } from "@/components/patient-images-section"
import { MedicalHistorySection } from "@/components/medical-history-section"
import { AddBillingRequestModal } from "@/components/add-billing-request-modal"
import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"

export default function PatientDetailPage() {
  const params = useParams()
  const patientId = params.id as string
  const { user, token } = useAuth()
  const [patient, setPatient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [showBillingRequestModal, setShowBillingRequestModal] = useState(false)

  useEffect(() => {
    if (token && patientId) {
      fetchPatient()
    }
  }, [token, patientId])

  const fetchPatient = async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPatient(data.patient)
      } else {
        toast.error("Failed to fetch patient")
      }
    } catch (error) {
      toast.error("Error fetching patient")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-muted-foreground">Loading patient details...</div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  if (!patient) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-muted-foreground">Patient not found</div>
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
          <div className="p-3 sm:p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6 md:mb-8">
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <Link
                  href="/dashboard/patients"
                  className="text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground truncate">{patient.name}</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Patient ID: {patient._id}</p>
                </div>
              </div>
              {user?.role === "doctor" && (
                <button
                  onClick={() => setShowBillingRequestModal(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Billing Request</span>
                  <span className="sm:hidden">Add Billing</span>
                </button>
              )}
            </div>

            {/* Patient Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6 md:mb-8">
              <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Phone</p>
                <p className="text-foreground font-medium text-sm sm:text-base truncate">{patient.phone}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Email</p>
                <p className="text-foreground font-medium text-xs sm:text-sm truncate">{patient.email}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">DOB</p>
                <p className="text-foreground font-medium text-sm sm:text-base">{patient.dob}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Doctor</p>
                <p className="text-foreground font-medium text-sm sm:text-base truncate">
                  {patient.assignedDoctorId?.name || "Unassigned"}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-card border border-border rounded-lg">
              <div className="flex border-b border-border overflow-x-auto">
                {["overview", "medical-history", "tooth-chart", "images"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-2 sm:px-4 py-2 sm:py-3 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                      activeTab === tab
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "overview" && "Overview"}
                    {tab === "medical-history" && "History"}
                    {tab === "tooth-chart" && "Teeth"}
                    {tab === "images" && "Images"}
                  </button>
                ))}
              </div>

              <div className="p-3 sm:p-4 md:p-6">
                {/* Overview Tab */}
                {activeTab === "overview" && (
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <h3 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">
                        Patient Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">ID Number</p>
                          <p className="text-foreground text-sm sm:text-base">{patient.idNumber || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Address</p>
                          <p className="text-foreground text-sm sm:text-base truncate">
                            {patient.address || "Not provided"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Insurance Provider</p>
                          <p className="text-foreground text-sm sm:text-base">{patient.insuranceProvider}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Insurance Number</p>
                          <p className="text-foreground text-sm sm:text-base">
                            {patient.insuranceNumber || "Not provided"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4 sm:pt-6">
                      <h3 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">
                        Medical Information
                      </h3>
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Allergies</p>
                          <p className="text-foreground text-sm sm:text-base">
                            {patient.allergies?.join(", ") || "None"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Medical Conditions</p>
                          <p className="text-foreground text-sm sm:text-base">
                            {patient.medicalConditions?.join(", ") || "None"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Medical History</p>
                          <p className="text-foreground text-sm sm:text-base">
                            {patient.medicalHistory || "No history recorded"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Medical History Tab */}
                {activeTab === "medical-history" && (
                  <MedicalHistorySection
                    patientId={patientId}
                    token={token!}
                    isDoctor={user?.role === "doctor"}
                    currentDoctorId={user?._id}
                  />
                )}

                {/* Tooth Chart Tab */}
                {activeTab === "tooth-chart" && (
                  <ToothChart patientId={patientId} token={token!} onSave={fetchPatient} />
                )}

                {/* Images Tab */}
                {activeTab === "images" && (
                  <PatientImagesSection patientId={patientId} token={token!} isDoctor={user?.role === "doctor"} />
                )}
              </div>
            </div>

            {/* Add Billing Request Modal */}
            <AddBillingRequestModal
              isOpen={showBillingRequestModal}
              onClose={() => setShowBillingRequestModal(false)}
              patientId={patientId}
              patientName={patient.name}
              token={token!}
              onSuccess={fetchPatient}
            />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
