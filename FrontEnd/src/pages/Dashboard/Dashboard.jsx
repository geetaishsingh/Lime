import './Dashboard.scss';
import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Home,
  Plus,
  Bell,
  User,
  MessageCircle,
  Search,
} from "lucide-react";
import LeftSidebar from "../../components/LeftSidebar";
import limeLogoFull from "../../assets/lime-logo-full.png";
import limeLogoFullLight from "../../assets/lime-logo-full-light.png";

const Dashboard = () => {
  const { user, theme, unreadNotificationsCount, unreadMessagesCount } = useSelector(
    (state) => state.user
  );
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isLogoRefreshing, setIsLogoRefreshing] = useState(false);
  const location = useLocation();

  const handleLogoClick = (e) => {
    e.preventDefault();
    setIsLogoRefreshing(true);
    setTimeout(() => {
      if (location.pathname === "/") {
        window.location.reload();
      } else {
        window.location.href = "/";
      }
    }, 200);
  };

  useEffect(() => {
    if (!window.visualViewport) return;

    const initialHeight = window.visualViewport.height;

    const handleResize = () => {
      const currentHeight = window.visualViewport.height;
      setIsKeyboardOpen(initialHeight - currentHeight > 150);
    };

    window.visualViewport.addEventListener("resize", handleResize);
    return () => window.visualViewport.removeEventListener("resize", handleResize);
  }, []);

  const isHomeActive = location.pathname === "/";
  const isSearchActive = location.pathname === "/search";
  const isCreateActive = location.pathname === "/create-post";
  const isInboxActive = location.pathname.startsWith("/messages");
  const isProfileActive = location.pathname.startsWith(`/profile/${user?._id}`);
  const isChatOpenOnMobile =
    location.pathname.startsWith("/messages/") &&
    location.pathname.length > "/messages/".length;

  return (
    <div className={`dashboard-container ${isChatOpenOnMobile ? "mobile-chat-active" : ""}`}>
      <div className="container">
        <div className="dashboard-inner-container">
          {/* Mobile Top Header (hidden inside active mobile chat) */}
          {!isChatOpenOnMobile && (
            <header className="mobile-top-header">
              <a
                href="/"
                className={`mobile-logo-link ${isLogoRefreshing ? "refreshing-spin" : ""}`}
                onClick={handleLogoClick}
                aria-label="Refresh Lime Home"
                title="Tap Lime logo to refresh website"
              >
                <img
                  src={theme === "light" ? limeLogoFullLight : limeLogoFull}
                  alt="Lime"
                  className="mobile-brand-logo"
                />
              </a>

              <div className="mobile-header-actions">
                <Link to="/search" className={`mobile-header-btn ${isSearchActive ? "active" : ""}`} title="Search">
                  <Search size={22} />
                </Link>
                <Link to="/notifications" className="mobile-header-btn" title="Notifications">
                  <Bell size={22} />
                  {unreadNotificationsCount > 0 && (
                    <span className="mobile-unread-dot" />
                  )}
                </Link>
              </div>
            </header>
          )}

          {/* Left Navigation Sidebar for Desktop */}
          <LeftSidebar />

          {/* Central Main Content Outlet */}
          <main className="main-content-area">
            <Outlet />
          </main>

          {/* Mobile Bottom Navigation Bar — Flat Tab Bar (hidden when keyboard open or inside active chat) */}
          {!isKeyboardOpen && !isChatOpenOnMobile && (
            <nav className="mobile-bottom-nav flat-tab-nav" aria-label="Mobile Navigation">
              {/* Home */}
              <Link
                to="/"
                className={`tab-nav-item ${isHomeActive ? "active" : ""}`}
                aria-label="Home"
              >
                <Home size={22} className="tab-icon" />
                <span className="tab-label">Home</span>
              </Link>

              {/* Messages */}
              <Link
                to="/messages"
                className={`tab-nav-item ${isInboxActive ? "active" : ""}`}
                aria-label="Messages"
              >
                <div className="tab-icon-wrapper">
                  <MessageCircle size={22} className="tab-icon" />
                  {unreadMessagesCount > 0 && (
                    <span className="tab-unread-badge" />
                  )}
                </div>
                <span className="tab-label">Message</span>
              </Link>

              {/* Create */}
              <Link
                to="/create-post"
                className={`tab-nav-item ${isCreateActive ? "active" : ""}`}
                aria-label="Create Post"
              >
                <Plus size={22} className="tab-icon" />
                <span className="tab-label">Create</span>
              </Link>

              {/* Profile */}
              <Link
                to={`/profile/${user?._id}`}
                className={`tab-nav-item ${isProfileActive ? "active" : ""}`}
                aria-label="Profile"
              >
                <div className="tab-avatar-frame">
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.username || "Profile"}
                      className="tab-avatar-img"
                    />
                  ) : (
                    <User size={22} className="tab-icon" />
                  )}
                </div>
                <span className="tab-label">Profile</span>
              </Link>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
