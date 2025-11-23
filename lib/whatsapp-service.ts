/**
 * WhatsApp Business API Service
 * Handles all WhatsApp template-based notifications
 * Updated with new template structure: appointment_confirmation, appointment_reschedule, appointment_reminding
 */

interface WhatsAppTemplateParams {
	to: string; // Phone number in international format (e.g., "923391415151")
	templateName: string;
	parameters: string[];
}

interface WhatsAppResponse {
	success: boolean;
	messageId?: string;
	error?: string;
}

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL!;

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * Sends a WhatsApp template message
 * @param params - Template parameters including phone number and template name
 * @returns Response with success status and message ID or error
 */
export async function sendWhatsAppTemplate(
	params: WhatsAppTemplateParams
): Promise<WhatsAppResponse> {
	try {
		console.log(
			"[v0] 🔵 WhatsApp Template Service: sendWhatsAppTemplate called",
			{
				templateName: params.templateName,
				phoneNumber: params.to,
				parametersCount: params.parameters.length,
			}
		);
		console.log(
			"[v0] 🔵 WhatsApp Service: API URL configured:",
			!!WHATSAPP_API_URL
		);
		console.log(
			"[v0] 🔵 WhatsApp Service: Access Token present:",
			!!WHATSAPP_ACCESS_TOKEN
		);

		const payload = {
			messaging_product: "whatsapp",
			to: params.to,
			type: "template",
			template: {
				name: params.templateName,
				language: { code: "en" },
				components: buildTemplateComponents(
					params.templateName,
					params.parameters
				),
			},
		};

		console.log(
			"[v0] 🔵 WhatsApp Service: Payload constructed:",
			JSON.stringify(payload, null, 2)
		);

		const response = await fetch(WHATSAPP_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
			},
			body: JSON.stringify(payload),
		});

		console.log(
			"[v0] 🔵 WhatsApp Service: API Response Status:",
			response.status
		);
		const data = await response.json();
		console.log(
			"[v0] 🔵 WhatsApp Service: Full API Response:",
			JSON.stringify(data, null, 2)
		);

		if (!response.ok) {
			console.error("[v0] ❌ WhatsApp Service: API Error Response:", data);
			return {
				success: false,
				error: data.error?.message || "Failed to send WhatsApp message",
			};
		}

		const messageId = data.messages?.[0]?.id;
		console.log(
			"[v0] ✅ WhatsApp Service: Message sent successfully with ID:",
			messageId
		);

		return { success: true, messageId };
	} catch (error) {
		console.error("[v0] ❌ WhatsApp Service: Critical error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Builds template components based on template name
 * NEW TEMPLATES: appointment_confirmation, appointment_reschedule, appointment_reminding
 */
function buildTemplateComponents(
	templateName: string,
	parameters: string[]
): any[] {
	console.log("[v0] 🟡 Template Builder: Processing template:", templateName);

	switch (templateName) {
		case "appointment_confirmation":
			console.log(
				"[v0] 🟡 Template Builder: Building appointment_confirmation with params:",
				parameters
			);
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
			];

		case "appointment_reminding":
			console.log(
				"[v0] 🟡 Template Builder: Building appointment_reminding with params:",
				parameters
			);
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
			];

		case "appointment_reschedule":
			console.log(
				"[v0] 🟡 Template Builder: Building appointment_reschedule with params:",
				parameters
			);
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
			];

		default:
			console.warn(
				"[v0] ⚠️ Template Builder: Unknown template name:",
				templateName
			);
			return [];
	}
}

/**
 * Sends appointment confirmation notification
 * New signature: patientName, date, time, doctorName (simplified from old template)
 */
export async function sendAppointmentConfirmation(
	phoneNumber: string,
	patientName: string,
	date: string,
	time: string,
	doctorName: string
): Promise<WhatsAppResponse> {
	console.log(
		"[v0] 📋 sendAppointmentConfirmation: Initiating confirmation send",
		{
			phone: phoneNumber,
			patient: patientName,
			doctor: doctorName,
			date,
			time,
		}
	);

	const result = await sendWhatsAppTemplate({
		to: phoneNumber,
		templateName: "appointment_confirmation",
		parameters: [patientName, date, time, doctorName],
	});

	console.log("[v0] 📋 sendAppointmentConfirmation: Result:", result);
	return result;
}

/**
 * Sends appointment reschedule notification
 * Updated to use new template structure
 */
export async function sendAppointmentReschedule(
	phoneNumber: string,
	patientName: string,
	newDate: string,
	newTime: string,
	doctorName: string
): Promise<WhatsAppResponse> {
	console.log("[v0] 📅 sendAppointmentReschedule: Initiating reschedule send", {
		phone: phoneNumber,
		patient: patientName,
		doctor: doctorName,
		newDate,
		newTime,
	});

	const result = await sendWhatsAppTemplate({
		to: phoneNumber,
		templateName: "appointment_reschedule",
		parameters: [patientName, newDate, newTime, doctorName],
	});

	console.log("[v0] 📅 sendAppointmentReschedule: Result:", result);
	return result;
}

/**
 * Sends appointment reminder notification
 * New template: appointment_reminding for server-side cron job integration
 */
export async function sendAppointmentReminder(
	phoneNumber: string,
	patientName: string,
	date: string,
	time: string,
	doctorName: string
): Promise<WhatsAppResponse> {
	console.log(
		"[v0] ⏰ sendAppointmentReminder: Initiating reminder send (cron job ready)",
		{
			phone: phoneNumber,
			patient: patientName,
			doctor: doctorName,
			date,
			time,
		}
	);
	console.log(
		"[v0] ⏰ sendAppointmentReminder: This will be triggered by server-side cron job"
	);

	const result = await sendWhatsAppTemplate({
		to: phoneNumber,
		templateName: "appointment_reminding",
		parameters: [patientName, date, time, doctorName],
	});

	console.log("[v0] ⏰ sendAppointmentReminder: Result:", result);
	return result;
}
