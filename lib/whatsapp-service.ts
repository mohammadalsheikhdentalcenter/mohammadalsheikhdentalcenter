/**
 * WhatsApp Business API Service
 * Handles all WhatsApp template-based notifications
 * Updated with new template structure: appointment_confirmation, appointment_reschedule, appointment_reminding
 */

interface WhatsAppTemplateParams {
  to: string // Phone number in international format (e.g., "923391415151")
  templateName: string
  parameters: string[]
  languageCode?: string // Added language code support for Arabic templates
}

interface WhatsAppResponse {
  success: boolean
  messageId?: string
  error?: string
}

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL!

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN

/**
 * Sends a WhatsApp template message
 * @param params - Template parameters including phone number and template name
 * @returns Response with success status and message ID or error
 */
export async function sendWhatsAppTemplate(params: WhatsAppTemplateParams): Promise<WhatsAppResponse> {
  try {
    console.log("[v0] 🔵 WhatsApp Template Service: sendWhatsAppTemplate called", {
      templateName: params.templateName,
      phoneNumber: params.to,
      parametersCount: params.parameters.length,
      languageCode: params.languageCode || "en", // Log language code
    })
    console.log("[v0] 🔵 WhatsApp Service: API URL configured:", !!WHATSAPP_API_URL)
    console.log("[v0] 🔵 WhatsApp Service: Access Token present:", !!WHATSAPP_ACCESS_TOKEN)

    const payload = {
      messaging_product: "whatsapp",
      to: params.to,
      type: "template",
      template: {
        name: params.templateName,
        language: { code: params.languageCode || "en" }, // Use dynamic language code
        components: buildTemplateComponents(params.templateName, params.parameters),
      },
    }

    console.log("[v0] 🔵 WhatsApp Service: Payload constructed:", JSON.stringify(payload, null, 2))

    const response = await fetch(WHATSAPP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(payload),
    })

    console.log("[v0] 🔵 WhatsApp Service: API Response Status:", response.status)
    const data = await response.json()
    console.log("[v0] 🔵 WhatsApp Service: Full API Response:", JSON.stringify(data, null, 2))

    if (!response.ok) {
      console.error("[v0] ❌ WhatsApp Service: API Error Response:", data)
      return {
        success: false,
        error: data.error?.message || "Failed to send WhatsApp message",
      }
    }

    const messageId = data.messages?.[0]?.id
    console.log("[v0] ✅ WhatsApp Service: Message sent successfully with ID:", messageId)

    return { success: true, messageId }
  } catch (error) {
    console.error("[v0] ❌ WhatsApp Service: Critical error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Builds template components based on template name
 * NEW TEMPLATES: appointment_confirmation, appointment_reschedule, appointment_reminding, appointment_cancellation, account_confirmation
 */
function buildTemplateComponents(templateName: string, parameters: string[]): any[] {
  console.log("[v0] 🟡 Template Builder: Processing template:", templateName)

  switch (templateName) {
    case "appointment_confirmation":
      console.log("[v0] 🟡 Template Builder: Building appointment_confirmation with params:", parameters)
      return [
        {
          type: "body",
          parameters: [
            { type: "text", text: parameters[0] || "" }, // Patient name
            { type: "text", text: parameters[1] || "" }, // Date
            { type: "text", text: parameters[2] || "" }, // Time
            { type: "text", text: parameters[3] || "" }, // Doctor name
          ],
        },
      ]

    case "appointment_confirmation_arabic":
      console.log("[v0] 🟡 Template Builder: Building appointment_confirmation_arabic with params:", parameters)
      return [
        {
          type: "body",
          parameters: [
            { type: "text", text: parameters[0] || "" }, // Date (Arabic format)
            { type: "text", text: parameters[1] || "" }, // Time (Arabic format)
            { type: "text", text: parameters[2] || "" }, // Doctor name (Arabic)
          ],
        },
      ]

    case "appointment_reschedule":
      console.log("[v0] 🟡 Template Builder: Building appointment_reschedule with params:", parameters)
      return [
        {
          type: "body",
          parameters: [
            { type: "text", text: parameters[0] || "" }, // Patient name
            { type: "text", text: parameters[1] || "" }, // New date
            { type: "text", text: parameters[2] || "" }, // New time
            { type: "text", text: parameters[3] || "" }, // Doctor name
          ],
        },
      ]

    case "appointment_reminding":
      console.log("[v0] 🟡 Template Builder: Building appointment_reminding with params:", parameters)
      return [
        {
          type: "body",
          parameters: [
            { type: "text", text: parameters[0] || "" }, // Patient name
            { type: "text", text: parameters[1] || "" }, // Date
            { type: "text", text: parameters[2] || "" }, // Time
            { type: "text", text: parameters[3] || "" }, // Doctor name
          ],
        },
      ]

    case "appointment_cancellation":
      console.log("[v0] 🟡 Template Builder: Building appointment_cancellation with params:", parameters)
      return [
        {
          type: "body",
          parameters: [
            { type: "text", text: parameters[0] || "" }, // Patient name
            { type: "text", text: parameters[1] || "" }, // Appointment date
            { type: "text", text: parameters[2] || "" }, // Appointment time
            { type: "text", text: parameters[3] || "" }, // Doctor name
          ],
        },
      ]

    case "account_confirmation":
      console.log("[v0] 🟡 Template Builder: Building account_confirmation with params:", parameters)
      return [
        {
          type: "body",
          parameters: [
            { type: "text", text: parameters[0] || "" }, // Patient name
            { type: "text", text: parameters[1] || "" }, // Account details
          ],
        },
      ]

    default:
      console.warn("[v0] ⚠️ Template Builder: Unknown template name:", templateName)
      return []
  }
}

/**
 * Sends appointment confirmation notification to primary or all phone numbers
 * sendToAll: if true, sends to all numbers; if false, sends to primary only
 */
export async function sendAppointmentConfirmation(
  phoneNumber: string | string[],
  patientName: string,
  date: string,
  time: string,
  doctorName: string,
): Promise<WhatsAppResponse> {
  const phoneNumbers = Array.isArray(phoneNumber) ? phoneNumber : [phoneNumber]

  console.log("[v0] 📋 sendAppointmentConfirmation: Initiating confirmation send", {
    phones: phoneNumbers,
    patient: patientName,
    doctor: doctorName,
    date,
    time,
  })

  const results = await Promise.all(
    phoneNumbers.map((phone) =>
      sendWhatsAppTemplate({
        to: phone,
        templateName: "appointment_confirmation",
        parameters: [patientName, date, time, doctorName],
      }),
    ),
  )

  // Return success if at least one message sent successfully
  const allSuccessful = results.every((r) => r.success)
  const successCount = results.filter((r) => r.success).length

  console.log("[v0] 📋 sendAppointmentConfirmation: Result - Sent to", successCount, "of", phoneNumbers.length)

  return {
    success: allSuccessful,
    messageId: results.filter((r) => r.messageId)[0]?.messageId,
    error: allSuccessful ? undefined : `Sent to ${successCount} of ${phoneNumbers.length} numbers`,
  }
}

/**
 * Sends appointment confirmation notification in Arabic
 * Falls back to English template if Arabic template doesn't exist
 * @param phoneNumber - Phone number(s) to send to
 * @param date - Appointment date in Arabic format
 * @param time - Appointment time in Arabic format
 * @param doctorName - Doctor name in Arabic
 * @param patientName - Patient name (optional, for fallback)
 */
export async function sendAppointmentConfirmationArabic(
  phoneNumber: string | string[],
  date: string,
  time: string,
  doctorName: string,
  patientName?: string,
): Promise<WhatsAppResponse> {
  const phoneNumbers = Array.isArray(phoneNumber) ? phoneNumber : [phoneNumber]

  console.log("[v0] 📋 sendAppointmentConfirmationArabic: Initiating Arabic confirmation send", {
    phones: phoneNumbers,
    doctor: doctorName,
    date,
    time,
  })

  const arabicResults = await Promise.all(
    phoneNumbers.map((phone) =>
      sendWhatsAppTemplate({
        to: phone,
        templateName: "appointment_confirmation_arabic",
        parameters: [date, time, doctorName],
        languageCode: "ar",
      }),
    ),
  )

  const arabicSuccess = arabicResults.filter((r) => r.success).length

  // if (arabicSuccess === 0 && patientName) {
  //   console.warn("[v0] ⚠️ Arabic template failed for all numbers, attempting English fallback...")
  //   const englishResults = await Promise.all(
  //     phoneNumbers.map((phone) =>
  //       sendWhatsAppTemplate({
  //         to: phone,
  //         templateName: "appointment_confirmation",
  //         parameters: [patientName, date, time, doctorName],
  //         languageCode: "en",
  //       }),
  //     ),
  //   )

  //   const englishSuccess = englishResults.filter((r) => r.success).length
  //   console.log(
  //     "[v0] 📋 sendAppointmentConfirmationArabic Fallback: Sent to",
  //     englishSuccess,
  //     "of",
  //     phoneNumbers.length,
  //     "using English template",
  //   )

  //   return {
  //     success: englishSuccess > 0,
  //     messageId: englishResults.filter((r) => r.messageId)[0]?.messageId,
  //     error:
  //       englishSuccess > 0
  //         ? undefined
  //         : `Failed with Arabic template and English fallback. Sent to ${englishSuccess} of ${phoneNumbers.length} numbers`,
  //   }
  // }

  const allSuccessful = arabicResults.every((r) => r.success)
  const successCount = arabicResults.filter((r) => r.success).length

  console.log("[v0] 📋 sendAppointmentConfirmationArabic: Result - Sent to", successCount, "of", phoneNumbers.length)

  return {
    success: allSuccessful,
    messageId: arabicResults.filter((r) => r.messageId)[0]?.messageId,
    error: allSuccessful ? undefined : `Sent to ${successCount} of ${phoneNumbers.length} numbers`,
  }
}

/**
 * Sends appointment reschedule notification to all phone numbers
 */
export async function sendAppointmentReschedule(
  phoneNumber: string | string[],
  patientName: string,
  newDate: string,
  newTime: string,
  doctorName: string,
): Promise<WhatsAppResponse> {
  const phoneNumbers = Array.isArray(phoneNumber) ? phoneNumber : [phoneNumber]

  console.log("[v0] 📅 sendAppointmentReschedule: Initiating reschedule send", {
    phones: phoneNumbers,
    patient: patientName,
    doctor: doctorName,
    newDate,
    newTime,
  })

  const results = await Promise.all(
    phoneNumbers.map((phone) =>
      sendWhatsAppTemplate({
        to: phone,
        templateName: "appointment_reschedule",
        parameters: [patientName, newDate, newTime, doctorName],
      }),
    ),
  )

  const allSuccessful = results.every((r) => r.success)
  const successCount = results.filter((r) => r.success).length

  console.log("[v0] 📅 sendAppointmentReschedule: Result - Sent to", successCount, "of", phoneNumbers.length)

  return {
    success: allSuccessful,
    messageId: results.filter((r) => r.messageId)[0]?.messageId,
    error: allSuccessful ? undefined : `Sent to ${successCount} of ${phoneNumbers.length} numbers`,
  }
}

/**
 * Sends appointment reminder to all phone numbers
 */
export async function sendAppointmentReminder(
  phoneNumber: string | string[],
  patientName: string,
  date: string,
  time: string,
  doctorName: string,
): Promise<WhatsAppResponse> {
  const phoneNumbers = Array.isArray(phoneNumber) ? phoneNumber : [phoneNumber]

  console.log("[v0] ⏰ sendAppointmentReminder: Initiating reminder send", {
    phones: phoneNumbers,
    patient: patientName,
    doctor: doctorName,
    date,
    time,
  })

  const results = await Promise.all(
    phoneNumbers.map((phone) =>
      sendWhatsAppTemplate({
        to: phone,
        templateName: "appointment_reminding",
        parameters: [patientName, date, time, doctorName],
      }),
    ),
  )

  const allSuccessful = results.every((r) => r.success)
  const successCount = results.filter((r) => r.success).length

  console.log("[v0] ⏰ sendAppointmentReminder: Result - Sent to", successCount, "of", phoneNumbers.length)

  return {
    success: allSuccessful,
    messageId: results.filter((r) => r.messageId)[0]?.messageId,
    error: allSuccessful ? undefined : `Sent to ${successCount} of ${phoneNumbers.length} numbers`,
  }
}

/**
 * Sends appointment cancellation notification to all phone numbers
 */
export async function sendAppointmentCancellation(
  phoneNumber: string | string[],
  patientName: string,
  appointmentDate: string,
  appointmentTime: string,
  doctorName: string,
): Promise<WhatsAppResponse> {
  const phoneNumbers = Array.isArray(phoneNumber) ? phoneNumber : [phoneNumber]

  console.log("[v0] ❌ sendAppointmentCancellation: Initiating cancellation notification", {
    phones: phoneNumbers,
    patient: patientName,
    doctor: doctorName,
    date: appointmentDate,
    time: appointmentTime,
  })

  const results = await Promise.all(
    phoneNumbers.map((phone) =>
      sendWhatsAppTemplate({
        to: phone,
        templateName: "appointment_cancellation",
        parameters: [patientName, appointmentDate, appointmentTime, doctorName],
      }),
    ),
  )

  const allSuccessful = results.every((r) => r.success)
  const successCount = results.filter((r) => r.success).length

  console.log("[v0] ❌ sendAppointmentCancellation: Result - Sent to", successCount, "of", phoneNumbers.length)

  return {
    success: allSuccessful,
    messageId: results.filter((r) => r.messageId)[0]?.messageId,
    error: allSuccessful ? undefined : `Sent to ${successCount} of ${phoneNumbers.length} numbers`,
  }
}

/**
 * Sends account confirmation notification
 */
export async function sendAccountConfirmation(
  phoneNumber: string | string[],
  patientName: string,
  accountDetails: string,
): Promise<WhatsAppResponse> {
  const phoneNumbers = Array.isArray(phoneNumber) ? phoneNumber : [phoneNumber]

  console.log("[v0] ✓ sendAccountConfirmation: Initiating account confirmation", {
    phones: phoneNumbers,
    patient: patientName,
  })

  const results = await Promise.all(
    phoneNumbers.map((phone) =>
      sendWhatsAppTemplate({
        to: phone,
        templateName: "account_confirmation",
        parameters: [patientName, accountDetails],
      }),
    ),
  )

  const allSuccessful = results.every((r) => r.success)
  const successCount = results.filter((r) => r.success).length

  console.log("[v0] ✓ sendAccountConfirmation: Result - Sent to", successCount, "of", phoneNumbers.length)

  return {
    success: allSuccessful,
    messageId: results.filter((r) => r.messageId)[0]?.messageId,
    error: allSuccessful ? undefined : `Sent to ${successCount} of ${phoneNumbers.length} numbers`,
  }
}

/**
 * Helper function to get primary phone number from patient
 * Handles both old format (single phone) and new format (phones array)
 */
export function getPrimaryPhoneNumber(patient: any): string | null {
  if (!patient) return null

  if (patient.phones && Array.isArray(patient.phones) && patient.phones.length > 0) {
    // Find primary phone or return first phone
    const primaryPhone = patient.phones.find((p: any) => p.isPrimary)
    return primaryPhone?.number || patient.phones[0]?.number || null
  }

  // Fallback to old single phone format for backward compatibility
  if (patient.phone) {
    return patient.phone
  }

  return null
}

/**
 * Helper function to get all phone numbers from patient
 * Returns an array of phone numbers, with primary first
 * Handles both old format (single phone) and new format (phones array)
 */
export function getAllPhoneNumbers(patient: any): string[] {
  if (!patient) return []

  const phones: string[] = []

  if (patient.phones && Array.isArray(patient.phones) && patient.phones.length > 0) {
    const primaryPhone = patient.phones.find((p: any) => p.isPrimary)
    if (primaryPhone?.number) {
      phones.push(primaryPhone.number)
    }

    // Add remaining secondary phone numbers
    patient.phones.forEach((p: any) => {
      if (p.number && !p.isPrimary && !phones.includes(p.number)) {
        phones.push(p.number)
      }
    })

    return phones
  }

  // Fallback to old single phone format for backward compatibility
  if (patient.phone) {
    return [patient.phone]
  }

  return []
}
