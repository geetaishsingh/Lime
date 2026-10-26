import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Home,
  Search,
  PlusSquare,
  Send,
  Heart,
} from "lucide-react";
import LeftSidebar from "../components/LeftSidebar";

const Dashboard = () => {
  const { user, unreadNotificationsCount, unreadMessagesCount } = useSelector(
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

  return (
    <div className="dashboard-container">
      <div className="container">
        <div className="dashboard-inner-container">
          {/* Mobile Top Header */}
          <header className="mobile-top-header">
            <Link to="/" className="mobile-logo-link">
              <div className="lime-citrus-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#84cc16">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <span className="mobile-brand-name">Lime</span>
            </Link>

            <div className="mobile-header-actions">
              <Link to="/create-post" className="mobile-header-btn" title="Create Post">
                <PlusSquare size={22} />
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
                  <span className="mobile-unread-badge">
                    {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                  </span>
                )}
              </Link>
            </div>
          </header>

          {/* Desktop & Tablet Sidebar */}
          <LeftSidebar />

          {/* Central Main Content Outlet */}
          <main className="main-content-area">
            <Outlet />
          </main>

          {/* Mobile Bottom Navigation Bar */}
          {!isKeyboardOpen && (
            <nav className="mobile-bottom-nav">
              <Link
                to="/"
                className={`bottom-nav-item ${location.pathname === "/" ? "active" : ""}`}
              >
                <Home size={22} />
              </Link>

              <Link
                to="/search"
                className={`bottom-nav-item ${location.pathname === "/search" ? "active" : ""}`}
              >
                <Search size={22} />
              </Link>

              <Link
                to="/create-post"
                className={`bottom-nav-item ${location.pathname === "/create-post" ? "active" : ""}`}
              >
                <PlusSquare size={22} />
              </Link>

              <Link
                to="/messages"
                className={`bottom-nav-item ${location.pathname.startsWith("/messages") ? "active" : ""}`}
              >
                <div className="mobile-nav-icon-wrapper">
                  <Send size={22} />
                  {unreadMessagesCount > 0 && (
                    <span className="mobile-unread-badge">
                      {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                    </span>
                  )}
                </div>
              </Link>

              <Link
                to={`/profile/${user?._id}`}
                className={`bottom-nav-item profile-item ${
                  location.pathname.startsWith(`/profile/${user?._id}`) ? "active" : ""
                }`}
              >
                <img
                  src={user?.profileImage}
                  alt={user?.username || "profile"}
                  className="mobile-avatar-icon"
                />
              </Link>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
