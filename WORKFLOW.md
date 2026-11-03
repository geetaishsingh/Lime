# WORKFLOW.md — Complete Application Workflows

This document details the complete end-to-end operational workflows of the Lime application across frontend, backend, database, and WebSockets layers.

---

## 1. Application Startup Workflow

```mermaid
flowchart TD
    Start([System Boot]) --> LoadEnv[Load Backend .env]
    LoadEnv --> ConnectDB[(Connect to MongoDB)]
    ConnectDB --> InitSocket[Initialize Socket.IO Server]
    InitSocket --> StartExpress[Start Express Server on Port 5000]
    
    StartExpress --> ClientStart[Start Vite Frontend on Port 5173]
    ClientStart --> MountApp[Mount React Root / App.jsx]
    MountApp --> CheckToken[useGetUser Hook fires GET /api/user/user]
    MountApp --> ConnectClientSocket[socket.connect() -> establish WS]
    
    CheckToken --> AuthCheck{Session Valid?}
    AuthCheck -- Yes --> SetUserStore[Redux: setuser(userData)]
    SetUserStore --> FetchFeeds[Trigger Feed, Suggestions & Notifications Hooks]
    SetUserStore --> IdentifySocket[Socket: emit 'identity' with userId]
    AuthCheck -- No --> ClearUserStore[Redux: setuser(null)]
    ClearUserStore --> RenderPublic[Display Login / Public Routes]
```

### Steps:
1. **Backend Initialization**: `server.js` loads environment variables, initializes database connectivity via Mongoose (`config/database.js`), configures passport strategies, attaches Socket.IO to the HTTP server via `initSocket`, and begins listening on `PORT` (default 5000).
2. **Frontend Boot**: Vite bundles and mounts `main.jsx` -> `App.jsx`.
3. **Session Rehydration**: `useGetUser.jsx` dispatches a request to `/api/user/user`. If the browser presents a valid signed `token` cookie, the backend deserializes the user and returns the user profile, setting `loading: false` in Redux.
4. **Socket Registration**: `socket.connect()` opens the real-time tunnel. Upon connection, if `user._id` exists, the client emits `identity` with the user ID, recording the socket connection in `userSocketMap`.

---

## 2. User Registration, OTP & Login Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Register as Register.jsx
    participant OTP as VerifyOtp.jsx
    participant Login as Login.jsx
    participant API as Auth Controller
    participant Mail as Nodemailer
    participant DB as MongoDB

    User->>Register: Enter name, username, email, password
    Register->>API: POST /api/auth/signup
    API->>DB: Check if username/email exists
    API->>API: Hash password with bcrypt & generate 6-digit OTP
    API->>DB: Save to PendingSignup collection
    API->>Mail: Send verification email with OTP
    API-->>Register: 200 OK ("OTP sent to email")
    Register->>OTP: Redirect to /verify-otp
    
    User->>OTP: Enter 6-digit OTP code
    OTP->>API: POST /api/auth/verify-otp
    API->>DB: Validate OTP against PendingSignup
    API->>DB: Create permanent User document
    API-->>OTP: 201 Created ("Signup successful")
    OTP->>Login: Redirect to /login
    
    User->>Login: Enter username/email + password
    Login->>API: POST /api/auth/login
    API->>DB: Fetch user by username or email
    API->>API: bcrypt.compare(password, user.password)
    API->>API: Sign JWT with user._id
    API-->>Login: 200 OK + Set-Cookie: token (HttpOnly) + User data
    Login->>Login: dispatch(setuser(data.user))
    Login->>Login: navigate("/")
```

---

## 3. Protected Routing & Session Persistence Workflow

```mermaid
flowchart TD
    ReqRoute[User Navigates to Route] --> CheckProtected{Inside Protected Route?}
    CheckProtected -- No --> RenderPublicPage[Render Register / Login / ForgotPassword]
    CheckProtected -- Yes --> CheckLoading{Redux loading == true?}
    
    CheckLoading -- Yes --> ShowSplash[Display Lime Animated Splash Screen]
    CheckLoading -- No --> CheckUser{Redux user != null?}
    
    CheckUser -- Yes --> RenderDashboard[Render Dashboard Shell with LeftSidebar]
    RenderDashboard --> RenderChild[Render Outlet: Feed / Messages / Profile / CreatePost]
    CheckUser -- No --> RedirectLogin[Navigate to /login with replace: true]
