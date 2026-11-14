import jwt from "jsonwebtoken";
import crypto from "crypto";
import RefreshToken from "../models/refreshToken.model.js";

const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes short-lived
const REFRESH_TOKEN_EXPIRY_DAYS = 30; // 30 days
const JWT_SECRET =
  process.env.JWT_SECRET_KEY ||
  process.env.JWT_SECRET ||
  "lime_fallback_secret_key_2026";

/**
 * Cookie configuration options supporting modern cross-site mobile browsers
 */
export const getTokenCookieOptions = (maxAgeMs = 15 * 60 * 1000) => {
  const isProduction = process.env.NODE_ENV === "production";
  const secure = process.env.COOKIE_SECURE === "true" || isProduction;

  return {
    httpOnly: true,
    path: "/",
    secure,
    sameSite: secure ? "none" : "lax",
    partitioned: secure, // CHIPS attribute for cross-site cookie partitioning
    maxAge: maxAgeMs,
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  };
};

export const getRefreshTokenCookieOptions = () => {
  return getTokenCookieOptions(REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
};

/**
 * Generate a short-lived access JWT
 */
export const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

/**
 * Generate and store a secure long-lived refresh token
 */
export const generateRefreshToken = async (userId) => {
  try {
    const token = crypto.randomBytes(40).toString("hex");
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    await RefreshToken.create({
      token,
      user: userId,
      expiresAt,
    });

    return token;
  } catch (err) {
    console.error("[Lime Auth] Refresh token creation error:", err.message);
    throw err;
  }
};

/**
 * Rotate an existing refresh token with concurrency protection
 */
export const rotateRefreshToken = async (oldTokenString) => {
  if (!oldTokenString) return null;

  try {
    const tokenDoc = await RefreshToken.findOne({ token: oldTokenString });
    if (!tokenDoc) {
      return null;
    }

    // Protection against concurrent mobile requests:
    // If token was already revoked within the last 15 seconds, return the newly rotated replacement
    if (tokenDoc.isRevoked) {
      const timeSinceRevoked =
        Date.now() - new Date(tokenDoc.updatedAt).getTime();
      if (timeSinceRevoked < 15000 && tokenDoc.replacedByToken) {
        const newAccess = generateAccessToken(tokenDoc.user);
        return {
          accessToken: newAccess,
          refreshToken: tokenDoc.replacedByToken,
          userId: tokenDoc.user,
        };
      }
      // Replay attack outside grace window: revoke all tokens for this user
      console.warn(
        `[Lime Auth] Revoked token replay detected for user: ${tokenDoc.user}. Invalidating sessions.`
      );
      await RefreshToken.deleteMany({ user: tokenDoc.user });
      return null;
    }

    if (new Date() > tokenDoc.expiresAt) {
      await tokenDoc.deleteOne();
      return null;
    }

    // Generate new refresh token
    const newRefreshToken = crypto.randomBytes(40).toString("hex");
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    tokenDoc.isRevoked = true;
    tokenDoc.replacedByToken = newRefreshToken;
    await tokenDoc.save();

    await RefreshToken.create({
      token: newRefreshToken,
      user: tokenDoc.user,
      expiresAt,
    });

    const newAccessToken = generateAccessToken(tokenDoc.user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      userId: tokenDoc.user,
    };
  } catch (err) {
    console.error("[Lime Auth] Token rotation error:", err.message);
    return null;
  }
};

/**
 * Revoke a specific refresh token (used on logout)
 */
export const revokeRefreshToken = async (tokenString) => {
  if (!tokenString) return;
  try {
    await RefreshToken.deleteOne({ token: tokenString });
  } catch (err) {
    console.error("[Lime Auth] Revoke token error:", err.message);
  }
};

/**
 * Revoke all refresh tokens for a user (used on full logout or password reset)
 */
export const revokeAllUserRefreshTokens = async (userId) => {
  if (!userId) return;
  try {
    await RefreshToken.deleteMany({ user: userId });
  } catch (err) {
    console.error("[Lime Auth] Revoke all tokens error:", err.message);
  }
};

/**
 * Backward compatibility helper for existing code calling getToken(userId)
 */
const getToken = async (userId) => {
  return generateAccessToken(userId);
};

export default getToken;
