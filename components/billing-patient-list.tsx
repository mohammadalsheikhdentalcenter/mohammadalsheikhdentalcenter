"use client"

import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

export function BillingPatientList({ patients }: any) {
  const router = useRouter()

  const handleSelectPatient = (patientId: string) => {
    router.push(`/dashboard/billing/${patientId}`)
  }

  return (
    <div className="space-y-3">
      {patients.map((patient: any) => (
        <button
          key={patient.patientId}
          onClick={() => handleSelectPatient(patient.patientId)}
          className="w-full bg-card rounded-lg border border-border hover:border-accent hover:shadow-md transition-all p-4 sm:p-6 text-left group cursor-pointer"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-accent transition-colors">
                {patient.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {patient.phones?.find((p: any) => p.isPrimary)?.number || patient.phone}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Total Paid</p>
              <p className="text-lg sm:text-xl font-bold text-accent">${patient.totalPaid.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                Remaining Balance
              </p>
              <p
                className={`text-lg sm:text-xl font-bold ${patient.remainingBalance > 0 ? "text-destructive" : "text-accent"}`}
              >
                ${patient.remainingBalance.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Total Debt</p>
              <p className="text-lg sm:text-xl font-bold text-foreground">${patient.totalDebt.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Payment %</p>
              <p
                className={`text-lg sm:text-xl font-bold ${
                  patient.paymentPercentage >= 100
                    ? "text-accent"
                    : patient.paymentPercentage >= 50
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-destructive"
                }`}
              >
                {patient.paymentPercentage?.toFixed(1) || 0}%
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
