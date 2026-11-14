import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import limeLogoIcon from "../assets/lime-logo-icon.png";
import limeLogoIconLight from "../assets/lime-logo-icon-light.png";
import authStorage from "../utils/authStorage";
import { setAuthLoading } from "../store/user.slice";

const Protected = () => {
  const { user, loading, networkError, theme } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  // 1. Initial verification loading state — never redirect while checking authentication
  if (loading) {
    return (
      <div className="lime-splash-screen">
        <div className="lime-splash-content">
          <div className="lime-splash-logo">
            <img
              src={theme === "light" ? limeLogoIconLight : limeLogoIcon}
              alt="Lime"
              width="56"
              height="56"
              style={{ objectFit: "contain" }}
            />
          </div>
          <h2>Lime</h2>
          <div className="lime-loading-pulse"></div>
        </div>
      </div>
    );
  }

  // 2. Network / server down recovery screen (preserves session during connection drops or cold starts)
  if (networkError && !user && authStorage.hasAuth()) {
    return (
      <div className="lime-splash-screen">
        <div className="lime-splash-content" style={{ maxWidth: "340px", textAlign: "center" }}>
          <div className="lime-splash-logo" style={{ marginBottom: "16px" }}>
            <img
              src={theme === "light" ? limeLogoIconLight : limeLogoIcon}
              alt="Lime"
              width="48"
              height="48"
              style={{ objectFit: "contain" }}
            />
          </div>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "8px", fontWeight: "700" }}>
            Connecting to Lime...
          </h3>
          <p style={{ fontSize: "0.85rem", opacity: 0.75, marginBottom: "20px", lineHeight: 1.4 }}>
            We're having trouble reaching the server. Your login session is saved.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
            <button
              onClick={() => {
                dispatch(setAuthLoading(true));
                window.location.reload();
              }}
              style={{
                padding: "10px 18px",
                background: "#84cc16",
                color: "#09090b",
                border: "none",
                borderRadius: "999px",
                fontWeight: "700",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Retry Connection
            </button>
            <button
              onClick={() => {
                authStorage.clearTokens();
                authStorage.clearCachedUser();
                window.location.href = "/login";
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                opacity: 0.6,
                fontSize: "0.8rem",
                cursor: "pointer",
                padding: "6px",
              }}
            >
              Sign out and return to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. User is authenticated -> render dashboard outlet
  if (user) {
    return <Outlet />;
  }

  // 4. Genuine unauthenticated state -> redirect to login
  return <Navigate to="/login" replace />;
};

export default Protected;
