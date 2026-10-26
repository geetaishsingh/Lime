# Lime — Modern Full-Stack Social Media Platform

Lime is an original, production-ready, full-stack social media web application designed with an authentic modern UI/UX, robust security, real-time communication, and responsive layouts across desktop, tablet, and mobile devices.

---

## Architecture Overview

- **Frontend**: React 19 + Vite, Redux Toolkit, React Router DOM 7, Sass (SCSS) design tokens with Dark/Light themes, Socket.IO Client, Lucide React & React Icons.
- **Backend**: Express.js (Node.js ES Modules), MongoDB with Mongoose ODM, JWT authentication, BcryptJS, Sharp image processing, Multer file upload, Socket.IO real-time server, Nodemailer.
- **Media Engine**: Dual-mode media storage (Cloudinary when configured; automatic local static storage in `/uploads` when developing locally).
- **Email Engine**: Dual-mode email verification (Nodemailer when SMTP credentials configured; formatted development console logging when testing locally).
- **Real-Time Communication**: Socket.IO signaling for messaging, user presence (Active now / Offline), read receipts (`sent`, `delivered`, `read`), audio/video calling with WebRTC, and persistent notifications.

---

## 15 Completed & Verified Requirements

1. **Block / Unblock System**:
   - Complete database persistence in `User.blockedUsers`.
   - Blocking automatically severs follower/following connections.
   - Profile displays a blocked user banner with an immediate "Unblock" button.
   - Home feed filters out posts from blocked users and users who have blocked the requesting user.
   - Synchronous Redux state management via `toggleBlockUserInState`.

2. **Content Moderation & Report System**:
   - Dedicated `Report` model (`reporter`, `reportedUser`, `reportedPost`, `reason`, `details`, `status`).
   - Interactive report modals available on both Post options dropdown and User Profile options.
   - Categorized reporting reasons (`spam`, `harassment`, `inappropriate`, `hate_speech`, `misinformation`, `other`) with optional descriptive details.
   - Real backend API integration via `POST /api/user/report`.

3. **Multiple Image Upload**:
   - Post creation supports selecting up to 10 photos simultaneously.
   - Multi-photo preview thumbnail strip with active image selector, per-image 90° canvas rotation, and individual photo removal.
   - Post card renders an image carousel with Left/Right navigation controls, dot indicators, and an active counter badge (`1/3`).

4. **Streamlined Login (OTP Removed from Login)**:
   - Login uses direct username/email and password authentication without OTP hurdles.
   - 6-digit email OTP verification is preserved for account signup (`/verify-otp`) with 10-minute expiry, resend cooldown, and 5-attempt brute-force protection.
   - Forgot password and password recovery OTP flow preserved.

5. **Cover Image Management**:
   - Direct cover photo update button right on the profile banner.
   - Live preview modal before uploading with 90° canvas rotation control.
   - Synchronized upload via `POST /api/user/profile/edit` with immediate Redux update.

6. **Status / Story Likes**:
   - `Story` model includes `likes` user array.
   - Interactive Heart like button on the story viewer with real-time like counts.
   - Optimistic UI updates with heart pop animation and automatic notification dispatch to story authors.
   - API endpoint: `POST /api/story/:storyId/like`.

7. **Audio & Video Calling**:
   - WebRTC peer-to-peer signaling over Socket.IO (`call-user`, `call-response`, `signal`, `hang-up`).
   - Global `IncomingCallModal` mounted at root (`App.jsx`), alerting recipients on any screen with caller avatar, name, and Accept / Decline controls.
   - Dedicated `/call` page supporting both Video and Audio-only modes.
   - Graceful camera permission handling (automatically falls back to audio mode if video is denied or camera is absent).
   - Microphone Mute/Unmute, Camera On/Off, and clean call hang-up.

8. **Chat Media UI & Lightbox**:
   - Send both image and video attachments with live pre-send preview and remove button.
   - Upload progress indicator during sending.
   - Redesigned message bubbles with clear timestamps and delivery/read ticks (`Check` for sent, gray `CheckCheck` for delivered, green `CheckCheck` for read).
   - Fullscreen media lightbox viewer when clicking on chat media, with Zoom In, Zoom Out, Reset, Download, and Close controls.

9. **Mobile Back Navigation**:
   - Prominent, touch-friendly back buttons on all mobile views:
     - Profile (`.profile-mobile-top-bar`)
     - ChatBox (`.chat-back-btn`)
     - Create Post (`.back-btn`)
     - Edit Profile (`.back-btn`)
     - Notifications (`.notif-back-btn`)
     - Search / Explore (`.search-back-btn`)
     - Calling Screen (`.call-back-btn`)

10. **Chat Selection & Action Controls**:
    - Dedicated "Select" mode toggle in the chat header.
    - Persistent top action toolbar showing selection count ("2 selected"), "Select All" / "Deselect All", "Delete for me", and "Delete for everyone" (enabled when selecting own messages).
    - Controls remain visible, stable, and functional while toggling message selections.

11. **Profile Picture Fullscreen Viewer**:
    - Clicking the avatar in `Profile.jsx` opens an interactive fullscreen viewer.
    - Features Zoom In (+), Zoom Out (-), Reset (100%), and Close (X) controls with keyboard Escape listener.

12. **Video Upload UI**:
    - Remove/Cancel button repositioned to the top-right corner (`top: 14px; right: 14px; z-index: 30`) with a dark translucent pill and drop shadow.
    - Completely eliminates collisions with HTML5 video player controls at the bottom.
    - Video duration badge (`Xs / max 60s`) and file size badge (`X.X MB`).
    - Live upload progress bar (`0% -> 100%`).

13. **Theme Focus & Highlight Effects**:
    - Removed unwanted default blue browser tap highlights via `-webkit-tap-highlight-color: transparent`.
    - Removed default blue browser focus rings on mouse click (`:focus:not(:focus-visible) { outline: none; }`).
    - Added accessible Lime-brand focus indicator rings: `:focus-visible { outline: 2px solid var(--lime-accent); outline-offset: 2px; }`.

14. **Status Viewer Controls**:
    - Dedicated top control bar inside the story card containing User Badge on the left, and Sound Mute/Unmute (`Volume2`/`VolumeX`), Pause/Play, Delete, and Close (`X`) buttons on the right.
    - Control buttons use translucent backdrop blur to remain visible over any story background.
    - Fully responsive layout on mobile screens (`@media (max-width: 600px)`).

15. **Stable Home Feed**:
    - Deterministic server-side sorting with secondary tie-breaker: `.sort({ createdAt: -1, _id: -1 })`.
    - In-place Redux state updates (`updatePostLikesInFeed`, bookmark toggles) to prevent posts from jumping or reordering on like or comment.

---

## Installation & Setup

### 1. Server Setup

```bash
cd Line/server
npm install
```

Create a `.env` file inside `Line/server` based on `.env.example`:

```env
PORT=5000
MONGO_URL=mongodb://127.0.0.1:27017/lime_social
JWT_SECRET_KEY=lime_super_secure_jwt_secret_key_2026

# Optional: Cloudinary Storage (if omitted, media is saved locally to /uploads)
CLOUD_NAME=your_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_SECRET_API_KEY=your_cloudinary_secret_key

# Optional: Nodemailer Email (if omitted, OTPs are printed to the server terminal)
EMAIL=your_email@gmail.com
PASSWORD=your_gmail_app_password
```

Start the backend:
```bash
npm start
```

### 2. Client Setup

```bash
cd Line/client
npm install
```

Create a `.env` file inside `Line/client`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Start the frontend:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

The application will be running at `http://localhost:5173`.
