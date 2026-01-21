"use client"

import Link from "next/link"
import { useAuth } from "./auth-context"
import { useRouter, usePathname } from "next/navigation"
import {
  Users,
  Calendar,
  FileText,
  Package,
  Users2,
  LayoutDashboard,
  LogOut,
  Stethoscope,
  Menu,
  X,
  Table,
} from "lucide-react"
import { useState, useEffect } from "react"
import Image from "next/image"

export function Sidebar() {
  const { user, logout, token } = useAuth() // Make sure token is available from auth context
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [pendingBillingCount, setPendingBillingCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setIsOpen(false)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "receptionist") {
      fetchPendingCount()
    }
  }, [user?.role, token]) // Add token as dependency

  const fetchPendingCount = async () => {
    if (!token) {
      console.log("No token available")
      return
    }

    setLoading(true)
    try {
      console.log("Fetching pending count...")
      const res = await fetch("/api/billing/pending-count", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("Response status:", res.status)

      if (res.ok) {
        const data = await res.json()
        console.log("Pending count data:", data)
        setPendingBillingCount(data.pendingCount || 0)
      } else {
        const errorText = await res.text()
        console.error("Failed to fetch pending count:", res.status, errorText)
        setPendingBillingCount(0)
      }
    } catch (error) {
      console.error("Failed to fetch pending count:", error)
      setPendingBillingCount(0)
    } finally {
      setLoading(false)
    }
  }

  // Optional: Set up polling for real-time updates
  useEffect(() => {
    if (user?.role === "admin" || user?.role === "receptionist") {
      const interval = setInterval(fetchPendingCount, 30000) // Every 30 seconds
      return () => clearInterval(interval)
    }
  }, [user?.role, token])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const getMenuItems = () => {
    const baseItems = [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }]

    if (user?.role === "admin") {
      return [
        ...baseItems,
        { label: "Patients", href: "/dashboard/patients", icon: Users },
        { label: "Appointments", href: "/dashboard/appointments", icon: Calendar },
        { label: "Appointments Table", href: "/dashboard/appointments-table", icon: Table },
        { label: "Forwarded Requests", href: "/dashboard/forwarded-requests", icon: FileText },
        { label: "Medical Reports", href: "/dashboard/medical-reports", icon: FileText },
        { label: "Billing", href: "/dashboard/billing", icon: FileText },
        {
          label: "Billing Requests",
          href: "/dashboard/billing-requests",
          icon: FileText,
          badge: pendingBillingCount,
        },
        { label: "Inventory", href: "/dashboard/inventory", icon: Package },
        { label: "Staff", href: "/dashboard/staff", icon: Users2 },
      ]
    }

    if (user?.role === "doctor") {
      return [
        ...baseItems,
        { label: "My Patients", href: "/dashboard/patients", icon: Users },
        { label: "My Appointments", href: "/dashboard/appointments", icon: Calendar },
        { label: "Appointments Table", href: "/dashboard/appointments-table", icon: Table },
        { label: "Patients Reports", href: "/dashboard/medical-reports", icon: FileText },
        { label: "Request Status", href: "/dashboard/request-status", icon: FileText },
        { label: "Billing Requests", href: "/dashboard/billing-requests", icon: FileText },
        { label: "Clinical Tools", href: "/dashboard/clinical-tools", icon: Stethoscope },
      ]
    }

    if (user?.role === "receptionist") {
      return [
        ...baseItems,
        { label: "Patients", href: "/dashboard/patients", icon: Users },
        { label: "Appointments", href: "/dashboard/appointments", icon: Calendar },
        { label: "Appointments Table", href: "/dashboard/appointments-table", icon: Table },
        { label: "Forwarded Requests", href: "/dashboard/forwarded-requests", icon: FileText },
        { label: "Medical Reports", href: "/dashboard/medical-reports", icon: FileText },
        { label: "Billing", href: "/dashboard/billing", icon: FileText },
        {
          label: "Billing Requests",
          href: "/dashboard/billing-requests",
          icon: FileText,
          badge: pendingBillingCount,
        },
      ]
    }

    if (user?.role === "hr") {
      return [
        ...baseItems,
        { label: "Patients", href: "/dashboard/patients", icon: Users },
        { label: "Inventory", href: "/dashboard/inventory", icon: Package },
        { label: "Staff", href: "/dashboard/staff", icon: Users2 },
      ]
    }

    return baseItems
  }

  const menuItems = getMenuItems()

  const isActive = (href: string) => pathname === href

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border flex items-center px-4 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-sidebar-foreground hover:text-sidebar-accent transition-colors"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="text-center ">
          <div className="inline-flex items-center justify-center ml-2">
            <Image
              src="/logo.jpeg"
              alt="DR. MOHAMMAD ALSHEIKH DENTAL CENTER"
              width={140}
              height={80}
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>

      {isOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setIsOpen(false)} />}

      <aside
        className={`fixed md:relative w-64 bg-sidebar text-sidebar-foreground h-screen flex flex-col border-r border-sidebar-border !scrollbar-none transition-transform duration-300 z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="hidden md:block p-4 sm:p-6 border-b border-sidebar-border">
          <div className="mb-4 sm:mb-8">
            <div className="inline-flex items-center justify-center">
              <Image
                src="/logo.jpeg"
                alt="DR. MOHAMMAD ALSHEIKH DENTAL CENTER"
                width={140}
                height={55}
                className="object-contain w-auto"
                priority
              />
            </div>
          </div>
          <p className="text-xs font-semibold text-sidebar-accent uppercase tracking-wider">{user?.role}</p>
        </div>

        <div className="md:hidden h-16" />

        <nav className="flex-1 p-1 sm:p-2 space-y-0.5 sm:space-y-1 overflow-y-auto scrollbar-thin">
          {menuItems.map((item: any) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/20 hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0 text-[0.6rem] sm:text-xs">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
                {loading && item.badge !== undefined && (
                  <span className="ml-auto w-5 h-5 flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-2 sm:p-4 border-t border-sidebar-border space-y-2 sm:space-y-4">
          <div className="text-xs sm:text-sm">
            <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wider">Logged in as</p>
            <p className="font-semibold text-sidebar-foreground truncate text-xs sm:text-sm">{user?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors text-xs sm:text-sm font-medium cursor-pointer"
          >
            <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="">Logout</span>
          </button>
        </div>
      </aside>

      <style jsx>{`
        @media (max-width: 768px) {
          main {
            padding-top: 4rem;
          }
        }
      `}</style>
    </>
  )
}
