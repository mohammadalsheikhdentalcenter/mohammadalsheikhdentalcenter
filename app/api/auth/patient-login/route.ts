import { type NextRequest, NextResponse } from "next/server";
import { Patient, connectDB } from "@/lib/db-server";
import { comparePassword } from "@/lib/encryption";

export async function POST(request: NextRequest) {
	try {
		await connectDB();
		const { email, password } = await request.json();

		if (!email || !password) {
			return NextResponse.json(
				{ error: "Email and password required" },
				{ status: 400 }
			);
		}

		const patient = await Patient.findOne({ email }).populate(
			"assignedDoctorId",
			"name email specialty"
		);

		if (!patient) {
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		const isPasswordValid = await comparePassword(password, patient.password);

		if (!isPasswordValid) {
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		const token = Buffer.from(patient._id.toString()).toString("base64");

		return NextResponse.json({
			success: true,
			token,
			patient: {
				_id: patient._id.toString(),
				id: patient._id.toString(),
				name: patient.name,
				email: patient.email,
				phone: patient.phone,
				dob: patient.dob,
				address: patient.address || "",
				insuranceProvider: patient.insuranceProvider || "",
				insuranceNumber: patient.insuranceNumber || "",
				allergies: patient.allergies || [],
				medicalConditions: patient.medicalConditions || [],
				balance: patient.balance || 0,
				assignedDoctor: patient.assignedDoctorId,
			},
		});
	} catch (error) {
		console.error("  Patient login error:", error);
		return NextResponse.json({ error: "Login failed" }, { status: 500 });
	}
}
