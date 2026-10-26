import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { BeatLoader } from "react-spinners";
import { ShieldCheck, ArrowLeft, RefreshCw } from "lucide-react";
import { serverUrl } from "../App";
import { setuser } from "../redux/user.slice";

const VerifyOtp = () => {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [errorMsg, setErrorMsg] = useState("");

  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (index, value) => {
    // Only accept numeric values
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setErrorMsg("");

    // Auto-advance to next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pasteData)) {
      const digits = pasteData.split("");
      setOtp(digits);
      inputRefs.current[5].focus();
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join("");

    if (fullOtp.length !== 6) {
      setErrorMsg("Please enter all 6 digits of the verification code.");
      return;
    }

    if (!email) {
      setErrorMsg("Email address is required.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const { data } = await axios.post(
        `${serverUrl}/api/auth/verify-signup-otp`,
        { email, otp: fullOtp },
        { withCredentials: true }
      );

      if (data?.success) {
        toast.success(data.message || "Account activated! Welcome to Lime.");
        dispatch(setuser(data.user));
        navigate("/", { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Verification failed. Please check the code.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || resending) return;

    try {
      setResending(true);
      setErrorMsg("");
      const { data } = await axios.post(
        `${serverUrl}/api/auth/resend-signup-otp`,
        { email },
        { withCredentials: true }
      );

      if (data?.success) {
        toast.success(data.message);
        setTimer(60);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0].focus();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not resend verification code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="container">
        <div className="register-container">
          <div className="form auth-card">
            <div className="auth-brand">
              <div className="lime-badge-icon">
                <ShieldCheck size={28} color="#84cc16" />
              </div>
              <h1 className="logo">Lime</h1>
              <h2>Verify Your Email</h2>
              <p className="auth-subtitle">
                We sent a 6-digit verification code to
                <br />
                <span className="email-highlight">{email || "your email"}</span>
              </p>
            </div>

            {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}

            <form onSubmit={handleVerify}>
              <div className="otp-inputs-wrapper" onPaste={handlePaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={`otp-digit-input ${digit ? "filled" : ""}`}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="register-btn"
                disabled={loading || otp.join("").length !== 6}
              >
                {loading ? <BeatLoader size={8} color="#fff" /> : "Verify & Activate Account"}
              </button>
            </form>

            <div className="otp-resend-row">
              {timer > 0 ? (
                <span className="resend-countdown">
                  Resend code in <b>{timer}s</b>
                </span>
              ) : (
                <button
                  type="button"
                  className="resend-btn"
                  onClick={handleResend}
                  disabled={resending}
                >
                  <RefreshCw size={14} className={resending ? "spin" : ""} />
                  {resending ? "Sending..." : "Resend Verification Code"}
                </button>
              )}
            </div>

            <div className="auth-footer-link">
              <Link to="/register" className="back-link">
                <ArrowLeft size={16} /> Back to Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
