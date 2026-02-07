# WhatsApp Media Authentication & Proxy Flow

## Overview

WhatsApp Cloud API returns temporary media URLs that are:
- **Valid for ~5 minutes** only
- **Require authentication** with Business Account access token
- **Cannot be accessed directly** from the browser without proper auth headers

This document explains how the authenticated media proxy works.

## Architecture

```
Client Browser
    ↓
Chat UI (whatsapp-message-bubble.tsx)
    ↓
/api/whatsapp/media-proxy?url=...&type=image
    ↓
API Route (Authenticated with WHATSAPP_ACCESS_TOKEN)
    ↓
WhatsApp Cloud API (with Bearer token in Authorization header)
    ↓
Media Content (Image/Video/Audio/Document)
    ↓
Back to Browser (Cached for 5 minutes)
```

## How It Works

### 1. Webhook Receives Media
When WhatsApp sends a message with media, the webhook stores:
```typescript
{
  messageType: "media",
  mediaType: "image" | "video" | "audio" | "document",
  mediaUrl: "https://graph.instagram.com/v18.0/[MEDIA_ID]?phone_number_id=...",
  body: "[Image caption]"
}
```

### 2. Frontend Requests Media
The message bubble component requests media through the authenticated proxy:
```typescript
const getProxiedMediaUrl = (url: string, type: string) => {
  return `/api/whatsapp/media-proxy?url=${encodeURIComponent(url)}&type=${type}`;
};

// Usage:
<img src={getProxiedMediaUrl(mediaUrl, "image")} alt="Message image" />
```

### 3. Proxy Authenticates & Proxies
The API route authenticates with WhatsApp and returns the media:
```typescript
// GET /api/whatsapp/media-proxy?url=...&type=...

const contentResponse = await fetch(mediaUrl, {
  headers: {
    Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
  },
});
```

### 4. Caching
- **Cache-Control**: `public, max-age=300` (5 minutes)
- Browser caches the media for the URL lifetime
- If user opens same chat within 5 min, media loads from cache
- After 5 min, new request fetches fresh media (requires new WhatsApp URL)

## Security Considerations

✅ **Access Token Safety**
- Token never exposed to client
- Only server can make authenticated requests
- Frontend only sees the public proxy URL

✅ **CORS Handled**
- WhatsApp URLs are WhatsApp-domain only
- Proxy adds CORS headers: `Access-Control-Allow-Origin: *`
- Browser can load media from `/api/` endpoint

✅ **No Storage**
- Media streamed directly through proxy
- Not saved to database or server disk
- Temporary URLs mean automatic cleanup

## Supported Media Types

| Type | Format | Extension | Usage |
|------|--------|-----------|-------|
| Image | JPEG, PNG, WebP, GIF | .jpg, .png, .webp, .gif | `<img>` tag |
| Video | MP4, WebM | .mp4, .webm | `<video>` tag with controls |
| Audio | AAC, MP3, Ogg | .m4a, .mp3, .ogg | `<audio>` tag with controls |
| Document | PDF, DOCX, etc | .pdf, .docx, etc | Download button |

## Media URL Format from WhatsApp

WhatsApp media URLs follow this pattern:
```
https://graph.instagram.com/v18.0/{MEDIA_ID}?phone_number_id={PHONE_NUMBER_ID}
```

**Parameters:**
- `MEDIA_ID`: Unique identifier from webhook
- `PHONE_NUMBER_ID`: Business phone number ID

**Expiry:**
- Expires after ~5 minutes
- Must be used with access token in Authorization header
- Old URLs cannot be refreshed; must get new ones from webhook

## Environment Setup

Required environment variable:
```
WHATSAPP_ACCESS_TOKEN=your_business_account_access_token
```

This token should have:
- `whatsapp_business_messaging` permission
- `whatsapp_business_management` permission

## Debugging Media Issues

### Image not loading?
Check browser DevTools → Network tab:
1. Is `/api/whatsapp/media-proxy` request successful (200)?
2. Does response have correct `Content-Type` header?
3. Check server logs for authorization errors

### Access token errors?
```
[v0] Failed to fetch media from WhatsApp URL: 401 Unauthorized
```
- Verify `WHATSAPP_ACCESS_TOKEN` is set correctly
- Check token hasn't expired
- Verify token has correct permissions

### URL expired?
```
[v0] Failed to fetch media from WhatsApp URL: 410 Gone
```
- WhatsApp URL is beyond 5-minute window
- User must receive fresh message with new URL
- Cannot refresh old URLs

## Performance Notes

- First media request: ~200-500ms (fresh fetch)
- Subsequent requests (within 5 min): <50ms (browser cache)
- Cached media expires and refreshes automatically after 5 minutes
- No database storage = minimal server resource usage

## Testing

### Test Image Loading
1. Send image via WhatsApp to business number
2. Open chat in portal
3. Image should display immediately
4. Refresh page - should load from cache
5. Wait 5 minutes - new request loads new copy

### Test Authentication
```bash
# This should fail (no auth):
curl "https://graph.instagram.com/v18.0/{MEDIA_ID}?phone_number_id={ID}"

# This should succeed (with token):
curl -H "Authorization: Bearer {TOKEN}" \
  "https://graph.instagram.com/v18.0/{MEDIA_ID}?phone_number_id={ID}"
```
