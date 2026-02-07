//@ts-nocheck
"use client"

import type React from "react"
import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"
import { validatePhoneWithDetails } from "@/lib/validation"
import { useState } from "react"
import { X, Loader2, Plus } from "lucide-react"
import { toast } from "react-hot-toast"

interface PatientReferralModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  token: string
  doctoName: string
}

export function PatientReferralModal({ isOpen, onClose, onSuccess, token, doctoName }: PatientReferralModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    patientName: "",
    phones: [{ number: "", isPrimary: true }],
    patientEmail: "",
    patientDob: "",
    patientNationality: "",
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

    const validPhones = formData.phones.filter((p) => p.number.trim())
    if (validPhones.length === 0) {
      newErrors.patientPhone = "At least one phone number is required"
    } else {
      for (const phone of validPhones) {
        const validation = validatePhoneWithDetails(phone.number)
        if (!validation.valid) {
          newErrors.patientPhone = validation.error
          break
        }
      }
    }

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
      // Calculate age from DOB
      const calculateAge = (dob: string): number => {
        const birthDate = new Date(dob)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        
        return Math.max(0, age)
      }

      const res = await fetch("/api/patient-referrals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientName: formData.patientName,
          patientPhones: formData.phones.filter((p) => p.number.trim()),
          patientEmail: formData.patientEmail || "",
          patientDob: formData.patientDob,
          patientAge: calculateAge(formData.patientDob),
          patientNationality: formData.patientNationality || "",
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
          phones: [{ number: "", isPrimary: true }],
          patientEmail: "",
          patientDob: "",
          patientNationality: "",
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

  const addPhoneField = () => {
    setFormData({
      ...formData,
      phones: [...formData.phones, { number: "", isPrimary: false }],
    })
  }

  const removePhoneField = (index: number) => {
    const newPhones = formData.phones.filter((_, i) => i !== index)
    if (newPhones.length > 0 && !newPhones.some((p) => p.isPrimary)) {
      newPhones[0].isPrimary = true
    }
    setFormData({ ...formData, phones: newPhones })
  }

  const updatePhoneField = (index: number, number: string, isPrimary: boolean) => {
    const newPhones = formData.phones.map((p, i) => {
      if (i === index) return { number, isPrimary }
      if (isPrimary && i !== index) return { ...p, isPrimary: false }
      return p
    })
    setFormData({ ...formData, phones: newPhones })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg shadow-lg border border-border p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Refer Unassigned Patient to Receptionist</h2>
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
                className={`w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm ${
                  errors.patientName ? "border-destructive" : "border-border"
                }`}
                placeholder="e.g., John Doe"
              />
              {errors.patientName && <p className="text-xs text-destructive mt-1">{errors.patientName}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">Phone Numbers *</label>
              <div className="space-y-2">
                {formData.phones.map((phone, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <PhoneInput
                        international
                        countryCallingCodeEditable={false}
                        defaultCountry="US"
                        value={phone.number}
                        onChange={(value) => updatePhoneField(index, value || "", phone.isPrimary)}
                        className="phone-input-wrapper"
                        disabled={loading}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={phone.isPrimary}
                        onChange={(e) => updatePhoneField(index, phone.number, e.target.checked)}
                        disabled={loading}
                        className="w-4 h-4"
                      />
                      Primary
                    </label>
                    {formData.phones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePhoneField(index)}
                        className="p-2 text-red-500 bg-red-50 rounded cursor-pointer"
                        disabled={loading}
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPhoneField}
                  className="mt-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 cursor-pointer disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  <Plus size={16} className="inline mr-1" /> Add Phone
                </button>
              </div>
              {errors.patientPhone && <p className="text-xs text-destructive mt-1">{errors.patientPhone}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Format: + followed by country code and number. Mark one as primary.
              </p>
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
              <label className="block text-sm font-medium text-foreground mb-1">Nationality (optional)</label>
              <input
                type="text"
                value={formData.patientNationality}
                onChange={(e) => setFormData({ ...formData, patientNationality: e.target.value })}
                disabled={loading}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                placeholder="e.g., American"
              />
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
              <strong>Note:</strong> The receptionist will receive this referral, upload the patient's photo, and
              complete the appointment booking process.
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
