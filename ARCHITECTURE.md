# ARCHITECTURE.md — Technical Architecture Blueprint

This document details the complete technical architecture of the **Lime** full-stack application, outlining system boundaries, communication protocols, state design, database schemas, and real-time coordination.

---

## 1. Overall Application Architecture

```mermaid
graph TB
    subgraph ClientLayer ["Client Layer (React 19 + Vite)"]
        BrowserUI["User Browser / Mobile PWA"]
        ReactRouter["React Router 7 (createBrowserRouter)"]
        ReduxStore["Redux Toolkit Global Store (user.slice.js)"]
        SocketClient["Socket.IO Client Singleton (socket.js)"]
        WebRTCClient["WebRTC RTCPeerConnection"]
    end

    subgraph GatewayLayer ["Network & Security Gateway"]
        CORS["CORS Policy (localhost:5173 / credentials: true)"]
        CookieGuard["HttpOnly Signed JWT Cookie ('token')"]
        RateLimiter["Body Parser Limit: 100MB"]
    end

    subgraph ServerLayer ["Backend Application Server (Express 5 + Node.js)"]
        AuthModule["Auth Controller & Passport.js"]
        UserModule["User & Follow Controller"]
        PostModule["Post, Like & Comment Controller"]
        MsgModule["Message & Conversation Controller"]
        NotifModule["Notification Controller"]
        SocketServer["Socket.IO Real-Time & Signaling Hub"]
        MediaService["mediaStorage.js (Sharp + Memory Buffer)"]
    end

    subgraph StorageLayer ["Persistence & Cloud Storage"]
        MongoDB[(MongoDB Database)]
        Cloudinary[(Cloudinary Media Storage)]
        LocalStorage[(Local /uploads/ Disk Storage)]
    end

    BrowserUI --> ReactRouter
    ReactRouter --> ReduxStore
    BrowserUI --> SocketClient
    BrowserUI --> WebRTCClient

    BrowserUI -->|HTTPS / Axios| GatewayLayer
    SocketClient <-->|WebSockets (Port 5000)| SocketServer
    WebRTCClient <-->|P2P Media Stream| WebRTCClient

    GatewayLayer --> ServerLayer
    ServerLayer --> MongoDB
    MediaService --> Cloudinary
    MediaService --> LocalStorage
```

---

## 2. Frontend & Backend Communication Protocols

1. **REST API (HTTP/1.1 & HTTP/2)**:
   * **Payload Format**: `application/json` for standard queries and mutations; `multipart/form-data` for photo galleries and video uploads.
   * **Credential Handling**: All client requests set `{ withCredentials: true }` to transmit the signed `token` HttpOnly cookie automatically.
   * **Response Structure**:
     ```json
     {
       "success": true,
       "message": "Human-readable status",
       "data": {}
     }
     ```
2. **WebSockets (Socket.IO v4)**:
   * Transport: Automatic negotiation (`websocket` preferred, `polling` fallback).
   * Event Channels:
     * `identity`: Client establishes identity with `{ userId }`.
     * `newMessage`: Direct message delivery.
     * `unreadMessageCount`: Updates unread message counter globally.
     * `notification`: Real-time like, comment, or follow alert.
     * `call-user` / `incoming-call` / `call-response` / `signal` / `hang-up`: WebRTC audio/video call signaling.

---

## 3. Component Hierarchy & Layout Structure

