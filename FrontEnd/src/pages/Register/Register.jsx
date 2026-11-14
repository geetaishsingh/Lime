import limeLogoFull from '../../assets/lime-logo-full.png';
import limeLogoFullLight from '../../assets/lime-logo-full-light.png';
import './Register.scss';
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { IoEye } from "react-icons/io5";
import { IoMdEyeOff } from "react-icons/io";
import { FaGithub } from "react-icons/fa";
import axios from "axios";
import toast from "react-hot-toast";
import { BeatLoader } from "react-spinners";
import { serverUrl } from "../../config";
import LimeMascot from "../../components/common/LimeMascot/LimeMascot";

const oauthBaseUrl = import.meta.env.VITE_OAUTH_BASE_URL || serverUrl;

const Register = () => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({});

  const navigate = useNavigate();
  const theme = useSelector((state) => state.user.theme);

  const handleName = (value) => {
    setName(value);
    setError((prev) => ({ ...prev, nameError: "" }));
  };

  const handleUsername = (value) => {
    setUsername(value);
    setError((prev) => ({ ...prev, usernameError: "" }));
  };

  const handleEmail = (value) => {
    setEmail(value);
    setError((prev) => ({ ...prev, emailError: "" }));
  };

  const handlePassword = (value) => {
    setPassword(value);
    setError((prev) => ({ ...prev, passwordError: "" }));
  };

  const handleSignUp = async (e) => {
    if (e) e.preventDefault();

    const errors = {};
    if (!name.trim()) errors.nameError = "Full name is required";
    if (!username.trim()) errors.usernameError = "Username is required";
    if (!email.trim()) errors.emailError = "Email address is required";
    if (!password) {
      errors.passwordError = "Password is required";
    } else if (password.length < 6) {
      errors.passwordError = "Password must be at least 6 characters";
    }

    setError(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setLoading(true);
      const { data } = await axios.post(
        `${serverUrl}/api/auth/register`,
        {
          name: name.trim(),
          username: username.trim(),
          email: email.trim(),
          password,
        },
        { withCredentials: true }
      );

      if (data?.success) {
        const normalizedEmail = email.trim();
        toast.success(data.message || "OTP sent to your email!");
        sessionStorage.setItem("otp_email", normalizedEmail);
        navigate(`/verify-otp?email=${encodeURIComponent(normalizedEmail)}`);
      }
    } catch (err) {
      const resp = err.response?.data;
      const msg = resp?.message || "Registration failed. Please try again.";
      toast.error(msg);
      if (msg.toLowerCase().includes("email")) {
        setError((prev) => ({ ...prev, emailError: msg }));
      } else if (msg.toLowerCase().includes("username")) {
        setError((prev) => ({ ...prev, usernameError: msg }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
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
              <h2 className="desktop-brand-element">Create your account</h2>
              <p className="auth-subtitle desktop-brand-element">Join friends and creators on Lime</p>
              <h2 className="mobile-mascot-headline">Ready for focus?</h2>
            </div>

            <form onSubmit={handleSignUp} className="auth-main-form">
              <div className="input-wrapper">
                <label className="desktop-field-label">Full Name</label>
                <input
                  type="text"
                  onChange={(e) => handleName(e.target.value)}
                  value={name}
                  placeholder="Your Name"
                />
                {error.nameError && <p className="field-error">{error.nameError}</p>}
              </div>

              <div className="input-wrapper">
                <label className="desktop-field-label">Username</label>
                <input
                  type="text"
                  onChange={(e) => handleUsername(e.target.value)}
                  value={username}
                  placeholder="Username"
                />
                {error.usernameError && <p className="field-error">{error.usernameError}</p>}
              </div>

              <div className="input-wrapper">
                <label className="desktop-field-label">Email Address</label>
                <input
                  type="email"
                  onChange={(e) => handleEmail(e.target.value)}
                  value={email}
                  placeholder="Email"
                />
                {error.emailError && <p className="field-error">{error.emailError}</p>}
              </div>

              <div className="input-wrapper password-input-wrapper">
                <label className="desktop-field-label">Password</label>
                <div className="input-with-toggle">
                  <input
                    type={showPassword ? "text" : "password"}
                    onChange={(e) => handlePassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    value={password}
                    placeholder="Password"
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
                {error.passwordError && <p className="field-error">{error.passwordError}</p>}
              </div>

              {/* Mobile Social Buttons */}
              <div className="mobile-social-grid">
                <a
                  className="mobile-social-btn btn-github"
                  href={`${oauthBaseUrl}/api/auth/github`}
                  aria-label="Sign up with GitHub"
                >
                  <FaGithub size={18} />
                  <span>GitHub</span>
                </a>
                <a
                  className="mobile-social-btn btn-google"
                  href={`${oauthBaseUrl}/api/auth/google`}
                  aria-label="Sign up with Google"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z" fill="#fff"/>
                    <path d="M12 23c3.2 0 6-1.1 8-3.1l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 15.8C3.7 19.6 7.5 23 12 23z" fill="#fff"/>
                    <path d="M5.6 12.9c-.2-.7-.3-1.4-.3-2.1s.1-1.4.3-2.1L1.9 5.8C.7 8.2 0 10.9 0 13.8s.7 5.6 1.9 8l3.7-2.9z" fill="#fff"/>
                    <path d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.5 3.7l3.7 2.9c2.2-2 3.8-5 3.8-8.9z" fill="#fff"/>
                  </svg>
                  <span>Google</span>
                </a>
              </div>

              <button type="submit" className="register-btn main-submit-btn" disabled={loading}>
                {loading ? (
                  <BeatLoader size={8} color="#fff" />
                ) : (
                  <>
                    <span className="desktop-btn-text">Sign Up with Email</span>
                    <span className="mobile-btn-text">Let&apos;s go!</span>
                  </>
                )}
              </button>
            </form>

            <div className="desktop-switch-link auth-divider">
              <span>Already have an account?</span>
            </div>

            <Link to="/login" className="register-btn secondary-btn desktop-switch-link">
              Log In to Lime
            </Link>

            {/* Mobile Footer */}
            <div className="mobile-auth-footer">
              <span>Already have an account? </span>
              <Link to="/login">Sign In</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
