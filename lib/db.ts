// Client-safe version - only exports types or empty functions

// Mock functions for client-side
export const connectDB = async () => {
  if (typeof window !== 'undefined') {
    throw new Error('Database operations can only be performed on the server')
  }
  // Dynamically import server version when on server
  const serverDb = await import('./db-server')
  return serverDb.connectDB()
}

export const initializeDB = async () => {
  if (typeof window !== 'undefined') {
    throw new Error('Database operations can only be performed on the server')
  }
  const serverDb = await import('./db-server')
  return serverDb.initializeDB()
}

// Mock models for client-side type safety
const createMockModel = (name: string) => {
  return {
    find: () => {
      if (typeof window !== 'undefined') {
        throw new Error(`Database operation ${name}.find can only be performed on the server`)
      }
      // This will never be called on client, but we need to return something
      return Promise.resolve([])
    },
    findOne: () => {
      if (typeof window !== 'undefined') {
        throw new Error(`Database operation ${name}.findOne can only be performed on the server`)
      }
      return Promise.resolve(null)
    },
    create: () => {
      if (typeof window !== 'undefined') {
        throw new Error(`Database operation ${name}.create can only be performed on the server`)
      }
      return Promise.resolve(null)
    },
    // Add other methods as needed
  }
}

// Export mock models
export const User = createMockModel('User')
export const Patient = createMockModel('Patient')
export const Appointment = createMockModel('Appointment')
export const ToothChart = createMockModel('ToothChart')
export const Billing = createMockModel('Billing')
export const Inventory = createMockModel('Inventory')
export const MedicalHistory = createMockModel('MedicalHistory')
export const PatientImage = createMockModel('PatientImage')
export const AppointmentReport = createMockModel('AppointmentReport')
export const PatientReferral = createMockModel('PatientReferral')
export const PatientReferralRequest = createMockModel('PatientReferralRequest')
