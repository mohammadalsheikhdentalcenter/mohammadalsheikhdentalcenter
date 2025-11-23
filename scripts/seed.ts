// @ts-nocheck
import { connectDB, User } from "../lib/db";

async function seedAdmin() {
	try {
		await connectDB();
		console.log("  Connected to database");

		// Always remove any existing admin first
		const result = await User.deleteMany({
			$or: [{ email: "admin@dentalcare.com" }, { username: "admin" }],
		});

		if (result.deletedCount > 0) {
			console.log(`  Deleted ${result.deletedCount} existing admin user(s)`);
		} else {
			console.log("  No existing admin user found — creating new one");
		}

		// Create a new admin
		await User.create({
			username: "admin",
			email: "admin@dentalcare.com",
			password: "Admin@123456", // password hashing handled in schema
			name: "Admin User",
			role: "admin",
			phone: "1234567890",
			active: true,
		});

		console.log("  Admin user created successfully!");
		console.log("Email: admin@dentalcare.com");
		console.log("Password: Admin@123456");
	} catch (error) {
		console.error("  Seed error:", error);
		process.exit(1);
	} finally {
		process.exit(0);
	}
}

seedAdmin();
