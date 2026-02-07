"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"
import { toast } from "react-hot-toast"
import Link from "next/link"
import { FaWhatsapp } from "react-icons/fa"
import Image from "next/image"

export default function LoginPage() {
  const [staffEmail, setStaffEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (!staffEmail.trim() || !password) {
        toast.error("Email and password required")
        setIsLoading(false)
        return
      }
      await login(staffEmail, password)
      toast.success("Login successful!")
      router.push("/dashboard")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // --- Admin contact info ---
  const adminEmail = "admin@dentalcarepro.com"
  const whatsappNumber = "+923001234567"

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
       {/* Logo with Image */}
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

        {/* Login Form */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-6 sm:p-8">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Staff Login</h2>
            <p className="text-muted-foreground text-xs sm:text-sm">Sign in to your staff account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 sm:py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-semibold py-2 sm:py-2.5 rounded-lg transition-colors duration-200 text-sm sm:text-base cursor-pointer"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Forgot Password */}
          <div className="text-center mt-4">
            <Link
              href="/forgot-password"
              className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          <div className="my-6 border-t border-border"></div>

          {/* Staff Contact Info */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600 mb-4">Don't have an account? Contact your admin to register.</p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mx-auto">
              {/* Email */}
              <div className="relative group">
                <a
                  href={`mailto:${adminEmail}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  <Mail className="w-4 h-4" />
                  <span>Email Admin</span>
                </a>
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  {adminEmail}
                </span>
              </div>

              {/* WhatsApp */}
              <div className="relative group">
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  <FaWhatsapp className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  Whatsapp open now
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">© 2025 Dr.Mohammad Alsheikh Dental Center. All rights reserved.</p>
      </div>
    </div>
  )
}
