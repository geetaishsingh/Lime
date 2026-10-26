import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
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
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minLength: [6, "Password must be at least 6 characters"],
    },
    bio: {
      type: String,
      default: "",
      maxLength: [250, "Bio cannot exceed 250 characters"],
    },
    website: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
      default: "Prefer not to say",
    },
    profileImage: {
      type: String,
      default:
        "https://ui-avatars.com/api/?name=Lime+User&background=10b981&color=fff&size=256",
    },
    coverImage: {
      type: String,
      default: "",
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    bookmarks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isPrivate: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    signupOtp: {
      type: String,
    },
    signupOtpExpires: {
      type: Date,
    },
    signupOtpAttempts: {
      type: Number,
      default: 0,
    },
    resetOtp: {
      type: String,
    },
    resetOtpExpires: {
      type: Date,
    },
    resetOtpAttempts: {
      type: Number,
      default: 0,
    },
    isOtpVerified: {
      type: Boolean,
      default: false,
    },
    socketId: {
      type: String,
      default: "",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
