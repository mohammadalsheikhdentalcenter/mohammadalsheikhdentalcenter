# WhatsApp Portal Visual Guide

## UI Layout Overview

### Desktop View (1280px+)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Dashboard Header                            │
├────────────────┬────────────────────────────────────────────────┤
│                │                                                │
│   WHATSAPP     │              CHAT AREA                         │
│   SIDEBAR      │                                                │
│                │  ┌──────────────────────────────────────────┐ │
│  ┌──────────┐  │  │ [ ← ] [ Avatar ] Name          [ 10:32 ] │ │
│  │  Chats   │  │  │ [ ← ] [ Phone ]                          │ │
│  └──────────┘  │  ├──────────────────────────────────────────┤ │
│                │  │                                          │ │
│  ┌──────────┐  │  │  Messages                                │ │
│  │[🔍Search]│  │  │  ┌──────────────────────────────────┐   │ │
│  └──────────┘  │  │  │ Customer: Hi, are you there?     │   │ │
│                │  │  │ 2:15 PM                          │   │ │
│  ┌──────────┐  │  │  └──────────────────────────────────┘   │ │
│  │ ✓ Chat 1 │  │  │                                          │ │
│  │ 5m ago   │  │  │              ┌────────────────────────┐  │ │
│  │ Last msg │  │  │              │ Us: Great! How can... ✓✓ │ │
│  │ [2]      │  │  │              │ 2:16 PM                  │ │
│  └──────────┘  │  │              └────────────────────────┘  │ │
│                │  │                                          │ │
│  ┌──────────┐  │  │  ┌─────────────────┐                    │ │
│  │   Chat 2 │  │  │  │ [Image Preview] │ 2:20 PM          │ │
│  │ 1h ago   │  │  │  │ (no download)   │                    │ │
│  │ Img sent │  │  │  └─────────────────┘                    │ │
│  └──────────┘  │  │                                          │ │
│                │  ├──────────────────────────────────────────┤ │
│  ┌──────────┐  │  │ [Type message...        ] [►]            │ │
│  │   Chat 3 │  │  └──────────────────────────────────────────┘ │
│  │ 3d ago   │  │                                                │
│  └──────────┘  │                                                │
│                │                                                │
└────────────────┴────────────────────────────────���───────────────┘
```

---

## Tablet View (768px - 1280px)

```
┌────────────────────────────────┐
│       Dashboard Header          │
├────────────────────────────────┤
│  [≡]                           │
│  Sidebar (auto-collapse)       │
│  Chat Area (responsive)        │
│  ┌──────────────────────────┐  │
│  │ [←] Name               │  │  
│  ├──────────────────────────┤  │
│  │ Messages (reflow)        │  │
│  │ Media displays properly  │  │
│  └──────────────────────────┘  │
│  [Input Box]                   │
│                                │
└────────────────────────────────┘
```

---

## Mobile View (< 768px)

```
┌──────────────────┐
│ [ ≡ ]  [Name]  [ ] │  ← Collapsible Sidebar
├──────────────────┤
│                  │
│  Messages        │
│  ┌────────────┐ │
│  │ Customer:  │ │
│  │ Hi there!  │ │
│  │ 2:15 PM    │ │
│  └────────────┘ │
│                  │
│      ┌────────┐  │
│      │  Us:   │  │
│      │  Hello!│  │
│      │ 2:16PM│  │
│      └────────┘  │
│                  │
│  [Image: 2:20PM]│
│  (inline)        │
│                  │
├──────────────────┤
│ [Type msg...] [→]│
├──────────────────┤
│ [≡] Menu Button  │  ← Floating hamburger
│ (bottom-right)   │
└──────────────────┘
```

---

## Component Hierarchy

```
Dashboard Layout
  │
  ├── WhatsAppChatSidebar
  │   ├── Search Input
  │   │   └── Debounced Search
  │   │
  │   ├── Chat List Container
  │   │   └── WhatsAppChatListItem (repeating)
  │   │       ├── Avatar
  │   │       ├── Chat Name
  │   │       ├── Last Message Preview
  │   │       ├── Unread Badge
  │   │       └── Timestamp
  │   │
  │   └── Mobile Menu Button
  │
  └── Main Chat Area
      │
      ├── WhatsAppChatHeader
      │   ├── Back Button (mobile)
      │   ├── Avatar
      │   ├── Customer Name
      │   └── Phone Number
      │
      ├── Messages Container
      │   └── WhatsAppMessageBubble (repeating)
      │       ├── Text Content
      │       ├── Media Content (if present)
      │       │   ├── Image Preview
      │       │   ├── Video Player
      │       │   ├── Audio Player
      │       │   └── Document Link
      │       ├── Timestamp
      │       └── Status Indicator
      │
      ├── 24-Hour Window Alert (conditional)
      │
      └── Message Input
          ├── Text Input
          └── Send Button
