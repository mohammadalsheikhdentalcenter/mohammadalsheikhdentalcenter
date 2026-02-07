export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ")
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function validatePassword(password: string): boolean {
  return password.length >= 6
}

export function validatePhone(phone: string): boolean {
  return phone.length >= 10
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":")
  const hour = Number.parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export function formatTimeFor12Hour(time: string): string {
  if (!time || time.trim() === "") return ""
  try {
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours)
    if (isNaN(hour)) return time
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  } catch {
    return time
  }
}

export function getAllPhoneNumbers(patientData: any): string[] {
  const phoneNumbers: string[] = []
  
  // Handle the phones array structure (phones: [{ number, isPrimary }])
  if (patientData.phones && Array.isArray(patientData.phones)) {
    patientData.phones.forEach((phoneObj: any) => {
      if (phoneObj.number && typeof phoneObj.number === "string" && phoneObj.number.trim()) {
        phoneNumbers.push(phoneObj.number.trim())
      }
    })
  }
  
  // Fallback to legacy phone number formats if no phones array
  if (phoneNumbers.length === 0) {
    if (patientData.phone && patientData.phone.trim()) {
      phoneNumbers.push(patientData.phone.trim())
    }
    if (patientData.alternatePhone && patientData.alternatePhone.trim()) {
      phoneNumbers.push(patientData.alternatePhone.trim())
    }
    if (patientData.phoneNumber && patientData.phoneNumber.trim()) {
      phoneNumbers.push(patientData.phoneNumber.trim())
    }
    if (patientData.mobileNumber && patientData.mobileNumber.trim()) {
      phoneNumbers.push(patientData.mobileNumber.trim())
    }
  }
  
  // Remove duplicates and empty values
  return [...new Set(phoneNumbers.filter(Boolean))]
}

export function calculateAgeFromDOB(dob: string | Date): number {
  const dobDate = typeof dob === "string" ? new Date(dob) : dob
  const today = new Date()
  let age = today.getFullYear() - dobDate.getFullYear()
  const monthDiff = today.getMonth() - dobDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
    age--
  }
  
  return age
}
