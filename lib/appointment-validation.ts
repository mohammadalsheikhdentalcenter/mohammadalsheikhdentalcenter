/**
 * Client-side appointment validation
 * Calls the API route instead of accessing database directly
 */
export async function validateAppointmentScheduling(
  doctorId: string,
  date: string,
  time: string,
  duration: number = 30,
  token?: string,
  excludeAppointmentId?: string,
): Promise<{ isValid: boolean; error?: string }> {
  try {
    console.log("[Client] Starting appointment validation...")

    if (!token) {
      return {
        isValid: false,
        error: "Authentication token is required"
      }
    }

    const response = await fetch("/api/appointments/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        doctorId,
        date,
        time,
        duration,
        excludeAppointmentId
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        isValid: false,
        error: errorData.error || "Failed to validate appointment"
      }
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error validating appointment:', error)
    return {
      isValid: false,
      error: 'Error checking appointment availability'
    }
  }
}