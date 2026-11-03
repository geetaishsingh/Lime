import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
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
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    password: {
      type: String,
      required: false,
    },

    otp: {
      type: String,
    },

    otpExpires: {
      type: Date,
    },

    resetToken: {
      type: String,
    },

    resetTokenExpires: {
      type: Date,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    githubId: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProvider: {
  type: [String],
  enum: ["email", "google", "github"],
  default: ["email"],
},
  },

  {
    timestamps: true,
  },
);

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
