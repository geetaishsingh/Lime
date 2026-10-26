import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Toaster, toast } from "react-hot-toast";
import axios from "axios";

import "./styles/index.scss";
import useGetUser from "./hooks/useGetUser";
import useGetPosts from "./hooks/useGetPosts";
import useGetUserPosts from "./hooks/useGetUserPosts";
import useGetMyLikes from "./hooks/useGetMyLikes";
import useGetMySuggestions from "./hooks/useGetMySuggestions.jsx";
import { socket } from "./socket.js";
import {
  addNotification,
  addNewPost,
  removePost,
  setTheme,
  setUnreadMessagesCount,
} from "./redux/user.slice";
import IncomingCallModal from "./components/IncomingCallModal";

export const serverUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const App = () => {
  const { user, theme } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  // Load user profile on mount
  useGetUser();

  // Data fetching hooks only fire when user exists
  useGetPosts();
  useGetUserPosts();
  useGetMyLikes();
  useGetMySuggestions();

  // Synchronize theme with HTML root attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Fetch unread messages count on initial load or user change
  useEffect(() => {
    if (!user?._id) return;
    const fetchUnreadCount = async () => {
      try {
        const { data } = await axios.get(
          `${serverUrl}/api/message/unread-count`,
          { withCredentials: true }
        );
        if (data?.success && typeof data.count === "number") {
          dispatch(setUnreadMessagesCount(data.count));
        }
      } catch (err) {
        console.error("Failed to load unread messages count:", err);
      }
    };
    fetchUnreadCount();
  }, [user?._id, dispatch]);

  // Manage socket connection & real-time events
  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      if (user?._id) {
        socket.emit("identity", { userId: user._id });
      }
    });

    // Real-time unread messages count listener (emitted from server)
    const handleUnreadCount = ({ count }) => {
      if (typeof count === "number") {
        dispatch(setUnreadMessagesCount(count));
      }
    };
    socket.on("unreadMessageCount", handleUnreadCount);

    // Sync unread count whenever an incoming message arrives
    const handleNewMessage = (msg) => {
      if (msg?.receiverId?.toString() === user?._id?.toString()) {
        axios
          .get(`${serverUrl}/api/message/unread-count`, { withCredentials: true })
          .then(({ data }) => {
            if (data?.success && typeof data.count === "number") {
              dispatch(setUnreadMessagesCount(data.count));
            }
          })
          .catch(() => {});
      }
    };
    socket.on("newMessage", handleNewMessage);

    // Real-time notifications listener
    socket.on("notification", (notif) => {
      dispatch(addNotification(notif));
      const senderName = notif.sender?.username || "Someone";
      toast(
        (t) => (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {notif.sender?.profileImage && (
              <img
                src={notif.sender.profileImage}
                alt=""
                style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
              />
            )}
            <div>
              <strong style={{ color: "#10b981" }}>@{senderName}</strong> {notif.message}
            </div>
          </div>
        ),
        {
          duration: 4000,
          position: "top-right",
          style: {
            background: theme === "dark" ? "#18181b" : "#ffffff",
            color: theme === "dark" ? "#f4f4f5" : "#09090b",
            border: theme === "dark" ? "1px solid #27272a" : "1px solid #e4e4e7",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
          },
        }
      );
    });

    return () => {
      socket.off("connect");
      socket.off("notification");
      socket.off("unreadMessageCount", handleUnreadCount);
      socket.off("newMessage", handleNewMessage);
      socket.disconnect();
    };
  }, [dispatch, user?._id]);

  // Identify user on socket whenever user ID changes
  useEffect(() => {
    if (user?._id) {
      socket.emit("identity", { userId: user._id });
    }
  }, [user?._id]);

  return (
    <div className={`lime-app theme-${theme}`}>
      <Outlet />
      <IncomingCallModal />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "10px",
            background: theme === "dark" ? "#27272a" : "#ffffff",
            color: theme === "dark" ? "#fafafa" : "#18181b",
            border: theme === "dark" ? "1px solid #3f3f46" : "1px solid #e4e4e7",
          },
        }}
      />
    </div>
  );
};

export default App;
