import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

const cloudName = process.env.CLOUD_NAME;
const apiKey = process.env.CLOUD_API_KEY;
const apiSecret = process.env.CLOUD_SECRET_API_KEY;

export const isCloudinaryConfigured = Boolean(
  cloudName &&
  apiKey &&
  apiSecret &&
  cloudName !== "your_cloud_name" &&
  cloudName !== ""
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

/**
 * Standardized optimization presets across Lime Social Media
 */
export const OPTIMIZATION_PRESETS = {
  profile: {
    name: "profile",
    folder: "lime/profiles",
    width: 512,
    height: 512,
    fit: "cover",
    quality: 45,
    format: "webp",
  },
  cover: {
    name: "cover",
    folder: "lime/covers",
    width: 1600,
    height: 600,
    fit: "cover",
    quality: 55,
    format: "webp",
  },
  post: {
    name: "post",
    folder: "lime/posts",
    width: 1600,
    height: 1600,
    fit: "inside",
    quality: 55,
    format: "webp",
  },
  chat: {
    name: "chat",
    folder: "lime/chat",
    width: 1280,
    height: 1280,
    fit: "inside",
    quality: 50,
    format: "webp",
  },
  story: {
    name: "story",
    folder: "lime/stories",
    width: 1080,
    height: 1920,
    fit: "inside",
    quality: 55,
    format: "webp",
  },
  thumbnail: {
    name: "thumbnail",
    folder: "lime/thumbnails",
    width: 400,
    height: 400,
    fit: "inside",
    quality: 45,
    format: "webp",
  },
};

export default cloudinary;
export { cloudinary };
