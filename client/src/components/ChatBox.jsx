import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import {
  ArrowLeft,
  Video,
  Phone,
  Send,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Trash2,
  X,
  CheckCircle,
  Circle,
  CheckSquare,
  Square,
  Play,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { BeatLoader } from "react-spinners";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { serverUrl } from "../App";
import { socket } from "../socket";
import { setUnreadMessagesCount } from "../redux/user.slice";
import CustomVideoPlayer from "./CustomVideoPlayer";

const VIDEO_EXTENSIONS = [
  "mp4", "m4v", "mov", "mkv", "webm", "avi", "wmv", "flv", "3gp",
  "3g2", "ts", "mts", "m2ts", "ogv", "vob", "qt", "asf", "rm",
  "rmvb", "f4v", "divx", "mpg", "mpeg"
];

const checkIsVideo = (file) => {
  if (!file) return false;
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const ext = name.split(".").pop();
  return mime.startsWith("video/") || VIDEO_EXTENSIONS.includes(ext);
};

const formatMessageTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const ChatBox = ({
  conversation,
  currentUser,
  otherUser,
  onlineUsers,
  onBack,
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [attachmentType, setAttachmentType] = useState("image"); // "image" | "video"
  const [sending, setSending] = useState(false);

  // Requirement 10: Selection & Action Controls
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [selectMode, setSelectMode] = useState(false);

  // Requirement 8: Media Viewer Lightbox
  const [lightboxMedia, setLightboxMedia] = useState(null); // { url, type }
  const [lightboxZoom, setLightboxZoom] = useState(1);

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Fetch messages on mount
  useEffect(() => {
    if (!otherUser?._id) return;
    const fetchMessages = async () => {
      try {
        const { data } = await axios.get(
          `${serverUrl}/api/message/messages/${otherUser._id}`,
          { withCredentials: true }
        );
        if (data?.success) {
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    };
    fetchMessages();
  }, [otherUser?._id]);

  // Mark incoming messages as read and update global unread count
  useEffect(() => {
    if (otherUser?._id) {
      axios
        .put(
          `${serverUrl}/api/message/read/${otherUser._id}`,
          {},
          { withCredentials: true }
        )
        .then(({ data }) => {
          if (data?.success && typeof data.unreadCount === "number") {
            dispatch(setUnreadMessagesCount(data.unreadCount));
          }
        })
        .catch(() => {});
    }
  }, [otherUser?._id, messages.length, dispatch]);

  // Socket listener for new messages & delivery/read receipts
  useEffect(() => {
    const handleNewMessage = (msg) => {
      const isRelevant =
        (msg.senderId?.toString() === otherUser?._id?.toString() &&
          msg.receiverId?.toString() === currentUser?._id?.toString()) ||
        (msg.senderId?.toString() === currentUser?._id?.toString() &&
          msg.receiverId?.toString() === otherUser?._id?.toString());

      if (isRelevant) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };

    const handleMessagesSeen = ({ by }) => {
      if (by?.toString() === otherUser?._id?.toString()) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.senderId?.toString() === currentUser?._id?.toString()
              ? { ...msg, isRead: true, status: "read" }
              : msg
          )
        );
      }
    };

    const handleMessagesDeleted = ({ messageIds }) => {
      setMessages((prev) =>
        prev.filter((msg) => !messageIds.includes(msg._id))
      );
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("messagesDeleted", handleMessagesDeleted);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("messagesDeleted", handleMessagesDeleted);
    };
  }, [otherUser?._id, currentUser?._id]);

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Keyboard escape for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setLightboxMedia(null);
        setLightboxZoom(1);
      }
    };
    if (lightboxMedia) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [lightboxMedia]);

  const handleAttachmentSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isVid = checkIsVideo(file);
    setAttachmentFile(file);
    setAttachmentType(isVid ? "video" : "image");
    setAttachmentPreview(URL.createObjectURL(file));
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !attachmentFile) return;

    try {
      setSending(true);
      const formData = new FormData();
      if (newMessage.trim()) formData.append("message", newMessage.trim());
      if (attachmentFile) formData.append("attachment", attachmentFile);

      const { data } = await axios.post(
        `${serverUrl}/api/message/send/${otherUser._id}`,
        formData,
        { withCredentials: true }
      );

      if (data?.success) {
        setNewMessage("");
        setAttachmentFile(null);
        setAttachmentPreview("");
      }
    } catch (err) {
      toast.error("Failed to deliver message.");
    } finally {
      setSending(false);
    }
  };

  // Requirement 10: Multi-select Action Controls
  const toggleSelectAll = () => {
    if (selectedMessages.length === messages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(messages.map((m) => m._id));
    }
  };

  const handleDelete = async (deleteFor) => {
    if (selectedMessages.length === 0) return;

    if (deleteFor === "everyone") {
      const containsOther = selectedMessages.some((id) => {
        const m = messages.find((msg) => msg._id === id);
        return m?.senderId?.toString() !== currentUser._id.toString();
      });
      if (containsOther) {
        toast.error("You can only delete your own sent messages for everyone.");
        return;
      }
    }

    try {
      await axios.delete(`${serverUrl}/api/message/delete`, {
        data: { messageIds: selectedMessages, deleteFor },
        withCredentials: true,
      });

      setMessages((prev) =>
        prev.filter((m) => !selectedMessages.includes(m._id))
      );
      setSelectedMessages([]);
      setSelectMode(false);
      toast.success("Messages deleted");
    } catch (err) {
      toast.error("Delete operation failed");
    }
  };

  // Requirement 7: Audio & Video Calling Initiators
  const handleStartCall = (callType = "video") => {
    const roomId = [currentUser._id, otherUser._id].sort().join("-");

    // Emit socket call event to alert recipient
    socket.emit("call-user", {
      recipientId: otherUser._id,
      caller: {
        _id: currentUser._id,
        username: currentUser.username,
        name: currentUser.name,
        profileImage: currentUser.profileImage,
      },
      callType,
      roomId,
    });

    const query = new URLSearchParams({
      roomId,
      callType,
      remoteName: otherUser.name || otherUser.username || "User",
      remoteAvatar: otherUser.profileImage || "",
    }).toString();

    navigate(`/call?${query}`, {
      state: {
        roomId,
        callType,
        callerName: otherUser.name || otherUser.username,
        avatarUrl: otherUser.profileImage,
      },
    });
  };

  const isOnline = onlineUsers.includes(otherUser?._id?.toString());
  const canDeleteForEveryone =
    selectedMessages.length > 0 &&
    selectedMessages.every((id) => {
      const m = messages.find((msg) => msg._id === id);
      return m?.senderId?.toString() === currentUser?._id?.toString();
    });

  return (
    <div className="chatbox-panel">
      {/* Header */}
      <header className="chatbox-top-bar">
        <div className="chat-header-user-side">
          <button className="chat-back-btn" onClick={onBack} aria-label="Back">
            <ArrowLeft size={20} />
          </button>

          <div className="chat-recipient-avatar-box">
            <img
              src={
                otherUser?.profileImage ||
                "https://ui-avatars.com/api/?name=" + (otherUser?.name || "User")
              }
              alt={otherUser?.username}
              className="chat-recipient-avatar"
            />
            {isOnline && <span className="chat-online-badge" />}
          </div>

          <div className="chat-recipient-text">
            <h3>{otherUser?.name || `@${otherUser?.username}`}</h3>
            <span className="chat-recipient-status">
              {isOnline ? "Active now" : "Offline"}
            </span>
          </div>
        </div>

        <div className="chat-header-actions">
          {/* Requirement 10: Toggle Select Mode */}
          <button
            className={`chat-action-btn ${selectMode ? "active-mode" : ""}`}
            onClick={() => {
              setSelectMode(!selectMode);
              setSelectedMessages([]);
            }}
            title={selectMode ? "Exit Select Mode" : "Select Messages"}
            aria-label="Select messages"
          >
            {selectMode ? <CheckSquare size={19} /> : <Square size={19} />}
          </button>

          {/* Requirement 7: Audio Call Button */}
          <button
            className="chat-action-btn audio-call-btn"
            onClick={() => handleStartCall("audio")}
            title="Start Audio Call"
            aria-label="Start audio call"
          >
            <Phone size={19} />
          </button>

          {/* Requirement 7: Video Call Button */}
          <button
            className="chat-action-btn video-call-btn"
            onClick={() => handleStartCall("video")}
            title="Start Video Call"
            aria-label="Start video call"
          >
            <Video size={20} />
          </button>
        </div>
      </header>

      {/* Requirement 10: Multi-Select Delete Action Bar */}
      {selectMode && (
        <div className="chat-multiselect-toolbar">
          <div className="select-left-controls">
            <button
              className="cancel-select-btn"
              onClick={() => {
                setSelectMode(false);
                setSelectedMessages([]);
              }}
              title="Cancel Selection"
            >
              <X size={18} />
            </button>
            <span className="selected-count">
              {selectedMessages.length} selected
            </span>
          </div>

          <div className="delete-options-btns">
            <button
              className="select-all-pill-btn"
              onClick={toggleSelectAll}
            >
              {selectedMessages.length === messages.length && messages.length > 0
                ? "Deselect All"
                : "Select All"}
            </button>

            <button
              className="delete-pill-btn"
              onClick={() => handleDelete("me")}
              disabled={selectedMessages.length === 0}
            >
              Delete for me
            </button>

            <button
              className="delete-pill-btn danger"
              onClick={() => handleDelete("everyone")}
              disabled={!canDeleteForEveryone}
              title={
                !canDeleteForEveryone
                  ? "Only available when selecting only your own sent messages"
                  : "Delete for both participants"
              }
            >
              Delete for everyone
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="messages-scroll-area">
        {messages.map((msg) => {
          const isSent =
            msg.senderId?.toString() === currentUser?._id?.toString();
          const isSelected = selectedMessages.includes(msg._id);
          const hasAttachment = Boolean(msg.attachment?.url);
          const isVideoAttachment =
            msg.attachment?.type === "video" ||
            msg.attachment?.url?.endsWith(".mp4") ||
            msg.attachment?.url?.includes("/video/");

          const mediaUrl = msg.attachment?.url
            ? msg.attachment.url.startsWith("http")
              ? msg.attachment.url
              : `${serverUrl}${msg.attachment.url}`
            : "";

          return (
            <div
              key={msg._id}
              className={`message-bubble-row ${isSent ? "sent" : "received"} ${
                isSelected ? "selected" : ""
              }`}
              onClick={() => {
                if (selectMode) {
                  setSelectedMessages((prev) =>
                    prev.includes(msg._id)
                      ? prev.filter((id) => id !== msg._id)
                      : [...prev, msg._id]
                  );
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setSelectMode(true);
                setSelectedMessages((prev) =>
                  prev.includes(msg._id) ? prev : [...prev, msg._id]
                );
              }}
            >
              {/* Checkbox indicator in Select Mode */}
              {selectMode && (
                <div className="message-select-indicator">
                  {isSelected ? (
                    <CheckCircle size={18} color="#84cc16" />
                  ) : (
                    <Circle size={18} color="#71717a" />
                  )}
                </div>
              )}

              <div className="bubble-content-box">
                {/* Media Attachment (Requirement 8) */}
                {hasAttachment && (
                  <div
                    className="attachment-media-box"
                    onClick={(e) => {
                      if (!selectMode) {
                        e.stopPropagation();
                        setLightboxMedia({
                          url: mediaUrl,
                          type: isVideoAttachment ? "video" : "image",
                        });
                        setLightboxZoom(1);
                      }
                    }}
                  >
                    {isVideoAttachment ? (
                      <div className="chat-video-preview">
                        <video src={mediaUrl} preload="metadata" />
                        <div className="video-play-overlay">
                          <Play size={24} fill="#fff" />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={mediaUrl}
                        alt="Attachment"
                        className="chat-attachment-img"
                        loading="lazy"
                      />
                    )}
                  </div>
                )}

                {/* Text Message */}
                {msg.message && <p className="msg-text">{msg.message}</p>}

                {/* Timestamp & Status Icon */}
                <div className="msg-meta-footer">
                  <span className="msg-time-pill">
                    {formatMessageTime(msg.createdAt)}
                  </span>
                  {isSent && (
                    <span className="msg-read-status" title={msg.status}>
                      {msg.isRead ? (
                        <CheckCheck size={14} color="#84cc16" />
                      ) : msg.status === "delivered" ? (
                        <CheckCheck size={14} color="#71717a" />
                      ) : (
                        <Check size={14} color="#71717a" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Attachment Pre-send Preview Bar */}
      {attachmentPreview && (
        <div className="chat-attachment-preview-bar">
          <div className="preview-media-thumb">
            {attachmentType === "video" ? (
              <video src={attachmentPreview} muted autoPlay loop playsInline />
            ) : (
              <img src={attachmentPreview} alt="Preview" />
            )}
            <button
              className="remove-attach-btn"
              onClick={() => {
                setAttachmentFile(null);
                setAttachmentPreview("");
              }}
              title="Remove attachment"
            >
              <X size={14} />
            </button>
          </div>
          <span className="preview-filename-badge">
            {attachmentFile?.name || "Ready to send"}
          </span>
        </div>
      )}

      {/* Composer Input Form */}
      <form onSubmit={handleSendMessage} className="chat-composer-bar">
        <button
          type="button"
          className="composer-media-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Send photo or video"
          disabled={sending}
        >
          <ImageIcon size={20} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,video/*,.mp4,.mov,.mkv,.webm,.avi,.wmv,.flv,.3gp,.m4v,.ts,.heic,.heif,.webp,.avif,*"
          style={{ display: "none" }}
          onChange={handleAttachmentSelect}
        />

        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="composer-input-field"
          disabled={sending}
        />

        <button
          type="submit"
          className="composer-send-btn"
          disabled={sending || (!newMessage.trim() && !attachmentFile)}
        >
          {sending ? (
            <BeatLoader size={6} color="#09090b" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </form>

      {/* Requirement 8: Fullscreen Chat Media Viewer Lightbox */}
      {lightboxMedia && (
        <div
          className="modal-overlay chat-media-lightbox"
          onClick={() => {
            setLightboxMedia(null);
            setLightboxZoom(1);
          }}
        >
          {/* Lightbox Toolbar */}
          <div
            className="lightbox-toolbar"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxMedia.type === "image" && (
              <>
                <button
                  className="lightbox-btn"
                  onClick={() => setLightboxZoom((z) => Math.min(3, z + 0.25))}
                  title="Zoom In"
                  aria-label="Zoom in"
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  className="lightbox-btn"
                  onClick={() => setLightboxZoom((z) => Math.max(0.5, z - 0.25))}
                  title="Zoom Out"
                  aria-label="Zoom out"
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  className="lightbox-btn"
                  onClick={() => setLightboxZoom(1)}
                  title="Reset Zoom"
                >
                  100%
                </button>
              </>
            )}

            <a
              href={lightboxMedia.url}
              download
              target="_blank"
              rel="noreferrer"
              className="lightbox-btn"
              title="Download media"
              aria-label="Download"
            >
              <Download size={18} />
            </a>

            <button
              className="lightbox-btn close-btn"
              onClick={() => {
                setLightboxMedia(null);
                setLightboxZoom(1);
              }}
              title="Close"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div
            className="lightbox-content-wrap"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxMedia.type === "video" ? (
              <CustomVideoPlayer
                src={lightboxMedia.url}
                autoPlay
                loop
                initialMuted={false}
                className="lightbox-video"
              />
            ) : (
              <img
                src={lightboxMedia.url}
                alt="Media view"
                className="lightbox-img"
                style={{
                  transform: `scale(${lightboxZoom})`,
                  transition: "transform 0.15s ease-out",
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBox;
