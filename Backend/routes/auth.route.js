import express from "express";
import passport from "passport";
import {
  login,
  logout,
  register,
  resetPassword,
  sendOtp,
  VerifyOtp,
  verifySignupOtp,
  resendSignupOtp,
  googleCallback,
  githubCallback,
} from "../controllers/auth.controller.js";

const authRoute = express.Router();
const clientLoginRedirect = (process.env.CLIENT_URL || "http://localhost:5173") + "/login";

authRoute.post("/register", register);
authRoute.post("/verify-signup-otp", verifySignupOtp);
authRoute.post("/resend-signup-otp", resendSignupOtp);
authRoute.post("/login", login);
authRoute.get("/logout", logout);
authRoute.post("/logout", logout);
authRoute.post("/send-otp", sendOtp);
authRoute.post("/verify-otp", VerifyOtp);
authRoute.post("/reset-password", resetPassword);

// Google OAuth
authRoute.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

authRoute.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: clientLoginRedirect,
  }),
  googleCallback
);

// GitHub OAuth
authRoute.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
    session: false,
  })
);

authRoute.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect: clientLoginRedirect,
  }),
  githubCallback
);

export default authRoute;
