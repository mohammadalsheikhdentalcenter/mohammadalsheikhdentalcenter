"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, ArrowLeft } from "lucide-react"
import { toast } from "react-hot-toast"
import Link from "next/link"
import Image from "next/image"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          userType: "staff",
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setSubmitted(true)
        toast.success("Password reset link sent to your email!")
      } else {
        toast.error(data.error || "Failed to send reset link")
      }
    } catch (error) {
      toast.error("Error sending reset link")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        {/* Logo - Minimalist */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="flex flex-col items-center">
            {/* Image with subtle background */}
            <div className="mb-2 p-3  rounded-2xl">
              <Image 
                src="/logo-removebg-preview.png" 
                alt="Dental Center" 
                width={60}
                height={60}
                className="object-contain"
                priority
              />
            </div>
            
            {/* Clinic Name */}
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

        {/* Forgot Password Form */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-6 sm:p-8">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Reset Password</h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground text-sm"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-semibold py-2 sm:py-2.5 rounded-lg transition-colors duration-200 text-sm sm:text-base cursor-pointer"
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
                <p className="text-accent font-medium mb-2">Check your email</p>
                <p className="text-accent/80 text-sm">
                  We've sent a password reset link to <strong>{email}</strong>. Click the link in the email to reset
                  your password.
                </p>
              </div>
              <p className="text-muted-foreground text-xs">
                Didn't receive the email? Check your spam folder or try again.
              </p>
            </div>
          )}

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">© 2025 Dr.Mohammad Alsheikh Dental Center. All rights reserved.</p>
      </div>
    </div>
  )
}
