import jwt from "jsonwebtoken";
import { getJwtSecret } from "../utils/jwtSecret.js";

const isAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    // Check Authorization header: Bearer <token>
    if (req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer" && parts[1]) {
        // Prefer header if present (crucial for mobile cross-site requests)
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        message: "Authentication token required. Please sign in.",
        code: "TOKEN_REQUIRED",
        success: false,
      });
    }

    try {
      const decodeToken = jwt.verify(token, getJwtSecret());

      if (!decodeToken || !decodeToken.userId) {
        return res.status(401).json({
          message: "Invalid or expired token. Please sign in again.",
          code: "TOKEN_INVALID",
          success: false,
        });
      }

      req.userId = decodeToken.userId;
      return next();
    } catch (jwtErr) {
      const isExpired = jwtErr.name === "TokenExpiredError";
      return res.status(401).json({
        message: isExpired
          ? "Session expired. Please refresh token."
          : "Session invalid. Please sign in again.",
        code: isExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
        success: false,
      });
    }
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(500).json({
      message: `Authentication error: ${error.message}`,
      success: false,
    });
  }
};

export default isAuth;