```mermaid
graph TD
    App["App.jsx (Root Theme, Toast Container, Socket Sync)"]
    
    App --> PublicRoutes["Public Routes"]
    PublicRoutes --> Login["Login.jsx"]
    PublicRoutes --> Register["Register.jsx"]
    PublicRoutes --> VerifyOtp["VerifyOtp.jsx"]
    PublicRoutes --> ForgotPass["ForgotPassword.jsx"]
    
    App --> ProtectedGuard["Protected.jsx (Auth Guard + Splash Loader)"]
    ProtectedGuard --> DashboardShell["Dashboard.jsx (Layout Shell)"]
    ProtectedGuard --> CallScreen["CallPage.jsx (WebRTC Fullscreen)"]
    
    DashboardShell --> LeftSidebar["LeftSidebar.jsx (Fixed 240px Sidebar)"]
    LeftSidebar -.-> FlyoutNotif["Notifications.jsx (Flyout Drawer)"]
    LeftSidebar -.-> FlyoutSearch["Search.jsx (Flyout Drawer)"]
    
    DashboardShell --> MainContentArea["<main className='main-content-area'>"]
    MainContentArea --> CentralOutlet["<Outlet />"]
    
    CentralOutlet --> FeedLayout["Layout.jsx (Main Community View)"]
    FeedLayout --> StoriesBar["StoriesBar.jsx (24-Hour Stories Strip)"]
    FeedLayout --> CentralFeed["Posts.jsx (Filter Tabs & Feed List)"]
    CentralFeed --> PostCard["Post.jsx (Media Carousel, Actions, Comments)"]
    FeedLayout --> RightSidebar["RightSideBar.jsx (User Snapshot & Suggestions)"]
    
    CentralOutlet --> MessagesPage["MessagePage.jsx (Direct Messages)"]
    MessagesPage --> ChatList["ChatList.jsx (Conversations Column)"]
    MessagesPage --> ChatBox["ChatBox.jsx (Chat Thread, Media Upload, Call Buttons)"]
    
    CentralOutlet --> CreatePostPage["CreatePost.jsx (2-Column Media Publisher)"]
    CentralOutlet --> ProfilePage["Profile.jsx (Profile Header, Grid & Tabs)"]
    CentralOutlet --> EditProfilePage["EditProfile.jsx (Profile Settings)"]
```

---

## 4. Redux Store Architecture (`user.slice.js`)

```mermaid
classDiagram
    class ReduxStore {
        +UserObject user
        +boolean loading
        +string theme ("dark" | "light")
        +PostObject[] posts
        +PostObject[] userPosts
        +PostObject[] myLikes
        +string[] myBookmarks
        +UserObject[] mySuggestions
        +NotificationObject[] notifications
        +number unreadNotificationsCount
        +number unreadMessagesCount
        +StoryObject[] activeStories
        +setuser(payload)
        +resetUserState()
        +toggleTheme()
        +addNewPost(payload)
        +removePost(postId)
        +updatePostLikesInFeed(payload)
        +setUnreadMessagesCount(count)
        +addNotification(payload)
        +markAllNotificationsReadInStore()
    }
```

---

## 5. Routing Hierarchy

```
/
├── register               (Public - Register.jsx)
├── verify-otp             (Public - VerifyOtp.jsx)
├── login                  (Public - Login.jsx)
├── forgot-password        (Public - ForgotPassword.jsx)
└── [Protected Guard]      (Protected.jsx)
    ├── call               (Protected - CallPage.jsx)
    └── [Dashboard Shell]  (Dashboard.jsx - LeftSidebar)
        ├── ''             (Index - Layout.jsx: StoriesBar + Posts + RightSideBar)
        ├── messages       (MessagePage.jsx)
        ├── messages/:id   (MessagePage.jsx with selected conversation)
        ├── profile/:id    (Profile.jsx)
        ├── create-post    (CreatePost.jsx - 2-Column Publishing View)
        ├── edit-profile/:id (EditProfile.jsx)
        ├── search         (Search.jsx - Dedicated route on mobile)
        └── notifications  (Notifications.jsx - Dedicated route on mobile)
```

---

## 6. Database Architecture & Schema Relationships

