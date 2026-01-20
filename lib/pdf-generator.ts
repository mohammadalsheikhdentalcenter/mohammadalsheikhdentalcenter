// @ts-nocheck
import jsPDF from "jspdf"
import { format } from "date-fns"

interface ReportData {
  _id: string
  patientId: {
    name: string
    email: string
    phone: string
    phones?: Array<{
      number: string
      isPrimary: boolean
    }>
    dateOfBirth?: string
    address?: string
  }
  doctorId: {
    name: string
    specialty: string
    email?: string
    licenseNumber?: string
  }
  procedures: Array<{ name: string; description?: string; tooth?: string; status?: string }>
  findings: string
  notes: string
  nextVisit?: string
  followUpDetails?: string
  createdAt: string
}

// Helper function to detect if text contains Arabic characters
function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text)
}

// Helper function to clean and normalize text
function cleanText(text: string | undefined | null): string {
  if (!text) return ""
  
  // Remove control characters and normalize
  return text
    .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u017F\u0180-\u024F\u0600-\u06FF]/g, '') // Keep common Unicode ranges including Arabic
    .normalize('NFKC') // Normalize Unicode
    .trim()
}

// Function to add Arabic font support
async function setupArabicFont(doc: jsPDF) {
  try {
    // Try to use the built-in Arabic font if available
    // Or load a custom Arabic font
    doc.setFont("helvetica")
    
    // Check if we need to set RTL for Arabic text
    // For now, we'll let jsPDF handle it with the default font
    // which might not support Arabic well
    
    return doc
  } catch (error) {
    console.error("Error setting up Arabic font:", error)
    return doc
  }
}

