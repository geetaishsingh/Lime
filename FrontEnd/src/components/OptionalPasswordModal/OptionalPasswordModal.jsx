import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import toast from "react-hot-toast";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import { BeatLoader } from "react-spinners";
import { serverUrl } from "../../config";
import { updateUserSecurityState } from "../../store/user.slice";
import "./OptionalPasswordModal.scss";

/**
 * OptionalPasswordModal
 * Handles the optional password setup for OAuth users (Google / GitHub)
 * as well as Set Password and Change Password from Account Settings.
 */
const OptionalPasswordModal = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  initialMode = null,
}) => {
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState("prompt"); // "prompt" | "set" | "change"

  // Form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Determine if auto-prompt should show for newly redirected OAuth user
  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setIsOpen(controlledIsOpen);
      if (initialMode) setView(initialMode);
      return;
    }

    if (typeof window === "undefined") return;

    const showPromptFlag = sessionStorage.getItem("lime_show_password_prompt");
    if (
      showPromptFlag === "true" &&
      user &&
      !user.hasPassword &&
      !user.passwordPromptDismissed
    ) {
      setIsOpen(true);
      setView("prompt");
    }
  }, [controlledIsOpen, initialMode, user]);

  // Listen for custom event to trigger password modal from settings or elsewhere
  useEffect(() => {
    const handleOpenEvent = (event) => {
      const mode = event.detail?.mode || "set";
      setView(mode);
      setIsOpen(true);
      setErrorMsg("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    };

    window.addEventListener("lime:open-password-modal", handleOpenEvent);
    return () => {
      window.removeEventListener("lime:open-password-modal", handleOpenEvent);
    };
  }, []);

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setIsOpen(false);
    }
    setErrorMsg("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  // Skip Password handler
  const handleSkip = async () => {
    try {
      setSubmitting(true);
      setErrorMsg("");

      // Mark prompt as dismissed on the server
      await axios.post(
        `${serverUrl}/api/user/skip-password-prompt`,
        {},
        { withCredentials: true }
      );

      // Clean session storage
      try {
        sessionStorage.removeItem("lime_show_password_prompt");
      } catch (_e) {}

      // Update Redux state
      dispatch(updateUserSecurityState({ passwordPromptDismissed: true }));
      handleClose();
    } catch (err) {
      console.warn("Skip prompt error:", err);
      // Even if network fails, close the modal and update local state so user is not trapped
      try {
        sessionStorage.removeItem("lime_show_password_prompt");
      } catch (_e) {}
      dispatch(updateUserSecurityState({ passwordPromptDismissed: true }));
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Password Setup (new password)
  const handleSetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await axios.post(
        `${serverUrl}/api/user/set-password`,
        { newPassword, confirmPassword },
        { withCredentials: true }
      );

      if (data?.success) {
        toast.success(
          data.message || "Password set successfully! You can now log in with email and password."
        );

        try {
          sessionStorage.removeItem("lime_show_password_prompt");
        } catch (_e) {}

        const updatedAuthProviders = user?.authProvider
          ? [...new Set([...user.authProvider, "local"])]
          : ["local"];

        dispatch(
          updateUserSecurityState({
            hasPassword: true,
            passwordPromptDismissed: true,
            authProvider: data.authProvider || updatedAuthProviders,
          })
        );

        handleClose();
      } else {
        setErrorMsg(data?.message || "Failed to set password.");
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Failed to set password. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Password Change (for users who already have a password)
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!currentPassword) {
      setErrorMsg("Current password is required.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await axios.post(
        `${serverUrl}/api/user/change-password`,
        { currentPassword, newPassword, confirmPassword },
        { withCredentials: true }
      );

      if (data?.success) {
        toast.success(data.message || "Password updated successfully.");
        dispatch(updateUserSecurityState({ hasPassword: true }));
        handleClose();
      } else {
        setErrorMsg(data?.message || "Failed to change password.");
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Failed to change password. Please check your current password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isMinLength = newPassword.length >= 6;
  const isMatching = newPassword && confirmPassword && newPassword === confirmPassword;

  return (
    <div className="optional-pwd-backdrop" onClick={handleClose}>
      <div
        className="optional-pwd-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwd-modal-title"
      >
        <button
          className="optional-pwd-close-btn"
          onClick={handleClose}
          aria-label="Close"
          type="button"
        >
          <X size={18} />
        </button>

        {view === "prompt" ? (
          /* STEP 1: PROMPT DIALOG (Secure Your Account) */
          <div className="prompt-content-view">
            <div className="shield-badge-container">
              <div className="shield-glow" />
              <div className="shield-icon-circle">
                <ShieldCheck size={36} className="shield-icon" />
              </div>
            </div>

            <h2 id="pwd-modal-title" className="modal-title">
              Secure Your Account
            </h2>
            <p className="modal-description">
              Set a password to access your account using your email and password,
              even without Google or GitHub.
            </p>

            <div className="prompt-actions-row">
              <button
                type="button"
                className="btn-set-password-primary"
                onClick={() => setView("set")}
                disabled={submitting}
              >
                Set Password
              </button>

              <button
                type="button"
                className="btn-skip-secondary"
                onClick={handleSkip}
                disabled={submitting}
              >
                {submitting ? <BeatLoader size={6} color="#a1a1aa" /> : "Skip for Now"}
              </button>
            </div>
          </div>
        ) : (
          /* STEP 2: PASSWORD SETUP OR CHANGE FORM */
          <div className="form-content-view">
            <div className="form-header-badge">
              <KeyRound size={24} className="key-icon" />
            </div>

            <h2 id="pwd-modal-title" className="modal-title">
              {view === "change" ? "Change Password" : "Create Password"}
            </h2>
            <p className="modal-description">
              {view === "change"
                ? "Enter your current password and choose a secure new password."
                : "Choose a strong password to enable email & password login anytime."}
            </p>

            {errorMsg && (
              <div className="error-alert-banner">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form
              onSubmit={view === "change" ? handleChangePassword : handleSetPassword}
              className="password-entry-form"
            >
              {view === "change" && (
                <div className="form-field-group">
                  <label htmlFor="current-pwd-input">Current Password</label>
                  <div className="input-with-icon">
                    <Lock size={16} className="leading-icon" />
                    <input
                      id="current-pwd-input"
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="eye-toggle-btn"
                      onClick={() => setShowCurrent(!showCurrent)}
                      aria-label="Toggle password visibility"
                    >
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="form-field-group">
                <label htmlFor="new-pwd-input">
                  {view === "change" ? "New Password" : "Create Password"}
                </label>
                <div className="input-with-icon">
                  <Lock size={16} className="leading-icon" />
                  <input
                    id="new-pwd-input"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="eye-toggle-btn"
                    onClick={() => setShowNew(!showNew)}
                    aria-label="Toggle password visibility"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-field-group">
                <label htmlFor="confirm-pwd-input">Confirm Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="leading-icon" />
                  <input
                    id="confirm-pwd-input"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="eye-toggle-btn"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label="Toggle password visibility"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Requirement Checklist */}
              <div className="pwd-checklist">
                <div className={`check-item ${isMinLength ? "passed" : ""}`}>
                  <CheckCircle2 size={14} />
                  <span>At least 6 characters</span>
                </div>
                <div className={`check-item ${isMatching ? "passed" : ""}`}>
                  <CheckCircle2 size={14} />
                  <span>Passwords match</span>
                </div>
              </div>

              <div className="form-actions-row">
                {view === "set" && !controlledIsOpen && (
                  <button
                    type="button"
                    className="btn-back-link"
                    onClick={() => setView("prompt")}
                  >
                    Back
                  </button>
                )}

                <button
                  type="submit"
                  className="btn-submit-action"
                  disabled={submitting || !isMinLength || !isMatching}
                >
                  {submitting ? (
                    <BeatLoader size={8} color="#09090b" />
                  ) : view === "change" ? (
                    "Update Password"
                  ) : (
                    "Save Password"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptionalPasswordModal;
