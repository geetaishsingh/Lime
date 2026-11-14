import limeLogoFull from '../../assets/lime-logo-full.png';
import limeLogoFullLight from '../../assets/lime-logo-full-light.png';
import './Login.scss';
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IoEye } from "react-icons/io5";
import { IoMdEyeOff } from "react-icons/io";
import { FaGithub } from "react-icons/fa";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { BeatLoader } from "react-spinners";
import { serverUrl } from "../../config";
import { setuser } from "../../store/user.slice";
import LimeMascot from "../../components/common/LimeMascot/LimeMascot";

// OAuth base URL — points to loginSystem backend (port 3000) for Google/GitHub OAuth
const oauthBaseUrl = import.meta.env.VITE_OAUTH_BASE_URL || serverUrl;

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({});

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.user.theme);

  const handleIdentifier = (value) => {
    setIdentifier(value);
    setError((prev) => ({ ...prev, usernameError: "" }));
  };

  const handlePassword = (value) => {
    setPassword(value);
    setError((prev) => ({ ...prev, passwordError: "" }));
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();

    const errors = {};
    if (!identifier.trim()) errors.usernameError = "Username or email is required";
    if (!password) errors.passwordError = "Password is required";

    setError(errors);
    if (errors.usernameError || errors.passwordError) return;

    try {
      setLoading(true);
      const { data } = await axios.post(
        `${serverUrl}/api/auth/login`,
        { identifier: identifier.trim(), password },
        { withCredentials: true }
      );

      if (data?.success) {
        dispatch(setuser(data.user));
        toast.success(data.message || `Welcome back!`);
        navigate("/");
      }
    } catch (err) {
      const resp = err.response?.data;
      const msg = resp?.message || "Invalid credentials. Please try again.";
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
              <h2 className="desktop-brand-element">Welcome back</h2>
              <p className="auth-subtitle desktop-brand-element">Sign in to your account</p>
              <h2 className="mobile-mascot-headline">Ready for focus?</h2>
            </div>

            <form onSubmit={handleLogin} className="auth-main-form">
              <div className="input-wrapper">
                <label className="desktop-field-label">Username or Email</label>
                <input
                  type="text"
                  onChange={(e) => handleIdentifier(e.target.value)}
                  value={identifier}
                  placeholder="Email or Username"
                  autoComplete="username"
                />
                {error.usernameError && <p className="field-error">{error.usernameError}</p>}
              </div>

              <div className="input-wrapper password-input-wrapper">
                <div className="label-with-action desktop-field-label">
                  <label>Password</label>
                  <Link to="/forgot-password" className="forgot-btn">
                    Forgot password?
                  </Link>
                </div>
                <div className="input-with-toggle">
                  <input
                    type={showPassword ? "text" : "password"}
                    onChange={(e) => handlePassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    value={password}
                    placeholder="Password"
                    autoComplete="current-password"
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

              {/* Mobile Social Buttons (GitHub & Google) */}
              <div className="mobile-social-grid">
                <a
                  className="mobile-social-btn btn-github"
                  href={`${oauthBaseUrl}/api/auth/github`}
                  aria-label="Sign in with GitHub"
                >
                  <FaGithub size={18} />
                  <span>GitHub</span>
                </a>
                <a
                  className="mobile-social-btn btn-google"
                  href={`${oauthBaseUrl}/api/auth/google`}
                  aria-label="Sign in with Google"
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
                    <span className="desktop-btn-text">Sign In to Lime</span>
                    <span className="mobile-btn-text">Let&apos;s go!</span>
                  </>
                )}
              </button>
            </form>

            {/* Desktop OAuth (Google / GitHub) */}
            <div className="desktop-oauth-section">
              <div className="auth-divider">
                <span>or continue with</span>
              </div>

              <div className="oauth-login-row">
                <a
                  className="oauth-btn oauth-google-btn"
                  href={`${oauthBaseUrl}/api/auth/google`}
                  aria-label="Sign in with Google"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"/>
                    <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/>
                    <path fill="#4A90D9" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"/>
                    <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z"/>
                  </svg>
                  Continue with Google
                </a>

                <a
                  className="oauth-btn oauth-github-btn"
                  href={`${oauthBaseUrl}/api/auth/github`}
                  aria-label="Sign in with GitHub"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Continue with GitHub
                </a>
              </div>
            </div>

            {/* Switch to Register */}
            <div className="desktop-switch-link auth-divider">
              <span>Don&apos;t have an account?</span>
            </div>

            <Link to="/register" className="register-btn secondary-btn desktop-switch-link">
              Create an Account
            </Link>

            {/* Mobile Footer */}
            <div className="mobile-auth-footer">
              <span>Don&apos;t have an account? </span>
              <Link to="/register">Sign Up</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
