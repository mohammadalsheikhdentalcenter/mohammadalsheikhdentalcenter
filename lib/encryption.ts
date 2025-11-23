import crypto from "crypto"
import bcrypt from "bcryptjs"

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "your-32-char-encryption-key-change!"
const ALGORITHM = "aes-256-cbc"

// Ensure key is 32 bytes for AES-256
const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32)

export function encryptData(data: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(data, "utf8", "hex")
  encrypted += cipher.final("hex")
  return iv.toString("hex") + ":" + encrypted
}

export function decryptData(encryptedData: string): string {
  const parts = encryptedData.split(":")
  const iv = Buffer.from(parts[0], "hex")
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  let decrypted = decipher.update(parts[1], "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}
