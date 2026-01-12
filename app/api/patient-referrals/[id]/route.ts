//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { PatientReferralRequest, connectDB } from "@/lib/db-server"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const referral = await PatientReferralRequest.findById(params.id).populate("doctorId", "name")

    if (!referral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 })
    }

    // Check authorization
    if (payload.role === "doctor" && referral.doctorId.toString() !== payload.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      referral: {
        _id: referral._id.toString(),
        id: referral._id.toString(),
        doctorId: referral.doctorId._id.toString(),
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
    console.error("Failed to fetch referral:", error)
    return NextResponse.json({ error: "Failed to fetch referral" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    if (payload.role !== "receptionist" && payload.role !== "admin") {
      return NextResponse.json({ error: "Only receptionist and admin can update referrals" }, { status: 403 })
    }

    const referral = await PatientReferralRequest.findById(params.id)

    if (!referral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 })
    }

    const { pictureUrl, status, appointmentId, notes, rejectionReason } = await request.json()

    const updatedReferral = await PatientReferralRequest.findByIdAndUpdate(
      params.id,
      {
        pictureUrl: pictureUrl || referral.pictureUrl,
        status: status || referral.status,
        appointmentId: appointmentId || referral.appointmentId,
        pictureSavedBy: pictureUrl ? payload.name : referral.pictureSavedBy,
        notes: notes || (rejectionReason ? `Rejected: ${rejectionReason}` : referral.notes),
        updatedAt: new Date(),
      },
      { new: true },
    )

    return NextResponse.json({
      success: true,
      referral: {
        _id: updatedReferral._id.toString(),
        id: updatedReferral._id.toString(),
        doctorId: updatedReferral.doctorId.toString(),
        doctorName: updatedReferral.doctorName,
        patientName: updatedReferral.patientName,
        patientPhones: updatedReferral.patientPhones || [],
        patientEmail: updatedReferral.patientEmail,
        patientDob: updatedReferral.patientDob,
        patientIdNumber: updatedReferral.idNumber,
        patientAddress: updatedReferral.patientAddress,
        patientInsuranceProvider: updatedReferral.patientInsuranceProvider,
        patientInsuranceNumber: updatedReferral.patientInsuranceNumber,
        patientAllergies: updatedReferral.patientAllergies,
        patientMedicalConditions: updatedReferral.patientMedicalConditions,
        referralReason: updatedReferral.referralReason,
        status: updatedReferral.status,
        pictureUrl: updatedReferral.pictureUrl,
        pictureSavedBy: updatedReferral.pictureSavedBy,
        appointmentId: updatedReferral.appointmentId?.toString() || null,
        notes: updatedReferral.notes,
        createdAt: updatedReferral.createdAt,
        updatedAt: updatedReferral.updatedAt,
      },
    })
  } catch (error) {
    console.error("Failed to update referral:", error)
    return NextResponse.json({ error: "Failed to update referral" }, { status: 500 })
  }
}
