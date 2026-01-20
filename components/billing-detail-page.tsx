//@ts-nocheck
"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { toast } from "react-hot-toast"
import { ArrowLeft, Plus, Loader2, CreditCard, FileText, DollarSign, User, Phone, FileText as FileIcon } from "lucide-react"
import { AddDebtModal } from "@/components/add-debt-modal"
import { AddPaymentModal } from "@/components/add-payment-modal"
import { PaymentHistory } from "./payment-history"
import { BillingChart } from "./billing-chart"
import { EditRemainingBalanceModal } from "@/components/edit-remaining-balance-modal"
import { PatientReportsSection } from "@/components/patient-reports-section"

export function BillingDetailPage({ patient, onBack }: any) {
  const { token } = useAuth()
  const [billings, setBillings] = useState([])
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalDebt: 0,
    remainingBalance: 0,
  })
  const [loading, setLoading] = useState(false)
  const [showAddDebt, setShowAddDebt] = useState(false)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [showReports, setShowReports] = useState(false)
  const [showEditBalance, setShowEditBalance] = useState(false)
  const [selectedBillingId, setSelectedBillingId] = useState(null)

  useEffect(() => {
    if (patient?.patientId) {
      fetchTransactions()
    }
  }, [token, patient?.patientId])

  const fetchTransactions = async () => {
    if (!patient?.patientId) return

    setLoading(true)
    try {
      const res = await fetch(`/api/billing/${patient.patientId}/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setBillings(data.billings || [])
        setStats(data.stats || { totalPaid: 0, totalDebt: 0, remainingBalance: 0 })
      } else {
        toast.error("Failed to load billing data")
      }
    } catch (error) {
      toast.error("Failed to load billing data")
    } finally {
      setLoading(false)
    }
  }

  const handleDebtAdded = () => {
    setShowAddDebt(false)
    toast.success("Debt added successfully")
    setTimeout(() => {
      fetchTransactions()
    }, 300)
  }

  const handlePaymentAdded = () => {
    setShowAddPayment(false)
    // toast.success("Payment recorded successfully")
    setTimeout(() => {
      fetchTransactions()
    }, 300)
  }

  const handleEditRemainingBalance = (billingId: string) => {
    setSelectedBillingId(billingId)
    setShowEditBalance(true)
  }

  const handleBalanceUpdated = () => {
    setShowEditBalance(false)
    setSelectedBillingId(null)
    setTimeout(() => {
      fetchTransactions()
    }, 300)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              onClick={onBack}
              className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium w-fit cursor-pointer"
            >
              <ArrowLeft className="w-7 h-5 transition-transform group-hover:-translate-x-0.5 duration-200" />
              Back
            </button>

            <div className="flex flex-col sm:flex-row sm:gap-2 gap-2 w-full justify-end">
              <button
                onClick={() => setShowReports(true)}
                className="flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 border border-border text-foreground px-3 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer"
              >
                <FileIcon className="w-4 h-4" />
                View Reports
              </button>

              <button
                onClick={() => setShowAddDebt(true)}
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Debt
              </button>

              <button
                onClick={() => setShowAddPayment(true)}
                className="flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-3 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Payment
              </button>
            </div>
          </div>

          {/* Patient Info */}
          <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{patient?.name || "Unknown Patient"}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  {patient?.phones?.find((p: any) => p.isPrimary)?.number || patient?.phone || "No phone"}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className="text-xs font-medium px-2 py-1 bg-muted rounded">
                    ID: {patient?.patientId || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-card rounded-xl border border-border">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground font-medium">Loading billing information...</p>
          </div>
        ) : (
          <>
            {/* Charts and Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <BillingChart stats={stats} />
              </div>

              <div className="space-y-4">
                {/* Total Paid */}
                <div className="bg-card rounded-xl border border-border p-5 hover:border-primary/50 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-accent/10 rounded-lg">
                        <DollarSign className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Paid</p>
                        <p className="text-2xl font-bold text-accent">${(stats?.totalPaid || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${stats?.totalDebt ? Math.min(100, (stats.totalPaid / stats.totalDebt) * 100) : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Total Debt */}
                <div className="bg-card rounded-xl border border-border p-5 hover:border-primary/50 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Debt</p>
                        <p className="text-2xl font-bold text-foreground">${(stats?.totalDebt || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    {billings.length > 0 && (
                      <button
                        onClick={() => handleEditRemainingBalance(billings[0]?._id)}
                        className="px-3 py-1.5 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors whitespace-nowrap ml-2 cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Remaining Balance */}
                <div
                  className={`bg-card rounded-xl border p-5 hover:border-primary/50 transition-colors duration-200 ${
                    (stats?.remainingBalance || 0) > 0 ? "border-destructive/20" : "border-accent/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`p-2 rounded-lg ${
                          (stats?.remainingBalance || 0) > 0 ? "bg-destructive/10" : "bg-accent/10"
                        }`}
                      >
                        <CreditCard
                          className={`w-5 h-5 ${
                            (stats?.remainingBalance || 0) > 0 ? "text-destructive" : "text-accent"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Remaining Balance</p>
                        <p
                          className={`text-2xl font-bold ${
                            (stats?.remainingBalance || 0) > 0 ? "text-destructive" : "text-accent"
                          }`}
                        >
                          ${(stats?.remainingBalance || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {billings.length > 0 && (
                      <button
                        onClick={() => handleEditRemainingBalance(billings[0]?._id)}
                        className="px-3 py-1.5 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors whitespace-nowrap ml-2 cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        (stats?.remainingBalance || 0) > 0 ? "bg-destructive" : "bg-accent"
                      }`}
                      style={{
                        width: `${
                          stats?.totalDebt
                            ? Math.min(100, (Math.abs(stats.remainingBalance) / stats.totalDebt) * 100)
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
              <PaymentHistory billings={billings} patient={patient} />
            </div>
          </>
        )}

        {/* Reports Modal */}
        {showReports && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg border border-border p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">Appointment Reports - {patient?.name}</h2>
                <button
                  onClick={() => setShowReports(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <PatientReportsSection patientId={patient?.patientId} token={token} isDoctor={false} />
            </div>
          </div>
        )}

        {/* Modals */}
        {patient?.patientId && (
          <>
            <AddDebtModal
              patientId={patient.patientId}
              isOpen={showAddDebt}
              onClose={() => setShowAddDebt(false)}
              onSuccess={handleDebtAdded}
            />
            <AddPaymentModal
              patientId={patient.patientId}
              remainingBalance={stats?.remainingBalance || 0}
              isOpen={showAddPayment}
              onClose={() => setShowAddPayment(false)}
              onSuccess={handlePaymentAdded}
            />
            <EditRemainingBalanceModal
              isOpen={showEditBalance}
              onClose={() => setShowEditBalance(false)}
              onSuccess={handleBalanceUpdated}
              currentBalance={stats?.remainingBalance || 0}
              totalDebt={stats?.totalDebt || 0}
              billingId={selectedBillingId}
            />
          </>
        )}
      </main>
    </div>
  )
}
