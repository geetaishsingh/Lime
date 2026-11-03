import './ForgotPassword.scss';
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaArrowLeft } from "react-icons/fa";
import { KeyRound } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { BeatLoader } from "react-spinners";
import { serverUrl } from "../../config";

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
      setErrorMsg("Please enter the 6-digit code.");
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

  const resetPassword = async (e) => {
    if (e) e.preventDefault();
    if (newpassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (newpassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
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
      toast.success(result.data.message || "Password updated! Please log in.");
      navigate("/login");
    } catch (error) {
      const msg = error.response?.data?.message || "Password reset failed.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container password-reset-page">
      <div className="auth-card password-reset-card">
        <div className="auth-body">
          <div className="auth-form-wrapper">
            <div className="auth-header">
              <div className="lime-logo-icon">
                <KeyRound size={28} color="#10b981" />
              </div>
              <h1 className="auth-title">Reset Password</h1>
              <p className="auth-subtitle">
                {step === 1 && "Enter your email to receive a recovery code"}
                {step === 2 && `Enter the 6-digit code sent to ${email}`}
                {step === 3 && "Create a secure new password for your account"}
              </p>
            </div>

            {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}

            {step === 1 && (
              <form onSubmit={sendOtp} className="auth-form">
                <div className="form-group">
                  <label htmlFor="recovery-email">Email Address</label>
                  <input
                    id="recovery-email"
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="register-btn"
                  disabled={loading || !email}
                >
                  {loading ? <BeatLoader size={8} color="#fff" /> : "Send Recovery Code"}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={verifyOtp} className="auth-form">
                <div className="form-group">
                  <label htmlFor="recovery-otp">6-Digit Verification Code</label>
                  <input
                    id="recovery-otp"
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    style={{ letterSpacing: "4px", textAlign: "center", fontSize: "1.2rem", fontWeight: "700" }}
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="register-btn"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? <BeatLoader size={8} color="#fff" /> : "Verify Code"}
                </button>

                <div className="auth-resend-row" style={{ textAlign: "center", marginTop: "1rem" }}>
                  <button
                    type="button"
                    onClick={sendOtp}
                    className="auth-text-btn"
                    disabled={loading}
                    style={{ background: "none", border: "none", color: "#10b981", cursor: "pointer", fontSize: "0.875rem" }}
                  >
                    Didn't get the code? Resend
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={resetPassword} className="auth-form">
                <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                  <div className="input-group">
                    <input
                    id="new-password"
                      type={toggle1 ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={newpassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setToggle1(!toggle1)}
                    >
                      {toggle1 ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-password">Confirm Password</label>
                  <div className="input-group">
                    <input
                      id="confirm-password"
                      type={toggle2 ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setToggle2(!toggle2)}
                    >
                      {toggle2 ? <FaEyeSlash /> : <FaEye />}
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

