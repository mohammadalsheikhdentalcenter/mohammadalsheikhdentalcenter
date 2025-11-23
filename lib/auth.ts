//@ts-nocheck
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"
const JWT_EXPIRY = "7d"

export interface JWTPayload {
  userId: string
  email: string
  role: "admin" | "doctor" | "receptionist" | "hr"
  name: string
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload
  } catch {
    return null
  }
}

export function verifyPatientToken(token: string): string | null {
  try {
    // Patient token is base64-encoded patient ID
    const patientId = Buffer.from(token, "base64").toString("utf-8")
    // Validate it's a valid MongoDB ObjectId format
    if (patientId.match(/^[0-9a-fA-F]{24}$/)) {
      return patientId
    }
    return null
  } catch {
    return null
  }
}
