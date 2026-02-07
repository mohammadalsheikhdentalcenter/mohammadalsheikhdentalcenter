import { NextRequest, NextResponse } from "next/server";

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mediaUrl = searchParams.get("url");
    const mediaType = searchParams.get("type") || "image";
    const mediaId = searchParams.get("id");

    if (!mediaUrl && !mediaId) {
      console.error("[v0] Media proxy: No URL or ID provided");
      return NextResponse.json({ error: "Media URL or ID required" }, { status: 400 });
    }

    console.log("[v0] Proxying WhatsApp media:", { mediaType, hasUrl: !!mediaUrl, hasId: !!mediaId });

    // If we have a media ID, it means it's stored locally
    if (mediaId && !mediaUrl) {
      try {
        const { connectDB, WhatsAppMessage } = await import("@/lib/db-server")
        await connectDB()

        // Media ID is in format: messageId-timestamp
        const messageId = mediaId.split("-")[0]
        const message = await WhatsAppMessage.findById(messageId)

        if (!message || !message.mediaData) {
          console.warn("[v0] Local media not found:", messageId)
          return NextResponse.json({ error: "Media not found" }, { status: 404 })
        }

        const mimeType =
          message.mediaType === "audio"
            ? "audio/webm"
            : message.mediaType === "image"
              ? "image/jpeg"
              : message.mediaType === "video"
                ? "video/mp4"
                : "application/octet-stream"

        console.log("[v0] Serving local media:", { mediaType: message.mediaType, size: message.mediaData.length })

        return new NextResponse(message.mediaData, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=2592000",
            "Access-Control-Allow-Origin": "*",
          },
        })
      } catch (error) {
        console.error("[v0] Error retrieving local media:", error)
        return NextResponse.json({ error: "Failed to retrieve local media" }, { status: 500 })
      }
    }

    // Fetch the media content from WhatsApp's temporary URL with access token
    // WhatsApp media URLs expire in ~5 minutes, but we cache for reliability
    let contentResponse;
    let retries = 0;
    const maxRetries = 2;

    while (retries < maxRetries) {
      try {
        contentResponse = await fetch(mediaUrl, {
          headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (contentResponse.ok) break;

        if (contentResponse.status === 404) {
          console.warn("[v0] WhatsApp media URL expired or not found, returning placeholder");
          // Return a placeholder image for expired media
          return new NextResponse(Buffer.from("media-expired"), {
            status: 410, // Gone
            headers: {
              "Content-Type": "text/plain",
              "Cache-Control": "no-cache",
            },
          });
        }

        if (contentResponse.status >= 500) {
          retries++;
          if (retries < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
            continue;
          }
        }

        throw new Error(`WhatsApp returned ${contentResponse.status}`);
      } catch (error) {
        retries++;
        if (retries >= maxRetries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
      }
    }

    if (!contentResponse || !contentResponse.ok) {
      console.error("[v0] Failed to fetch media from WhatsApp URL:", {
        status: contentResponse?.status,
        statusText: contentResponse?.statusText,
      });
      return NextResponse.json(
        { error: `Failed to fetch media: ${contentResponse?.statusText}` },
        { status: contentResponse?.status || 500 }
      );
    }

    const contentType = contentResponse.headers.get("content-type") || "application/octet-stream";
    const buffer = await contentResponse.arrayBuffer();

    console.log("[v0] Media proxy success:", { contentType, size: buffer.byteLength });

    // Return media with caching headers - cache aggressively since URLs expire
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=2592000", // Cache for 30 days (after first fetch)
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  } catch (error) {
    console.error("[v0] Media proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