export function generateReportPDF(report: ReportData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  })
  
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = 60

  // 🎨 Colors
  const blue = [23, 78, 166]
  const lightBlue = [235, 241, 255]
  const gray = [70, 70, 70]
  const softGray = [250, 250, 252]
  const green = [34, 197, 94]
  const red = [239, 68, 68]

  // Setup Arabic font if needed
  setupArabicFont(doc)

  /* -------------------- HEADER -------------------- */
  const headerHeight = 50
  doc.setFillColor(blue[0], blue[1], blue[2])
  doc.rect(0, 0, pageWidth, headerHeight, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text("Dr. Mohammad Alsheikh", 20, 20)
  doc.setFontSize(12)
  doc.text("Dental Center", 20, 30)

  doc.setFont("helvetica", "italic")
  doc.setFontSize(10)
  doc.text("Your Smile, Our Priority", 20, 40)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text("MEDICAL REPORT", pageWidth - 20, 20, { align: "right" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text("Confidential Patient Document", pageWidth - 20, 29, { align: "right" })

  /* -------------------- REPORT INFO STRIP -------------------- */
  const reportDate = format(new Date(report.createdAt), "MMMM dd, yyyy")
  const reportTime = format(new Date(report.createdAt), "hh:mm a")
  const reportID = `DC-${report._id.slice(-6).toUpperCase()}`

  doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
  doc.roundedRect(15, 52, pageWidth - 30, 14, 3, 3, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(blue[0], blue[1], blue[2])
  doc.text(`Report ID: ${reportID}`, 22, 61)
  doc.text(`Date: ${reportDate}`, pageWidth / 2, 61, { align: "center" })
  doc.text(`Time: ${reportTime}`, pageWidth - 22, 61, { align: "right" })

  y += 10

  /* -------------------- PATIENT INFO -------------------- */
  y = drawSectionHeader(doc, "PATIENT INFORMATION", y, blue, pageWidth)

  // Get patient details safely and clean the text
  const patientData = report.patientId || {}

  // Clean and normalize patient data
  const patientName = cleanText(patientData.name) || "N/A"
  const patientEmail = cleanText(patientData.email) || "N/A"
  
  // Get the primary phone number
  let patientPhone = "N/A"
  if (patientData.phones && Array.isArray(patientData.phones)) {
    const primaryPhone = patientData.phones.find(p => p.isPrimary)
    if (primaryPhone?.number) {
      patientPhone = cleanText(primaryPhone.number)
    } else if (patientData.phones.length > 0 && patientData.phones[0]?.number) {
      patientPhone = cleanText(patientData.phones[0].number)
    }
  } else if (patientData.phone) {
    patientPhone = cleanText(patientData.phone)
  }

  // Format date of birth
  let patientDOB = ""
  if (patientData.dateOfBirth) {
    try {
      const dobDate = new Date(patientData.dateOfBirth)
      if (!isNaN(dobDate.getTime())) {
        patientDOB = `Date of Birth: ${format(dobDate, "MMMM dd, yyyy")}`
      }
    } catch (error) {
      console.error("Error formatting date of birth:", error)
    }
  }

  const patientAddress = patientData.address ? `Address: ${cleanText(patientData.address)}` : ""

  // Check if we have Arabic text and handle it specially
  const patientInfoLines = [
    `Name: ${patientName}`,
    `Email: ${patientEmail}`,
    `Phone: ${patientPhone}`,
    patientDOB,
    
  ].filter(Boolean)

  y = drawInfoCard(doc, patientInfoLines, y, softGray, pageWidth, patientName)

  /* -------------------- DOCTOR INFO -------------------- */
  y = drawSectionHeader(doc, "ATTENDING DOCTOR", y, blue, pageWidth)
  
  // Clean doctor data
  const doctorName = cleanText(report.doctorId?.name) || "N/A"
  const doctorSpecialty = cleanText(report.doctorId?.specialty) || "General Dentistry"
  const doctorEmail = cleanText(report.doctorId?.email) || ""
  const doctorLicense = cleanText(report.doctorId?.licenseNumber) || ""
  
  const doctorInfoLines = [
    `Name: ${doctorName}`,
    `Specialty: ${doctorSpecialty}`,
    doctorEmail ? `Email: ${doctorEmail}` : "",
    doctorLicense ? `License #: ${doctorLicense}` : "",
  ].filter(Boolean)
  
  y = drawInfoCard(doc, doctorInfoLines, y, softGray, pageWidth, doctorName)

  /* -------------------- PROCEDURES -------------------- */
  y = drawSectionHeader(doc, "PROCEDURES PERFORMED", y, blue, pageWidth)
  if (report.procedures?.length) {
    for (const [i, p] of report.procedures.entries()) {
      y = checkNewPage(doc, y, pageHeight)
      
      // Clean procedure data
      const procedureName = cleanText(p.name)
      const procedureTooth = cleanText(p.tooth)
      const procedureStatus = cleanText(p.status)
      const procedureDescription = cleanText(p.description)
      
      // Handle Arabic text in procedures
      const cardHeight = 18
      const startY = y + 2
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(20, startY, pageWidth - 40, cardHeight, 3, 3, "F")

      doc.setFont("helvetica", "bold")
      doc.setTextColor(blue[0], blue[1], blue[2])
      doc.setFontSize(10)
      
      // Check if procedure name contains Arabic
      if (containsArabic(procedureName)) {
        // For Arabic text, we might need to handle RTL
        const arabicProcedureName = `${i + 1}. ${procedureName}`
        // Try to split and display Arabic text
        try {
          const arabicLines = splitArabicText(doc, arabicProcedureName, pageWidth - 60)
          arabicLines.forEach((line, lineIndex) => {
            // For Arabic, we might need to adjust positioning
            doc.text(line, 26, startY + 7 + (lineIndex * 5))
          })
        } catch (error) {
          // Fallback to regular text
          doc.text(`${i + 1}. ${procedureName}`, 26, startY + 7)
        }
      } else {
        // Regular text handling
        const procedureNameLines = doc.splitTextToSize(`${i + 1}. ${procedureName}`, pageWidth - 60)
        procedureNameLines.forEach((line, lineIndex) => {
          doc.text(line, 26, startY + 7 + (lineIndex * 5))
        })
      }

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(gray[0], gray[1], gray[2])
      
      const textY = startY + 12
      
      if (procedureTooth) doc.text(`Tooth: ${procedureTooth}`, 26, textY)
      if (procedureStatus) {
        const color = procedureStatus.toLowerCase() === "completed" ? green : red
        doc.setTextColor(color[0], color[1], color[2])
        doc.text(`Status: ${procedureStatus}`, pageWidth - 26, textY, { align: "right" })
        doc.setTextColor(gray[0], gray[1], gray[2])
      }

      y += cardHeight + 2
      
      if (procedureDescription) {
        if (containsArabic(procedureDescription)) {
          try {
            const arabicDesc = splitArabicText(doc, `Description: ${procedureDescription}`, pageWidth - 50)
            arabicDesc.forEach((line, lineIndex) => {
              doc.text(line, 28, y + (lineIndex * 4.5))
            })
            y += arabicDesc.length * 4.5 + 2
          } catch (error) {
            const desc = doc.splitTextToSize(`Description: ${procedureDescription}`, pageWidth - 50)
            doc.text(desc, 28, y)
            y += desc.length * 4.5 + 2
          }
        } else {
          const desc = doc.splitTextToSize(`Description: ${procedureDescription}`, pageWidth - 50)
          doc.text(desc, 28, y)
          y += desc.length * 4.5 + 2
        }
      }
    }
  } else {
    y = drawInfoCard(doc, ["No procedures recorded."], y, softGray, pageWidth)
  }

  /* -------------------- FINDINGS -------------------- */
  y = checkNewPage(doc, y, pageHeight)
  y = drawSectionHeader(doc, "CLINICAL FINDINGS", y, blue, pageWidth)
  const findingsText = cleanText(report.findings) || "No findings recorded."
  y = drawParagraphCard(doc, findingsText, y, pageWidth)

  /* -------------------- NOTES -------------------- */
  y = checkNewPage(doc, y, pageHeight)
  y = drawSectionHeader(doc, "DOCTOR'S NOTES", y, blue, pageWidth)
  const notesText = cleanText(report.notes) || "No additional notes."
  y = drawParagraphCard(doc, notesText, y, pageWidth)

  /* -------------------- NEXT VISIT -------------------- */
  if (report.nextVisit) {
    y = checkNewPage(doc, y, pageHeight)
    y = drawSectionHeader(doc, "NEXT APPOINTMENT", y, green, pageWidth)
    
    // Parse date and time
    try {
      const nextVisitDate = new Date(report.nextVisit)
      if (!isNaN(nextVisitDate.getTime())) {
        const dateStr = nextVisitDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        
        let timeStr = ""
        if ((report as any).nextVisitTime) {
          const timeDate = new Date(`2000-01-01T${(report as any).nextVisitTime}`)
          timeStr = timeDate.toLocaleTimeString("en-US", {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        }
        
        const nextVisitText = timeStr ? `${dateStr} at ${timeStr}` : dateStr
        y = drawParagraphCard(doc, `Scheduled for: ${nextVisitText}`, y, pageWidth)
      }
    } catch (error) {
      console.error("Error parsing next visit date:", error)
    }
  }

  /* -------------------- FOLLOW-UP -------------------- */
  if (report.followUpDetails) {
    y = checkNewPage(doc, y, pageHeight)
    y = drawSectionHeader(doc, "FOLLOW-UP INSTRUCTIONS", y, blue, pageWidth)
    const followUpText = cleanText(report.followUpDetails)
    y = drawParagraphCard(doc, followUpText, y, pageWidth)
  }

  /* -------------------- SIGNATURE -------------------- */
  if (y > pageHeight - 70) {
    doc.addPage()
    y = 40
  }
  const signatureY = y + 8

  doc.setFillColor(softGray[0], softGray[1], softGray[2])
  doc.roundedRect(80, signatureY, 110, 36, 3, 3, "F")

  doc.setDrawColor(120, 120, 120)
  doc.line(100, signatureY + 20, 180, signatureY + 20)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  const signatureName = cleanText(report.doctorId?.name) || "Attending Dentist"
  doc.text(signatureName, 145, signatureY + 28, { align: "center" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)

  /* -------------------- FOOTER -------------------- */
  doc.setFillColor(blue[0], blue[1], blue[2])
  doc.rect(0, pageHeight - 14, pageWidth, 14, "F")
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text("Dr. Mohammad Alsheikh Dental Center — Compassion. Precision. Care.", 10, pageHeight - 6)

  const fileNamePatientName = patientName.replace(/\s+/g, "_") || "Patient"
  const dateStr = format(new Date(report.createdAt), "yyyy-MM-dd")
  doc.save(`Dental_Report_${fileNamePatientName}_${dateStr}.pdf`)
}

/* -------------------- HELPERS -------------------- */

function splitArabicText(doc: jsPDF, text: string, maxWidth: number): string[] {
  // Simple Arabic text splitting
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const testWidth = doc.getStringUnitWidth(testLine) * doc.getFontSize() / doc.internal.scaleFactor
    
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  
  if (currentLine) {
    lines.push(currentLine)
  }
  
  return lines
}

function drawSectionHeader(doc: jsPDF, title: string, y: number, color: number[], width: number): number {
  y += 6
  doc.setFillColor(color[0], color[1], color[2])
  doc.roundedRect(18, y, width - 36, 8, 2, 2, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text(title, 24, y + 5.5)
  return y + 10
}

function drawInfoCard(doc: jsPDF, lines: string[], y: number, bgColor: number[], width: number, arabicSample?: string): number {
  // Calculate height based on wrapped text
  let totalHeight = 8
  const allLines: string[] = []
  
  for (const line of lines) {
    if (line.trim()) {
      const cleanedLine = cleanText(line)
      if (cleanedLine) {
        // Check if line contains Arabic
        if (containsArabic(cleanedLine)) {
          try {
            const arabicLines = splitArabicText(doc, cleanedLine, width - 50)
            allLines.push(...arabicLines)
            totalHeight += arabicLines.length * 5
          } catch (error) {
            // Fallback to regular splitting
            const wrapped = doc.splitTextToSize(cleanedLine, width - 50)
            allLines.push(...wrapped)
            totalHeight += wrapped.length * 5
          }
        } else {
          const wrapped = doc.splitTextToSize(cleanedLine, width - 50)
          allLines.push(...wrapped)
          totalHeight += wrapped.length * 5
        }
      }
    }
  }
  
  // Ensure minimum height
  if (totalHeight < 18) totalHeight = 18
  
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
  doc.roundedRect(20, y + 1, width - 40, totalHeight, 3, 3, "F")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(50, 50, 50)
  
  allLines.forEach((line, i) => {
    // For Arabic text, we might need to adjust alignment or handling
    doc.text(line, 28, y + 7 + i * 5)
  })
  
  return y + totalHeight + 4
}

function drawParagraphCard(doc: jsPDF, text: string, y: number, width: number): number {
  const cleanedText = cleanText(text)
  
  let lines: string[]
  if (containsArabic(cleanedText)) {
    try {
      lines = splitArabicText(doc, cleanedText, width - 50)
    } catch (error) {
      lines = doc.splitTextToSize(cleanedText, width - 50)
    }
  } else {
    lines = doc.splitTextToSize(cleanedText, width - 50)
  }
  
  const height = lines.length * 4.6 + 8
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(20, y + 1, width - 40, height, 3, 3, "F")
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  doc.text(lines, 28, y + 8)
  return y + height + 4
}

function checkNewPage(doc: jsPDF, y: number, pageHeight: number): number {
  if (y > pageHeight - 70) {
    doc.addPage()
    return 20
  }
  return y
}