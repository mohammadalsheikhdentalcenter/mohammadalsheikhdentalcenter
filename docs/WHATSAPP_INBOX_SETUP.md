# WhatsApp Inbox System Documentation

## Overview

The WhatsApp Inbox is a custom-built messaging system for dental clinic staff (receptionist and admin) to manage patient conversations via WhatsApp Cloud API. It supports sending, receiving, and tracking messages while respecting WhatsApp's 24-hour messaging window rules.

## Features

### 1. **Chat Management**
- List all active chats with patients
- View chat history and message threads
- Search chats by patient name or phone number
- Filter chats by status (active, archived, closed)
- Track unread message counts

### 2. **Message Handling**
- Send free-form text messages (within 24-hour window)
- Send template messages (unlimited, anytime)
- Receive patient messages automatically via webhook
- Track message status (sent, delivered, read, failed)
- Store all messages in database for audit trail

### 3. **24-Hour Window Management**
- Automatically tracks when 24-hour window opens (after customer initiates conversation)
- Stores window expiration timestamp
- Prevents sending non-template messages outside window
- UI indicators for window status

### 4. **Role-Based Access**
- **Admin**: Full access to all chats and features
- **Receptionist**: Full access to all chats and features
- **Doctor**: No access (view-only if needed in future)
- **HR**: No access

## Database Schema

### WhatsAppChat Collection
```javascript
{
  _id: ObjectId,
  patientId: ObjectId (ref: Patient),
  patientPhone: String,        // Primary phone for this chat
  patientName: String,
  whatsappBusinessPhoneNumberId: String,
  lastMessage: String,         // Last message preview
  lastMessageAt: Date,
  unreadCount: Number,
  messageCount: Number,
  status: "active" | "archived" | "closed",
  window24HourEndsAt: Date,   // When 24-hour window expires
  lastTemplateMessageAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### WhatsAppMessage Collection
```javascript
{
  _id: ObjectId,
  chatId: ObjectId (ref: WhatsAppChat),
  patientId: ObjectId (ref: Patient),
  patientPhone: String,
  senderType: "patient" | "business",
  senderName: String,
  messageType: "text" | "template" | "media" | "interactive",
  body: String,
  mediaUrl: String (optional),
  mediaType: "image" | "document" | "audio" | "video" (optional),
  templateName: String (optional),
  templateParams: [String] (optional),
  whatsappMessageId: String,  // WhatsApp's message ID
  status: "sent" | "delivered" | "read" | "failed",
  statusChangedAt: Date,
  errorMessage: String (optional),
  sentBy: ObjectId (ref: User),
  sentByName: String,
  window24HourValid: Boolean, // Was sent within valid window
  createdAt: Date
}
```

### WhatsAppWebhookLog Collection
```javascript
{
  _id: ObjectId,
  event: String,              // message_sent, message_delivered, etc.
  patientPhone: String,
  whatsappMessageId: String,
  payload: Mixed,             // Full webhook payload
  processed: Boolean,
  processedAt: Date,
  createdAt: Date
}
```

## API Routes

### GET `/api/whatsapp/chats`
Fetch all chats with pagination and search

**Query Parameters:**
- `status`: "active" | "archived" | "closed" (default: "active")
- `search`: Search by patient name or phone
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "chats": [...],
  "total": 50,
  "page": 1,
  "limit": 20,
  "pages": 3
}
```

### POST `/api/whatsapp/chats`
Create a new chat (typically called from webhook)

**Body:**
```json
{
  "patientId": "...",
  "patientPhone": "+923391415151",
  "patientName": "Ahmed Khan",
  "whatsappBusinessPhoneNumberId": "..."
}
```

### GET `/api/whatsapp/chats/[chatId]`
Get specific chat details with message count and 24-hour window status

**Response:**
```json
{
  "success": true,
  "chat": {
    "_id": "...",
    "patientName": "Ahmed Khan",
    "patientPhone": "+923391415151",
    "messageCount": 15,
    "unreadCount": 3,
    "window24HourValid": true,
    "window24HourEndsAt": "2024-01-21T10:30:00Z"
  }
}
```

### PATCH `/api/whatsapp/chats/[chatId]`
Update chat status

**Body:**
```json
{
  "status": "archived" | "closed" | "active"
}
```

### GET `/api/whatsapp/messages`
Fetch messages for a chat with pagination

**Query Parameters:**
- `chatId`: Required
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "messages": [...],
  "total": 100,
  "page": 1,
  "limit": 50
}
```

### POST `/api/whatsapp/messages`
Send a message to patient via WhatsApp Cloud API

**Body:**
```json
{
  "chatId": "...",
  "patientId": "...",
  "patientPhone": "+923391415151",
  "message": "Your appointment is confirmed for tomorrow at 10 AM",
  "messageType": "text",
  "whatsappBusinessPhoneNumberId": "..."
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "_id": "...",
    "body": "...",
    "status": "sent",
    "whatsappMessageId": "...",
    "createdAt": "2024-01-20T10:00:00Z"
  }
}
```

### GET `/api/whatsapp/webhook`
Verify webhook endpoint (WhatsApp calls this during setup)

### POST `/api/whatsapp/webhook`
Receive incoming messages and status updates from WhatsApp

**Webhook Format:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "...",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "messages": [
              {
                "from": "923391415151",
                "id": "wamid.xxx",
                "timestamp": "1234567890",
                "type": "text",
                "text": { "body": "Hello!" }
              }
            ],
            "statuses": [
              {
                "id": "wamid.xxx",
                "recipient_id": "923391415151",
                "status": "delivered",
                "timestamp": "1234567890"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

## Environment Variables

Required environment variables:

```env
# WhatsApp Cloud API
WHATSAPP_API_URL=https://graph.instagram.com/v18.0/{PHONE_NUMBER_ID}/messages
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token

