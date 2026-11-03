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
    phone: {
      type: String,
      sparse: true,
      default: undefined,
    },
    googleId: {
      type: String,
      sparse: true,
      default: undefined,
    },
    githubId: {
      type: String,
      sparse: true,
      default: undefined,
    },
    authProvider: {
      type: [String],
      default: ["local"],
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId && !this.githubId;
      },
      validate: {
        validator: function (v) {
          if (this.googleId || this.githubId) return true;
          return Boolean(v && v.length >= 6);
        },
        message: "Password must be at least 6 characters",
      },
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
    profileImageMetadata: {
      public_id: { type: String, default: "" },
      secure_url: { type: String, default: "" },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      format: { type: String, default: "webp" },
      bytes: { type: Number, default: 0 },
    },
    coverImage: {
      type: String,
      default: "",
    },
    coverImageMetadata: {
      public_id: { type: String, default: "" },
      secure_url: { type: String, default: "" },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      format: { type: String, default: "webp" },
      bytes: { type: Number, default: 0 },
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
