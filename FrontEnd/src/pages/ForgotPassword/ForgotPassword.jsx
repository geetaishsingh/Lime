import './ForgotPassword.scss';
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IoEye } from "react-icons/io5";
import { IoMdEyeOff } from "react-icons/io";
import { ArrowLeft, KeyRound, CheckCircle2, RotateCw, Mail, ShieldCheck } from "lucide-react";
import axios from "axios";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { BeatLoader } from "react-spinners";
import { serverUrl } from "../../config";
import LimeMascot from "../../components/common/LimeMascot/LimeMascot";
import limeLogoFull from "../../assets/lime-logo-full.png";
import limeLogoFullLight from "../../assets/lime-logo-full-light.png";

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const theme = useSelector((state) => state.user.theme);

  // Timer countdown for resending recovery OTP
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Focus first OTP input when reaching step 2
  useEffect(() => {
    if (step === 2 && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [step]);

  // Handle OTP digit entry
  const handleOtpChange = (index, value) => {
    if (value && !/^\d+$/.test(value)) return;
    const nextOtp = [...otp];
    nextOtp[index] = value ? value.slice(-1) : "";
    setOtp(nextOtp);
    setErrorMsg("");

    // Auto advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const nextOtp = [...otp];
    pasted.split("").forEach((char, idx) => {
      if (idx < 6) nextOtp[idx] = char;
    });
    setOtp(nextOtp);
    setErrorMsg("");

    const targetIdx = Math.min(pasted.length, 5);
    inputRefs.current[targetIdx]?.focus();
  };

  // STEP 1: Send Recovery OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMsg("Please enter your registered email address.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      const { data } = await axios.post(
        `${serverUrl}/api/auth/send-otp`,
        { email: trimmedEmail },
        { withCredentials: true }
      );

      if (data?.success) {
        toast.success(data.message || "Recovery code sent to your email!");
        setStep(2);
        setTimer(60);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Could not find an account with that email.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP in Step 2
  const handleResendOtp = async () => {
    if (timer > 0 || resending) return;

    try {
      setResending(true);
      setErrorMsg("");
      const { data } = await axios.post(
        `${serverUrl}/api/auth/send-otp`,
        { email: email.trim().toLowerCase() },
        { withCredentials: true }
      );

      if (data?.success) {
        toast.success("A fresh recovery code has been sent!");
        setTimer(60);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Could not resend code. Please try again.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  // STEP 2: Verify Recovery OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join("");
    if (fullOtp.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      const { data } = await axios.post(
        `${serverUrl}/api/auth/verify-otp`,
        { email: email.trim().toLowerCase(), otp: fullOtp },
        { withCredentials: true }
      );

      if (data?.success) {
        toast.success(data.message || "Code verified successfully!");
        setStep(3);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Invalid or expired recovery code.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Reset Password
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();

    if (!newPassword) {
      setErrorMsg("New password is required.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      const { data } = await axios.post(
        `${serverUrl}/api/auth/reset-password`,
        { email: email.trim().toLowerCase(), newpassword: newPassword },
        { withCredentials: true }
      );

      if (data?.success) {
        toast.success(data.message || "Password updated! You can now log in.");
        setStep(4);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Password reset failed. Please try again.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container forgot-password-page">
      <div className="container">
        <div className="register-container">
          <div className="form auth-card">
            {/* Header / Brand */}
            <div className="auth-brand">
              <div className="mobile-mascot-wrapper">
                <LimeMascot isPassword={isPasswordFocused} />
              </div>

              <img
                src={theme === "light" ? limeLogoFullLight : limeLogoFull}
                alt="Lime"
                className="auth-brand-logo desktop-brand-element"
              />

              {/* Dynamic Headers based on step */}
              {step === 1 && (
                <>
                  <h2 className="desktop-brand-element">Forgot Password</h2>
                  <p className="auth-subtitle desktop-brand-element">
                    Enter your registered email and we&apos;ll send a recovery code
                  </p>
                  <h2 className="mobile-mascot-headline">Forgot password?</h2>
                  <p className="mobile-mascot-subline">
                    Enter your registered email below
                  </p>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="desktop-brand-element">Verify Recovery Code</h2>
                  <p className="auth-subtitle desktop-brand-element">
                    Enter the 6-digit code sent to{" "}
                    <strong style={{ color: "var(--lime-accent)" }}>{email}</strong>
                  </p>
                  <h2 className="mobile-mascot-headline">Check your inbox</h2>
                  <p className="mobile-mascot-subline">
                    Enter the 6-digit code sent to {email}
                  </p>
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className="desktop-brand-element">Create New Password</h2>
                  <p className="auth-subtitle desktop-brand-element">
                    Choose a strong password with at least 6 characters
                  </p>
                  <h2 className="mobile-mascot-headline">New password</h2>
                  <p className="mobile-mascot-subline">
                    Choose a strong password with at least 6 characters
                  </p>
                </>
              )}

              {step === 4 && (
                <>
                  <div className="success-badge-icon" style={{ margin: "8px auto" }}>
                    <CheckCircle2 size={46} color="#84cc16" />
                  </div>
                  <h2 className="desktop-brand-element" style={{ color: "var(--lime-accent)" }}>
                    Password Updated!
                  </h2>
                  <p className="auth-subtitle desktop-brand-element">
                    Your password has been changed. You can now sign in.
                  </p>
                  <h2 className="mobile-mascot-headline" style={{ color: "#ffffff" }}>
                    All done!
                  </h2>
                  <p className="mobile-mascot-subline">
                    Your password has been updated successfully
                  </p>
                </>
              )}
            </div>

            {/* Error Banner */}
            {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}

            {/* STEP 1: Email Form */}
            {step === 1 && (
              <form onSubmit={handleSendOtp} className="auth-main-form">
                <div className="input-wrapper">
                  <label className="desktop-field-label">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMsg("");
                    }}
                    placeholder="Enter your registered email"
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="register-btn main-submit-btn"
                  disabled={loading || !email.trim()}
                >
                  {loading ? (
                    <BeatLoader size={8} color="#fff" />
                  ) : (
                    <>
                      <span className="desktop-btn-text">Send Recovery Code</span>
                      <span className="mobile-btn-text">Send code</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: 6-Digit OTP Form */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="auth-main-form">
                <div className="otp-inputs-wrapper" onPaste={handleOtpPaste}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (inputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className={`otp-digit-input ${digit ? "filled" : ""}`}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className="register-btn main-submit-btn"
                  disabled={loading || otp.join("").length !== 6}
                >
                  {loading ? (
                    <BeatLoader size={8} color="#fff" />
                  ) : (
                    <>
                      <span className="desktop-btn-text">Verify Code</span>
                      <span className="mobile-btn-text">Verify</span>
                    </>
                  )}
                </button>

                <div className="resend-actions-row">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={timer > 0 || resending}
                    className="resend-otp-btn"
                  >
                    {resending ? (
                      "Sending..."
                    ) : timer > 0 ? (
                      `Resend code in ${timer}s`
                    ) : (
                      "Didn't get the code? Resend"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setOtp(["", "", "", "", "", ""]);
                      setErrorMsg("");
                    }}
                    className="change-email-btn"
                  >
                    Change email
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: New Password Form */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="auth-main-form">
                <div className="input-wrapper password-input-wrapper">
                  <label className="desktop-field-label">New Password</label>
                  <div className="input-with-toggle">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setErrorMsg("");
                      }}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      tabIndex="-1"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <IoMdEyeOff size={18} /> : <IoEye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="input-wrapper password-input-wrapper">
                  <label className="desktop-field-label">Confirm New Password</label>
                  <div className="input-with-toggle">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrorMsg("");
                      }}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      tabIndex="-1"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <IoMdEyeOff size={18} />
                      ) : (
                        <IoEye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="register-btn main-submit-btn"
                  disabled={loading || !newPassword || !confirmPassword}
                >
                  {loading ? (
                    <BeatLoader size={8} color="#fff" />
                  ) : (
                    <>
                      <span className="desktop-btn-text">Save New Password</span>
                      <span className="mobile-btn-text">Save password</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 4: Success View */}
            {step === 4 && (
              <div className="auth-main-form" style={{ textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="register-btn main-submit-btn"
                >
                  <span className="desktop-btn-text">Sign In Now</span>
                  <span className="mobile-btn-text">Sign in now</span>
                </button>
              </div>
            )}

            {/* Footer Back Link */}
            <div className="desktop-switch-link auth-switch" style={{ marginTop: "18px" }}>
              <Link to="/login" className="forgot-back-link">
                <ArrowLeft size={15} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                Back to Sign In
              </Link>
            </div>

            <div className="mobile-auth-footer">
              <Link to="/login">
                &larr; Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
