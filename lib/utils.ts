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

export function getAllPhoneNumbers(patientData: any): string[] {
  const phoneNumbers: string[] = []
  
  // Collect all available phone numbers from patient data
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
  
  // Remove duplicates
  return [...new Set(phoneNumbers)]
}
