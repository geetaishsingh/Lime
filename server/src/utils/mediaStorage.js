import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import crypto from "crypto";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../../uploads");

// Ensure local uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const isCloudinaryConfigured = Boolean(
  process.env.CLOUD_NAME &&
  process.env.CLOUD_API_KEY &&
  process.env.CLOUD_SECRET_API_KEY &&
  process.env.CLOUD_NAME !== "your_cloud_name"
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_SECRET_API_KEY,
  });
}

const VIDEO_EXTENSIONS = new Set([
  "mp4", "m4v", "mov", "mkv", "webm", "avi", "wmv", "flv", "3gp",
  "3g2", "ts", "mts", "m2ts", "ogv", "vob", "qt", "asf", "rm",
  "rmvb", "f4v", "divx", "mpg", "mpeg"
]);

/**
 * Check if a file is a video by mimetype, extension, or options
 */
export const isVideoMedia = (file, options = {}) => {
  if (options.isVideo) return true;
  if (!file) return false;
  const mime = (file.mimetype || "").toLowerCase();
  const ext = (path.extname(file.originalname || "") || "").replace(".", "").toLowerCase();
  if (mime.startsWith("video/")) return true;
  if (
    ["application/x-matroska", "application/mp4", "application/octet-stream"].includes(mime) &&
    VIDEO_EXTENSIONS.has(ext)
  ) {
    return true;
  }
  return VIDEO_EXTENSIONS.has(ext);
};

/**
 * Process and save an image or video file
 * @param {Object} file - Multer file object
 * @param {Object} options - { rotation: number, isVideo: boolean, duration: number }
 * @returns {Promise<{ url: String, mediaType: String, duration?: Number }>}
 */
export const processAndUploadMedia = async (file, options = {}) => {
  if (!file) throw new Error("No file uploaded");

  const isVideo = isVideoMedia(file, options);
  const rotation = Number(options.rotation) || 0;

  if (isVideo) {
    // Validate video size (100MB max)
    const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_VIDEO_SIZE) {
      throw new Error("Video file size exceeds maximum limit of 100MB");
    }

    const ext = path.extname(file.originalname) || ".mp4";

    if (isCloudinaryConfigured) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "video",
            folder: "lime_social/videos",
          },
          (error, result) => {
            if (error) return reject(error);
            resolve({
              url: result.secure_url,
              mediaType: "video",
              duration: Math.round(result.duration || options.duration || 0),
              thumbnail: result.thumbnail_url || "",
            });
          }
        );
        uploadStream.end(file.buffer);
      });
    } else {
      // Local storage fallback for video
      const filename = `video_${Date.now()}_${crypto.randomBytes(6).toString("hex")}${ext}`;
      const destPath = path.join(uploadsDir, filename);
      fs.writeFileSync(destPath, file.buffer);

      return {
        url: `/uploads/${filename}`,
        mediaType: "video",
        duration: options.duration ? Number(options.duration) : 0,
        thumbnail: "",
      };
    }
  }

  // Image Processing with resilient fallback
  let optimizedBuffer = file.buffer;
  let fileExt = (path.extname(file.originalname || "") || ".jpg").toLowerCase();

  try {
    let pipeline = sharp(file.buffer);
    if (rotation) {
      pipeline = pipeline.rotate(rotation);
    } else {
      pipeline = pipeline.rotate(); // Auto-orient based on EXIF
    }

    optimizedBuffer = await pipeline
      .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
      .toFormat("jpeg", { quality: 88 })
      .toBuffer();
    fileExt = ".jpg";
  } catch (sharpErr) {
    // If sharp fails on an exotic format (HEIC, BMP, RAW, SVG, etc.), save original buffer directly
    optimizedBuffer = file.buffer;
  }

  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "lime_social/images",
          resource_type: "auto",
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            mediaType: "image",
          });
        }
      );
      uploadStream.end(optimizedBuffer);
    });
  } else {
    // Local storage fallback for images
    const filename = `img_${Date.now()}_${crypto.randomBytes(6).toString("hex")}${fileExt}`;
    const destPath = path.join(uploadsDir, filename);
    fs.writeFileSync(destPath, optimizedBuffer);

    return {
      url: `/uploads/${filename}`,
      mediaType: "image",
    };
  }
};

export default processAndUploadMedia;
