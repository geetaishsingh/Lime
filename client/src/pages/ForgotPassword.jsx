import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaArrowLeft } from "react-icons/fa";
import { KeyRound, ShieldAlert } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BeatLoader } from "react-spinners";
import { serverUrl } from "../App";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [newpassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toggle1, setToggle1] = useState(false);
  const [toggle2, setToggle2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();

  const sendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Email address is required.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const result = await axios.post(
        `${serverUrl}/api/auth/send-otp`,
        { email: email.trim().toLowerCase() },
        { withCredentials: true }
      );
      toast.success(result.data.message || "Reset code sent to your email!");
      setStep(2);
    } catch (error) {
      const msg = error.response?.data?.message || "Could not send reset code.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otp.trim()) {
      setErrorMsg("Please enter the verification code.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const result = await axios.post(
        `${serverUrl}/api/auth/verify-otp`,
        { email: email.trim().toLowerCase(), otp: otp.trim() },
        { withCredentials: true }
      );
      toast.success(result.data.message || "Code verified successfully!");
      setStep(3);
    } catch (error) {
      const msg = error.response?.data?.message || "Invalid or expired code.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (e) => {
    if (e) e.preventDefault();
    if (newpassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    if (confirmPassword !== newpassword) {
      setErrorMsg("Passwords do not match.");
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const result = await axios.post(
        `${serverUrl}/api/auth/reset-password`,
        { email: email.trim().toLowerCase(), newpassword },
        { withCredentials: true }
      );
      toast.success(result.data.message || "Password changed! You can now log in.");
      navigate("/login");
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to reset password.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="container">
        <div className="register-container">
          <div className="form auth-card">
            <div className="auth-brand">
              <div className="lime-badge-icon">
                <KeyRound size={28} color="#84cc16" />
              </div>
              <h1 className="logo">Lime</h1>
              <h2>Reset Password</h2>
              <p className="auth-subtitle">
                {step === 1 && "Enter your email to receive a recovery code"}
                {step === 2 && `Enter the 6-digit code sent to ${email}`}
                {step === 3 && "Create your new secure password"}
              </p>
            </div>

            {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}

            {step === 1 && (
              <form onSubmit={sendOtp}>
                <div className="input-wrapper">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your registered email"
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMsg("");
                    }}
                    value={email}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="register-btn"
                  disabled={loading || !email}
                >
                  {loading ? <BeatLoader size={8} color="#fff" /> : "Send Reset Code"}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={verifyOtp}>
                <div className="input-wrapper">
                  <label>Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter 6-digit code"
                    onChange={(e) => {
                      setOtp(e.target.value);
                      setErrorMsg("");
                    }}
                    value={otp}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="register-btn"
                  disabled={loading || !otp}
                >
                  {loading ? <BeatLoader size={8} color="#fff" /> : "Verify Code"}
                </button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={changePassword}>
                <div className="input-wrapper password-input-wrapper">
                  <label>New Password</label>
                  <div className="input-with-toggle">
                    <input
                      type={toggle1 ? "text" : "password"}
                      placeholder="At least 6 characters"
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setErrorMsg("");
                      }}
                      value={newpassword}
                      autoFocus
                    />
                    <button
                      type="button"
                      tabIndex="-1"
                      className="password-toggle-btn"
                      onClick={() => setToggle1(!toggle1)}
                    >
                      {toggle1 ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="input-wrapper password-input-wrapper">
                  <label>Confirm New Password</label>
                  <div className="input-with-toggle">
                    <input
                      type={toggle2 ? "text" : "password"}
                      placeholder="Re-enter password"
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrorMsg("");
                      }}
                      value={confirmPassword}
                    />
                    <button
                      type="button"
                      tabIndex="-1"
                      className="password-toggle-btn"
                      onClick={() => setToggle2(!toggle2)}
                    >
                      {toggle2 ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="register-btn"
                  disabled={loading || !newpassword || !confirmPassword}
                >
                  {loading ? <BeatLoader size={8} color="#fff" /> : "Save New Password"}
                </button>
              </form>
            )}

            <div className="auth-footer-link">
              <Link to="/login" className="back-link">
                <FaArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
