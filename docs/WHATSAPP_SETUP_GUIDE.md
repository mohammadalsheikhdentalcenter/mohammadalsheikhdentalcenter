# WhatsApp Inbox Setup Guide

## Prerequisites

1. WhatsApp Business Account
2. WhatsApp Cloud API access
3. Valid business phone number
4. MongoDB database
5. Vercel or self-hosted deployment

## Step 1: WhatsApp Cloud API Setup

### 1.1 Create Meta Business Account
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app (type: Business)
3. Add WhatsApp product to your app
4. Create a WhatsApp Business Account

### 1.2 Get Required Credentials

#### Phone Number ID
1. Go to WhatsApp > Getting Started
2. Click on "Start using the APIs"
3. Select your phone number
4. Copy the **Phone Number ID** (e.g., `102345678901234567`)

#### Access Token
1. Go to Settings > User and Access Tokens
2. Create a new access token (or use existing system user token)
3. Ensure it has these permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Copy the **Access Token**

#### API URL
\`\`\`
https://graph.instagram.com/v18.0/{PHONE_NUMBER_ID}/messages
\`\`\`

### 1.3 Configure Webhook

#### Webhook URL
Your webhook endpoint:
\`\`\`
https://yourdomain.com/api/whatsapp/webhook
\`\`\`

#### Webhook Verify Token
Create a random string for security (e.g., `abc123xyz789`):
\`\`\`
WHATSAPP_WEBHOOK_VERIFY_TOKEN=abc123xyz789
\`\`\`

#### Setup Webhook in Meta Dashboard
1. Go to App Settings > Basic
2. Scroll to "Webhook"
3. Click "Subscribe to this object"
4. Set Webhook URL: `https://yourdomain.com/api/whatsapp/webhook`
5. Set Verify Token: `abc123xyz789`
6. Subscribe to:
   - `messages`
   - `message_status`
   - `message_template_status_update`

## Step 2: Environment Variables

Add these to your `.env.local` file:

\`\`\`env
# WhatsApp Cloud API
WHATSAPP_API_URL=https://graph.instagram.com/v18.0/102345678901234567/messages
WHATSAPP_ACCESS_TOKEN=your_long_access_token_here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=abc123xyz789

# Database (already configured)
MONGODB_URI=mongodb://...

# JWT (already configured)
JWT_SECRET=your_secret_key
\`\`\`

## Step 3: Test the Setup

### Test Webhook Verification
\`\`\`bash
curl -X GET "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=abc123xyz789&hub.challenge=test_challenge"
\`\`\`

Expected response: `test_challenge`

### Test Sending Message
\`\`\`bash
curl -X POST "http://localhost:3000/api/whatsapp/messages" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "chat_id",
    "patientId": "patient_id",
    "patientPhone": "+923391415151",
    "message": "Hello! This is a test message.",
    "messageType": "text",
    "whatsappBusinessPhoneNumberId": "102345678901234567"
  }'
\`\`\`

### Test Incoming Message (Webhook)
\`\`\`bash
curl -X POST "http://localhost:3000/api/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "123456",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "messages": [{
            "from": "923391415151",
            "id": "wamid.test123",
            "timestamp": "1234567890",
            "type": "text",
            "text": { "body": "Test message from patient" }
          }]
        }
      }]
    }]
  }'
\`\`\`

## Step 4: Access the Inbox

### For Admin
1. Go to Dashboard
2. Click "WhatsApp Inbox" in sidebar
3. You should see chat list

### For Receptionist
1. Same as Admin
2. Inbox will appear in menu after login

### Send First Message
1. From WhatsApp app, send a message to your business number
2. The patient's chat should appear in inbox
3. You can reply to the message

## Troubleshooting

### Problem: Webhook not receiving messages

**Check 1: Webhook URL is accessible**
\`\`\`bash
curl https://yourdomain.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=abc123xyz789&hub.challenge=test
\`\`\`

Should return: `test`

**Check 2: Verify token matches**
Make sure `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in env matches what you set in Meta dashboard

**Check 3: Check webhook logs**
\`\`\`javascript
// Add this to webhook route to debug
console.log("[v0] Webhook received:", JSON.stringify(body, null, 2));
\`\`\`

### Problem: Messages not sending

**Check 1: Access token is valid**
\`\`\`bash
curl -X GET \
  "https://graph.instagram.com/v18.0/me?access_token=YOUR_TOKEN" \
  -H "Content-Type: application/json"
\`\`\`

Should return your app info, not an error.

**Check 2: Phone number format**
Must be international format without symbols:
- ✓ `923391415151`
- ✓ `+923391415151`
- ✗ `(923) 391-4151`
- ✗ `92-339-1415151`

**Check 3: API rate limiting**
WhatsApp has rate limits. Wait between requests if getting `429` errors.

### Problem: Chat not appearing

**Check 1: Chat creation**
Manually create chat:
\`\`\`bash
curl -X POST "http://localhost:3000/api/whatsapp/chats" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient_mongodb_id",
    "patientPhone": "923391415151",
    "patientName": "Patient Name",
    "whatsappBusinessPhoneNumberId": "102345678901234567"
  }'
\`\`\`

**Check 2: Patient exists**
Verify patient ID is valid in MongoDB:
\`\`\`javascript
// In MongoDB shell
db.patients.findOne({ _id: ObjectId("patient_id") })
\`\`\`

### Problem: "Unauthorized" errors

**Check 1: JWT token valid**
Token should be stored in sessionStorage during login.

**Check 2: User role correct**
Only admin and receptionist have access. Check:
\`\`\`javascript
// In browser console
sessionStorage.getItem("user") // Should show role
\`\`\`

## Performance Optimization

### Enable Message Indexing
\`\`\`javascript
// Already configured in schema, but verify:
db.whatsappmessages.createIndex({ chatId: 1, createdAt: -1 })
db.whatsappmessages.createIndex({ whatsappMessageId: 1 }, { sparse: true })
\`\`\`

### Configure Polling Interval
Edit `/app/dashboard/inbox/[chatId]/page.tsx`:
\`\`\`typescript
const interval = setInterval(() => {
  fetchMessages()
}, 3000) // Change 3000 to desired milliseconds
\`\`\`

### Cache Chat List
Consider adding Redis cache for frequently accessed chats:
\`\`\`typescript
// Add to fetchChats:
const cacheKey = `chats:${status}:${search}:${page}`;
// Check Redis first
// If miss, fetch from DB and cache
\`\`\`

## Production Deployment

### Vercel Deployment
1. Connect GitHub repository
2. Add environment variables in Vercel dashboard:
   - `WHATSAPP_API_URL`
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - `MONGODB_URI`
   - `JWT_SECRET`
3. Deploy

### Self-Hosted (Docker)
\`\`\`dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
\`\`\`

\`\`\`bash
docker run -e WHATSAPP_API_URL=... -e WHATSAPP_ACCESS_TOKEN=... your-image
\`\`\`

## Monitoring

### Check Health
\`\`\`bash
curl https://yourdomain.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=health_check
\`\`\`

### Monitor Webhook Logs
\`\`\`javascript
db.whatsappwebhooklogs.find().sort({ createdAt: -1 }).limit(100)
\`\`\`

### Check Failed Messages
\`\`\`javascript
db.whatsappmessages.find({ status: "failed" }).pretty()
\`\`\`

## Support

For issues:
1. Check browser console for JavaScript errors
2. Check server logs for API errors
3. Review webhook logs in MongoDB
4. Verify WhatsApp API status at [status.cloud.meta.com](https://status.cloud.meta.com)
5. Check Meta documentation: [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/)
