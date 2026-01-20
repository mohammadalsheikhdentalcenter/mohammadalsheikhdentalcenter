//@ts-nocheck
import { Appointment, connectDB } from "@/lib/db-server"
import mongoose from "mongoose"

/**
 * Server-side appointment validation (for API routes)
 * Uses database directly since it runs on server
 */

/**
 * Converts time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

/**
 * Converts minutes to time string (HH:MM)
 */
function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * Adds minutes to a time string and returns the result
 */
function addMinutesToTime(time: string, minutesToAdd: number): string {
  const totalMinutes = timeToMinutes(time) + minutesToAdd
  return minutesToTime(totalMinutes)
}

/**
 * Formats time for display (converts 14:30 to 2:30 PM)
 */
function formatTimeForDisplay(time: string): string {
  const [hours, minutes] = time.split(":").map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

/**
 * Converts date and time to absolute minutes from epoch for cross-day comparison
 */
function dateTimeToAbsoluteMinutes(date: string, time: string): number {
  const [year, month, day] = date.split("-").map(Number)
  const [hours, minutes] = time.split(":").map(Number)
  const dateObj = new Date(year, month - 1, day)
  const daysSinceEpoch = Math.floor(dateObj.getTime() / (1000 * 60 * 60 * 24))
  return daysSinceEpoch * 24 * 60 + hours * 60 + minutes
}

/**
 * Checks if two time ranges overlap
 */
function appointmentsOverlap(
  date1: string,
  start1: string,
  duration1: number,
  date2: string,
  start2: string,
  duration2: number,
): boolean {
  const start1Abs = dateTimeToAbsoluteMinutes(date1, start1)
  const end1Abs = start1Abs + duration1
  const start2Abs = dateTimeToAbsoluteMinutes(date2, start2)
  const end2Abs = start2Abs + duration2
  return start1Abs < end2Abs && start2Abs < end1Abs
}

/**
 * Server-side appointment validation
 */
export async function validateAppointmentSchedulingServer(
  doctorId: string,
  date: string,
  time: string,
  duration: number,
  excludeAppointmentId?: string,
  roomNumber?: string,
): Promise<{ isValid: boolean; error?: string }> {
  try {
    console.log("[Server Validation] Starting validation...")

    if (!doctorId || doctorId.trim() === "") {
      return {
        isValid: false,
        error: "Doctor ID is required",
      }
    }

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return {
        isValid: false,
        error: "Invalid doctor ID format",
      }
    }

    const query: any = {}

    // Exclude the current appointment if updating
    if (excludeAppointmentId) {
      query._id = { $ne: excludeAppointmentId }
    }

    // Fetch ALL appointments (not just doctor's)
    const allAppointments = await Appointment.find(query).lean()

    // Filter active appointments (exclude closed, cancelled, completed)
    const activeAppointments = allAppointments.filter((apt) => {
      return apt.status !== "closed" && apt.status !== "cancelled" && apt.status !== "completed"
    })

    console.log(`[Server Validation] Found ${activeAppointments.length} active appointments`)

    // ONLY CONSTRAINT: Check for room conflicts
    // Same room cannot have two appointments at the same time (regardless of doctor)
    // Note: Same doctor CAN have multiple appointments at the same time if they are in different rooms
    if (roomNumber && String(roomNumber).trim() !== "") {
      const roomConflict = activeAppointments.find((existing) => {
        if (!existing.roomNumber || String(existing.roomNumber).trim() === "") return false
        if (String(existing.roomNumber) !== String(roomNumber)) return false
        const existingDuration = existing.duration || 30
        const newDuration = duration || 30
        return appointmentsOverlap(date, time, newDuration, existing.date, existing.time, existingDuration)
      })

      if (roomConflict) {
        const existingDuration = roomConflict.duration || 30
        const existingEndTime = addMinutesToTime(roomConflict.time, existingDuration)
        const existingStartDisplay = formatTimeForDisplay(roomConflict.time)
        const existingEndDisplay = formatTimeForDisplay(existingEndTime)
        
        const errorMsg = `Room ${roomNumber} is already booked from ${existingStartDisplay} to ${existingEndDisplay} on ${roomConflict.date}. Please choose another room or time.`
        
        console.log("[Server Validation] Room conflict detected:", {
          existingAppointment: {
            roomNumber: roomConflict.roomNumber,
            doctorName: roomConflict.doctorName,
            start: roomConflict.time,
            end: existingEndTime,
            date: roomConflict.date,
          }
        })
        
        return {
          isValid: false,
          error: errorMsg,
        }
      }
    }

    return { isValid: true }
  } catch (error) {
    console.error("[Server Validation] Error:", error)
    return {
      isValid: false,
      error: `Error validating appointment: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
