"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { BillingDetailPage } from "@/components/billing-detail-page"
import { useAuth } from "@/components/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { Sidebar } from "@/components/sidebar"
import { ProtectedRoute } from "@/components/protected-route"

export default function PatientBillingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { token } = useAuth()
  const patientId = params.patientId as string
  const [patient, setPatient] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token && patientId) {
      fetchPatientData()
    }
  }, [token, patientId])

  const fetchPatientData = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/billing/patient-stats", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const foundPatient = data.patients?.find((p: any) => p.patientId === patientId)
        if (foundPatient) {
          setPatient(foundPatient)
        } else {
          toast.error("Patient not found")
          router.push("/dashboard/billing")
        }
      } else {
        toast.error("Failed to load patient data")
        router.push("/dashboard/billing")
      }
    } catch (error) {
      console.error("Error fetching patient data:", error)
      toast.error("Error loading patient information")
      router.push("/dashboard/billing")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <main className="flex-1 overflow-auto md:pt-0 pt-16">
            <div className="flex flex-col items-center justify-center gap-3 py-12 h-screen">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="flex justify-center items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
                  <div
                    className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                <span className="text-gray-600 text-sm">Loading patient billing details...</span>
              </div>
            </div>
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
          <main className="flex-1 overflow-auto md:pt-0 pt-16">
            <div className="flex flex-col items-center justify-center gap-3 py-12 h-screen">
              <p className="text-muted-foreground">Patient not found</p>
            </div>
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
          <BillingDetailPage
            patient={patient}
            onBack={() => {
              router.push("/dashboard/billing")
            }}
          />
        </main>
      </div>
    </ProtectedRoute>
  )
}
