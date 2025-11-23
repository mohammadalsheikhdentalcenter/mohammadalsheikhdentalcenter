//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server";
import { User, connectDB } from "@/lib/db-server";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
	try {
		await connectDB();
		const token = request.headers.get("authorization")?.split(" ")[1];

		if (!token) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const payload = verifyToken(token);
		if (!payload) {
			return NextResponse.json({ error: "Invalid token" }, { status: 401 });
		}

		const role = request.nextUrl.searchParams.get("role");
		const query: any = {};

		if (role) {
			query.role = role;
		}

		const users = await User.find(query).select("-password");

		return NextResponse.json({
			success: true,
			users: users.map((u) => ({
				id: u._id.toString(),
				name: u.name,
				email: u.email,
				role: u.role,
				specialty: u.specialty,
			})),
		});
	} catch (error) {
		console.error("  Get users error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch users" },
			{ status: 500 }
		);
	}
}
