import { type NextRequest, NextResponse } from "next/server";
import { User, connectDB } from "@/lib/db-server";
import { generateToken } from "@/lib/auth";
import { comparePassword } from "@/lib/encryption";

export async function POST(request: NextRequest) {
	try {
		await connectDB();
		const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

		const user = await User.findOne({
			$or: [{ username }, { email: username }],
		});

		if (!user) {
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		const isPasswordValid = await comparePassword(password, user.password);

		if (!isPasswordValid) {
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		const token = generateToken({
			userId: user._id.toString(),
			email: user.email,
			role: user.role,
			name: user.name,
		});

		return NextResponse.json({
			success: true,
			token,
			user: {
				id: user._id.toString(),
				name: user.name,
				email: user.email,
				role: user.role,
			},
		});
	} catch (error) {
		console.error("  Login error:", error);
		return NextResponse.json({ error: "Login failed" }, { status: 500 });
	}
}
