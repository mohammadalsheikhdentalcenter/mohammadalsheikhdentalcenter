import { type NextRequest, NextResponse } from "next/server"
import { Appointment, connectDB } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"
import mongoose from "mongoose"

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

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const token = request.headers.get("authorization")?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { doctorId, date, time, duration = 30, excludeAppointmentId } = await request.json()

    console.log("[API Validation] Appointment validation request:", { doctorId, date, time, duration, excludeAppointmentId })

    if (!doctorId || doctorId.trim() === "") {
      return NextResponse.json({
        isValid: false,
        error: "Doctor ID is required",
      })
    }

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return NextResponse.json({
        isValid: false,
        error: "Invalid doctor ID format",
      })
    }

    const query: any = {
      doctorId: doctorId.toString(),
    }

    // Exclude the current appointment if updating
    if (excludeAppointmentId) {
      query._id = { $ne: excludeAppointmentId }
    }

    // Fetch all appointments for the doctor
    const allAppointments = await Appointment.find(query).lean()

    // Filter active appointments (exclude closed, cancelled, completed)
    const activeAppointments = allAppointments.filter((apt) => {
      return apt.status !== "closed" && apt.status !== "cancelled" && apt.status !== "completed"
    })

    console.log(`[API Validation] Found ${activeAppointments.length} active appointments`)

    // Check for conflicts with active appointments
    for (const existing of activeAppointments) {
      const existingDuration = existing.duration || 30
      const newDuration = duration || 30

      if (appointmentsOverlap(date, time, newDuration, existing.date, existing.time, existingDuration)) {
        // Calculate the end time of the existing appointment
        const existingEndTime = addMinutesToTime(existing.time, existingDuration)
        
        // Format times for display (convert to 12-hour format)
        const existingStartDisplay = formatTimeForDisplay(existing.time)
        const existingEndDisplay = formatTimeForDisplay(existingEndTime)
        
        const errorMsg = `Doctor has an appointment from ${existingStartDisplay} to ${existingEndDisplay} on ${existing.date}. Please choose another time.`
        
        console.log("[API Validation] Conflict detected:", {
          existingAppointment: {
            start: existing.time,
            end: existingEndTime,
            startDisplay: existingStartDisplay,
            endDisplay: existingEndDisplay,
            date: existing.date,
            duration: existingDuration
          },
          newAppointment: {
            start: time,
            duration: newDuration,
            date: date
          }
        })
        
        return NextResponse.json({
          isValid: false,
          error: errorMsg,
        })
      }
    }

    return NextResponse.json({ 
      isValid: true 
    })
  } catch (error) {
    console.error("[API Validation] Appointment validation error:", error)
    return NextResponse.json({
      isValid: false,
      error: `Error validating appointment: ${error instanceof Error ? error.message : "Unknown error"}`,
    }, { status: 500 })
  }
}