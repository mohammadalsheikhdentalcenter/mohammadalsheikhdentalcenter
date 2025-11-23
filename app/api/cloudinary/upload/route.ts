import { type NextRequest, NextResponse } from "next/server"
import { uploadToCloudinary } from "@/lib/cloudinary-upload"
import { verifyToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const secure_url = await uploadToCloudinary(file)

    return NextResponse.json({
      success: true,
      secure_url,
    })
  } catch (error) {
    console.error("Cloudinary upload error:", error)
    const message = error instanceof Error ? error.message : "Failed to upload file"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
