const MAX_FILE_SIZE = 1024 * 1024 // 1MB in bytes

export async function uploadToCloudinary(file: File): Promise<string> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size must be less than 1MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`)
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only JPEG, PNG, GIF, and WebP images are allowed")
  }

  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "")

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
      {
        method: "POST",
        body: formData,
      },
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || "Upload failed")
    }

    const data = await response.json()
    return data.secure_url
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Failed to upload file to Cloudinary")
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}
