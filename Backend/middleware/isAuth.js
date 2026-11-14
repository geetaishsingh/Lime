import jwt from "jsonwebtoken";
import { getJwtSecret } from "../utils/jwtSecret.js";

const isAuth = async (req, res, next) => {
  const reqId = req.headers["x-request-id"] || "req_" + Math.random().toString(36).slice(2, 9);

  try {
    let token = req.cookies?.token;
    let source = token ? "cookie" : null;

    // Check Authorization header: Bearer <token>
    if (req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer" && parts[1]) {
        // Prefer header if present (crucial for mobile cross-site requests)
        token = parts[1];
        source = "header";
      }
    }

    const hasCookie = Boolean(req.cookies?.token);
    const hasHeader = Boolean(req.headers.authorization);

    if (!token) {
      console.info(
        `[Lime Auth] Authentication middleware result: FAILED (no token) [reqId=${reqId}] [cookieReceived=${hasCookie}] [headerReceived=${hasHeader}]`
      );
      return res.status(401).json({
        message: "Authentication token required. Please sign in.",
        code: "TOKEN_REQUIRED",
        success: false,
      });
    }

    try {
      const decodeToken = jwt.verify(token, getJwtSecret());

      if (!decodeToken || !decodeToken.userId) {
        console.warn(
          `[Lime Auth] JWT verification: FAILED (payload invalid) [reqId=${reqId}] [source=${source}]`
        );
        return res.status(401).json({
          message: "Invalid or expired token. Please sign in again.",
          code: "TOKEN_INVALID",
          success: false,
        });
      }

      req.userId = decodeToken.userId;
      // Success log
      return next();
    } catch (jwtErr) {
      const isExpired = jwtErr.name === "TokenExpiredError";
      console.info(
        `[Lime Auth] JWT verification: ${isExpired ? "EXPIRED" : "INVALID"} [reqId=${reqId}] [source=${source}]`
      );
      return res.status(401).json({
        message: isExpired
          ? "Session expired. Please refresh token."
          : "Session invalid. Please sign in again.",
        code: isExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
        success: false,
      });
    }
  } catch (error) {
    console.error(
      `[Lime Auth] Authentication error [reqId=${reqId}]:`,
      error.message
    );
    return res.status(500).json({
      message: `Authentication error: ${error.message}`,
      success: false,
    });
  }
};

export default isAuth;
