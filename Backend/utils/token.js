import jwt from "jsonwebtoken";

export const getTokenCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const secure = process.env.COOKIE_SECURE === "true" || isProduction;

  return {
    httpOnly: true,
    path: "/",
    secure,
    sameSite: secure ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  };
};

const getToken = async (userId) => {
  try {
    const secret =
      process.env.JWT_SECRET_KEY ||
      process.env.JWT_SECRET ||
      "lime_fallback_secret_key_2026";
    const token = jwt.sign({ userId }, secret, {
      expiresIn: "30d",
    });
    return token;
  } catch (err) {
    console.error("Token generation error:", err);
    throw err;
  }
};

export default getToken;