```

---

## 4. Redux Global State Management Workflow

```mermaid
flowchart LR
    Component[React Component] -->|User Interaction| Dispatch[dispatch(action)]
    SocketEvent[Socket.IO Event] -->|Incoming Data| Dispatch
    DataHook[Custom Data Hook] -->|Axios Response| Dispatch
    
    Dispatch --> SliceReducer[userSlice Reducer]
    SliceReducer --> StateUpdate[Updated Redux Store State]
    
    StateUpdate --> ReRender[Subscriber Components Re-render Optimistically]
    StateUpdate --> SyncAttr[Theme Sync: document.documentElement data-theme]
```

### Key Global Subscriptions:
* **Posts Feed**: Feed updates via `setPosts`, `addNewPost`, `removePost`, and `updatePostLikesInFeed`.
* **Badge Counters**: Unread messages badge (`unreadMessagesCount`) and notifications badge (`unreadNotificationsCount`) update in real time.
* **Theme Switching**: `toggleTheme()` updates both the Redux store and the DOM `data-theme` attribute for instant stylesheet recoloring.

---

## 5. Post Publishing & Media Handling Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Creator
    participant UI as CreatePost.jsx
    participant API as Post Controller
    participant Media as mediaStorage.js
    participant Cloud as Cloudinary / Local Disk
    participant DB as MongoDB (Post Model)
    participant Socket as Socket.IO

    Creator->>UI: Selects photos (up to 10) or video (< 60s)
    opt Image Rotation
        Creator->>UI: Clicks "Rotate"
        UI->>UI: HTML5 Canvas rotates image 90° clockwise
    end
    Creator->>UI: Enters caption & clicks "Share Post"
    UI->>API: POST /api/post/add-post (multipart/form-data)
    API->>Media: Process file buffers
    alt Video
        Media->>Cloud: Upload video stream
    else Images
        Media->>Cloud: Sharp resize & upload images
    end
    Cloud-->>Media: Return hosted media URLs
    Media-->>API: Array of media objects
    API->>DB: Create Post document (author, media, caption, rotations)
    API->>Socket: io.emit("post-created", newPost)
    API-->>UI: 200 OK + newPost
    UI->>UI: dispatch(addNewPost(newPost))
    UI->>Creator: Toast: "Post published successfully!" & navigate to feed
```

---

## 6. Direct Chat & Real-Time Messaging Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Alice
    actor Bob
    participant AliceUI as Alice's ChatBox
    participant Server as Socket.IO & Message Controller
    participant DB as MongoDB
    participant BobUI as Bob's ChatBox / Sidebar

    Alice->>AliceUI: Types message and/or attaches photo/video
    AliceUI->>Server: POST /api/message/send/:bobId
    Server->>DB: Create Message document (status: "sent")
    Server->>DB: Update or create Conversation record
    
    Server->>Server: Check if Bob is connected in userSocketMap
    alt Bob is Online
        Server->>DB: Update Message status to "delivered"
        Server->>BobUI: socket.emit("newMessage", message)
        Server->>BobUI: socket.emit("unreadMessageCount", { count })
        Server-->>AliceUI: socket.emit("newMessage", message with status "delivered")
    else Bob is Offline
        Server-->>AliceUI: Return message with status "sent"
    end
    
    opt Bob Views Conversation
        BobUI->>Server: PUT /api/message/read/:aliceId
        Server->>DB: Mark messages as isRead = true, status = "read"
        Server->>AliceUI: socket.emit("messagesSeen", { by: bobId })
    end
```

---

## 7. WebRTC Audio & Video Calling Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Caller
    actor Callee
    participant CallerUI as Caller UI (CallPage)
    participant Signal as Socket.IO Server
    participant CalleeModal as IncomingCallModal
    participant CalleeUI as Callee UI (CallPage)

    Caller->>Signal: socket.emit("call-user", { recipientId, caller, callType, roomId })
    Signal->>CalleeModal: socket.emit("incoming-call", { caller, callType, roomId })
    CalleeModal->>Callee: Shows pulsing incoming call dialog
    
    alt Callee Accepts
        Callee->>Signal: socket.emit("call-response", { callerId, accepted: true, roomId })
        CalleeModal->>CalleeUI: navigate to /call?roomId=...
        Signal->>CallerUI: socket.emit("call-response", { accepted: true })
        
        CallerUI->>Signal: socket.emit("join-room", roomId)
        CalleeUI->>Signal: socket.emit("join-room", roomId)
        
        CallerUI->>CallerUI: createOffer() -> setLocalDescription()
        CallerUI->>Signal: socket.emit("signal", { roomId, data: { sdp: offer } })
        Signal->>CalleeUI: socket.emit("signal", { data: { sdp: offer } })
        CalleeUI->>CalleeUI: setRemoteDescription() -> createAnswer() -> setLocalDescription()
        CalleeUI->>Signal: socket.emit("signal", { roomId, data: { sdp: answer } })
        Signal->>CallerUI: socket.emit("signal", { data: { sdp: answer } })
        
        Note over CallerUI,CalleeUI: ICE candidate exchange via socket 'signal' event
        Note over CallerUI,CalleeUI: PeerConnection State: 'connected' -> Audio/Video Streams Flow
    else Callee Declines
        Callee->>Signal: socket.emit("call-response", { callerId, accepted: false })
        Signal->>CallerUI: socket.emit("call-response", { accepted: false })
        CallerUI->>Caller: Show "Call declined" and return to chat
    end
```

