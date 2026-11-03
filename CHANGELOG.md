# CHANGELOG.md — Lime Project Development History

All notable technical changes, architectural upgrades, UI/UX restorations, and bug fixes for the **Lime** application are documented in this chronological record.

---

## [2.2.0] — 2026-11-02

### Features & Format Enhancements
* **Universal Multi-Format Media Support & Instant Preview Pipeline (Screenshot 4 Fix)**:
  * Resolved the broken thumbnail bug (`[broken-img-icon] Thum [x]`) occurring when selecting multiple media files with exotic, mobile, or high-resolution formats (e.g., iPhone HEIC/HEIF, TIFF, Camera RAW, CR2, NEF, ARW, DNG, BMP, PSD) or large files.
  * Introduced dedicated backend conversion endpoint: `POST /api/post/convert-preview` leveraging libvips-powered `sharp` to transcode non-browser-native image buffers on-the-fly into optimized JPEG data URLs.
  * Enhanced `CreatePost.jsx` with automatic format detection: exotic formats trigger background conversion while immediately rendering clean, stylish format badges (`HEIC`, `RAW`, `TIFF`, etc.) with `ImageIcon` instead of browser broken-image placeholders and truncated alt text.
  * Added instant thumbnail `onError` recovery: if any thumbnail fails client rendering, it displays `.thumb-fallback-badge` and triggers automatic conversion to seamlessly update the thumbnail with the converted image once ready.
  * Expanded accepted video extensions across the entire stack: `mp4`, `m4v`, `mov`, `mkv`, `webm`, `avi`, `wmv`, `flv`, `3gp`, `3g2`, `ts`, `mts`, `m2ts`, `ogv`, `vob`, `qt`, `asf`, `rm`, `rmvb`, `f4v`, `divx`, `mpg`, `mpeg`, `hevc`.
  * Added video codec fallback card in `CustomVideoPlayer.jsx` (`.pro-video-fallback`) with play icon badge to handle video containers unsupported by client HTML5 video players gracefully before server optimization.

### Bug Fixes
* **Eliminated Broken Image Truncated Alt-Text**: Removed default image `alt="Thumbnail X"` that was causing the browser to truncate text into `"Thum"` inside the 48px thumbnail cards. Implemented clean `alt=""` with state-driven format fallback badges.
* **Non-Blocking Video Metadata Extraction**: Enhanced video duration detection in `CreatePost.jsx` to handle `tempVideo.onerror` gracefully for uncommon video containers without rejecting valid user uploads.

---

## [2.1.0] — 2026-11-02

### Architecture Changes
* **Unified Dual-Class CSS Architecture**: Established backward and forward-compatible CSS selector bridging between `lime-sidebar` / `left-sidebar`, `notifContainer` / `notifBox`, and `search-flyout-wrapper` / `search-panel`. This completely eliminates layout breakage and post-login styling distortion.
* **Standardized Viewport Units (`dvh`)**: Converted all legacy `vh` viewport height units across the entire SCSS architecture to modern dynamic viewport height units (`dvh`). This eliminates vertical jumping, content clipping, and hidden controls caused by dynamic mobile and desktop browser navigation chrome.
* **Global Typography Migration**: Transitioned from `Plus Jakarta Sans` to **`Poppins`** across `index.html`, `variable.scss`, `reset.scss`, and all component headers to enforce typography consistency per the project design system.

### UI/UX Restorations (Per User Guidelines & Screenshots)
* **Left Sidebar Restoration (Screenshot 1)**:
  * Restored desktop sticky left sidebar with fixed width `240px`, height `100dvh`, background `#101012`, and border `#27272a`.
  * Implemented active nav item pill styling in dark olive green (`background: rgba(132, 204, 22, 0.16); color: #84cc16; border: 1px solid rgba(132, 204, 22, 0.28); font-weight: 700`).
  * Added initials circular avatar placeholder (cyan/blue background `#0284c7` with white letters "US") as an automatic graceful fallback when a user avatar is absent.
  * Formatted the bottom action buttons: theme toggle (`Light Mode` / `Dark Mode`) and a distinct, visually clear `Log Out` button with red accent hover.
