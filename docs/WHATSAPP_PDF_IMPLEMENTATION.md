# WhatsApp PDF/Document Implementation

## Overview
This implementation follows the official WhatsApp Business API documentation for handling media uploads and messages. PDFs and documents are now fully supported alongside images.

## Implementation Details

### 1. Media Upload Flow (Official WhatsApp API)
Following the WhatsApp Business Platform documentation:

#### For Images:
- Upload to Cloudinary for CDN storage and display
- Send via WhatsApp API with `link` parameter containing the Cloudinary URL
- Type: `image`

#### For Documents (PDFs):
- Upload to WhatsApp Media API endpoint (`/v18.0/{phone_id}/media`)
- Receive media ID from WhatsApp
- Send via WhatsApp API with `id` parameter containing the media ID
- Type: `document`
- Documents persist for 30 days on WhatsApp servers

### 2. API Endpoints

#### Upload Helper Functions:
```typescript
// Upload to WhatsApp Media API (documents)
uploadMediaToWhatsApp(buffer, fileName, mimeType, phoneNumberId)
  → Returns media ID

// Upload to Cloudinary (images)
uploadToCloudinary(buffer, fileName, mimeType)
  → Returns Cloudinary secure URL
```

#### Message Sending Payload:

**Image:**
```json
{
  "messaging_product": "whatsapp",
  "to": "1234567890",
  "type": "image",
  "image": {
    "link": "https://cloudinary-url.com/image.jpg",
    "caption": "Optional caption"
  }
}
```

**Document:**
```json
{
  "messaging_product": "whatsapp",
  "to": "1234567890",
  "type": "document",
  "document": {
    "id": "media-id-from-whatsapp",
    "caption": "Optional caption"
  }
}
```

### 3. Frontend Changes

#### Chat Page:
- File input accepts: `image/*` and `.pdf`
- Auto-detection of PDF files as "document" type
- Media preview shows filename before sending
- Single attachment button for both images and PDFs

#### Message Bubble:
- Images display as thumbnails with caption
- Documents show as download card with filename and download button
- Both types support quoted message previews

### 4. Database Schema
Messages store:
- `mediaType`: "image" | "document" | "audio" | "video"
- `mediaUrl`: Cloudinary URL for images, WhatsApp media ID for documents
- `mediaData`: Buffer for local storage (optional backup)

### 5. Compliance with WhatsApp Limits
- **Images**: < 5 MB, JPEG/PNG
- **Documents**: < 100 MB, PDF/Office/Text formats
- **Media Persistence**: 30 days on WhatsApp servers
- **Download URLs**: Valid for 5 minutes

## Testing

To test PDF sending:
1. Click attachment button in chat
2. Select a PDF file
3. Add optional caption
4. Click send
5. PDF will be uploaded to WhatsApp and sent to recipient
6. Recipient will see downloadable PDF document

## Files Modified
- `/app/api/whatsapp/messages/route.ts` - Media upload and sending logic
- `/app/dashboard/inbox/[chatId]/page.tsx` - File input and UI
- `/lib/db-server.ts` - Database schema (already supports documents)
- `/components/whatsapp-message-bubble.tsx` - Document display (already implemented)
- `/app/api/whatsapp/webhook/route.ts` - Document receiving (already implemented)