---

## 8. Real-Time Notification Workflow

```mermaid
flowchart TD
    Event[User Likes Post / Comments / Follows] --> Controller[Post / User Controller]
    Controller --> DBNotif[Save Notification in MongoDB]
    Controller --> CheckSocket{Is Target User Online?}
    
    CheckSocket -- Yes --> EmitSocket[Socket.IO: emit 'notification' to Target]
    EmitSocket --> ClientToast[Client App.jsx: Show Hot Toast Alert]
    EmitSocket --> ReduxNotif[Redux: dispatch addNotification]
    ReduxNotif --> UpdateBadge[Increment Unread Notifications Badge]
    
    CheckSocket -- No --> PersistentOnly[Notification Stored in DB for Next Login]
```

---

## 9. Logout Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Sidebar as LeftSidebar.jsx
    participant API as /api/auth/logout
    participant Store as Redux Toolkit
    participant WS as Socket.IO Client

    User->>Sidebar: Clicks "Log Out" button
    Sidebar->>API: GET /api/auth/logout (withCredentials: true)
    API->>API: res.clearCookie("token")
    API-->>Sidebar: 200 OK ("Logged out successfully")
    Sidebar->>Store: dispatch(resetUserState())
    Sidebar->>WS: socket.disconnect()
    Sidebar->>Sidebar: navigate("/login")
```

---

## 10. Error Handling & Resilience Architecture

1. **Backend Unhandled Errors**: Central error middleware in `server.js` catches all thrown controller exceptions, logs stack traces, and formats a standardized `{ success: false, message: err.message }` JSON response with corresponding HTTP status codes.
2. **Database Fallback Mode**: If MongoDB is unavailable during startup, `server.js` logs a diagnostic warning and launches the Express server in degraded mode so API health checks remain responsive.
3. **Frontend API Interceptor**: Axios requests are configured with `{ withCredentials: true }`. API failure responses surface clean toast errors via `react-hot-toast` instead of crashing the UI.
4. **Media Fallback Mechanisms**: Broken or inaccessible image URLs trigger `onError` callbacks that gracefully substitute styled placeholder cards or UI-Avatars without layout distortion.

---

## 11. Multi-Format Media Upload & Instant Preview Conversion Workflow

```mermaid
flowchart TD
    Select[User selects multiple media files in CreatePost] --> TypeCheck{Is it a Video or Image?}
    
    TypeCheck -- Video --> VidFormat{Is video codec natively playable?}
    VidFormat -- Yes --> NativePlayer[Play via CustomVideoPlayer with controls]
    VidFormat -- No --> FallbackCard[Display .pro-video-fallback card with format info]
    
    TypeCheck -- Image --> NativeImg{Is format web-safe?}
    NativeImg -- Yes (JPG/PNG/WEBP/GIF/AVIF) --> BlobURL[URL.createObjectURL -> Native &lt;img&gt;]
    NativeImg -- No (HEIC/TIFF/RAW/PSD/CR2) --> ShowBadge[Display .thumb-fallback-badge immediately]
    ShowBadge --> CallConvert[POST /api/post/convert-preview with file buffer]
    BlobURL --> OnErr{Does client &lt;img&gt; fail?}
    OnErr -- Yes --> ShowBadge
    OnErr -- No --> RenderNative[Display rendered preview]
    
    CallConvert --> SharpServer[Server sharp: auto-orient, resize & transcode to JPEG]
    SharpServer --> ReturnB64[Return base64 JPEG data URL]
    ReturnB64 --> UpdateState[Update item.previewUrl & clear error state]
    UpdateState --> RenderConverted[Thumbnail & Active preview instantly display converted image]
```

