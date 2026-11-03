import mongoose from "mongoose";

const pendingSignupSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },

  name: {
    type: String,
    default: "",
    trim: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },

  otp: {
    type: String,
    required: true,
  },

  otpExpires: {
    type: Date,
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
    expires: "7d",
  },
  otpAttempts: {
    type: Number,
    default: 0,
  },
});

const PendingSignup = mongoose.model("PendingSignup", pendingSignupSchema);

export default PendingSignup;
