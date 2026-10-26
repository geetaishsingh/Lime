import React, { useState, useEffect } from "react";
import { Search, MoreVertical, BellOff, Bell, Trash2, X } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { serverUrl } from "../App";

const formatChatTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const ChatList = ({
  conversations,
  setConversations,
  currentUser,
  selectedChat,
  setSelectedChat,
  onlineUsers,
  getOtherUser,
  className = "",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [muteModalId, setMuteModalId] = useState(null);
  const [mutedConvs, setMutedConvs] = useState([]);

  // Load muted state
  useEffect(() => {
    if (!conversations || !currentUser?._id) return;
    const muted = conversations
      .filter((conv) => {
        const muteEntry = conv.mutedChats?.find(
          (m) => (m.userId?._id || m.userId)?.toString() === currentUser._id.toString()
        );
        if (!muteEntry) return false;
        if (!muteEntry.mutedUntil) return true; // always muted
        return new Date(muteEntry.mutedUntil) > new Date();
      })
      .map((c) => c._id);
    setMutedConvs(muted);
  }, [conversations, currentUser?._id]);

  const handleMuteToggle = async (convId, duration) => {
    try {
      const isMuted = mutedConvs.includes(convId);
      if (isMuted) {
        await axios.post(
          `${serverUrl}/api/message/unmute/${convId}`,
          {},
          { withCredentials: true }
        );
        setMutedConvs((prev) => prev.filter((id) => id !== convId));
        toast.success("Notifications unmuted");
      } else {
        await axios.post(
          `${serverUrl}/api/message/mute/${convId}`,
          { duration },
          { withCredentials: true }
        );
        setMutedConvs((prev) => [...prev, convId]);
        toast.success("Conversation muted");
      }
      setMuteModalId(null);
      setActiveMenuId(null);
    } catch (err) {
      toast.error("Failed to update mute settings");
    }
  };

  const handleDeleteChat = async (convId) => {
    try {
      await axios.delete(`${serverUrl}/api/message/delete/${convId}`, {
        withCredentials: true,
      });
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      if (selectedChat?._id === convId) {
        setSelectedChat(null);
      }
      toast.success("Chat deleted");
      setActiveMenuId(null);
    } catch (err) {
      toast.error("Failed to delete chat");
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    const other = getOtherUser(conv);
    if (!other) return false;
    const query = searchTerm.toLowerCase();
    return (
      (other.username && other.username.toLowerCase().includes(query)) ||
      (other.name && other.name.toLowerCase().includes(query))
    );
  });

  return (
    <div className={`chat-list-panel ${className}`}>
      {/* Header */}
      <div className="chat-list-header">
        <div className="chat-user-title">
          <h2>Messages</h2>
          <span className="current-user-handle">@{currentUser?.username}</span>
        </div>
      </div>

      {/* Search Filter */}
      <div className="chat-search-bar">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="clear-btn" onClick={() => setSearchTerm("")}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Conversations List */}
      <div className="conversation-items-scroll">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => {
            const other = getOtherUser(conv);
            const isOnline = onlineUsers.includes(other?._id?.toString());
            const isSelected = selectedChat?._id === conv._id;
            const isMuted = mutedConvs.includes(conv._id);
            const isOwnLastMsg =
              conv.lastMessageSender?.toString() === currentUser?._id?.toString();

            return (
              <div
                key={conv._id}
                className={`conversation-item-row ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  setSelectedChat(conv);
                  if (conv.unreadCount > 0) {
                    setConversations((prev) =>
                      prev.map((c) =>
                        c._id === conv._id ? { ...c, unreadCount: 0 } : c
                      )
                    );
                  }
                }}
              >
                <div className="avatar-with-presence">
                  <img
                    src={
                      other?.profileImage ||
                      "https://ui-avatars.com/api/?name=User"
                    }
                    alt={other?.username || "Lime user"}
                  />
                  {isOnline && <span className="presence-online-dot" />}
                </div>

                <div className="conv-preview-details">
                  <div className="conv-name-row">
                    <span className="conv-username">
                      {other?.name || `@${other?.username || "Lime Member"}`}
                    </span>
                    {conv.lastMessageTime && (
                      <span className="conv-time">
                        {formatChatTime(conv.lastMessageTime)}
                      </span>
                    )}
                  </div>

                  <div className="conv-sub-row">
                    <p className="conv-last-text">
                      {isOwnLastMsg ? "You: " : ""}
                      {conv.lastMessage || "Started conversation"}
                    </p>
                    <div className="conv-status-icons">
                      {isMuted && <BellOff size={13} color="#71717a" />}
                      {conv.unreadCount > 0 && !isSelected && (
                        <span className="conv-unread-bubble">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3-dots actions menu */}
                <div
                  className="conv-actions-anchor"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="conv-menu-trigger"
                    onClick={() =>
                      setActiveMenuId((prev) =>
                        prev === conv._id ? null : conv._id
                      )
                    }
                  >
                    <MoreVertical size={16} />
                  </button>

                  {activeMenuId === conv._id && (
                    <div className="conv-menu-dropdown">
                      <button
                        onClick={() => {
                          if (isMuted) {
                            handleMuteToggle(conv._id, null);
                          } else {
                            setMuteModalId(conv._id);
                            setActiveMenuId(null);
                          }
                        }}
                      >
                        {isMuted ? (
                          <>
                            <Bell size={14} /> Unmute Notifications
                          </>
                        ) : (
                          <>
                            <BellOff size={14} /> Mute Notifications
                          </>
                        )}
                      </button>
                      <button
                        className="danger"
                        onClick={() => handleDeleteChat(conv._id)}
                      >
                        <Trash2 size={14} /> Delete Conversation
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-chats-placeholder">
            <p>
              {searchTerm
                ? "No conversations match your search."
                : "No conversations yet. Visit someone's profile to message them!"}
            </p>
          </div>
        )}
      </div>

      {/* Mute Duration Modal (English UI) */}
      {muteModalId && (
        <div className="modal-overlay">
          <div className="mute-dialog-card">
            <h3>Mute Notifications</h3>
            <p>Select how long to mute alerts for this conversation:</p>
            <div className="mute-duration-options">
              <button
                className="mute-option-btn"
                onClick={() => handleMuteToggle(muteModalId, "8h")}
              >
                For 8 Hours
              </button>
              <button
                className="mute-option-btn"
                onClick={() => handleMuteToggle(muteModalId, "1w")}
              >
                For 1 Week
              </button>
              <button
                className="mute-option-btn"
                onClick={() => handleMuteToggle(muteModalId, "always")}
              >
                Until I turn it back on
              </button>
            </div>
            <button
              className="btn-cancel"
              onClick={() => setMuteModalId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatList;
