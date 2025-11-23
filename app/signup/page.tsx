"use client"

import { useAuth } from "@/components/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { AdminStaffRegistration } from "@/components/admin-staff-registration"
import Image from "next/image"

export default function SignupPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user?.role !== "admin" && user?.role !== "hr") {
      router.replace("/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "hr"]}>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Logo and Branding */}
          <div className="text-center mb-4 sm:mb-6">
            <div className="flex flex-col items-center">
              <div className="mb-2 p-3 rounded-2xl">
                <Image 
                  src="/logo-removebg-preview.png" 
                  alt="Dental Center" 
                  width={60}
                  height={60}
                  className="object-contain"
                  priority
                />
              </div>
              
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  DR. MOHAMMAD ALSHEIKH
                </h1>
                <div className="h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent w-3/4 mx-auto"></div>
                <h2 className="text-lg sm:text-xl font-semibold text-blue-600">
                  DENTAL CENTER
                </h2>
              </div>
            </div>
            
            <p className="text-muted-foreground text-xs sm:text-sm mt-4">Professional Clinic Management</p>
          </div>

          <AdminStaffRegistration />
        </div>
      </div>
    </ProtectedRoute>
  )
}