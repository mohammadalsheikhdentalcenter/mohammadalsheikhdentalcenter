"use client"

import type React from "react"

//@ts-nocheck
import { AlertCircle, CheckCircle, Clock, CreditCard, FileText, Download, X } from "lucide-react"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useRef } from "react"
import jsPDF from "jspdf"

// PaymentHistory Component with Beautiful PDF Generation
export function PaymentHistory({ billings, patient }: any) {
  const allTransactions = billings.flatMap((billing: any) => {
    // Include transactions from the transactions array
    const transactionsFromArray = (billing.transactions || []).map((transaction: any) => ({
      ...transaction,
      billingId: billing._id,
      debtAmount: billing.totalAmount,
      paidAmount: billing.paidAmount,
      paymentStatus: billing.paymentStatus,
    }))
    return transactionsFromArray
  })

  const sortedTransactions = [...allTransactions].sort(
    (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Paid":
        return <CheckCircle className="w-4 h-4 text-accent" />
      case "Partially Paid":
        return <Clock className="w-4 h-4 text-warning" />
      case "Pending":
        return <AlertCircle className="w-4 h-4 text-secondary" />
      default:
        return <AlertCircle className="w-4 h-4 text-destructive" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return {
          bg: "bg-accent/10",
          text: "text-accent",
          border: "border-accent/20",
          icon: <CheckCircle className="w-3.5 h-3.5" />,
        }
      case "Partially Paid":
        return {
          bg: "bg-warning/10",
          text: "text-warning",
          border: "border-warning/20",
          icon: <Clock className="w-3.5 h-3.5" />,
        }
      case "Pending":
        return {
          bg: "bg-secondary/10",
          text: "text-secondary",
          border: "border-secondary/20",
          icon: <AlertCircle className="w-3.5 h-3.5" />,
        }
      default:
        return {
          bg: "bg-destructive/10",
          text: "text-destructive",
          border: "border-destructive/20",
          icon: <AlertCircle className="w-3.5 h-3.5" />,
        }
    }
  }

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) {
      const today = new Date()
      return {
        day: today.getDate(),
        month: today.toLocaleDateString("en-US", { month: "short" }),
        year: today.getFullYear(),
        time: today.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        fullDate: today.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      }
    }

    const date = new Date(dateString)

    if (isNaN(date.getTime())) {
      const today = new Date()
      return {
        day: today.getDate(),
        month: today.toLocaleDateString("en-US", { month: "short" }),
        year: today.getFullYear(),
        time: today.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        fullDate: today.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      }
    }

    return {
      day: date.getDate(),
      month: date.toLocaleDateString("en-US", { month: "short" }),
      year: date.getFullYear(),
      time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      fullDate: date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    }
  }

  const handleViewReceipt = (transaction: any) => {
    setSelectedTransaction(transaction)
    setShowReceiptModal(true)
  }

  const handleViewDetails = (billing: any) => {
    setSelectedTransaction(billing.transactions[0])
    setShowDetailsModal(true)
  }

