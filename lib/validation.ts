export interface PatientCredentials {
  idNumber?: string
  phones?: Array<{ number?: string; isPrimary?: boolean }> // Updated to accept phones array
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
  
  // For phones, check if array exists and has at least one valid phone
  const validPhones = credentials.phones?.filter((p) => {
    const phoneNumber = p?.number?.trim()
    return phoneNumber && phoneNumber !== "" && validatePhone(phoneNumber)
  }) || []
  
  if (validPhones.length === 0) {
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
  if (!email || email.trim() === "") return false
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function validatePassword(password: string): boolean {
  if (!password || password.trim() === "") return false
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

export function validatePhone(phone?: string): boolean {
  if (!phone || phone.trim() === "") {
    return false
  }
  // Phone must start with + and have digits after
  const phoneStr = String(phone).trim()
  
  if (!phoneStr.startsWith("+")) {
    return false
  }
  
  const digitsOnly = phoneStr.slice(1)
  if (!/^\d+$/.test(digitsOnly)) {
    return false
  }
  
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return false
  }
  
  return true
}

export function formatPhoneForDisplay(phone?: string): string {
  // Handle undefined, null, or empty string
  if (!phone || phone.trim() === "") {
    return "Not provided"
  }
  
  const phoneStr = String(phone).trim()
  
  // Remove all non-digit characters except +
  const cleaned = phoneStr.replace(/[^\d+]/g, "")
  
  // If it's empty after cleaning
  if (cleaned === "") {
    return "Not provided"
  }
  
  // If it starts with +, keep it; otherwise add +
  if (cleaned.startsWith("+")) {
    return cleaned
  }
  return "+" + cleaned
}

export function formatPhoneForDatabase(phone?: string): string {
  // Handle undefined, null, or empty string
  if (!phone || phone.trim() === "") {
    return ""
  }
  
  const phoneStr = String(phone).trim()
  
  // Remove all non-digit characters except +
  const withPlus = phoneStr.replace(/[^\d+]/g, "")
  
  // If it's empty after cleaning
  if (withPlus === "") {
    return ""
  }
  
  // Ensure it starts with +
  if (withPlus.startsWith("+")) {
    return withPlus
  }
  return "+" + withPlus
}

export function formatDate(date?: Date | string | null): string {
  if (!date) return "Not set"
  
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return "Invalid date"
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  } catch {
    return "Invalid date"
  }
}

export function formatTime(time?: string): string {
  if (!time || time.trim() === "") return "Not set"
  
  try {
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours)
    if (isNaN(hour)) return "Invalid time"
    
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes || "00"} ${ampm}`
  } catch {
    return "Invalid time"
  }
}

// Helper function for phone validation with detailed error messages
export function validatePhoneWithDetails(phone?: string): { valid: boolean; error?: string } {
  if (!phone || phone.trim() === "") {
    return { valid: false, error: "Phone number is required" }
  }

  const phoneStr = String(phone).trim()

  if (phoneStr === "") {
    return { valid: false, error: "Phone number is required" }
  }

  // Check if it starts with +
  if (!phoneStr.startsWith("+")) {
    return {
      valid: false,
      error: "Phone must start with + (country code, e.g., +1234567890)",
    }
  }

  // Get digits after +
  const digitsOnly = phoneStr.slice(1)

  // Check if contains only digits
  if (!/^\d+$/.test(digitsOnly)) {
    return { valid: false, error: "Phone must contain only digits after +" }
  }

  // Check length
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return { valid: false, error: "Phone must be 10-15 digits after +" }
  }

  return { valid: true }
}

// Helper function to validate multiple phone numbers in an array
export function validatePhonesArray(phones: Array<{ number?: string; isPrimary?: boolean }>): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!phones || phones.length === 0) {
    return { valid: false, errors: ["At least one phone number is required"] }
  }
  
  let hasPrimary = false
  let hasValidPhone = false
  
  for (let i = 0; i < phones.length; i++) {
    const phone = phones[i]
    const validation = validatePhoneWithDetails(phone?.number)
    
    if (!validation.valid) {
      errors.push(`Phone ${i + 1}: ${validation.error}`)
    } else {
      hasValidPhone = true
    }
    
    if (phone?.isPrimary) {
      hasPrimary = true
    }
  }
  
  if (!hasValidPhone) {
    errors.push("No valid phone numbers provided")
  }
  
  if (!hasPrimary) {
    errors.push("At least one phone must be marked as primary")
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}