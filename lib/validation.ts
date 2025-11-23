export interface PatientCredentials {
  idNumber?: string
  phone?: string
  email?: string
  insuranceProvider?: string
  insuranceNumber?: string
  dob?: string
  address?: string
}

export interface CredentialValidationResult {
  isComplete: boolean
  missingCredentials: string[]
  warnings: string[]
}

export const CRITICAL_CREDENTIALS = ["phone", "dob", "idNumber"]
export const IMPORTANT_CREDENTIALS = ["insuranceProvider", "insuranceNumber", "address"]

export function validatePatientCredentials(credentials: PatientCredentials): CredentialValidationResult {
  const missingCredentials: string[] = []
  const warnings: string[] = []

  // Check critical credentials
  if (!credentials.idNumber?.trim()) {
    missingCredentials.push("ID Number")
  }
  if (!credentials.phone?.trim()) {
    missingCredentials.push("Phone Number")
  }
  if (!credentials.dob?.trim()) {
    missingCredentials.push("Date of Birth")
  }

  // Check important credentials
  if (!credentials.insuranceProvider?.trim()) {
    warnings.push("Insurance Provider not set")
  }
  if (!credentials.insuranceNumber?.trim()) {
    warnings.push("Insurance Number not set")
  }
  if (!credentials.address?.trim()) {
    warnings.push("Address not set")
  }

  return {
    isComplete: missingCredentials.length === 0,
    missingCredentials,
    warnings,
  }
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function validatePassword(password: string): boolean {
  // Enhanced password validation: at least 8 chars, 1 uppercase, 1 number, 1 special char
  const re = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  return re.test(password)
}

export function generateStrongPassword(): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const lowercase = "abcdefghijklmnopqrstuvwxyz"
  const numbers = "0123456789"
  const special = "@$!%*?&"

  const allChars = uppercase + lowercase + numbers + special
  let password = ""

  // Ensure at least one of each required character type
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  // Fill the rest randomly (12 chars total for strong password)
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("")
}

export function validatePhone(phone: string): boolean {
  const re = /^[\d\s\-+$$$$]{10,}$/
  return re.test(phone)
}

export function formatPhoneForDisplay(phone: string): string {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, "")

  // If it starts with +, keep it; otherwise add +
  if (cleaned.startsWith("+")) {
    return cleaned
  }
  return "+" + cleaned
}

export function formatPhoneForDatabase(phone: string): string {
  // Remove all non-digit characters (remove the + sign)
  return phone.replace(/[^\d]/g, "")
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
