import User from "../models/user.model.js";
import { sendOtpmail, sendSignupOtpMail } from "../utils/mail.js";
import getToken from "../utils/token.js";
import bcrypt from "bcryptjs";

// Helper to sanitize user object returned to client
const sanitizeUser = (user) => ({
  _id: user._id,
  username: user.username,
  name: user.name || "",
  email: user.email,
  profileImage: user.profileImage,
  coverImage: user.coverImage || "",
  bio: user.bio || "",
  website: user.website || "",
  gender: user.gender,
  isPrivate: user.isPrivate || false,
  isEmailVerified: user.isEmailVerified,
  followers: user.followers || [],
  following: user.following || [],
  posts: user.posts || [],
  bookmarks: user.bookmarks || [],
});

/**
 * Step 1: User Registration
 * Validates credentials, checks duplicates, creates pending user, sends OTP
 */
export const register = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email, and password are required.",
        success: false,
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
        success: false,
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long.",
        success: false,
      });
    }

    // Check duplicate email
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail && existingEmail.isEmailVerified) {
      return res.status(400).json({
        message: "An account with this email already exists. Please log in.",
        success: false,
      });
    }

    // Check duplicate username
    const existingUsername = await User.findOne({ username: cleanUsername });
    if (existingUsername && existingUsername._id.toString() !== existingEmail?._id?.toString()) {
      return res.status(400).json({
        message: "This username is already taken. Please pick another.",
        success: false,
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user;
    if (existingEmail && !existingEmail.isEmailVerified) {
      // Re-use pending account
      existingEmail.username = cleanUsername;
      existingEmail.name = name ? name.trim() : existingEmail.name;
      existingEmail.password = hashPassword;
      existingEmail.signupOtp = otp;
      existingEmail.signupOtpExpires = otpExpires;
      existingEmail.signupOtpAttempts = 0;
      user = await existingEmail.save();
    } else {
      user = await User.create({
        name: name ? name.trim() : "",
        username: cleanUsername,
        email: cleanEmail,
        password: hashPassword,
        isEmailVerified: false,
        signupOtp: otp,
        signupOtpExpires: otpExpires,
        signupOtpAttempts: 0,
      });
    }

    // Dispatch email
    await sendSignupOtpMail(cleanEmail, otp);

    return res.status(200).json({
      message: "Verification code sent to your email. Please verify to activate your account.",
      email: cleanEmail,
      requiresOtp: true,
      success: true,
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      message: `Registration failed: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Step 2: Verify Signup OTP
 */
export const verifySignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP code are required.",
        success: false,
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({
        message: "Account not found for this email address.",
        success: false,
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        message: "Email is already verified. You can log in.",
        success: false,
      });
    }

    // Check attempt limits (Max 5 attempts)
    if (user.signupOtpAttempts >= 5) {
      return res.status(400).json({
        message: "Too many failed attempts. Please request a new verification code.",
        success: false,
      });
    }

    // Check expiry
    if (!user.signupOtpExpires || user.signupOtpExpires < new Date()) {
      return res.status(400).json({
        message: "Verification code has expired. Please request a new code.",
        success: false,
      });
    }

    // Validate OTP
    if (user.signupOtp !== otp.toString().trim()) {
      user.signupOtpAttempts = (user.signupOtpAttempts || 0) + 1;
      await user.save();
      const remaining = 5 - user.signupOtpAttempts;
      return res.status(400).json({
        message: `Invalid verification code. ${remaining} attempts remaining.`,
        success: false,
      });
    }

    // Success: activate user
    user.isEmailVerified = true;
    user.signupOtp = undefined;
    user.signupOtpExpires = undefined;
    user.signupOtpAttempts = 0;
    await user.save();

    const token = await getToken(user._id);
    res.cookie("token", token, {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return res.status(200).json({
      message: "Account verified successfully! Welcome to Lime.",
      user: sanitizeUser(user),
      token,
      success: true,
    });
  } catch (error) {
    console.error("Verify signup OTP error:", error);
    return res.status(500).json({
      message: `Verification failed: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Resend Signup OTP
 */
export const resendSignupOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required.", success: false });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(400).json({ message: "User not found.", success: false });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Account is already verified. Please sign in.", success: false });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.signupOtp = otp;
    user.signupOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.signupOtpAttempts = 0;
    await user.save();

    await sendSignupOtpMail(cleanEmail, otp);

    return res.status(200).json({
      message: "A fresh verification code has been sent to your email.",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({ message: `Resend OTP error: ${error.message}`, success: false });
  }
};

/**
 * User Login
 */
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Username/Email and password are required.",
        success: false,
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: cleanIdentifier }, { username: cleanIdentifier }],
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials. Please check your username or email.",
        success: false,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Incorrect password. Please try again.",
        success: false,
      });
    }

    // Direct password login without OTP requirement (preserved for signup and password recovery)
    const token = await getToken(user._id);
    res.cookie("token", token, {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: `Welcome back, @${user.username}!`,
      success: true,
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: `Login error: ${error.message}`, success: false });
  }
};

/**
 * Logout
 */
export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      httpOnly: true,
    });
    return res.status(200).json({ message: "Logged out successfully", success: true });
  } catch (error) {
    return res.status(500).json({ message: `Logout error: ${error.message}`, success: false });
  }
};

/**
 * Forgot Password - Send OTP
 */
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required.", success: false });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(400).json({
        message: "No user found with this email address.",
        success: false,
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.resetOtpAttempts = 0;
    user.isOtpVerified = false;
    await user.save();

    await sendOtpmail(cleanEmail, otp);

    return res.status(200).json({
      message: "Password reset code sent to your email.",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({ message: `Failed to send reset code: ${error.message}`, success: false });
  }
};

/**
 * Forgot Password - Verify OTP
 */
export const VerifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required.", success: false });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(400).json({ message: "User not found.", success: false });
    }

    if (user.resetOtpAttempts >= 5) {
      return res.status(400).json({
        message: "Too many failed attempts. Please request a new code.",
        success: false,
      });
    }

    if (!user.resetOtpExpires || user.resetOtpExpires < new Date()) {
      return res.status(400).json({ message: "Reset code has expired.", success: false });
    }

    if (user.resetOtp !== otp.toString().trim()) {
      user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
      await user.save();
      const left = 5 - user.resetOtpAttempts;
      return res.status(400).json({
        message: `Invalid reset code. ${left} attempts remaining.`,
        success: false,
      });
    }

    user.isOtpVerified = true;
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    return res.status(200).json({
      message: "Reset code verified successfully. You may now set a new password.",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({ message: `Verification failed: ${error.message}`, success: false });
  }
};

/**
 * Forgot Password - Reset Password
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, newpassword } = req.body;
    if (!email || !newpassword) {
      return res.status(400).json({
        message: "Email and new password are required.",
        success: false,
      });
    }

    if (newpassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters long.",
        success: false,
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(400).json({ message: "User not found.", success: false });
    }

    if (!user.isOtpVerified) {
      return res.status(400).json({
        message: "Please verify your reset code before resetting your password.",
        success: false,
      });
    }

    const hashPassword = await bcrypt.hash(newpassword, 10);
    user.password = hashPassword;
    user.isOtpVerified = false;
    await user.save();

    return res.status(200).json({
      message: "Password changed successfully! You can now log in.",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({ message: `Password reset error: ${error.message}`, success: false });
  }
};
