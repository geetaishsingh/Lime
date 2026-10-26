import express from "express";
import {
  login,
  logout,
  register,
  resetPassword,
  sendOtp,
  VerifyOtp,
  verifySignupOtp,
  resendSignupOtp,
} from "../controllers/auth.controller.js";

const authRoute = express.Router();

authRoute.post("/register", register);
authRoute.post("/verify-signup-otp", verifySignupOtp);
authRoute.post("/resend-signup-otp", resendSignupOtp);
authRoute.post("/login", login);
authRoute.get("/logout", logout);
authRoute.post("/send-otp", sendOtp);
authRoute.post("/verify-otp", VerifyOtp);
authRoute.post("/reset-password", resetPassword);

export default authRoute;