```

---

## Message Bubble Styles

### Received (Customer)
```
┌─────────────────────┐
│ Customer message    │
│ Left aligned        │
│ Gray background     │
│ 2:15 PM             │
└─────────────────────┘
```

### Sent (Business)
```
                ┌─────────────────────┐
                │ Our reply message   │
                │ Right aligned       │
                │ Blue background     │
                │ 2:16 PM ✓✓          │
                └─────────────────────┘
```

### With Image
```
┌──────────────────────┐
│ ┌──────────────────┐ │
│ │  Image Preview   │ │
│ │  (no download)   │ │
│ │  Max-width: auto │ │
│ └──────────────────┘ │
│ Caption text (opt)   │
│ 2:20 PM              │
└──────────────────────┘
```

### With Video
```
┌──────────────────────┐
│ ┌──────────────────┐ │
│ │ [►] Video Player │ │
│ │ Full controls    │ │
│ └──────────────────┘ │
│ Video from WhatsApp  │
│ 2:25 PM              │
└──────────────────────┘
```

### Document
```
┌──────────────────────────┐
│ ┌──┐                     │
│ │📄│ document.pdf        │
│ └──┘ 2.4 MB [↓Download] │
│ Document file           │
│ 2:30 PM                 │
└──────────────────────────┘
```

---

## Color Palette

### Primary Colors
```
Blue (Primary):        #3b82f6  ● Sent messages, buttons
Gray (Background):     #f3f4f6  ● Page background
White (Surface):       #ffffff  ● Cards, sidebars
Gray (Border):         #e5e7eb  ● Subtle borders
```

### Text Colors
```
Primary Text:          #111827  ● Main content
Secondary Text:        #6b7280  ● Timestamps, hints
Muted Text:            #9ca3af  ● Disabled, secondary
```

### Status Colors
```
Success/Online:        #10b981  ● Online indicator
Warning/Outside 24h:   #f59e0b  ● Alert notifications
Error:                 #ef4444  ● Failed messages
```

---

## Typography Scale

```
H1: 28px / 36px    - Chat page title
H2: 24px / 32px    - Chat name header
H3: 18px / 28px    - Not commonly used
Body: 14px / 20px  - Message text, labels
Small: 12px / 16px - Timestamps, badges
Tiny: 11px / 14px  - Hint text
```

---

## Spacing System

```
0px   - No space
4px   - xs (tight)
8px   - sm (compact)
12px  - md (normal)
16px  - lg (comfortable)
20px  - xl (spacious)
24px  - 2xl (very spacious)
```

---

## Interactive States

### Button States
```
Default:   bg-blue-500 text-white cursor-pointer
Hover:     bg-blue-600 (darker)
Active:    bg-blue-700 (even darker)
Disabled:  bg-gray-300 cursor-not-allowed opacity-50
```

### Input States
```
Default:   border-gray-300 bg-white
Focus:     border-blue-500 ring-1 ring-blue-500
Error:     border-red-500
```

### Chat Item States
```
Default:   hover:bg-gray-50 transition-colors
Selected:  bg-blue-50 border-l-4 border-l-blue-500
Unread:    font-semibold text-gray-900 badge
```

---

## Responsive Breakpoints

```
Mobile:    < 640px    (sm)    Full-screen chat
Small:     640px+     (sm)    Responsive
Medium:    768px+     (md)    Sidebar visible
Large:     1024px+    (lg)    Full layout
XL:        1280px+    (xl)    Maximum width
2XL:       1536px+    (2xl)   Ultra-wide
```

---

## Mobile Interactions

### Sidebar Toggle
```
1. User clicks hamburger menu (bottom-right)
   ↓
