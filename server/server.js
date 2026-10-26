import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

import connectDb from "./src/config/database.js";
import { initSocket } from "./socket.js";
import authRoute from "./src/routes/auth.route.js";
import userRoute from "./src/routes/user.route.js";
import postRoute from "./src/routes/post.route.js";
import messageRoute from "./src/routes/message.route.js";
import storyRoute from "./src/routes/story.route.js";
import notificationRoute from "./src/routes/notification.route.js";

dotenv.config();

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
  "https://line-1-88y0.onrender.com",
  "https://lime-tgyy.onrender.com",
];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl)
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
    name: "Lime Social API",
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
const MONGO_URI = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/lime_social";

connectDb()
  .then(() => {
    console.log("MongoDB connected successfully");
    server.listen(PORT, () => {
      console.log(`Lime Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB Connection Failed:", error.message);
    console.log("Starting server without DB connection for diagnostics...");
    server.listen(PORT, () => {
      console.log(`Lime Server running in degraded mode on port ${PORT}`);
    });
  });

export { app, server };
