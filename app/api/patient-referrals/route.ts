//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { PatientReferralRequest, connectDB } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const role = payload.role

    const query: any = {}

    // Doctors see only their own referrals
    if (role === "doctor") {
      query.doctorId = payload.userId
    } else if (role === "receptionist" || role === "admin") {
      // Only apply status filter if explicitly passed in query params
      const status = searchParams.get("status")
      if (status) {
        query.status = status
      }
      // If no status filter provided, show all referrals
    } else {
      return NextResponse.json({ error: "Unauthorized role" }, { status: 403 })
    }

    const referrals = await PatientReferralRequest.find(query).populate("doctorId", "name").sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      referrals: referrals.map((ref) => ({
        _id: ref._id.toString(),
        id: ref._id.toString(),
        doctorId: ref.doctorId._id.toString(),
        doctorName: ref.doctorName,
        patientName: ref.patientName,
        patientPhones: ref.patientPhones || [],
        patientEmail: ref.patientEmail,
        patientDob: ref.patientDob,
        patientIdNumber: ref.patientIdNumber,
        patientAddress: ref.patientAddress,
        patientInsuranceProvider: ref.patientInsuranceProvider,
        patientInsuranceNumber: ref.patientInsuranceNumber,
        patientAllergies: ref.patientAllergies,
        patientMedicalConditions: ref.patientMedicalConditions,
        referralReason: ref.referralReason,
        status: ref.status,
        pictureUrl: ref.pictureUrl,
        pictureSavedBy: ref.pictureSavedBy,
        appointmentId: ref.appointmentId?.toString() || null,
        notes: ref.notes,
        createdAt: ref.createdAt,
        updatedAt: ref.updatedAt,
      })),
    })
  } catch (error) {
    console.error("Failed to fetch referrals:", error)
    return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 })
  }
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

    if (payload.role !== "doctor") {
      return NextResponse.json({ error: "Only doctors can create referrals" }, { status: 403 })
    }

    const {
      patientName,
      patientPhones,
      patientEmail,
      patientDob,
      patientIdNumber,
      patientAddress,
      patientInsuranceProvider,
      patientInsuranceNumber,
      patientAllergies,
      patientMedicalConditions,
      referralReason,
    } = await request.json()

    if (!patientName || !patientPhones || patientPhones.length === 0 || !patientDob) {
      return NextResponse.json({ error: "Patient name, phone, and DOB are required" }, { status: 400 })
    }

    const referral = await PatientReferralRequest.create({
      doctorId: payload.userId,
      doctorName: payload.name,
      patientName,
      patientPhones,
      patientEmail: patientEmail || "",
      patientDob,
      patientIdNumber: patientIdNumber || "",
      patientAddress: patientAddress || "",
      patientInsuranceProvider: patientInsuranceProvider || "",
      patientInsuranceNumber: patientInsuranceNumber || "",
      patientAllergies: patientAllergies || [],
      patientMedicalConditions: patientMedicalConditions || [],
      referralReason,
      status: "pending",
    })

    return NextResponse.json({
      success: true,
      referral: {
        _id: referral._id.toString(),
        id: referral._id.toString(),
        doctorId: referral.doctorId.toString(),
        doctorName: referral.doctorName,
        patientName: referral.patientName,
        patientPhones: referral.patientPhones || [],
        patientEmail: referral.patientEmail,
        patientDob: referral.patientDob,
        patientIdNumber: referral.patientIdNumber,
        patientAddress: referral.patientAddress,
        patientInsuranceProvider: referral.patientInsuranceProvider,
        patientInsuranceNumber: referral.patientInsuranceNumber,
        patientAllergies: referral.patientAllergies,
        patientMedicalConditions: referral.patientMedicalConditions,
        referralReason: referral.referralReason,
        status: referral.status,
        pictureUrl: referral.pictureUrl,
        pictureSavedBy: referral.pictureSavedBy,
        appointmentId: referral.appointmentId?.toString() || null,
        notes: referral.notes,
        createdAt: referral.createdAt,
        updatedAt: referral.updatedAt,
      },
    })
  } catch (error) {
    console.error("Failed to create referral:", error)
    return NextResponse.json({ error: "Failed to create referral" }, { status: 500 })
  }
}
