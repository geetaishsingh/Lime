import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Home, ArrowLeft } from "lucide-react";
import limeLogoFull from "../../assets/lime-logo-full.png";
import limeLogoFullLight from "../../assets/lime-logo-full-light.png";
import authStorage from "../../utils/authStorage";
import "./NotFound.scss";

/**
 * NotFound (404 Page)
 * Premium SaaS 404 Not Found screen for Lime Chat Application.
 * Supports dark/light themes, chat-themed SVG illustration,
 * authentication-aware routing, and responsive layouts.
 */
const NotFound = () => {
  const navigate = useNavigate();
  const { user, theme } = useSelector((state) => state.user);

  // Determine authentication state to route to dashboard or login
  const isAuthenticated = Boolean(user?._id || authStorage.hasAuth());
  const homePath = isAuthenticated ? "/" : "/login";

  const handleHomeClick = (e) => {
    e.preventDefault();
    navigate(homePath);
  };

  const handleGoBack = () => {
    // If there is meaningful history, step back; otherwise fall back to home/login
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(homePath, { replace: true });
    }
  };

  return (
    <main className="not-found-page" role="main" aria-label="Page Not Found">
      {/* Background ambient lighting effects */}
      <div className="not-found-ambient-bg" aria-hidden="true">
        <div className="glow-sphere glow-sphere-purple" />
        <div className="glow-sphere glow-sphere-blue" />
        <div className="glow-grid-overlay" />
      </div>

      <div className="not-found-content-wrapper">
        {/* Top Centered Application Logo */}
        <header className="not-found-header">
          <Link
            to={homePath}
            onClick={handleHomeClick}
            className="not-found-logo-link"
            aria-label="Return to Lime Home"
            title="Lime Home"
          >
            <img
              src={theme === "light" ? limeLogoFullLight : limeLogoFull}
              alt="Lime"
              className="not-found-logo-img"
            />
          </Link>
        </header>

        {/* Central Card with Illustration and 404 Message */}
        <div className="not-found-card">
          {/* Chat-Related Error Illustration */}
          <div className="illustration-container" aria-hidden="true">
            <svg
              className="chat-404-svg"
              viewBox="0 0 320 230"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Glow & Gradient definitions */}
                <radialGradient id="auraGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                  <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </radialGradient>

                <linearGradient id="windowBorder" x1="0" y1="0" x2="320" y2="230" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#6366f1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.5" />
                </linearGradient>

                <linearGradient id="msgSentGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>

                <linearGradient id="lensRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>

                <linearGradient id="handleGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#4338ca" />
                </linearGradient>

                <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
                  <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#000000" floodOpacity="0.35" />
                </filter>

                <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Aura */}
              <circle cx="160" cy="115" r="95" fill="url(#auraGlow)" filter="url(#glowFilter)" />

              {/* Chat Window Frame */}
              <g className="chat-window-group" filter="url(#cardShadow)">
                {/* Window Outer Rect */}
                <rect
                  x="45"
                  y="28"
                  width="230"
                  height="154"
                  rx="18"
                  className="chat-window-bg"
                />
                <rect
                  x="45"
                  y="28"
                  width="230"
                  height="154"
                  rx="18"
                  stroke="url(#windowBorder)"
                  strokeWidth="1.5"
                  fill="none"
                />

                {/* Top Window Bar */}
                <rect
                  x="45"
                  y="28"
                  width="230"
                  height="30"
                  rx="18"
                  className="chat-window-header-bg"
                />
                <line x1="45" y1="58" x2="275" y2="58" className="chat-window-divider" strokeWidth="1" />

                {/* Window Dots (macOS style) */}
                <circle cx="62" cy="43" r="3.5" fill="#ef4444" opacity="0.85" />
                <circle cx="74" cy="43" r="3.5" fill="#f59e0b" opacity="0.85" />
                <circle cx="86" cy="43" r="3.5" fill="#10b981" opacity="0.85" />

                {/* Chat Title Placeholder Bar */}
                <rect x="120" y="39" width="80" height="8" rx="4" className="chat-bar-placeholder" />

                {/* Chat Message 1 (Received, Left) */}
                <g className="chat-msg msg-received">
                  <circle cx="66" cy="85" r="9" className="msg-avatar" />
                  <rect x="82" y="73" width="96" height="26" rx="10" className="msg-bubble-received" />
                  <rect x="92" y="81" width="56" height="4" rx="2" className="msg-text-line" />
                  <rect x="92" y="89" width="38" height="4" rx="2" className="msg-text-line" />
                </g>

                {/* Chat Message 2 (Sent, Right - Purple/Blue Gradient) */}
                <g className="chat-msg msg-sent">
                  <rect x="138" y="108" width="118" height="30" rx="12" fill="url(#msgSentGrad)" />
                  <rect x="148" y="117" width="70" height="4.5" rx="2" fill="#ffffff" opacity="0.9" />
                  <rect x="148" y="126" width="46" height="4.5" rx="2" fill="#ffffff" opacity="0.65" />
                </g>

                {/* Chat Message 3 (Typing indicator dots, Left) */}
                <g className="chat-msg msg-typing">
                  <rect x="60" y="146" width="46" height="18" rx="9" className="msg-bubble-typing" />
                  <circle cx="73" cy="155" r="2.2" className="typing-dot typing-dot-1" />
                  <circle cx="83" cy="155" r="2.2" className="typing-dot typing-dot-2" />
                  <circle cx="93" cy="155" r="2.2" className="typing-dot typing-dot-3" />
                </g>
              </g>

              {/* Floating Magnifying Glass with X Symbol */}
              <g className="magnifying-glass-group" filter="url(#cardShadow)">
                {/* Handle */}
                <line
                  x1="228"
                  y1="146"
                  x2="258"
                  y2="176"
                  stroke="url(#handleGrad)"
                  strokeWidth="11"
                  strokeLinecap="round"
                />
                <line
                  x1="229"
                  y1="147"
                  x2="256"
                  y2="174"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.3"
                />

                {/* Lens Outer Rim */}
                <circle
                  cx="198"
                  cy="116"
                  r="38"
                  stroke="url(#lensRingGrad)"
                  strokeWidth="6"
                  className="lens-glass-surface"
                />

                {/* Glass Glare Arc */}
                <path
                  d="M174 96 A 32 32 0 0 1 216 96"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.4"
                />

                {/* Luminous "X" Symbol */}
                <g className="lens-x-symbol">
                  <line
                    x1="186"
                    y1="104"
                    x2="210"
                    y2="128"
                    stroke="#ef4444"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <line
                    x1="210"
                    y1="104"
                    x2="186"
                    y2="128"
                    stroke="#ef4444"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </g>
              </g>

              {/* Floating Sparkles & Soft Particles */}
              <g className="floating-particles" opacity="0.75">
                <path
                  d="M50 110 L52 114 L56 116 L52 118 L50 122 L48 118 L44 116 L48 114 Z"
                  fill="#a855f7"
                  className="sparkle-1"
                />
                <path
                  d="M276 80 L277.5 83 L281 84.5 L277.5 86 L276 89 L274.5 86 L271 84.5 L274.5 83 Z"
                  fill="#38bdf8"
                  className="sparkle-2"
                />
                <circle cx="270" cy="170" r="3" fill="#6366f1" className="particle-dot" />
                <circle cx="40" cy="60" r="2.5" fill="#8b5cf6" className="particle-dot" />
              </g>
            </svg>
          </div>

          {/* Large 404 Typography */}
          <div className="error-number-container">
            <h1 className="error-code">404</h1>
          </div>

          {/* Heading and Description */}
          <div className="error-text-container">
            <h2 className="error-heading">Oops! Page Not Found</h2>
            <p className="error-description">
              The page you're looking for doesn't exist or may have been moved.
            </p>
          </div>

          {/* Navigation Action Buttons */}
          <div className="not-found-actions-group">
            <button
              type="button"
              className="btn-not-found btn-primary-home"
              onClick={handleHomeClick}
              aria-label="Back to Home"
            >
              <Home size={18} className="btn-icon" />
              <span>Back to Home</span>
            </button>

            <button
              type="button"
              className="btn-not-found btn-secondary-back"
              onClick={handleGoBack}
              aria-label="Go Back to previous page"
            >
              <ArrowLeft size={18} className="btn-icon" />
              <span>Go Back</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
