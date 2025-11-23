import type React from "react"

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  variant?: "default" | "success" | "warning" | "error"
}

export function StatCard({
  label,
  value,
  icon,
  variant = "default",
}: StatCardProps) {
  const borderColors = {
    default: "border-blue-200",
    success: "border-green-200",
    warning: "border-yellow-200",
    error: "border-red-200",
  }

  const iconColors = {
    default: "text-blue-600 bg-blue-50",
    success: "text-green-600 bg-green-50",
    warning: "text-yellow-600 bg-yellow-50",
    error: "text-red-600 bg-red-50",
  }

  return (
    <div
      className={`bg-white border ${borderColors[variant]} rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`${iconColors[variant]} p-3 rounded-full text-xl flex items-center justify-center`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  )
}
