//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { User, Patient, connectDB } from "@/lib/db-server"
import { sendPasswordResetEmail } from "@/lib/email"
import crypto from "crypto"

export async function POST(request: NextRequest) {
	try {
		await connectDB();
		const { email, userType } = await request.json();

		if (!email) {
			return NextResponse.json({ error: "Email is required" }, { status: 400 });
		}

    if (!userType || (userType !== "staff" && userType !== "patient")) {
      return NextResponse.json({ error: "Invalid user type" }, { status: 400 })
    }

    let user
    if (userType === "patient") {
  user = await Patient.findOne({ email })
} else {
  user = await User.findOne({ email })
}


		if (!user) {
			// Don't reveal if email exists for security
			return NextResponse.json({
				success: true,
				message:
					"If an account exists with this email, a password reset link has been sent.",
			});
		}

		const resetToken = crypto.randomBytes(32).toString("hex");
		const resetTokenHash = crypto
			.createHash("sha256")
			.update(resetToken)
			.digest("hex");
		const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    if (userType === "patient") {
      await Patient.findByIdAndUpdate(user._id, {
        resetToken: resetTokenHash,
        resetTokenExpiry,
      })
    } else {
      await User.findByIdAndUpdate(user._id, {
        resetToken: resetTokenHash,
        resetTokenExpiry,
      })
    }

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}&type=${userType}`

    console.log(`[v0] Attempting to send password reset to ${userType}:`, email)

    try {
      await sendPasswordResetEmail(email, user.name, resetUrl)
      console.log(`[v0] Password reset email sent successfully to ${userType}:`, email)
    } catch (emailError) {
      console.error(`[v0] Failed to send password reset email to ${userType}:`, emailError)
      // Still return success to user for security, but log the error
      console.warn(
        "[v0] Password reset token saved but email delivery failed. Check EMAIL_USER and EMAIL_PASS environment variables.",
      )
    }

		return NextResponse.json({
			success: true,
			message:
				"If an account exists with this email, a password reset link has been sent.",
		});
	} catch (error) {
		console.error("  Forgot password error:", error);
		return NextResponse.json(
			{ error: "Failed to process password reset request" },
			{ status: 500 }
		);
	}
}
