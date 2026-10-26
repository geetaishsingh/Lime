import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { IoEye } from "react-icons/io5";
import { IoMdEyeOff } from "react-icons/io";
import axios from "axios";
import toast from "react-hot-toast";
import { BeatLoader } from "react-spinners";
import { serverUrl } from "../App";

const Register = () => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({});

  const navigate = useNavigate();

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
    if (!email.trim()) errors.emailError = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.emailError = "Please enter a valid email address";
    }
    if (!password) errors.passwordError = "Password is required";
    else if (password.length < 6) {
      errors.passwordError = "Password must be at least 6 characters";
    }

    setError(errors);

    // FIXED: Ensure all fields are checked before proceeding
    if (
      errors.nameError ||
      errors.usernameError ||
      errors.emailError ||
      errors.passwordError
    ) {
      return;
    }

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
        toast.success(data.message || "Verification code sent to your email!");
        // Navigate to dedicated OTP verification page
        navigate(`/verify-otp?email=${encodeURIComponent(email.trim())}`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed. Please try again.";
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
            <div className="auth-brand">
              <div className="lime-logo-symbol">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="#84cc16">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <h1 className="logo">Lime</h1>
              <h2>Create your account</h2>
              <p className="auth-subtitle">Join friends and creators on Lime</p>
            </div>

            <form onSubmit={handleSignUp}>
              <div className="input-wrapper">
                <label>Full Name</label>
                <input
                  type="text"
                  onChange={(e) => handleName(e.target.value)}
                  value={name}
                  placeholder="e.g. Alex Morgan"
                />
                {error.nameError && <p className="field-error">{error.nameError}</p>}
              </div>

              <div className="input-wrapper">
                <label>Username</label>
                <input
                  type="text"
                  onChange={(e) => handleUsername(e.target.value)}
                  value={username}
                  placeholder="e.g. alexmorgan"
                />
                {error.usernameError && <p className="field-error">{error.usernameError}</p>}
              </div>

              <div className="input-wrapper">
                <label>Email Address</label>
                <input
                  type="email"
                  onChange={(e) => handleEmail(e.target.value)}
                  value={email}
                  placeholder="name@example.com"
                />
                {error.emailError && <p className="field-error">{error.emailError}</p>}
              </div>

              <div className="input-wrapper password-input-wrapper">
                <label>Password</label>
                <div className="input-with-toggle">
                  <input
                    type={showPassword ? "text" : "password"}
                    onChange={(e) => handlePassword(e.target.value)}
                    value={password}
                    placeholder="Create a strong password (6+ chars)"
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
                {loading ? <BeatLoader size={8} color="#fff" /> : "Sign Up with Email"}
              </button>
            </form>

            <div className="auth-divider">
              <span>Already have an account?</span>
            </div>

            <Link to="/login" className="register-btn secondary-btn">
              Log In to Lime
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
