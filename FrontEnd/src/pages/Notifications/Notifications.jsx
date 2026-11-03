import './Notifications.scss';
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import toast from "react-hot-toast";
import {
  X,
  ArrowLeft,
  Heart,
  MessageCircle,
  UserPlus,
  CheckCheck,
  Bell,
  Trash2,
} from "lucide-react";
import { serverUrl } from "../../config";
import {
  setNotifications,
  markNotificationReadInStore,
  markAllNotificationsReadInStore,
  setUnreadNotificationsCount,
} from "../../store/user.slice";

const tabs = ["All", "Likes", "Comments", "Follows"];

const Notifications = ({ handleShow }) => {
  const { notifications, unreadNotificationsCount } = useSelector(
    (state) => state.user
  );
  const [activeTab, setActiveTab] = useState("All");
  const [_loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${serverUrl}/api/notifications`, {
        withCredentials: true,
      });
      if (data?.success) {
        dispatch(setNotifications(data.notifications || []));
        dispatch(setUnreadNotificationsCount(data.unreadCount || 0));
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await axios.put(
        `${serverUrl}/api/notifications/read-all`,
        {},
        { withCredentials: true }
      );
      dispatch(markAllNotificationsReadInStore());
      toast.success("All notifications marked as read");
    } catch (_err) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleDeleteNotification = async (e, notifId) => {
    e.stopPropagation();
    try {
      await axios.delete(`${serverUrl}/api/notifications/${notifId}`, {
        withCredentials: true,
      });
      dispatch(
        setNotifications(notifications.filter((n) => n._id !== notifId))
      );
    } catch (_err) {}
  };

  const handleItemClick = async (notif) => {
    if (!notif.isRead) {
      axios
        .put(
          `${serverUrl}/api/notifications/${notif._id}/read`,
          {},
          { withCredentials: true }
        )
        .catch(() => {});
      dispatch(markNotificationReadInStore(notif._id));
    }

    if (handleShow) handleShow();

    if (notif.post) {
      navigate("/");
    } else if (notif.sender?._id) {
      navigate(`/profile/${notif.sender._id}`);
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    if (diffDay < 7) return `${diffDay}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === "Likes") return notif.type === "like";
    if (activeTab === "Comments") return notif.type === "comment";
    if (activeTab === "Follows") return notif.type === "follow";
    return true; // All
  });

  return (
    <div className="notifContainer notifBox">
      {/* Header */}
      <div className="notifHeader">
        <div className="header-title-box header-left">
          {handleShow ? null : (
            <button
              className="backBtn panel-back-btn"
              onClick={() => navigate(-1)}
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h2>Notifications</h2>
          {unreadNotificationsCount > 0 && (
            <span className="unread-counter-pill unread-badge">
              {unreadNotificationsCount}
            </span>
          )}
        </div>

        <div className="header-action-btns">
          {unreadNotificationsCount > 0 && (
            <button
              className="mark-all-read-btn"
              onClick={handleMarkAllRead}
              title="Mark all as read"
            >
              <CheckCheck size={16} />
              <span>Mark all read</span>
            </button>
          )}
          {handleShow && (
            <button
              className="closeBtn panel-close-btn"
              onClick={handleShow}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="notif-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`notif-tab-item ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="notifList">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => (
            <div
              key={notif._id}
              className={`notifItem ${!notif.isRead ? "unread" : ""}`}
              onClick={() => handleItemClick(notif)}
            >
              <div className="notif-sender-avatar-wrap">
                <img
                  src={
                    notif.sender?.profileImage ||
                    "https://ui-avatars.com/api/?name=" +
                      (notif.sender?.username || "User")
                  }
                  alt={notif.sender?.username}
                  className="notif-avatar"
                />
                <span className={`notif-type-icon notif-${notif.type}`}>
                  {notif.type === "like" && <Heart size={10} fill="#fff" />}
                  {notif.type === "comment" && <MessageCircle size={10} fill="#fff" />}
                  {notif.type === "follow" && <UserPlus size={10} />}
                </span>
              </div>

              <div className="content">
                <p>
                  <strong className="sender-username">
                    @{notif.sender?.username || "Someone"}
                  </strong>{" "}
                  {notif.message}
                </p>
                <span className="time">{formatRelativeTime(notif.createdAt)}</span>
              </div>

              {notif.post?.image && (
                <div className="target-post-thumb">
                  <img
                    src={
                      notif.post.image.startsWith("http")
                        ? notif.post.image
                        : `${serverUrl}${notif.post.image}`
                    }
                    alt="Post"
                  />
                </div>
              )}

              <button
                className="delete-notif-btn"
                onClick={(e) => handleDeleteNotification(e, notif._id)}
                title="Remove notification"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        ) : (
          <div className="empty-notifications-state">
            <div className="empty-bell-wrap">
              <Bell size={32} color="#84cc16" />
            </div>
            <h3>No notifications here</h3>
            <p>
              When people like your posts, comment, or start following you,
              you'll see them right here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;

