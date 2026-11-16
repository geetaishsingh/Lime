import React from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import toast from "react-hot-toast";
import { Navigate, Outlet } from "react-router-dom";
import limeLogoIcon from "../assets/lime-logo-icon.png";
import limeLogoIconLight from "../assets/lime-logo-icon-light.png";
import { serverUrl } from "../config";
import authStorage from "../utils/authStorage";
import { resetUserState, setAuthLoading } from "../store/user.slice";

const Protected = () => {
  const { user, loading, theme, authVerificationError } = useSelector(
    (state) => state.user
  );
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

  if (!user && authVerificationError !== null) {
    return (
      <div className="lime-splash-screen" role="alert">
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
            Unable to verify your session
          </h3>
          <p style={{ fontSize: "0.85rem", opacity: 0.75, marginBottom: "20px", lineHeight: 1.4 }}>
            {authVerificationError === 403
              ? "The server denied the session verification request."
              : authVerificationError === 404
                ? "The authentication endpoint could not be found."
                : authVerificationError === 500
                  ? "The authentication service is temporarily unavailable."
                  : typeof authVerificationError === "number"
                    ? `The authentication service returned HTTP ${authVerificationError}.`
                    : "The authentication service could not be reached."}{" "}
            Your session has not been cleared. Please try again.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
            <button
              type="button"
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
              Retry
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await axios.post(
                    `${serverUrl}/api/auth/logout`,
                    { refreshToken: authStorage.getRefreshToken() },
                    { withCredentials: true }
                  );
                  authStorage.clearTokens();
                  authStorage.clearCachedUser();
                  dispatch(resetUserState());
                  window.location.href = "/login";
                } catch (error) {
                  toast.error(
                    error.response?.data?.message ||
                      "Could not reach Lime to sign out. Please try again."
                  );
                }
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

  if (user) {
    return <Outlet />;
  }

  return <Navigate to="/login" replace />;
};

export default Protected;
