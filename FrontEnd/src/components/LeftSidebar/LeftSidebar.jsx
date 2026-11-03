import { useState, lazy, Suspense } from "react";
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
} from "lucide-react";
import { serverUrl } from "../../config";
import { resetUserState, toggleTheme } from "../../store/user.slice";
import limeLogoFull from "../../assets/lime-logo-full.png";
import limeLogoIcon from "../../assets/lime-logo-icon.png";
import limeLogoFullLight from "../../assets/lime-logo-full-light.png";
import limeLogoIconLight from "../../assets/lime-logo-icon-light.png";
import "./LeftSidebar.scss";

// Lazy-loaded flyout panels to optimize bundle size
const Search = lazy(() => import("../../pages/Search/Search"));
const Notifications = lazy(() => import("../../pages/Notifications/Notifications"));

export const LeftSidebar = () => {
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
      navigate("/login");
    } catch (_error) {
      dispatch(resetUserState());
      navigate("/login");
    }
  };

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className="lime-sidebar left-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <Link to="/" className="sidebar-brand-link brand-logo-link" aria-label="Lime Home">
          <img
            src={theme === "light" ? limeLogoFullLight : limeLogoFull}
            alt="Lime"
            className="brand-logo-img brand-logo-full"
          />
          <img
            src={theme === "light" ? limeLogoIconLight : limeLogoIcon}
            alt="Lime"
            className="brand-logo-img brand-logo-icon"
          />
        </Link>
      </div>

      {/* Main Navigation Links */}
      <nav className="sidebar-nav sidebar-nav-list">
        {/* Home */}
        <Link
          to="/"
          className={`sidebar-nav-item sidebar-nav-btn ${
            isActive("/") && !showSearchModal && !showNotificationModal ? "active" : ""
          }`}
          onClick={() => {
            setShowSearchModal(false);
            setShowNotificationModal(false);
          }}
        >
          <Home size={24} />
          <span className="nav-label-text">Home</span>
        </Link>

        {/* Search */}
        <button
          type="button"
          className={`sidebar-nav-item sidebar-nav-btn ${
            showSearchModal || location.pathname === "/search" ? "active" : ""
          }`}
          onClick={() => {
            setShowSearchModal(!showSearchModal);
            setShowNotificationModal(false);
          }}
        >
          <SearchIcon size={24} />
          <span className="nav-label-text">Search</span>
        </button>

        {/* Messages */}
        <Link
          to="/messages"
          className={`sidebar-nav-item sidebar-nav-btn ${
            isActive("/messages") && !showSearchModal && !showNotificationModal
              ? "active"
              : ""
          }`}
          onClick={() => {
            setShowSearchModal(false);
            setShowNotificationModal(false);
          }}
        >
          <div className="nav-icon-container">
            <Send size={24} />
            {unreadMessagesCount > 0 && (
              <span className="nav-badge-pill nav-badge-count">
                {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
              </span>
            )}
          </div>
          <span className="nav-label-text">Messages</span>
        </Link>

        {/* Notifications */}
        <button
          type="button"
          className={`sidebar-nav-item sidebar-nav-btn ${
            showNotificationModal || location.pathname === "/notifications" ? "active" : ""
          }`}
          onClick={() => {
            setShowNotificationModal(!showNotificationModal);
            setShowSearchModal(false);
          }}
        >
          <div className="nav-icon-container">
            <Heart size={24} />
            {unreadNotificationsCount > 0 && (
              <span className="nav-badge-pill nav-badge-count">
                {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
              </span>
            )}
          </div>
          <span className="nav-label-text">Notifications</span>
        </button>

        {/* Create Post */}
        <Link
          to="/create-post"
          className={`sidebar-nav-item sidebar-nav-btn ${
            isActive("/create-post") && !showSearchModal && !showNotificationModal
              ? "active"
              : ""
          }`}
          onClick={() => {
            setShowSearchModal(false);
            setShowNotificationModal(false);
          }}
        >
          <PlusSquare size={24} />
          <span className="nav-label-text">Create</span>
        </Link>

        {/* Profile */}
        {user?._id && (
          <Link
            to={`/profile/${user._id}`}
            className={`sidebar-nav-item sidebar-nav-btn ${
              location.pathname === `/profile/${user._id}` &&
              !showSearchModal &&
              !showNotificationModal
                ? "active"
                : ""
            }`}
            onClick={() => {
              setShowSearchModal(false);
              setShowNotificationModal(false);
            }}
          >
            <div className="avatar-wrapper sidebar-user-avatar">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.username}
                  className="sidebar-avatar"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    if (e.currentTarget.nextSibling) {
                      e.currentTarget.nextSibling.style.display = "flex";
                    }
                  }}
                />
              ) : null}
              <div
                className="sidebar-avatar-placeholder"
                style={{ display: user.profileImage ? "none" : "flex" }}
              >
                {(user.name || user.username || "US").slice(0, 2).toUpperCase()}
              </div>
            </div>
            <span className="nav-label-text">Profile</span>
          </Link>
        )}
      </nav>

      {/* Bottom Actions: Theme Toggle & Logout */}
      <div className="sidebar-bottom-actions">
        {/* Dark/Light Theme Switcher */}
        <button
          type="button"
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
          type="button"
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
        <Suspense fallback={null}>
          <Search handleShow={() => setShowSearchModal(false)} />
        </Suspense>
      )}

      {/* Flyout Notifications Modal */}
      {showNotificationModal && (
        <Suspense fallback={null}>
          <Notifications handleShow={() => setShowNotificationModal(false)} />
        </Suspense>
      )}
    </aside>
  );
};

export default LeftSidebar;
