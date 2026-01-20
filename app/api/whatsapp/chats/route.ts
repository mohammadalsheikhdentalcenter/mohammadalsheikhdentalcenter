import { verifyToken } from "@/lib/auth"
import { connectDB, WhatsAppChat, User } from "@/lib/db-server"
import { NextRequest, NextResponse } from "next/server"


// GET /api/whatsapp/chats - List all chats for inbox
export async function GET(req: NextRequest) {
  try {
     await connectDB()
            const token = req.headers.get("authorization")?.split(" ")[1]
        
            if (!token) {
              return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
            }
        
            const payload = verifyToken(token)
            if (!payload) {
              return NextResponse.json({ error: "Invalid token" }, { status: 401 })
            }
        
            if (payload.role !== "admin" && payload.role !== "receptionist") {
              return NextResponse.json({ error: "Access denied" }, { status: 403 })
            }
    

    await connectDB()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || "active"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search")

    let query: any = { status }

    if (search) {
      query = {
        ...query,
        $or: [
          { patientName: { $regex: search, $options: "i" } },
          { patientPhone: { $regex: search, $options: "i" } },
        ],
      }
    }

    const total = await WhatsAppChat.countDocuments(query)
    const chats = await WhatsAppChat.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("patientId", "name phones email")

    return NextResponse.json({
      success: true,
      chats,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("[v0] WhatsApp GET chats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/whatsapp/chats - Create new chat (when first message from patient arrives)
export async function POST(req: NextRequest) {
  try {
     await connectDB()
        const token = req.headers.get("authorization")?.split(" ")[1]
    
        if (!token) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
    
        const payload = verifyToken(token)
        if (!payload) {
          return NextResponse.json({ error: "Invalid token" }, { status: 401 })
        }
    
        if (payload.role !== "admin" && payload.role !== "receptionist") {
          return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }


    const { patientId, patientPhone, patientName, whatsappBusinessPhoneNumberId } = await req.json()

    if (!patientId || !patientPhone || !patientName || !whatsappBusinessPhoneNumberId) {
      return NextResponse.json(
        { error: "Missing required fields: patientId, patientPhone, patientName, whatsappBusinessPhoneNumberId" },
        { status: 400 },
      )
    }

    // Check if chat already exists
    let chat = await WhatsAppChat.findOne({ patientId, patientPhone })

    if (!chat) {
      chat = await WhatsAppChat.create({
        patientId,
        patientPhone,
        patientName,
        whatsappBusinessPhoneNumberId,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    return NextResponse.json({ success: true, chat }, { status: 201 })
  } catch (error) {
    console.error("[v0] WhatsApp POST chat error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
