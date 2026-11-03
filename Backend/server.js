import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import passport from "passport";
import mongoose from "mongoose";

import connectDb from "./config/database.js";
import { initSocket } from "./services/socket.service.js";
import { initChatCleanup } from "./services/chatCleanup.service.js";
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
import postRoute from "./routes/post.route.js";
import messageRoute from "./routes/message.route.js";
import storyRoute from "./routes/story.route.js";
import notificationRoute from "./routes/notification.route.js";

// Load Passport strategies after dotenv has populated process.env.
import "./config/googleStrategy.js";
import "./config/githubStrategy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Supported frontend origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Dev-friendly permissive CORS
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
});

initSocket(io);

// Middlewares
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(cookieParser());
app.use(passport.initialize());

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true); // Permissive in dev to avoid blocking local Vite ports
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/api", (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database is unavailable. Check the MongoDB connection and try again.",
      success: false,
    });
  }
  return next();
});

// Serve static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);
app.use("/api/post", postRoute);
app.use("/api/message", messageRoute);
app.use("/api/story", storyRoute);
app.use("/api/notifications", notificationRoute);

app.get("/", (req, res) => {
  return res.status(200).json({
    name: "C Lime Unified API",
    status: "Healthy",
    version: "2.0.0",
    uptime: process.uptime(),
  });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err);
  const status = err.status || 500;
  return res.status(status).json({
    message: err.message || "Internal server error",
    success: false,
  });
});

// Start Server
connectDb()
  .then(() => {
    console.log("MongoDB connected successfully");
    initChatCleanup(); // Automatically sweeps expired 24h chats & attachments
    server.listen(PORT, () => {
      console.log(`C Lime Backend running on http://localhost:${PORT}`);
    });
  })
  .catch(async (error) => {
    console.error("MongoDB Connection Failed:", error.message);
    await mongoose.disconnect();
    process.exitCode = 1;
  });

export { app, server };
