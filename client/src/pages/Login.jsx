import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IoEye } from "react-icons/io5";
import { IoMdEyeOff } from "react-icons/io";
import axios from "axios";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { BeatLoader } from "react-spinners";
import { serverUrl } from "../App";
import { setuser } from "../redux/user.slice";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({});

  const navigate = useNavigate();
  const dispatch = useDispatch();

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
            <div className="auth-brand">
              <div className="lime-logo-symbol">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="#84cc16">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <h1 className="logo">Lime</h1>
              <h2>Welcome back</h2>
              <p className="auth-subtitle">Sign in to your account</p>
            </div>

            <form onSubmit={handleLogin}>
              <div className="input-wrapper">
                <label>Username or Email</label>
                <input
                  type="text"
                  onChange={(e) => handleIdentifier(e.target.value)}
                  value={identifier}
                  placeholder="Enter your username or email"
                  autoComplete="username"
                />
                {error.usernameError && <p className="field-error">{error.usernameError}</p>}
              </div>

              <div className="input-wrapper password-input-wrapper">
                <div className="label-with-action">
                  <label>Password</label>
                  <Link to="/forgot-password" className="forgot-btn">
                    Forgot password?
                  </Link>
                </div>
                <div className="input-with-toggle">
                  <input
                    type={showPassword ? "text" : "password"}
                    onChange={(e) => handlePassword(e.target.value)}
                    value={password}
                    placeholder="Enter your password"
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

              <button type="submit" className="register-btn" disabled={loading}>
                {loading ? <BeatLoader size={8} color="#fff" /> : "Sign In to Lime"}
              </button>
            </form>

            <div className="auth-divider">
              <span>Don't have an account?</span>
            </div>

            <Link to="/register" className="register-btn secondary-btn">
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