```mermaid
erDiagram
    USER ||--o{ POST : "authors"
    USER ||--o{ COMMENT : "writes"
    USER ||--o{ STORY : "publishes"
    USER ||--o{ NOTIFICATION : "receives"
    USER }o--o{ CONVERSATION : "participates in"
    CONVERSATION ||--o{ MESSAGE : "contains"
    POST ||--o{ COMMENT : "has"
    POST ||--o{ USER : "liked by"
    POST ||--o{ USER : "bookmarked by"

    USER {
        ObjectId _id PK
        string username UK
        string email UK
        string password
        string name
        string profileImage
        string bio
        string gender
        ObjectId[] followers
        ObjectId[] following
        ObjectId[] bookmarks
        ObjectId[] blockedUsers
        boolean isOnline
        string socketId
        timestamps createdAt
    }

    POST {
        ObjectId _id PK
        ObjectId author FK
        string caption
        string[] images
        boolean isVideo
        string videoUrl
        number duration
        ObjectId[] likes
        ObjectId[] comments
        timestamps createdAt
    }

    COMMENT {
        ObjectId _id PK
        ObjectId author FK
        ObjectId post FK
        string text
        timestamps createdAt
    }

    CONVERSATION {
        ObjectId _id PK
        ObjectId[] participants FK
        ObjectId[] messages FK
        string lastMessage
        ObjectId lastMessageSender
        Date lastMessageTime
        ObjectId[] deletedFor
        timestamps updatedAt
    }

    MESSAGE {
        ObjectId _id PK
        ObjectId senderId FK
        ObjectId receiverId FK
        string message
        object attachment
        string status
        boolean isRead
        ObjectId[] deletedFor
        timestamps createdAt
    }

    STORY {
        ObjectId _id PK
        ObjectId author FK
        string mediaUrl
        string mediaType
        ObjectId[] viewers
        Date expiresAt
        timestamps createdAt
    }

    NOTIFICATION {
        ObjectId _id PK
        ObjectId recipient FK
        ObjectId sender FK
        string type
        string message
        ObjectId post FK
        boolean isRead
        timestamps createdAt
    }
```

---

## 7. Real-Time Communication & WebRTC Signaling Architecture

```mermaid
sequenceDiagram
    autonumber
    participant A as Peer A (Caller)
    participant S as Socket.IO Signaling Server
    participant B as Peer B (Callee)

    A->>S: emit("call-user", { recipientId: B, caller: A, callType: "video", roomId })
    S->>B: emit("incoming-call", { caller: A, callType: "video", roomId })
    
    B->>S: emit("call-response", { callerId: A, accepted: true, roomId })
    S->>A: emit("call-response", { accepted: true, roomId })
    
    A->>S: emit("join-room", roomId)
    B->>S: emit("join-room", roomId)
    S-->>A: emit("joined-room", { otherPeers: [B] })
    S-->>B: emit("joined-room", { otherPeers: [A] })
    
    A->>A: Create WebRTC Offer SDP
    A->>S: emit("signal", { roomId, data: { sdp: offer } })
    S->>B: emit("signal", { data: { sdp: offer } })
    
    B->>B: Set Remote Offer & Create Answer SDP
    B->>S: emit("signal", { roomId, data: { sdp: answer } })
    S->>A: emit("signal", { data: { sdp: answer } })
    
    loop ICE Negotiation
        A->>S: emit("signal", { roomId, data: { candidate: iceCandidateA } })
        S->>B: emit("signal", { data: { candidate: iceCandidateA } })
        B->>S: emit("signal", { roomId, data: { candidate: iceCandidateB } })
        S->>A: emit("signal", { data: { candidate: iceCandidateB } })
    end
    
    Note over A,B: Direct P2P Media Streams Established (Audio/Video Flowing)
    
    opt Hang Up
        A->>S: emit("hang-up", { roomId })
        S->>B: emit("peer-hung-up")
        Note over A,B: Media Tracks Stopped & PeerConnections Closed
    end
```

---

## 8. Summary of Architectural Guarantees

* **Layout Isolation**: The left sidebar, notifications flyout drawer, and central content area are decoupled. The sidebar maintains a fixed width and sticky position (`top: 0; height: 100dvh;`), preventing any layout jump after user login.
* **Responsive Scaling**: Desktop (> 1080px), Tablet (641px - 1080px), and Mobile (≤ 640px) breakpoints provide dedicated layouts without overlapping elements or broken margins.
* **Unified State Resilience**: State updates occur optimistically on the client and reconcile via WebSockets and HTTP responses, ensuring instant user feedback while preserving consistency with MongoDB.
* **Universal Multi-Format Media Pipeline**: High-resolution and exotic image/video formats (HEIC, TIFF, RAW, MKV, AVI, etc.) are converted on-the-fly via backend `sharp` transcoders (`/api/post/convert-preview`) while maintaining resilient thumbnail format badges (`.thumb-fallback-badge`) on the client. Broken image placeholders and truncated alt-text are completely eliminated.
