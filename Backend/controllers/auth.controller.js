import User from "../models/user.model.js";
import PendingSignup from "../models/pendingSignup.model.js";
import {
  sendLoginOtpMail,
  sendOtpmail,
  sendSignupOtpMail,
} from "../utils/mail.js";
import {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  getTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from "../utils/token.js";
import bcrypt from "bcryptjs";
import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { getJwtSecret } from "../utils/jwtSecret.js";

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
  hasPassword: Boolean(user.password),
  hasGoogle: Boolean(user.googleId),
  hasGithub: Boolean(user.githubId),
  passwordPromptDismissed: Boolean(user.passwordPromptDismissed),
  authProvider: user.authProvider || [],
  followers: user.followers || [],
  following: user.following || [],
  posts: user.posts || [],
  bookmarks: user.bookmarks || [],
});

const hashOtp = (otp) =>
  createHmac("sha256", getJwtSecret()).update(otp).digest("hex");

const isSameHash = (firstHash, secondHash) => {
  if (!firstHash || !secondHash || firstHash.length !== secondHash.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(firstHash, "hex"), Buffer.from(secondHash, "hex"));
};

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

    // Clean up unverified legacy user with this email so it doesn't block registration
    if (existingEmail && !existingEmail.isEmailVerified) {
      await existingEmail.deleteOne();
    }

    // Check duplicate username in registered users
    const existingUsername = await User.findOne({ username: cleanUsername });
    if (existingUsername) {
      return res.status(400).json({
        message: "This username is already taken. Please pick another.",
        success: false,
      });
    }

    // Check if another user has an active (non-expired) pending signup with this username
    const conflictingPending = await PendingSignup.findOne({
      username: cleanUsername,
      email: { $ne: cleanEmail },
      otpExpires: { $gte: new Date() },
    });
    if (conflictingPending) {
      return res.status(400).json({
        message: "This username is temporarily reserved. Please choose another username.",
        success: false,
      });
    }

    // Clean up any stale/expired pending signups for this email or username
    await PendingSignup.deleteMany({
      $or: [
        { email: cleanEmail },
        { username: cleanUsername, otpExpires: { $lt: new Date() } },
      ],
    });

    const hashPassword = await bcrypt.hash(password, 10);
    // Generate secure 6-digit OTP
    const otp = randomInt(100000, 1000000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Atomic upsert for pending signup
    await PendingSignup.findOneAndUpdate(
      { email: cleanEmail },
      {
        username: cleanUsername,
        name: name ? name.trim() : "",
        password: hashPassword,
        otp,
        otpExpires,
        otpAttempts: 0,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Dispatch email
    const mailResult = await sendSignupOtpMail(cleanEmail, otp);

    const responsePayload = {
      message: "Verification code sent to your email. Please verify to activate your account.",
      email: cleanEmail,
      requiresOtp: true,
      success: true,
    };

    if (mailResult?.previewOtp) {
      responsePayload.previewOtp = mailResult.previewOtp;
      responsePayload.warning = mailResult.warning;
    }

    return res.status(200).json(responsePayload);
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

      const mailResult = await sendSignupOtpMail(cleanEmail, otp);

      const responsePayload = {
        message: "A fresh verification code has been sent to your email.",
        success: true,
      };

      if (mailResult?.previewOtp) {
        responsePayload.previewOtp = mailResult.previewOtp;
        responsePayload.warning = mailResult.warning;
      }

      return res.status(200).json(responsePayload);
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

    const mailResult = await sendSignupOtpMail(cleanEmail, otp);

    const responsePayload = {
      message: "A fresh verification code has been sent to your email.",
      success: true,
    };

    if (mailResult?.previewOtp) {
      responsePayload.previewOtp = mailResult.previewOtp;
      responsePayload.warning = mailResult.warning;
    }

    return res.status(200).json(responsePayload);
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
        message:
          "This account uses Google or GitHub sign-in. Continue with that provider, or select Forgot password to set a password for this account.",
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

    // Direct password sign-in by default.
    // If Two-Factor Authentication (2FA) is explicitly enabled via REQUIRE_LOGIN_OTP=true, dispatch OTP.
    const requireLoginOtp = process.env.REQUIRE_LOGIN_OTP === "true";

    if (!requireLoginOtp) {
      const token = generateAccessToken(user._id);
      const refreshToken = await generateRefreshToken(user._id);
      res.cookie("token", token, getTokenCookieOptions());
      res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

      return res.status(200).json({
        message: `Welcome back, @${user.username}!`,
        success: true,
        user: sanitizeUser(user),
        token,
        accessToken: token,
        refreshToken,
      });
    }

    const otp = randomInt(100000, 1000000).toString();
    const challengeId = randomBytes(32).toString("hex");
    const now = new Date();
    user.loginOtpHash = hashOtp(otp);
    user.loginOtpExpires = new Date(now.getTime() + 10 * 60 * 1000);
    user.loginOtpAttempts = 0;
    user.loginOtpSentAt = now;
    user.loginOtpChallengeHash = hashOtp(challengeId);
    user.loginOtpChallengeExpires = new Date(now.getTime() + 10 * 60 * 1000);
    await user.save();

    const mailResult = await sendLoginOtpMail(user.email, otp);

    return res.status(200).json({
      message: mailResult?.warning
        ? `Sign-in code generated. ${mailResult.warning}`
        : `A sign-in code was sent to ${user.email}.`,
      success: true,
      requiresOtp: true,
      email: user.email,
      challengeId,
      ...(mailResult?.previewOtp ? { devOtp: mailResult.previewOtp } : {}),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: `Login error: ${error.message}`, success: false });
  }
};

export const verifyLoginOtp = async (req, res) => {
  try {
    const { challengeId, otp } = req.body;
    if (!challengeId || !otp) {
      return res.status(400).json({
        message: "Sign-in challenge and verification code are required.",
        success: false,
      });
    }

    const user = await User.findOne({
      loginOtpChallengeHash: hashOtp(challengeId),
    });
    if (!user || !user.loginOtpChallengeExpires || user.loginOtpChallengeExpires < new Date()) {
      return res.status(400).json({
        message: "This sign-in code has expired. Please sign in again.",
        success: false,
      });
    }

    if (!user.loginOtpExpires || user.loginOtpExpires < new Date()) {
      return res.status(400).json({
        message: "Sign-in code expired. Request a new one.",
        success: false,
      });
    }

    if ((user.loginOtpAttempts || 0) >= 5) {
      return res.status(429).json({
        message: "Too many incorrect codes. Request a new sign-in code.",
        success: false,
      });
    }

    if (!isSameHash(user.loginOtpHash, hashOtp(otp.toString().trim()))) {
      user.loginOtpAttempts = (user.loginOtpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({
        message: `Incorrect code. ${5 - user.loginOtpAttempts} attempts remaining.`,
        success: false,
      });
    }

    user.loginOtpHash = undefined;
    user.loginOtpExpires = undefined;
    user.loginOtpAttempts = 0;
    user.loginOtpSentAt = undefined;
    user.loginOtpChallengeHash = undefined;
    user.loginOtpChallengeExpires = undefined;
    await user.save();

    const token = generateAccessToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);
    res.cookie("token", token, getTokenCookieOptions());
    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

    return res.status(200).json({
      message: `Welcome back, @${user.username}!`,
      success: true,
      user: sanitizeUser(user),
      token,
      accessToken: token,
      refreshToken,
    });
  } catch (error) {
    console.error("Verify login OTP error:", error);
    return res.status(500).json({
      message: `Could not verify sign-in code: ${error.message}`,
      success: false,
    });
  }
};

export const resendLoginOtp = async (req, res) => {
  try {
    const { challengeId } = req.body;
    if (!challengeId) {
      return res.status(400).json({
        message: "Sign-in challenge is missing. Please sign in again.",
        success: false,
      });
    }

    const user = await User.findOne({
      loginOtpChallengeHash: hashOtp(challengeId),
    });
    if (!user || !user.loginOtpChallengeExpires || user.loginOtpChallengeExpires < new Date()) {
      return res.status(400).json({
        message: "This sign-in session has expired. Please sign in again.",
        success: false,
      });
    }

    const cooldownMs = 60 * 1000;
    const remainingMs = cooldownMs - (Date.now() - new Date(user.loginOtpSentAt || 0).getTime());
    if (remainingMs > 0) {
      return res.status(429).json({
        message: "Please wait before requesting another code.",
        retryAfterSeconds: Math.ceil(remainingMs / 1000),
        success: false,
      });
    }

    const otp = randomInt(100000, 1000000).toString();
    const previousOtp = {
      hash: user.loginOtpHash,
      expires: user.loginOtpExpires,
      attempts: user.loginOtpAttempts,
      sentAt: user.loginOtpSentAt,
      challengeExpires: user.loginOtpChallengeExpires,
    };
    user.loginOtpHash = hashOtp(otp);
    user.loginOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.loginOtpAttempts = 0;
    user.loginOtpSentAt = new Date();
    user.loginOtpChallengeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const mailResult = await sendLoginOtpMail(user.email, otp);

    return res.status(200).json({
      message: mailResult?.warning
        ? `Sign-in code regenerated. ${mailResult.warning}`
        : `A new sign-in code was sent to ${user.email}.`,
      success: true,
      ...(mailResult?.previewOtp ? { devOtp: mailResult.previewOtp } : {}),
    });
  } catch (error) {
    console.error("Resend login OTP error:", error);
    return res.status(500).json({
      message: `Could not resend sign-in code: ${error.message}`,
      success: false,
    });
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
      return res.status(401).json({
        message: "Refresh token required.",
        code: "REFRESH_TOKEN_REQUIRED",
        success: false,
      });
    }

    const rotated = await rotateRefreshToken(rawRefreshToken);
    if (!rotated) {
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

    const mailResult = await sendOtpmail(cleanEmail, otp);

    const responsePayload = {
      message: mailResult?.warning
        ? "Recovery code generated. If you don't receive an email, use the code displayed below."
        : "Password reset code sent to your email. Check your Inbox and Spam folder.",
      success: true,
      email: cleanEmail,
    };

    if (mailResult?.previewOtp) {
      responsePayload.previewOtp = mailResult.previewOtp;
      responsePayload.warning = mailResult.warning;
    }

    return res.status(200).json(responsePayload);
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
    await revokeAllUserRefreshTokens(user._id);
    user.password = hashPassword;
    user.isOtpVerified = false;
    user.loginOtpHash = undefined;
    user.loginOtpExpires = undefined;
    user.loginOtpAttempts = 0;
    user.loginOtpSentAt = undefined;
    user.loginOtpChallengeHash = undefined;
    user.loginOtpChallengeExpires = undefined;
    await user.save();

    res.clearCookie("token", getTokenCookieOptions());
    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());

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

    const isNew = Boolean(user._isNewUser || (!user.password && user.passwordPromptDismissed === false));
    const newOAuthParam = isNew ? "&newOAuth=true" : "";

    return res.redirect(`${clientUrl}/#token=${token}&refreshToken=${refreshToken}${newOAuthParam}`);
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

    const isNew = Boolean(user._isNewUser || (!user.password && user.passwordPromptDismissed === false));
    const newOAuthParam = isNew ? "&newOAuth=true" : "";

    return res.redirect(`${clientUrl}/#token=${token}&refreshToken=${refreshToken}${newOAuthParam}`);
  } catch (error) {
    console.error("[Lime Auth] GitHub Callback Error:", error);
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    return res.redirect(`${clientUrl}/login`);
  }
};
