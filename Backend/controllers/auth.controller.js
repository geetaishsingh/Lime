import User from "../models/user.model.js";
import PendingSignup from "../models/pendingSignup.model.js";
import { sendOtpmail, sendSignupOtpMail } from "../utils/mail.js";
import getToken, {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  getTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from "../utils/token.js";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

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
 * Validates credentials, stores a pending signup, and sends an OTP
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
    const [existingUsername, existingPendingUsername, existingPendingEmail] =
      await Promise.all([
        User.findOne({ username: cleanUsername }),
        PendingSignup.findOne({ username: cleanUsername }),
        PendingSignup.findOne({ email: cleanEmail }),
      ]);
    if (
      (existingUsername &&
        existingUsername._id.toString() !== existingEmail?._id?.toString()) ||
      (existingPendingUsername &&
        existingPendingUsername.email !== cleanEmail)
    ) {
      return res.status(400).json({
        message: "This username is already taken. Please pick another.",
        success: false,
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    // Generate secure 6-digit OTP
    const otp = randomInt(100000, 1000000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const pendingSignup =
      existingPendingEmail || new PendingSignup({ email: cleanEmail });
    pendingSignup.username = cleanUsername;
    pendingSignup.name = name ? name.trim() : existingEmail?.name || "";
    pendingSignup.password = hashPassword;
    pendingSignup.otp = otp;
    pendingSignup.otpExpires = otpExpires;
    pendingSignup.otpAttempts = 0;
    await pendingSignup.save();

    // Move legacy unverified accounts out of the users collection.
    if (existingEmail && !existingEmail.isEmailVerified) {
      await existingEmail.deleteOne();
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

    const cleanEmail = email.trim().toLowerCase();
    const pendingSignup = await PendingSignup.findOne({ email: cleanEmail });
    const legacyUser = pendingSignup
      ? null
      : await User.findOne({ email: cleanEmail });
    if (!pendingSignup && !legacyUser) {
      return res.status(400).json({
        message: "Account not found for this email address.",
        success: false,
      });
    }

    if (legacyUser?.isEmailVerified) {
      return res.status(400).json({
        message: "Email is already verified. You can log in.",
        success: false,
      });
    }

    // Check attempt limits (Max 5 attempts)
    const attempts = pendingSignup
      ? pendingSignup.otpAttempts || 0
      : legacyUser.signupOtpAttempts || 0;
    if (attempts >= 5) {
      return res.status(400).json({
        message: "Too many failed attempts. Please request a new verification code.",
        success: false,
      });
    }

    // Check expiry
    const otpExpires = pendingSignup
      ? pendingSignup.otpExpires
      : legacyUser.signupOtpExpires;
    if (!otpExpires || otpExpires < new Date()) {
      return res.status(400).json({
        message: "Verification code has expired. Please request a new code.",
        success: false,
      });
    }

    // Validate OTP
    const storedOtp = pendingSignup ? pendingSignup.otp : legacyUser.signupOtp;
    if (storedOtp !== otp.toString().trim()) {
      if (pendingSignup) {
        pendingSignup.otpAttempts = attempts + 1;
        await pendingSignup.save();
      } else {
        legacyUser.signupOtpAttempts = (legacyUser.signupOtpAttempts || 0) + 1;
        await legacyUser.save();
      }
      const remaining = 5 - (attempts + 1);
      return res.status(400).json({
        message: `Invalid verification code. ${remaining} attempts remaining.`,
        success: false,
      });
    }

    let user;
    if (pendingSignup) {
      user = await User.create({
        username: pendingSignup.username,
        name: pendingSignup.name,
        email: pendingSignup.email,
        password: pendingSignup.password,
        isEmailVerified: true,
      });
      await pendingSignup.deleteOne();
    } else {
      // Preserve verification for accounts created before pending signups were used.
      user = legacyUser;
      user.isEmailVerified = true;
      user.signupOtp = undefined;
      user.signupOtpExpires = undefined;
      user.signupOtpAttempts = 0;
      await user.save();
    }

    const token = generateAccessToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);

    res.cookie("token", token, getTokenCookieOptions());
    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

    console.info(`[Lime Auth] Signup verification successful [userId=${user._id}]`);

    return res.status(200).json({
      message: "Account verified successfully! Welcome to Lime.",
      user: sanitizeUser(user),
      token,
      accessToken: token,
      refreshToken,
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
    const pendingSignup = await PendingSignup.findOne({ email: cleanEmail });

    if (pendingSignup) {
      const otp = randomInt(100000, 1000000).toString();
      pendingSignup.otp = otp;
      pendingSignup.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      pendingSignup.otpAttempts = 0;
      await pendingSignup.save();

      await sendSignupOtpMail(cleanEmail, otp);

      return res.status(200).json({
        message: "A fresh verification code has been sent to your email.",
        success: true,
      });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(400).json({ message: "User not found.", success: false });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Account is already verified. Please sign in.", success: false });
    }

    const otp = randomInt(100000, 1000000).toString();
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
      $or: [{ email: cleanIdentifier }, { username: cleanIdentifier }, { phone: identifier.trim() }],
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials. Please check your username or email.",
        success: false,
      });
    }

    if (!user.password) {
      return res.status(400).json({
        message: "This account uses Google or GitHub sign-in. Please continue with the social login option.",
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

    const token = generateAccessToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);

    res.cookie("token", token, getTokenCookieOptions());
    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

    console.info(`[Lime Auth] Login successful [userId=${user._id}]`);

    return res.status(200).json({
      message: `Welcome back, @${user.username}!`,
      success: true,
      user: sanitizeUser(user),
      token,
      accessToken: token,
      refreshToken,
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
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    if (req.userId) {
      await revokeAllUserRefreshTokens(req.userId);
    }
    res.clearCookie("token", getTokenCookieOptions());
    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
    console.info("[Lime Auth] Logout executed successfully");
    return res.status(200).json({ message: "Logged out successfully", success: true });
  } catch (error) {
    return res.status(500).json({ message: `Logout error: ${error.message}`, success: false });
  }
};

/**
 * Token Refresh Controller
 */
export const refreshTokenController = async (req, res) => {
  try {
    const rawRefreshToken =
      req.cookies?.refreshToken ||
      req.body?.refreshToken ||
      req.headers["x-refresh-token"];

    if (!rawRefreshToken) {
      console.info("[Lime Auth] Refresh request: FAILED (no refresh token provided)");
      return res.status(401).json({
        message: "Refresh token required.",
        code: "REFRESH_TOKEN_REQUIRED",
        success: false,
      });
    }

    const rotated = await rotateRefreshToken(rawRefreshToken);
    if (!rotated) {
      console.warn("[Lime Auth] Refresh request: FAILED (invalid or revoked refresh token)");
      res.clearCookie("token", getTokenCookieOptions());
      res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
      return res.status(401).json({
        message: "Invalid or expired session. Please sign in again.",
        code: "REFRESH_TOKEN_INVALID",
        success: false,
      });
    }

    const user = await User.findById(rotated.userId).select("-password -signupOtp -resetOtp");
    if (!user) {
      return res.status(401).json({
        message: "User account no longer exists.",
        code: "USER_NOT_FOUND",
        success: false,
      });
    }

    res.cookie("token", rotated.accessToken, getTokenCookieOptions());
    res.cookie("refreshToken", rotated.refreshToken, getRefreshTokenCookieOptions());

    console.info(`[Lime Auth] Refresh request: SUCCESS [userId=${user._id}]`);

    return res.status(200).json({
      success: true,
      token: rotated.accessToken,
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("[Lime Auth] Refresh request error:", error.message);
    return res.status(500).json({
      message: `Token refresh error: ${error.message}`,
      success: false,
    });
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


export const googleCallback = async (req, res) => {
  try {
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const user = req.user;
    if (!user) {
      return res.redirect(`${clientUrl}/login`);
    }
    const token = generateAccessToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);

    res.cookie("token", token, getTokenCookieOptions());
    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

    console.info(`[Lime Auth] Google OAuth login successful [userId=${user._id}]`);
    return res.redirect(`${clientUrl}/#token=${token}&refreshToken=${refreshToken}`);
  } catch (error) {
    console.error("[Lime Auth] Google Callback Error:", error);
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    return res.redirect(`${clientUrl}/login`);
  }
};

export const githubCallback = async (req, res) => {
  try {
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const user = req.user;
    if (!user) {
      return res.redirect(`${clientUrl}/login`);
    }
    const token = generateAccessToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);

    res.cookie("token", token, getTokenCookieOptions());
    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

    console.info(`[Lime Auth] GitHub OAuth login successful [userId=${user._id}]`);
    return res.redirect(`${clientUrl}/#token=${token}&refreshToken=${refreshToken}`);
  } catch (error) {
    console.error("[Lime Auth] GitHub Callback Error:", error);
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    return res.redirect(`${clientUrl}/login`);
  }
};