2. Overlay appears (semi-transparent)
   ↓
3. Sidebar slides in from left
   ↓
4. User clicks chat
   ↓
5. Sidebar auto-closes
   ↓
6. Chat displays full-width
```

### Message Bubble
```
Touch (long press):
  └─ Future: Copy, Forward, Delete
  
Swipe (right):
  └─ Typically: Reply (not implemented)

Normal Tap:
  └─ No action (media taps to download)
```

### Image/Media Preview
```
Touch on Media:
  └─ If image: Lightbox view (future)
  └─ If video: Full controls
  └─ If document: Download starts
```

---

## Loading States

### Chat List Loading
```
┌─────────────────┐
│ [·····]         │ ← Skeleton
│ [·····]         │
│ [·····]         │
└─────────────────┘
```

### Message Loading
```
┌────────────────────────┐
│ [·· Messages Loading ··] │
│ Spinner animation       │
└────────────────────────┘
```

### Media Loading
```
┌──────────────────┐
│  [Spinner]       │
│  Loading image...│
└──────────────────┘
```

---

## Empty States

### No Chats Yet
```
┌────────────────────────┐
│                        │
��  💬 No chats yet      │
│                        │
│  Waiting for messages  │
│  from customers        │
│                        │
└────────────────────────┘
```

### Chat Empty
```
┌────────────────────────┐
│                        │
│  Start a conversation  │
│                        │
│  No messages here yet  │
│  Send the first one!   │
│                        │
└────────────────────────┘
```

---

## Error States

### Failed Message
```
┌─────────────────────────┐
│ Message failed ✗        │
│ Retry sending           │
│ 2:45 PM                 │
└─────────────────────────┘
```

### Failed Media Load
```
┌──────────────────┐
│ [⚠️]             │
│ Unable to load   │
│ image            │
└──────────────────┘
```

### Network Error
```
┌────────────────────────────────┐
│ ⚠️  Failed to fetch messages   │
│ [Retry]                        │
└────────────────────────────────┘
```

---

## Accessibility Features

### Keyboard Navigation
```
Tab        - Navigate between elements
Enter      - Send message / Click button
Escape     - Close sidebar (mobile)
Space      - Play/pause media
```

### Screen Reader Support
```
Aria Labels - All buttons labeled
Alt Text    - Images have alt text
Landmarks   - Semantic HTML
Color Contrast - WCAG AA compliant
```

### Touch Targets
```
Minimum: 44px × 44px
Buttons: 44px × 44px minimum
Input:   40px × 40px minimum
Chat Items: 48px × 48px minimum
```

---

## Animation & Transitions

### Page Transitions
```
Duration:   300ms
Easing:     cubic-bezier(0.4, 0, 0.2, 1)
Properties: opacity, transform
```

### Sidebar Mobile
```
Duration:   250ms
Easing:     ease-in-out
Type:       Slide from left
Overlay:    Fade in/out
```

### Message Bubble
```
Duration:   200ms
Easing:     ease-out
Effect:     Fade in, slight scale
```

### Loading Spinner
```
Duration:   1000ms
Type:       Rotate 360°
Repeat:     Infinite
```

---

## Dark Mode (Future)

### Color Mapping
```
Light Theme          Dark Theme
─────────────────────────────────
#ffffff (white)   ← #1f2937 (dark gray)
#f3f4f6 (light)   ← #111827 (darker gray)
#111827 (dark)    ← #f3f4f6 (light)
#e5e7eb (border)  ← #374151 (darker border)
```

---

## Summary

**Layout:**
- Responsive sidebar + main area
- Mobile: Full-screen with collapsible sidebar
- Desktop: Side-by-side layout

**Components:**
- Professional message bubbles
- Real-time media preview
- Unread indicators
- Status badges

**Interactions:**
- Smooth animations
- Touch-friendly
- Accessible
- Responsive

**Design:**
- Clean, professional
- Blue and gray palette
- Modern typography
- Subtle shadows

✅ Ready for production! 🚀
