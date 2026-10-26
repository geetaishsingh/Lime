import jwt from "jsonwebtoken";

const isAuth = async (req, res, next) => {
  try {
    let token = req.cookies.token;

    // Also support Authorization header: Bearer <token>
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        message: "Authentication token required. Please sign in.",
        success: false,
      });
    }

    try {
      const decodeToken = jwt.verify(
        token,
        process.env.JWT_SECRET_KEY || "lime_fallback_secret_key_2026"
      );

      if (!decodeToken || !decodeToken.userId) {
        return res.status(401).json({
          message: "Invalid or expired token. Please sign in again.",
          success: false,
        });
      }

      req.userId = decodeToken.userId;
      next();
    } catch (jwtErr) {
      return res.status(401).json({
        message: "Session expired or invalid. Please sign in again.",
        success: false,
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: `Authentication error: ${error.message}`,
      success: false,
    });
  }
};

export default isAuth;
