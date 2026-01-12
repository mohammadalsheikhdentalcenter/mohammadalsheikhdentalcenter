//@ts-nocheck
import jsPDF from "jspdf"
import { format } from "date-fns"

interface ReportData {
  _id: string
  patientId: {
    name: string
    email: string
    phone: string
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

export function generateReportPDF(report: ReportData) {
  const doc = new jsPDF()
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
  y = drawInfoCard(doc, [
    `Name: ${report.patientId?.name || "N/A"}`,
    `Email: ${report.patientId?.email || "N/A"}`,
    `Phone: ${report.patientId?.phone || "N/A"}`,
    report.patientId?.dateOfBirth ? `Date of Birth: ${format(new Date(report.patientId.dateOfBirth), "MMMM dd, yyyy")}` : "",
    report.patientId?.address ? `Address: ${report.patientId.address}` : "",
  ].filter(Boolean), y, softGray, pageWidth)

  /* -------------------- DOCTOR INFO -------------------- */
  y = drawSectionHeader(doc, "ATTENDING DOCTOR", y, blue, pageWidth)
  y = drawInfoCard(doc, [
    `Name: ${report.doctorId?.name || "N/A"}`,
    `Specialty: ${report.doctorId?.specialty || "General Dentistry"}`,
    report.doctorId?.email ? `Email: ${report.doctorId.email}` : "",
    report.doctorId?.licenseNumber ? `License #: ${report.doctorId.licenseNumber}` : "",
  ].filter(Boolean), y, softGray, pageWidth)

  /* -------------------- PROCEDURES -------------------- */
  y = drawSectionHeader(doc, "PROCEDURES PERFORMED", y, blue, pageWidth)
  if (report.procedures?.length) {
    for (const [i, p] of report.procedures.entries()) {
      y = checkNewPage(doc, y, pageHeight)
      const startY = y + 2
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(20, startY, pageWidth - 40, 18, 3, 3, "F")

      doc.setFont("helvetica", "bold")
      doc.setTextColor(blue[0], blue[1], blue[2])
      doc.setFontSize(10)
      doc.text(`${i + 1}. ${p.name}`, 26, startY + 7)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(gray[0], gray[1], gray[2])
      if (p.tooth) doc.text(`Tooth: ${p.tooth}`, 26, startY + 13)
      if (p.status) {
        const color = p.status.toLowerCase() === "completed" ? green : red
        doc.setTextColor(color[0], color[1], color[2])
        doc.text(`Status: ${p.status}`, pageWidth - 26, startY + 13, { align: "right" })
        doc.setTextColor(gray[0], gray[1], gray[2])
      }

      y += 20
      if (p.description) {
        const desc = doc.splitTextToSize(`Description: ${p.description}`, pageWidth - 50)
        doc.text(desc, 28, y)
        y += desc.length * 4 + 2
      }
    }
  } else {
    y = drawInfoCard(doc, ["No procedures recorded."], y, softGray, pageWidth)
  }

  /* -------------------- FINDINGS -------------------- */
  y = checkNewPage(doc, y, pageHeight)
  y = drawSectionHeader(doc, "CLINICAL FINDINGS", y, blue, pageWidth)
  y = drawParagraphCard(doc, report.findings || "No findings recorded.", y, pageWidth)

  /* -------------------- NOTES -------------------- */
  y = checkNewPage(doc, y, pageHeight)
  y = drawSectionHeader(doc, "DOCTOR'S NOTES", y, blue, pageWidth)
  y = drawParagraphCard(doc, report.notes || "No additional notes.", y, pageWidth)

  /* -------------------- NEXT VISIT -------------------- */
  /* -------------------- NEXT VISIT -------------------- */
if (report.nextVisit) {
  y = checkNewPage(doc, y, pageHeight)
  y = drawSectionHeader(doc, "NEXT APPOINTMENT", y, green, pageWidth)
  
  // Parse date and time
  const nextVisitDate = new Date(report.nextVisit)
  const dateStr = nextVisitDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  
  let timeStr = ""
  // Check if nextVisitTime exists in the report
  if ((report as any).nextVisitTime) {
    const timeDate = new Date(`2000-01-01T${(report as any).nextVisitTime}`)
    timeStr = timeDate.toLocaleTimeString("en-US", {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }
  
  // Use drawParagraphCard instead of directly writing with doc.text
  const nextVisitText = timeStr ? `${dateStr} at ${timeStr}` : dateStr
  y = drawParagraphCard(doc, `Scheduled for: ${nextVisitText}`, y, pageWidth)
}
  

  /* -------------------- FOLLOW-UP -------------------- */
  if (report.followUpDetails) {
    y = checkNewPage(doc, y, pageHeight)
    y = drawSectionHeader(doc, "FOLLOW-UP INSTRUCTIONS", y, blue, pageWidth)
    y = drawParagraphCard(doc, report.followUpDetails, y, pageWidth)
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
  doc.text(`${report.doctorId?.name || "Attending Dentist"}`, 145, signatureY + 28, { align: "center" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)

  /* -------------------- FOOTER -------------------- */
  doc.setFillColor(blue[0], blue[1], blue[2])
  doc.rect(0, pageHeight - 14, pageWidth, 14, "F")
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text("Dr. Mohammad Alsheikh Dental Center — Compassion. Precision. Care.", 10, pageHeight - 6)

  const patientName = report.patientId?.name?.replace(/\s+/g, "_") || "Patient"
  const dateStr = format(new Date(report.createdAt), "yyyy-MM-dd")
  doc.save(`Dental_Report_${patientName}_${dateStr}.pdf`)
}

/* -------------------- HELPERS -------------------- */

function drawSectionHeader(doc, title, y, color, width) {
  y += 6
  doc.setFillColor(color[0], color[1], color[2])
  doc.roundedRect(18, y, width - 36, 8, 2, 2, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text(title, 24, y + 5.5)
  return y + 10
}

function drawInfoCard(doc, lines, y, bgColor, width) {
  const height = lines.length * 5 + 8
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
  doc.roundedRect(20, y + 1, width - 40, height, 3, 3, "F")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(50, 50, 50)
  lines.forEach((line, i) => doc.text(line, 28, y + 7 + i * 5))
  return y + height + 4
}

function drawParagraphCard(doc, text, y, width) {
  const lines = doc.splitTextToSize(text, width - 50)
  const height = lines.length * 4.6 + 8
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(20, y + 1, width - 40, height, 3, 3, "F")
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  doc.text(lines, 28, y + 8)
  return y + height + 4
}

function checkNewPage(doc, y, pageHeight) {
  if (y > pageHeight - 70) {
    doc.addPage()
    // reduce top margin for next page content
    return 20  // was 35 — reduced to 20 for tighter layout
  }
  return y
}
