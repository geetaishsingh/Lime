import React from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import limeLogoIcon from "../assets/lime-logo-icon.png";
import limeLogoIconLight from "../assets/lime-logo-icon-light.png";

const Protected = () => {
  const { user, loading, theme, authVerificationError } = useSelector(
    (state) => state.user
  );

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
              style={{ objectFit: 'contain' }}
            />
          </div>
          <h2>Lime</h2>
          <div className="lime-loading-pulse"></div>
        </div>
      </div>
    );
  }

  if (!user && authVerificationError) {
    return (
      <div className="lime-splash-screen" role="alert">
        <div className="lime-splash-content">
          <h2>Unable to verify your session</h2>
          <p>
            The authentication service could not verify your session
            {typeof authVerificationError === "number"
              ? ` (HTTP ${authVerificationError})`
              : ""}
            . Please try again.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default Protected;
