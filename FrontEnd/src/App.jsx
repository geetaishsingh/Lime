import { useEffect, useRef } from "react";
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
import IncomingCallModal from './components/IncomingCallModal/IncomingCallModal.jsx'
import { socket } from "./socket.js";
import {
  addNotification,
  setUnreadMessagesCount,
} from "./store/user.slice";
import { serverUrl } from "./config.js";

export { serverUrl };

const App = () => {
  const { user, theme } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const userIdRef = useRef(user?._id);
  const themeRef = useRef(theme);
  userIdRef.current = user?._id;
  themeRef.current = theme;

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

  // Keep the shared socket alive across user and theme changes.
  useEffect(() => {
    const handleConnect = () => {
      if (userIdRef.current) {
        socket.emit("identity", { userId: userIdRef.current });
      }
    };

    const handleUnreadCount = ({ count }) => {
      if (typeof count === "number") {
        dispatch(setUnreadMessagesCount(count));
      }
    };

    const handleNewMessage = (msg) => {
      if (msg?.receiverId?.toString() === userIdRef.current?.toString()) {
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

    const handleNotification = (notif) => {
      dispatch(addNotification(notif));
      const senderName = notif.sender?.username || "Someone";
      toast(
        () => (
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
            background: themeRef.current === "dark" ? "#18181b" : "#ffffff",
            color: themeRef.current === "dark" ? "#f4f4f5" : "#09090b",
            border: themeRef.current === "dark" ? "1px solid #27272a" : "1px solid #e4e4e7",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
          },
        }
      );
    };

    socket.on("connect", handleConnect);
    socket.on("unreadMessageCount", handleUnreadCount);
    socket.on("newMessage", handleNewMessage);
    socket.on("notification", handleNotification);
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("notification", handleNotification);
      socket.off("unreadMessageCount", handleUnreadCount);
      socket.off("newMessage", handleNewMessage);
      socket.disconnect();
    };
  }, [dispatch]);

  useEffect(() => {
    if (socket.connected) socket.emit("identity", { userId: user?._id });
  }, [user?._id]);

  return (
    <div className={`lime-app theme-${theme}`}>
      <Outlet />
      <IncomingCallModal/>
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
