//@ts-nocheck
import { Appointment, AppointmentReport } from "@/lib/db-server"

/**
 * Check if doctor can create a medical report for an appointment
 *
 * RULE: Doctor 1 can create a report after referral back
 * ONLY if Doctor 1 did NOT create a report before referring
 */
export async function canCreateReport(
  appointmentId: string,
  doctorId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const appointment = await Appointment.findById(appointmentId)
  if (!appointment) {
    return { allowed: false, reason: "Appointment not found" }
  }

  // Check if doctor owns or is referred this appointment
  const isOriginalDoctor = String(appointment.originalDoctorId || appointment.doctorId) === String(doctorId)
  const isReferredDoctor = appointment.isReferred && String(appointment.doctorId) === String(doctorId)

  if (!isOriginalDoctor && !isReferredDoctor) {
    return { allowed: false, reason: "You are not authorized to create a report for this appointment" }
  }

  // Check if this doctor already created a report
  const existingReport = await AppointmentReport.findOne({
    appointmentId: appointmentId,
    doctorId: doctorId,
  })

  if (existingReport) {
    return { allowed: false, reason: "You have already created a report for this appointment" }
  }

  // CRITICAL RULE: If original doctor and appointment was referred back, can they create now?
  if (isOriginalDoctor && appointment.status === "refer_back") {
    // Check if original doctor created a report BEFORE the referral
    const reportBeforeReferral = await AppointmentReport.findOne({
      appointmentId: appointmentId,
      doctorId: doctorId,
      doctorRole: "original",
      createdAt: { $lt: appointment.lastReferBackDate || new Date() },
    })

    if (reportBeforeReferral) {
      return {
        allowed: false,
        reason: "You already created a report before referring this case. You cannot create another report.",
      }
    }

    // Original doctor did NOT create a report before, so they CAN create now
    return { allowed: true }
  }

  return { allowed: true }
}

/**
 * Check if doctor can perform actions on an appointment based on referral status
 */
export async function getAppointmentPermissions(appointmentId: string, doctorId: string) {
  const appointment = await Appointment.findById(appointmentId)
  if (!appointment) {
    return null
  }

  const isOriginalDoctor = String(appointment.originalDoctorId || appointment.doctorId) === String(doctorId)
  const isCurrentDoctor = String(appointment.doctorId) === String(doctorId)
  const isReferred = appointment.isReferred
  const isReferBack = appointment.status === "refer_back"

  return {
    canCreateReport: isCurrentDoctor && !isReferred ? true : isReferred && isCurrentDoctor ? true : false,
    canViewAppointment: isOriginalDoctor || isCurrentDoctor,
    canReferAppointment: isReferBack && isOriginalDoctor ? true : isCurrentDoctor && !isReferred,
    canReferBack: isCurrentDoctor && isReferred,
    canCloseAppointment: isOriginalDoctor || isCurrentDoctor,
    canCancelAppointment: isCurrentDoctor && !isReferred,
    canEditAppointment: isCurrentDoctor && !isReferred,
    status: isReferred ? (isOriginalDoctor ? "Referred" : "Assigned (Referred)") : "Active",
  }
}

/**
 * Get appointment visibility for doctor dashboard
 */
export async function shouldShowAppointmentForDoctor(appointment: any, doctorId: string) {
  const isOriginalDoctor = String(appointment.originalDoctorId) === String(doctorId)
  const isCurrentDoctor = String(appointment.doctorId) === String(doctorId)

  return isOriginalDoctor || isCurrentDoctor
}
