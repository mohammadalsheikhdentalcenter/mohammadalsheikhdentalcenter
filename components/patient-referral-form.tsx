"use client"

import type React from "react"
import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import { toast } from "react-hot-toast"

interface PatientReferralFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  token: string
}

export function PatientReferralForm({ isOpen, onClose, onSuccess, token }: PatientReferralFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    patientName: "",
    patientPhone: "",
    patientEmail: "",
    patientDob: "",
    patientIdNumber: "",
    patientAddress: "",
    patientAllergies: "",
    patientMedicalConditions: "",
    referralReason: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.patientName.trim()) newErrors.patientName = "Patient name is required"
    if (!formData.patientPhone.trim()) newErrors.patientPhone = "Patient phone is required"
    if (!formData.patientDob) newErrors.patientDob = "Date of birth is required"
    if (!formData.referralReason.trim()) newErrors.referralReason = "Referral reason is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error("Please fix the errors in the form")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/patient-referrals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientName: formData.patientName,
          patientPhone: formData.patientPhone,
          patientEmail: formData.patientEmail || "",
          patientDob: formData.patientDob,
          patientIdNumber: formData.patientIdNumber || "",
          patientAddress: formData.patientAddress || "",
          patientAllergies: formData.patientAllergies ? formData.patientAllergies.split(",").map((a) => a.trim()) : [],
          patientMedicalConditions: formData.patientMedicalConditions
            ? formData.patientMedicalConditions.split(",").map((c) => c.trim())
            : [],
          referralReason: formData.referralReason,
        }),
      })

      if (res.ok) {
        toast.success("Patient referral sent to receptionist successfully!")
        setFormData({
          patientName: "",
          patientPhone: "",
          patientEmail: "",
          patientDob: "",
          patientIdNumber: "",
          patientAddress: "",
          patientAllergies: "",
          patientMedicalConditions: "",
          referralReason: "",
        })
        setErrors({})
        onClose()
        onSuccess()
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || "Failed to send referral")
      }
    } catch (error) {
      console.error("Failed to send referral:", error)
      toast.error("Error sending referral")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg shadow-lg border border-border p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Refer New Patient</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Patient Name *</label>
              <input
                type="text"
                value={formData.patientName}
                onChange={(e) => {
                  setFormData({ ...formData, patientName: e.target.value })
                  setErrors({ ...errors, patientName: "" })
                }}
                disabled={loading}
                className={`w-full px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm ${
                  errors.patientName ? "border-destructive" : "border-border"
                }`}
                placeholder="e.g., John Doe"
              />
              {errors.patientName && <p className="text-xs text-destructive mt-1">{errors.patientName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Phone *</label>
              <input
                type="tel"
                value={formData.patientPhone}
                onChange={(e) => {
                  setFormData({ ...formData, patientPhone: e.target.value })
                  setErrors({ ...errors, patientPhone: "" })
                }}
                disabled={loading}
                className={`w-full px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm ${
                  errors.patientPhone ? "border-destructive" : "border-border"
                }`}
                placeholder="e.g., 9876543210"
              />
              {errors.patientPhone && <p className="text-xs text-destructive mt-1">{errors.patientPhone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input
                type="email"
                value={formData.patientEmail}
                onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
                disabled={loading}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                placeholder="e.g., john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Date of Birth *</label>
              <input
                type="date"
                value={formData.patientDob}
                onChange={(e) => {
                  setFormData({ ...formData, patientDob: e.target.value })
                  setErrors({ ...errors, patientDob: "" })
                }}
                disabled={loading}
                className={`w-full px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm ${
                  errors.patientDob ? "border-destructive" : "border-border"
                }`}
              />
              {errors.patientDob && <p className="text-xs text-destructive mt-1">{errors.patientDob}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">ID Number</label>
              <input
                type="text"
                value={formData.patientIdNumber}
                onChange={(e) => setFormData({ ...formData, patientIdNumber: e.target.value })}
                disabled={loading}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                placeholder="e.g., ID123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Address</label>
              <input
                type="text"
                value={formData.patientAddress}
                onChange={(e) => setFormData({ ...formData, patientAddress: e.target.value })}
                disabled={loading}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                placeholder="e.g., 123 Main St"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Allergies</label>
            <input
              type="text"
              value={formData.patientAllergies}
              onChange={(e) => setFormData({ ...formData, patientAllergies: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
              placeholder="e.g., Penicillin, Nuts (comma-separated)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Medical Conditions</label>
            <input
              type="text"
              value={formData.patientMedicalConditions}
              onChange={(e) => setFormData({ ...formData, patientMedicalConditions: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
              placeholder="e.g., Diabetes, Hypertension (comma-separated)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Referral Reason *</label>
            <textarea
              value={formData.referralReason}
              onChange={(e) => {
                setFormData({ ...formData, referralReason: e.target.value })
                setErrors({ ...errors, referralReason: "" })
              }}
              disabled={loading}
              className={`w-full px-4 py-2 bg-input border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm ${
                errors.referralReason ? "border-destructive" : "border-border"
              }`}
              placeholder="Reason for referral..."
              rows={3}
            />
            {errors.referralReason && <p className="text-xs text-destructive mt-1">{errors.referralReason}</p>}
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> This referral will be processed by the receptionist to complete patient
              registration.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-accent-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm disabled:cursor-not-allowed cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Send Referral
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-muted hover:bg-muted/80 disabled:bg-muted/50 text-muted-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
