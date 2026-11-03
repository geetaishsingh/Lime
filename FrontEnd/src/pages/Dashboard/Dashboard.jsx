import './Dashboard.scss';
import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Home,
  Search,
  Plus,
  Send,
  Heart,
  Bookmark,
} from "lucide-react";
import LeftSidebar from "../../components/LeftSidebar";
import limeLogoFull from "../../assets/lime-logo-full.png";
import limeLogoIcon from "../../assets/lime-logo-icon.png";
import limeLogoFullLight from "../../assets/lime-logo-full-light.png";
import limeLogoIconLight from "../../assets/lime-logo-icon-light.png";

const Dashboard = () => {
  const { user, theme, unreadNotificationsCount, unreadMessagesCount } = useSelector(
    (state) => state.user
  );
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const location = useLocation();

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

  return (
    <div className="dashboard-container">
      <div className="container">
        <div className="dashboard-inner-container">
          {/* Mobile Top Header */}
          <header className="mobile-top-header">
            <Link to="/" className="mobile-logo-link" aria-label="Lime Home">
              <img
                src={theme === "light" ? limeLogoFullLight : limeLogoFull}
                alt="Lime"
                className="mobile-brand-logo"
              />
            </Link>

            <div className="mobile-header-actions">
              <Link to="/create-post" className="mobile-header-btn" title="Create Post">
                <Plus size={22} />
              </Link>
              <Link to="/notifications" className="mobile-header-btn" title="Notifications">
                <Heart size={22} />
                {unreadNotificationsCount > 0 && (
                  <span className="mobile-unread-dot" />
                )}
              </Link>
              <Link to="/messages" className="mobile-header-btn" title="Messages">
                <Send size={22} />
                {unreadMessagesCount > 0 && (
                  <span className="mobile-unread-dot" />
                )}
              </Link>
            </div>
          </header>

          {/* Left Navigation Sidebar for Desktop */}
          <LeftSidebar />

          {/* Central Main Content Outlet */}
          <main className="main-content-area">
            <Outlet />
          </main>

          {/* Mobile Bottom Navigation Bar: Floating Capsule Dock */}
          {!isKeyboardOpen && (
            <nav className="mobile-bottom-nav floating-dock-nav" aria-label="Mobile Navigation">
              {/* Circular Logo Emblem on Far Left */}
              <Link to="/" className="dock-brand-circle" title="Lime Home" aria-label="Lime Home">
                <img
                  src={theme === "light" ? limeLogoIconLight : limeLogoIcon}
                  alt="Lime"
                  className="dock-brand-logo"
                />
              </Link>

              {/* Navigation Items Tray */}
              <div className="dock-nav-items">
                {/* Home */}
                <Link
                  to="/"
                  className={`dock-nav-item ${isHomeActive ? "active" : ""}`}
                >
                  <div className="dock-active-contour" />
                  <Home size={19} className="dock-icon" />
                  <span className="dock-active-dot" />
                  <span className="dock-label">Home</span>
                </Link>

                {/* Search */}
                <Link
                  to="/search"
                  className={`dock-nav-item ${isSearchActive ? "active" : ""}`}
                >
                  <div className="dock-active-contour" />
                  <Search size={19} className="dock-icon" />
                  <span className="dock-active-dot" />
                  <span className="dock-label">Search</span>
                </Link>

                {/* Create */}
                <Link
                  to="/create-post"
                  className={`dock-nav-item ${isCreateActive ? "active" : ""}`}
                >
                  <div className="dock-active-contour" />
                  <Plus size={20} className="dock-icon" />
                  <span className="dock-active-dot" />
                  <span className="dock-label">Create</span>
                </Link>

                {/* Inbox */}
                <Link
                  to="/messages"
                  className={`dock-nav-item ${isInboxActive ? "active" : ""}`}
                >
                  <div className="dock-active-contour" />
                  <div className="dock-icon-wrapper">
                    <Send size={19} className="dock-icon" />
                    {unreadMessagesCount > 0 && (
                      <span className="dock-unread-badge" />
                    )}
                  </div>
                  <span className="dock-active-dot" />
                  <span className="dock-label">Inbox</span>
                </Link>

                {/* Saved / Profile */}
                <Link
                  to={`/profile/${user?._id}`}
                  className={`dock-nav-item ${isProfileActive ? "active" : ""}`}
                >
                  <div className="dock-active-contour" />
                  <div className="dock-avatar-frame">
                    {user?.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt={user.username || "Profile"}
                        className="dock-avatar-img"
                      />
                    ) : (
                      <Bookmark size={19} className="dock-icon" />
                    )}
                  </div>
                  <span className="dock-active-dot" />
                  <span className="dock-label">Saved</span>
                </Link>
              </div>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