* **Notifications Drawer Restoration (Screenshot 1)**:
  * Docked the notifications slide-out flyout directly next to the left sidebar (`left: 240px; width: 390px; height: 100dvh; z-index: 95`).
  * Implemented top header with bold "Notifications" title and 'X' close button.
  * Added filter pill tabs: "All" (active lime green pill `#84cc16`, black text), "Likes", "Comments", and "Follows" (dark elevated pills).
  * Rebuilt the empty state with a centered circular green bell icon inside a subtle green circular highlight (`background: rgba(132, 204, 22, 0.15)`), bold title "No notifications here", and descriptive subtitle.
* **Create Post Modal Restoration (Screenshot 2)**:
  * Removed unnecessary nested `.feed-container` wrappers to give the post creator a dedicated, clean 2-column modal layout.
  * Added top header with Back arrow, centered "Create New Post" title, and a neon lime green pill "Share Post" button (`background: #84cc16; color: #09090b; border-radius: 9999px; font-weight: 700`).
  * Re-anchored the media removal button as a bottom-centered overlaid pill (`X Remove` with dark background and red text/border), exactly matching Screenshot 2.
  * Formatted the author card (circular "US" avatar, name "Geetaish", handle "@Geetaish"), caption textarea with "0/1000" counter, and the "Lime Posting Guidelines" card with green sparkle icon.
* **Search Flyout Drawer Alignment**:
  * Docked the user search drawer seamlessly beside the left sidebar (`left: 240px; width: 390px; height: 100dvh;`).
  * Provided debounced real-time user lookup, follow/unfollow toggle buttons, and empty/no-results states.
* **Stories & Home Feed Layout Restoration (Screenshot 3)**:
  * Restored the distinct rounded 24-Hour Stories tray (`background-color: var(--bg-card); border-radius: 18px; border: 1px solid var(--border-subtle)`).
  * Styled the "Your Story" action node with circular avatar ring and bottom-right lime green circular plus badge button (`#84cc16`), accompanied by the capitalized "Your Story" label.
  * Formatted the central dual-tab filter container with the active "For You" green pill highlight (`background: rgba(132, 204, 22, 0.16); color: #84cc16; border: 1px solid rgba(132, 204, 22, 0.28)`) and muted "Following" button.
  * Restored the rounded empty feed card (`border-radius: 20px; padding: 56px 24px`) with centered circular green image icon, bold "No posts yet" title, and full lime green pill "Create First Post" button.
  * Synchronized the Right Sidebar user snapshot card with the green pill "Edit" button (`background: rgba(132, 204, 22, 0.16); border: 1px solid rgba(132, 204, 22, 0.3)`).

### Bug Fixes
* **Resolved Post-Login Layout Explosion**: Identified and fixed the discrepancy where `LeftSidebar.jsx` used `.left-sidebar` while `dashboard.scss` declared `.lime-sidebar`, causing the sidebar to render completely unstyled upon login and blowing out the main feed layout.
* **Resolved Unstyled Notifications Breakage**: Fixed the class mismatch between `Notifications.jsx` (`notifBox`) and `notifiaction.scss` (`notifContainer`).
* **Resolved WebRTC Call Parameter Desync**: Fixed missing `isCaller` and `otherUser` parameters in navigation state when launching `CallPage.jsx` from `ChatBox.jsx` and `IncomingCallModal.jsx`. Added query parameter fallbacks (`searchParams.get("roomId")`, `searchParams.get("callType")`, `searchParams.get("remoteName")`) for full resilience across page refreshes.
* **Fixed Broken Avatar Icons in Right Sidebar**: Added UI-Avatars fallbacks with custom lime and neutral palettes in `RightSideBar.jsx` to prevent broken image badges when suggested accounts lack a custom profile image.

### Documentation System Added
* Created comprehensive developer and AI assistant documentation system:
  1. `AI.md`: Primary reference for technology versions, folder structure, API endpoints, and mandatory coding rules.
  2. `WORKFLOW.md`: Complete end-to-end development workflows with Mermaid diagrams.
  3. `TASK_TRACKER.md`: 14-module task tracker detailing status, priority, and verified completion notes.
  4. `CHANGELOG.md`: Chronological development ledger documenting all changes.
  5. `ARCHITECTURE.md`: High-level and module-level system architecture blueprints.