# Database
MONGODB_URI=mongodb://...

# JWT
JWT_SECRET=your_secret_key
```

## 24-Hour Window Logic

### How It Works

1. **Customer initiates conversation**: When patient sends first message, WhatsApp opens a 24-hour window
2. **System tracks window**: `window24HourEndsAt` is set to `now + 24 hours`
3. **Business can send**: Within this window, business can send free text messages
4. **Template messages**: Always allowed (outside window too), but cost a credit
5. **Window resets**: Window resets each time customer sends a message

### Implementation

```typescript
// When incoming message received
const now = new Date();
const window24HourEndsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
await WhatsAppChat.findByIdAndUpdate(chatId, {
  window24HourEndsAt,
  lastTemplateMessageAt: now,
});

// When checking if message can be sent as free text
const isWithin24Hour = !chat.window24HourEndsAt || 
  new Date(chat.window24HourEndsAt) > new Date();
```

## UI Pages

### `/dashboard/inbox`
Main inbox listing page showing all chats

**Features:**
- Search by patient name or phone
- Filter by status (active, archived, closed)
- View unread count for each chat
- Click to view chat thread
- Last message preview
- Time since last message

### `/dashboard/inbox/[chatId]`
Individual chat thread page

**Features:**
- Show all messages in conversation
- Display message status (sent, delivered, read, failed)
- Send new messages
- Mark messages as read
- Show 24-hour window status
- Go back to inbox

## Implementation Guide

### For Developers

1. **Authentication**: All endpoints require JWT token in Authorization header
2. **Role Check**: Only admin and receptionist can access inbox
3. **Data Storage**: All messages stored immediately before sending to WhatsApp
4. **Error Handling**: Failed messages marked with error details
5. **Polling**: Client polls `/api/whatsapp/messages` every 3 seconds for real-time effect

### For Integration

1. **Incoming Messages**:
   - WhatsApp webhook calls `/api/whatsapp/webhook` with incoming message
   - System finds chat or creates new one
   - Message stored in database
   - Chat unread count updated

2. **Outgoing Messages**:
   - Staff sends message via UI
   - Message saved to database with "sent" status
   - Message sent to WhatsApp Cloud API
   - WhatsApp ID stored in message
   - Status updates received via webhook

3. **Status Updates**:
   - WhatsApp sends status updates via webhook
   - Message status updated in database
   - Client sees real-time update on next poll

## Best Practices

### 1. **24-Hour Window Management**
- Always check `window24HourValid` before sending text messages
- Use template messages for important communications outside window
- Educate users about window limitations

### 2. **Message Handling**
- Store messages immediately (before sending to WhatsApp)
- Don't rely solely on WhatsApp delivery for audit trail
- Log all webhook events for debugging

### 3. **Error Recovery**
- Failed messages stay in "failed" status
- Staff can see error message and retry
- No automatic retry to avoid duplicate messages

### 4. **Performance**
- Use pagination in chat list (limit 50)
- Index on frequently queried fields (chatId, patientPhone, createdAt)
- Cache unread count periodically

### 5. **Security**
- Verify webhook token on each request
- Validate phone number format
- Sanitize message content
- Rate limit message sending

## Troubleshooting

### Issue: Incoming messages not showing up
1. Check webhook URL is correctly configured in WhatsApp Business
2. Verify webhook token in environment variables
3. Check MongoDB connection
4. Review webhook logs in database

### Issue: Messages failing to send
1. Verify WhatsApp access token is valid
2. Check phone number format (must be international format)
3. Ensure 24-hour window not expired for text messages
4. Check WhatsApp API quota

### Issue: Chat not appearing
1. Verify patientId exists in database
2. Check if incoming message webhook was processed
3. Manually create chat via POST `/api/whatsapp/chats`

## Future Enhancements

1. **Real-time Updates**: Implement Pusher or Socket.io for live message delivery
2. **Media Support**: Support sending/receiving images, documents, audio, video
3. **Template Management**: UI for managing WhatsApp templates
4. **Bulk Messaging**: Send messages to multiple patients
5. **Message Scheduling**: Schedule messages to send later
6. **Analytics**: Message delivery rates, response times, etc.
7. **Chat Export**: Export chat history as PDF
8. **Chat Merge**: Merge duplicate chats for same patient

## Compliance

- **WhatsApp Terms**: Follow WhatsApp Business Terms of Service
- **24-Hour Rule**: Respect the 24-hour messaging window
- **Message Quality**: Maintain high message quality to avoid account restrictions
- **GDPR**: Handle patient data securely and comply with privacy laws
- **Audit Trail**: Keep all messages stored for compliance