const generateBeautifulPDF = async (billing: any) => {
  setIsGeneratingPDF(true)

  try {
    // Create PDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const margin = 20
    const contentWidth = pageWidth - margin * 2

    // Current Y position
    let currentY = margin

    // Header with blue background
    doc.setFillColor(59, 130, 246)
    doc.rect(0, 0, pageWidth, 50, "F")

    // Receipt Title
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")
    doc.text("PATIENT RECEIPT", pageWidth / 2, 32, { align: "center" })
    
    // Start content
    currentY = 60

    // Section styling constants
    const sectionSpacing = 8
    const subsectionSpacing = 6
    const sectionTitleSpacing = 5

    // Extract patient information
    const patientName = billing.patientName || billing.patient?.name || "N/A"
    const patientId = billing.patientId || billing.patient?._id || billing.patient?.patientId || "N/A"

    // === PATIENT INFORMATION SECTION ===
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text("Patient Information", margin, currentY)

    currentY += sectionTitleSpacing

    // Add subtle underline
    doc.setDrawColor(59, 130, 246)
    doc.line(margin, currentY, margin + 50, currentY)
    doc.setDrawColor(200, 200, 200)

    currentY += 10

    // Patient Name
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(75, 85, 99)
    doc.text("Name:", margin, currentY)
    
    doc.setFont("helvetica", "normal")
    doc.setTextColor(31, 41, 55)
    doc.text(patientName, margin + 25, currentY)

    currentY += subsectionSpacing

    // Patient ID
    doc.setFont("helvetica", "bold")
    doc.setTextColor(75, 85, 99)
    doc.text("ID:", margin, currentY)
    
    doc.setFont("helvetica", "normal")
    doc.setTextColor(31, 41, 55)
    doc.text(patientId, margin + 25, currentY)

    currentY += 15

    // === TRANSACTION INFORMATION SECTION ===
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text("Transaction Information", margin, currentY)

    currentY += sectionTitleSpacing

    // Add subtle underline
    doc.setDrawColor(59, 130, 246)
    doc.line(margin, currentY, margin + 70, currentY)

    currentY += 10

    // Transaction ID
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(75, 85, 99)
    doc.text("Transaction ID:", margin, currentY)
    
    doc.setFont("helvetica", "normal")
    doc.setTextColor(31, 41, 55)
    const transactionId = billing.transactions?.[0]?.transactionId || billing.transactionId || "N/A"
    doc.text(`#${transactionId}`, margin + 45, currentY)

    currentY += subsectionSpacing

    // Date
    doc.setFont("helvetica", "bold")
    doc.setTextColor(75, 85, 99)
    doc.text("Date:", margin, currentY)
    
    doc.setFont("helvetica", "normal")
    doc.setTextColor(31, 41, 55)
    const now = new Date()
    const dateOptions: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }
    const timeOptions: Intl.DateTimeFormatOptions = { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }
    
    const transactionDate = billing.transactions?.[0]?.date || billing.date || now
    const dateObj = new Date(transactionDate)
    const dateText = dateObj.toLocaleDateString('en-US', dateOptions)
    const timeText = dateObj.toLocaleTimeString('en-US', timeOptions)
    doc.text(`${dateText} at ${timeText}`, margin + 45, currentY)

    currentY += subsectionSpacing

    // Status
    doc.setFont("helvetica", "bold")
    doc.setTextColor(75, 85, 99)
    doc.text("Status:", margin, currentY)
    
    const status = billing.transactions?.[0]?.paymentStatus || billing.paymentStatus || "Paid"
    if (status === "Paid") {
      doc.setTextColor(34, 197, 94)
    } else if (status === "Pending") {
      doc.setTextColor(234, 179, 8)
    } else {
      doc.setTextColor(239, 68, 68)
    }
    
    doc.setFont("helvetica", "bold")
    doc.text(status, margin + 45, currentY)

    currentY += subsectionSpacing

    // Amount Paid - Now in Transaction Information section
    doc.setFont("helvetica", "bold")
    doc.setTextColor(75, 85, 99)
    doc.text("Amount Paid:", margin, currentY)
    
    // Calculate the amount
    const paymentSplits = billing.transactions?.[0]?.paymentSplits || billing.paymentSplits || []
    const totalAmount = paymentSplits.length > 0
      ? paymentSplits.reduce((sum: number, split: any) => sum + (split.amount || 0), 0)
      : (billing.transactions?.[0]?.totalAmount || billing.totalAmount || 600.0)
    
    doc.setFontSize(12) // Slightly larger for amount
    doc.setTextColor(59, 130, 246) // Blue color for amount
    doc.setFont("helvetica", "bold")
    doc.text(`$${totalAmount.toFixed(2)}`, margin + 45, currentY)

    currentY += 10

    // === SEPARATOR LINE ===
    doc.setDrawColor(226, 232, 240)
    doc.line(margin, currentY, pageWidth - margin, currentY)

    currentY += 10

    // === PAYMENT METHODS SECTION ===
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(31, 41, 55)
    doc.text("Payment Methods:", margin, currentY)

    currentY += 10

    // Table Header
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(255, 255, 255)

    // Header background
    doc.setFillColor(59, 130, 246)
    doc.rect(margin, currentY, contentWidth, 8, "F")

    // Header text
    doc.text("#", margin + 6, currentY + 5.5)
    doc.text("Payment Method", margin + 25, currentY + 5.5)
    doc.text("Amount", pageWidth - margin - 25, currentY + 5.5, { align: "right" })

    currentY += 8

    // Table Rows
    doc.setFont("helvetica", "normal")
    doc.setTextColor(0, 0, 0)

    if (paymentSplits.length > 0) {
      paymentSplits.forEach((split: any, index: number) => {
        // Alternate row background
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252)
          doc.rect(margin, currentY, contentWidth, 8, "F")
        }

        // Row number
        doc.text((index + 1).toString(), margin + 6, currentY + 5.5)

        // Payment method
        const method = split.paymentType || "cash"
        const formattedMethod = method.charAt(0).toUpperCase() + method.slice(1).replace(/([A-Z])/g, ' $1').trim()
        doc.text(formattedMethod, margin + 25, currentY + 5.5)

        // Amount
        const amount = `$${(split.amount || 0).toFixed(2)}`
        doc.text(amount, pageWidth - margin - 6, currentY + 5.5, { align: "right" })

        currentY += 8
      })
    } else {
      // Default rows
      const defaultRows = [
        { method: 'cash', amount: 100.00 },
        { method: 'card', amount: 200.00 },
        { method: 'bankTransfer', amount: 200.00 },
        { method: 'other', amount: 100.00 }
      ]

      defaultRows.forEach((row, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252)
          doc.rect(margin, currentY, contentWidth, 8, "F")
        }

        doc.text((index + 1).toString(), margin + 6, currentY + 5.5)
        
        const formattedMethod = row.method.charAt(0).toUpperCase() + row.method.slice(1).replace(/([A-Z])/g, ' $1').trim()
        doc.text(formattedMethod, margin + 25, currentY + 5.5)
        
        const amount = `$${row.amount.toFixed(2)}`
        doc.text(amount, pageWidth - margin - 6, currentY + 5.5, { align: "right" })

        currentY += 8
      })
    }

    currentY += 10

    // Total Row
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text("Total:", margin + contentWidth - 40, currentY, { align: "right" })

    doc.setTextColor(34, 197, 94)
    doc.text(`$${totalAmount.toFixed(2)}`, pageWidth - margin - 6, currentY, { align: "right" })

    currentY += 10

    // === NOTES SECTION ===
    if (currentY < pageHeight - 50) {
      // Separator line
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, currentY, pageWidth - margin, currentY)

      currentY += 10

      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(0, 0, 0)
      doc.text("Notes:", margin, currentY)

      currentY += 10

      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 100, 100)

      const notesText = billing.transactions?.[0]?.notes || billing.notes || "Payment receipt"
      
      // Split notes
      const notesLines = notesText.split(/[,\n]/).filter((line: string) => line.trim())
      
      if (notesLines.length > 0) {
        notesLines.forEach((line: string) => {
          const trimmedLine = line.trim()
          if (trimmedLine) {
            const lineText = `• ${trimmedLine}`
            const maxNotesWidth = contentWidth - 10
            const splitLine = doc.splitTextToSize(lineText, maxNotesWidth)
            
            splitLine.forEach((split: string) => {
              doc.text(split, margin + 6, currentY)
              currentY += 6
            })
          }
        })
      } else {
        doc.text("• Payment receipt", margin + 6, currentY)
        currentY += 6
      }
    }

    // === FOOTER SECTION ===
    const footerY = Math.max(pageHeight - 25, currentY + 15)

    doc.setFontSize(9)
    doc.setFont("helvetica", "italic")
    doc.setTextColor(100, 100, 100)

    // Footer text
    doc.text("This is an official record for your record.", pageWidth / 2, footerY, { align: "center" })
    doc.text("Given credit, total fees are paid.", pageWidth / 2, footerY + 5, { align: "center" })

    // Save PDF
    const safePatientName = patientName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const fileName = `receipt_${safePatientName}_${new Date().toISOString().split('T')[0]}.pdf`
    
    doc.save(fileName)

   
  } catch (error) {
    console.error("Error generating PDF:", error)
    toast.error("Failed to generate receipt")
  } finally {
    setIsGeneratingPDF(false)
  }
}



 const handleDownloadReceipt = async () => {
  if (!selectedTransaction || !patient) return
  
  // Create billing object with transaction AND patient data
  const billingWithPatient = { 
    transactions: [selectedTransaction],
    patientName: patient.name,
    patientId: patient.patientId || patient._id
  }
  
  await generateBeautifulPDF(billingWithPatient)
}

  const handleShareReceipt = async () => {
    if (!selectedTransaction) return

    try {
      // Generate simple PDF for sharing
      const doc = new jsPDF()
      const date = formatDate(selectedTransaction.date)

      // Simple receipt for sharing
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("PAYMENT RECEIPT", 20, 20)

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`Transaction ID: #${selectedTransaction.transactionId || "N/A"}`, 20, 30)
      doc.text(`Date: ${date.fullDate}`, 20, 35)
      doc.text(`Status: ${selectedTransaction.paymentStatus}`, 20, 40)

      doc.setFontSize(14)
      doc.text(`Amount Paid: ${formatCurrency(selectedTransaction.totalAmount)}`, 20, 50)

      // Generate blob
      const pdfBlob = doc.output("blob")
      const file = new File([pdfBlob], `receipt_${selectedTransaction.transactionId || Date.now()}.pdf`, {
        type: "application/pdf",
      })

      // Check if Web Share API is available
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Receipt #${selectedTransaction.transactionId || "N/A"}`,
          text: `Payment receipt for ${formatCurrency(selectedTransaction.totalAmount)}`,
          files: [file],
        })
        toast.success("Receipt shared successfully")
      } else {
        // Fallback: Download PDF
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement("a")
        a.href = url
        a.download = `receipt_${selectedTransaction.transactionId || Date.now()}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success("PDF downloaded for sharing")
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Error sharing receipt:", error)
        toast.error("Failed to share receipt")
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const handleCloseModal = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowDetailsModal(false)
      setShowReceiptModal(false)
    }
  }

  return (
    <>
      <div className="bg-card rounded-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                Transaction History
              </h3>
              <p className="text-sm text-muted-foreground mt-1">All billing transactions and payments</p>
            </div>
            <div className="hidden sm:block px-4 py-2 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium text-foreground">
                {sortedTransactions.length} {sortedTransactions.length === 1 ? "Transaction" : "Transactions"}
              </span>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="p-4 sm:p-6">
          {sortedTransactions.length > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {sortedTransactions.map((transaction: any, index: number) => {
                const date = formatDate(transaction.date)
                const transactionTotal =
                  transaction.paymentSplits?.reduce((sum: number, split: any) => sum + (split.amount || 0), 0) || 0

                return (
                  <div
                    key={index}
                    className="group bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left Side - Date and Details */}
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          {/* Date Badge */}
                          <div className="flex flex-col items-center min-w-14">
                            <div className="bg-primary/5 rounded-lg p-2 w-full text-center">
                              <div className="text-lg font-bold text-primary">{date.day}</div>
                              <div className="text-xs text-muted-foreground uppercase">{date.month}</div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">{date.year}</div>
                          </div>

                          {/* Transaction Details */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Payment Received
                              </span>
                              <span className="text-xs text-muted-foreground">{date.time}</span>
                            </div>

                            {/* Notes */}
                            {transaction.notes && (
                              <div className="mt-2">
                                <p className="text-sm text-muted-foreground bg-muted/20 rounded-lg p-3 border border-border line-clamp-2">
                                  {transaction.notes}
                                </p>
                              </div>
                            )}

                            {/* Payment Methods */}
                            {transaction.paymentSplits && transaction.paymentSplits.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-medium text-muted-foreground">Payment Methods:</span>
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {transaction.paymentSplits.length}{" "}
                                    {transaction.paymentSplits.length === 1 ? "method" : "methods"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {transaction.paymentSplits.map((split: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/20 rounded-lg border border-border"
                                    >
                                      <span className="text-xs font-medium text-foreground capitalize">
                                        {split.paymentType}
                                      </span>
                                      <span className="text-xs font-bold text-foreground">
                                        ${Number(split.amount).toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side - Amount and Actions */}
                      <div className="flex flex-col items-end sm:items-end gap-2">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-accent">${transactionTotal.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground mt-1">Payment Amount</p>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleViewReceipt(transaction)}
                            className="flex items-center gap-1 text-xs text-foreground hover:text-foreground font-medium px-2 py-1 hover:bg-muted bg-muted rounded transition-colors cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            Receipt
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <CreditCard className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No transactions yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
          {/* Hidden content for printing */}
          <div className="hidden">
            <div ref={printRef} className="p-8 bg-white text-black">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-2">PAYMENT RECEIPT</h1>
                <p className="text-gray-600">Thank you for your payment</p>
              </div>

              <div className="mb-6">
                <div className="flex justify-between mb-4">
                  <span>Transaction ID:</span>
                  <span className="font-bold">#{selectedTransaction.transactionId || "N/A"}</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span>Date:</span>
                  <span>{formatDate(selectedTransaction.date).fullDate}</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span>Status:</span>
                  <span>{selectedTransaction.paymentStatus}</span>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-center p-4 bg-gray-100 rounded-lg mb-4">
                  <p className="text-sm text-gray-600">Amount Paid</p>
                  <p className="text-3xl font-bold">{formatCurrency(selectedTransaction.totalAmount)}</p>
                </div>

                {selectedTransaction.paymentSplits && selectedTransaction.paymentSplits.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-bold mb-2">Payment Methods</h3>
                    {selectedTransaction.paymentSplits.map((split: any, idx: number) => (
                      <div key={idx} className="flex justify-between mb-1">
                        <span>{split.paymentType}:</span>
                        <span>{formatCurrency(split.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedTransaction.notes && (
                  <div className="mb-4">
                    <h3 className="font-bold mb-2">Notes</h3>
                    <p className="text-gray-700">{selectedTransaction.notes}</p>
                  </div>
                )}
              </div>

              <div className="text-center text-sm text-gray-500 pt-6 border-t">
                <p>Generated on: {new Date().toLocaleDateString()}</p>
                <p className="mt-2">This is an official receipt for your records.</p>
              </div>
            </div>
          </div>

          {/* Visible modal */}
          <div className="bg-card rounded-xl border border-border shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Payment Receipt</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Transaction #{selectedTransaction.transactionId || "N/A"}
                  </p>
                </div>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Receipt Header */}
              <div className="text-center border-b border-border pb-6">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-accent" />
                </div>
                <h4 className="text-2xl font-bold text-foreground">Payment Receipt</h4>
                <p className="text-muted-foreground mt-2">Thank you for your payment</p>
              </div>

              {/* Receipt Details */}
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted/10 rounded-lg">
                  <span className="font-medium text-foreground">Amount Paid</span>
                  <span className="text-2xl font-bold text-accent">
                    {formatCurrency(selectedTransaction.totalAmount)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium text-foreground">{formatDate(selectedTransaction.date).fullDate}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="inline-flex items-center gap-2">
                      {getStatusIcon(selectedTransaction.paymentStatus)}
                      <span className="font-medium text-foreground">{selectedTransaction.paymentStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                {selectedTransaction.paymentSplits && selectedTransaction.paymentSplits.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">Payment Methods</p>
                    <div className="space-y-2">
                      {selectedTransaction.paymentSplits.map((split: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
                          <span className="font-medium text-foreground">{split.paymentType}</span>
                          <span className="font-bold text-foreground">{formatCurrency(split.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedTransaction.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Notes</p>
                    <div className="bg-muted/10 rounded-lg p-4 border border-border">
                      <p className="text-foreground">{selectedTransaction.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Receipt Footer */}
              <div className="pt-6 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                  This is an official receipt for payment #{selectedTransaction.transactionId || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Generated on {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Receipt Actions */}
            <div className="p-6 border-t border-border">
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={handleDownloadReceipt}
                  disabled={isGeneratingPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isGeneratingPDF ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download PDF
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/90 text-foreground rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
