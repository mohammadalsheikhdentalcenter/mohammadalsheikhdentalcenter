//@ts-nocheck
import nodemailer from "nodemailer";

let transporter: any = null;

function getTransporter() {
	if (transporter) return transporter;

	const emailService = process.env.EMAIL_SERVICE || "gmail";
	const emailUser = process.env.EMAIL_USER;
	const emailPassword = process.env.EMAIL_PASS;

	if (!emailUser || !emailPassword) {
		console.error("  Email credentials not configured. Email sending will fail.");
		console.error("  Please set EMAIL_USER and EMAIL_PASS environment variables");
	}

	console.log("  Initializing NodeMailer transporter with Gmail service");

	transporter = nodemailer.createTransport({
		service: emailService,
		auth: {
			user: emailUser,
			pass: emailPassword,
		},
	});

	transporter.verify((error: any, success: any) => {
		if (error) {
			console.error("  NodeMailer transporter verification failed:", error.message);
		} else {
			console.log("  NodeMailer transporter verified successfully");
		}
	});

	return transporter;
}

interface EmailTemplate {
	subject: string;
	html: string;
}

// 🩵 Common Email Layout (used for all templates)
function wrapEmailTemplate(title: string, content: string): string {
	return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">${title}</h1>
      </div>

      <div style="background: #f9f9f9; padding: 30px;
                  border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
        ${content}
      </div>
    </div>
  `;
}

// 🦷 Appointment Confirmation Email
function generateAppointmentConfirmationEmail(
	patientName: string,
	doctorName: string,
	appointmentDate: string,
	appointmentTime: string,
	appointmentType: string
): EmailTemplate {
	const content = `
    <p style="color: #333; font-size: 16px;">Dear <strong>${patientName}</strong>,</p>
    <p style="color: #555; font-size: 14px; line-height: 1.6;">
      Your appointment has been successfully scheduled. Here are the details:
    </p>

    <div style="background: white; border-left: 4px solid #667eea;
                padding: 20px; margin: 20px 0; border-radius: 4px;">
      <p><strong>Doctor:</strong> ${doctorName}</p>
      <p><strong>Date:</strong> ${appointmentDate}</p>
      <p><strong>Time:</strong> ${appointmentTime}</p>
      <p><strong>Type:</strong> ${appointmentType}</p>
    </div>

    <div style="background: #e8f4f8; border: 1px solid #b3e5fc;
                padding: 15px; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 0; color: #01579b; font-size: 13px;">
        Please arrive 10 minutes early. If you need to reschedule, please contact us as soon as possible.
      </p>
    </div>

    <p style="color: #555;">Best regards,<br/>DentalCare Pro Team</p>
  `;
	return {
		subject: `Appointment Confirmation - ${appointmentDate}`,
		html: wrapEmailTemplate("Appointment Confirmation", content),
	};
}

// ⏰ Appointment Reminder Email
function generateAppointmentReminderEmail(
	patientName: string,
	doctorName: string,
	appointmentDate: string,
	appointmentTime: string
): EmailTemplate {
	const content = `
    <p style="color: #333;">Dear <strong>${patientName}</strong>,</p>
    <p style="color: #555;">This is a friendly reminder for your upcoming appointment:</p>

    <div style="background: white; border-left: 4px solid #667eea;
                padding: 20px; margin: 20px 0; border-radius: 4px;">
      <p><strong>Doctor:</strong> ${doctorName}</p>
      <p><strong>Date:</strong> ${appointmentDate}</p>
      <p><strong>Time:</strong> ${appointmentTime}</p>
    </div>

    <p style="color: #555;">Please arrive 10 minutes early.</p>
    <p style="color: #555;">Best regards,<br/>DentalCare Pro Team</p>
  `;
	return {
		subject: `Reminder: Your appointment is on ${appointmentDate}`,
		html: wrapEmailTemplate("Appointment Reminder", content),
	};
}

// 🔄 Appointment Reschedule Email
function generateAppointmentRescheduleEmail(
	patientName: string,
	doctorName: string,
	newDate: string,
	newTime: string,
	oldDate: string,
	oldTime: string
): EmailTemplate {
	const content = `
    <p>Dear <strong>${patientName}</strong>,</p>
    <p>Your appointment has been <strong>rescheduled</strong>. Here are the updated details:</p>

    <div style="background: white; border-left: 4px solid #667eea;
                padding: 20px; margin: 20px 0; border-radius: 4px;">
      <p><strong>Doctor:</strong> ${doctorName}</p>
      <p><strong>Previous:</strong> ${oldDate} at ${oldTime}</p>
      <p><strong>New:</strong> ${newDate} at ${newTime}</p>
    </div>

    <p style="color: #555;">Please confirm your attendance. Thank you!</p>
    <p>Best regards,<br/>DentalCare Pro Team</p>
  `;
	return {
		subject: `Appointment Rescheduled - ${newDate}`,
		html: wrapEmailTemplate("Appointment Rescheduled", content),
	};
}

// ❌ Appointment Cancellation Email
function generateAppointmentCancellationEmail(
	patientName: string,
	doctorName: string,
	appointmentDate: string,
	appointmentTime: string
): EmailTemplate {
	const content = `
    <p>Dear <strong>${patientName}</strong>,</p>
    <p>Your appointment has been <strong>cancelled</strong>. Below are the details:</p>

    <div style="background: white; border-left: 4px solid #e74c3c;
                padding: 20px; margin: 20px 0; border-radius: 4px;">
      <p><strong>Doctor:</strong> ${doctorName}</p>
      <p><strong>Date:</strong> ${appointmentDate}</p>
      <p><strong>Time:</strong> ${appointmentTime}</p>
    </div>

    <div style="background: #fff3cd; border: 1px solid #ffc107;
                padding: 15px; border-radius: 4px; margin: 20px 0;">
      <p style="color: #856404;">
        If you would like to reschedule, please contact us to book a new appointment.
      </p>
    </div>

    <p>Best regards,<br/>DentalCare Pro Team</p>
  `;
	return {
		subject: `Appointment Cancelled - ${appointmentDate}`,
		html: wrapEmailTemplate("Appointment Cancelled", content),
	};
}

// 🧾 Treatment Report Email
function generateTreatmentReportEmail(
	patientName: string,
	doctorName: string,
	procedures: string[],
	findings: string,
	nextVisitDate?: string
): EmailTemplate {
	const proceduresList = procedures.map((p) => `<li>${p}</li>`).join("");
	const content = `
    <p>Dear <strong>${patientName}</strong>,</p>
    <p>Your treatment report from Dr. ${doctorName} is ready.</p>

    <div style="background: white; border-left: 4px solid #667eea;
                padding: 20px; margin: 20px 0; border-radius: 4px;">
      <h3>Procedures Performed:</h3>
      <ul>${proceduresList}</ul>
      <h3>Findings:</h3>
      <p>${findings}</p>
      ${nextVisitDate ? `<h3>Next Visit:</h3><p>${nextVisitDate}</p>` : ""}
    </div>

    <p>Please follow post-treatment instructions carefully.</p>
    <p>Best regards,<br/>DentalCare Pro Team</p>
  `;
	return {
		subject: `Treatment Report - Follow-up Information`,
		html: wrapEmailTemplate("Treatment Report", content),
	};
}

// 🩺 Doctor Assignment Email
function generateDoctorAssignmentEmail(
	doctorName: string,
	patientName: string,
	patientEmail: string
): EmailTemplate {
	const content = `
    <p>Dear Dr. <strong>${doctorName}</strong>,</p>
    <p>A new patient has been assigned to you.</p>

    <div style="background: white; border-left: 4px solid #667eea;
                padding: 20px; margin: 20px 0; border-radius: 4px;">
      <p><strong>Patient Name:</strong> ${patientName}</p>
      <p><strong>Patient Email:</strong> ${patientEmail}</p>
    </div>

    <p>Please review their medical history and contact them for a consultation.</p>
    <p>Best regards,<br/>DentalCare Pro Team</p>
  `;
	return {
		subject: `New Patient Assignment - ${patientName}`,
		html: wrapEmailTemplate("New Patient Assignment", content),
	};
}

// 🖼️ X-ray / Image Upload Email
function generateXrayUploadEmail(
	patientName: string,
	imageType: string,
	uploadedBy: string,
	imageTitle?: string
): EmailTemplate {
	const content = `
    <p>Dear <strong>${patientName}</strong>,</p>
    <p>New ${imageType} images have been added to your medical profile.</p>

    <div style="background: white; border-left: 4px solid #667eea;
                padding: 20px; margin: 20px 0; border-radius: 4px;">
      <p><strong>Image Type:</strong> ${imageType}</p>
      ${imageTitle ? `<p><strong>Title:</strong> ${imageTitle}</p>` : ""}
      <p><strong>Uploaded By:</strong> ${uploadedBy}</p>
    </div>

    <p>You can view them in your patient dashboard under Medical Records.</p>
    <p>Best regards,<br/>DentalCare Pro Team</p>
  `;
	return {
		subject: `New ${imageType} Images Added`,
		html: wrapEmailTemplate("Medical Images Updated", content),
	};
}

// 📩 Main email sender
export async function sendEmail(to: string, subject: string, html: string, eventType: string) {
	try {
		console.log(`  Sending ${eventType} email to: ${to}`);
		const transporter = getTransporter();

		const info = await transporter.sendMail({
			from: process.env.EMAIL_USER,
			to,
			subject,
			html,
		});

		console.log(`  ${eventType} email sent successfully to ${to}`);
		console.log(`  Message ID: ${info.messageId}`);
		return { success: true, messageId: info.messageId };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		console.error(`  Failed to send ${eventType} email to ${to}: ${errorMessage}`);
		return { success: false, error: errorMessage };
	}
}

// 🚀 Exported functions (unchanged)
export async function sendAppointmentConfirmationEmail(...args) {
	const t = generateAppointmentConfirmationEmail(...args.slice(1));
	return sendEmail(args[0], t.subject, t.html, "APPOINTMENT_CONFIRMATION");
}
export async function sendAppointmentReminderEmail(...args) {
	const t = generateAppointmentReminderEmail(...args.slice(1));
	return sendEmail(args[0], t.subject, t.html, "APPOINTMENT_REMINDER");
}
export async function sendAppointmentRescheduleEmail(...args) {
	const t = generateAppointmentRescheduleEmail(...args.slice(1));
	return sendEmail(args[0], t.subject, t.html, "APPOINTMENT_RESCHEDULE");
}
export async function sendAppointmentCancellationEmail(...args) {
	const t = generateAppointmentCancellationEmail(...args.slice(1));
	return sendEmail(args[0], t.subject, t.html, "APPOINTMENT_CANCELLATION");
}
export async function sendTreatmentReportEmail(...args) {
	const t = generateTreatmentReportEmail(...args.slice(1));
	return sendEmail(args[0], t.subject, t.html, "TREATMENT_REPORT");
}
export async function sendDoctorAssignmentEmail(...args) {
	const t = generateDoctorAssignmentEmail(...args.slice(1));
	return sendEmail(args[0], t.subject, t.html, "DOCTOR_ASSIGNMENT");
}
export async function sendXrayUploadEmail(...args) {
	const t = generateXrayUploadEmail(...args.slice(1));
	return sendEmail(args[0], t.subject, t.html, "XRAY_UPLOAD");
}
