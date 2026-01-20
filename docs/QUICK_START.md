# WhatsApp Inbox - Quick Start Guide

## 5-Minute Setup

### Step 1: Get WhatsApp Credentials (2 minutes)

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create/Open your Business App
3. Go to WhatsApp > Getting Started
4. Copy these values:
   - **Phone Number ID**: (e.g., `102345678901234567`)
   - **Access Token**: (from Settings > User Tokens)

### Step 2: Add Environment Variables (1 minute)

Update `.env.local`:

```env
WHATSAPP_API_URL=https://graph.instagram.com/v18.0/YOUR_PHONE_NUMBER_ID/messages
WHATSAPP_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
WHATSAPP_WEBHOOK_VERIFY_TOKEN=any_random_string_123
```

### Step 3: Configure Webhook (2 minutes)

In Meta Dashboard > App Settings > Webhooks:

1. **Callback URL**: `https://yourdomain.com/api/whatsapp/webhook`
2. **Verify Token**: `any_random_string_123` (same as env variable)
3. **Subscribe to**: `messages` + `message_status`

### Step 4: Deploy

```bash
npm run build
npm start
```

## Test It

### Send Message from WhatsApp
1. Open WhatsApp on your phone
2. Send message to your business number
3. Go to Dashboard → WhatsApp Inbox
4. You should see the chat appear!

### Reply from Dashboard
1. Click the chat
2. Type a message
3. Click Send
4. You'll receive it on WhatsApp

## Verify It's Working

### Check Webhook Verification
```bash
curl "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=any_random_string_123&hub.challenge=test"
```

Should return: `test`

### Check Message Sending
1. Go to Dashboard → WhatsApp Inbox
2. Open a chat
3. Send a test message
4. Check status updates

### Check Database
```bash
# In MongoDB
db.whatsappchat.find()      # Should have chats
db.whatsappmessages.find()  # Should have messages
```

## Common Issues

| Problem | Solution |
|---------|----------|
| Chats not appearing | Send message from WhatsApp first |
| Messages not sending | Check access token is valid |
| Webhook not working | Verify webhook URL is public and token matches |
| "Unauthorized" error | Check JWT token is stored (check sessionStorage) |
| Chat empty | Messages take a few seconds to appear |

## Environment Variables Explained

```env
# Your WhatsApp Business Phone Number ID (from Meta dashboard)
WHATSAPP_API_URL=https://graph.instagram.com/v18.0/102345678901234567/messages

# Your WhatsApp Business access token (from Meta dashboard)
WHATSAPP_ACCESS_TOKEN=abc123xyz789...

# Random string for webhook security (make it unique)
WHATSAPP_WEBHOOK_VERIFY_TOKEN=my_super_secret_webhook_token

# Already configured
MONGODB_URI=mongodb://...
JWT_SECRET=your_secret_key
```

## File Locations

- **UI Pages**: `/app/dashboard/inbox/`
- **API Routes**: `/app/api/whatsapp/`
- **Database Models**: `/lib/db-server.ts`
- **Utilities**: `/lib/whatsapp-inbox.ts`
- **Docs**: `/docs/WHATSAPP_*.md`

## Access Inbox

**URL**: `http://localhost:3000/dashboard/inbox`

**Allowed Users**: Admin or Receptionist only

## Key Features

✅ Send/receive text messages  
✅ Track message status  
✅ Manage 24-hour window  
✅ Search and filter chats  
✅ Real-time updates  
✅ Full message history  
✅ Auto-created chats on incoming message  

## Next Steps

1. **Full Documentation**: Read `WHATSAPP_INBOX_README.md`
2. **Setup Guide**: Read `WHATSAPP_SETUP_GUIDE.md`
3. **Code Examples**: Read `WHATSAPP_CODE_EXAMPLES.md`
4. **API Reference**: Read `WHATSAPP_INBOX_SETUP.md`

## Deployment

### Vercel
```bash
# Add environment variables in Vercel dashboard
# Then deploy:
git push
```

### Self-Hosted
```bash
# Build
npm run build

# Run
npm start

# Or Docker
docker build -t clinic .
docker run -e WHATSAPP_API_URL=... your-app
```

## Support

- Check `/docs` folder for detailed guides
- Review `/lib/whatsapp-inbox.ts` for utility functions
- Check API errors in browser console
- Review server logs for webhook errors

## Verify Everything Works

### 1. Check Auth
```bash
# Login and check sessionStorage in browser console
console.log(sessionStorage.getItem("token"))
console.log(sessionStorage.getItem("user"))
```

### 2. Check Database Connection
```bash
# Visit dashboard
# If it loads, database is connected
```

### 3. Check Webhook
```bash
# Send message from WhatsApp
# Check if it appears in inbox within 5 seconds
```

### 4. Check Message Sending
```bash
# Reply in inbox
# Check if you receive on WhatsApp within 5 seconds
```

## That's It! 🎉

Your WhatsApp inbox is ready. Staff can now:
- View all patient conversations
- Reply to messages
- See message status
- Search conversations
- Archive chats

For detailed setup, see the full documentation in `/docs` folder.
