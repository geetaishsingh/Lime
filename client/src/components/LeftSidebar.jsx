import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Home,
  Search as SearchIcon,
  Send,
  Heart,
  PlusSquare,
  LogOut,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
import { serverUrl } from "../App";
import { resetUserState, toggleTheme } from "../redux/user.slice";
import Notifications from "./Notifications";
import Search from "./Search";

const LeftSidebar = () => {
  const { user, theme, unreadNotificationsCount, unreadMessagesCount } = useSelector(
    (state) => state.user
  );
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, {
        withCredentials: true,
      });
      dispatch(resetUserState());
      toast.success("Logged out successfully");
      navigate("/login", { replace: true });
    } catch (error) {
      dispatch(resetUserState());
      navigate("/login", { replace: true });
    }
  };

  const navItems = [
    {
      name: "Home",
      path: "/",
      icon: <Home size={22} />,
      isActive: location.pathname === "/",
    },
    {
      name: "Search",
      path: "#search",
      icon: <SearchIcon size={22} />,
      onClick: () => setShowSearchModal((prev) => !prev),
      isActive: showSearchModal || location.pathname === "/search",
    },
    {
      name: "Messages",
      path: "/messages",
      icon: <Send size={22} />,
      badge:
        unreadMessagesCount > 0
          ? unreadMessagesCount > 99
            ? "99+"
            : unreadMessagesCount
          : null,
      isActive: location.pathname.startsWith("/messages"),
    },
    {
      name: "Notifications",
      path: "#notifications",
      icon: <Heart size={22} />,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null,
      onClick: () => setShowNotificationModal((prev) => !prev),
      isActive: showNotificationModal || location.pathname === "/notifications",
    },
    {
      name: "Create",
      path: "/create-post",
      icon: <PlusSquare size={22} />,
      isActive: location.pathname === "/create-post",
    },
  ];

  return (
    <aside className="lime-sidebar">
      {/* Brand Logo */}
      <Link to="/" className="sidebar-brand-link">
        <div className="lime-citrus-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#84cc16">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        <span className="brand-wordmark">Lime</span>
      </Link>

      {/* Main Navigation */}
      <nav className="sidebar-nav-list">
        {navItems.map((item, idx) => (
          <div key={idx} className="nav-item-wrapper">
            {item.onClick ? (
              <button
                type="button"
                className={`sidebar-nav-btn ${item.isActive ? "active" : ""}`}
                onClick={item.onClick}
              >
                <div className="nav-icon-container">
                  {item.icon}
                  {item.badge && (
                    <span className="nav-badge-pill">{item.badge}</span>
                  )}
                </div>
                <span className="nav-label-text">{item.name}</span>
              </button>
            ) : (
              <Link
                to={item.path}
                className={`sidebar-nav-btn ${item.isActive ? "active" : ""}`}
              >
                <div className="nav-icon-container">
                  {item.icon}
                  {item.badge && (
                    <span className="nav-badge-pill">{item.badge}</span>
                  )}
                </div>
                <span className="nav-label-text">{item.name}</span>
              </Link>
            )}
          </div>
        ))}

        {/* Profile Link */}
        {user && (
          <Link
            to={`/profile/${user._id}`}
            className={`sidebar-nav-btn profile-nav-btn ${
              location.pathname.startsWith(`/profile/${user._id}`) ? "active" : ""
            }`}
          >
            <div className="nav-icon-container">
              <img
                src={user.profileImage}
                alt={user.username}
                className="sidebar-user-avatar"
              />
            </div>
            <span className="nav-label-text">Profile</span>
          </Link>
        )}
      </nav>

      {/* Bottom Actions: Theme Toggle & Logout */}
      <div className="sidebar-bottom-actions">
        {/* Dark/Light Theme Switcher */}
        <button
          className="sidebar-action-btn theme-toggle-btn"
          onClick={() => dispatch(toggleTheme())}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          <span className="nav-label-text">
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </span>
        </button>

        {/* Logout Button */}
        <button
          className="sidebar-action-btn logout-btn"
          onClick={handleLogout}
          title="Log out of Lime"
        >
          <LogOut size={20} />
          <span className="nav-label-text">Log Out</span>
        </button>
      </div>

      {/* Flyout Search Modal */}
      {showSearchModal && (
        <Search handleShow={() => setShowSearchModal(false)} />
      )}

      {/* Flyout Notifications Modal */}
      {showNotificationModal && (
        <Notifications handleShow={() => setShowNotificationModal(false)} />
      )}
    </aside>
  );
};

export default LeftSidebar;
