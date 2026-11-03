import path from "path";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";
import cloudinary, { isCloudinaryConfigured, OPTIMIZATION_PRESETS } from "../config/cloudinary.js";
import { compressImage, validateImageSignature } from "./compressImage.js";
import { uploadToCloudinary, deleteFromCloudinary } from "./uploadToCloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const VIDEO_EXTENSIONS = new Set([
  "mp4", "m4v", "mov", "mkv", "webm", "avi", "wmv", "flv", "3gp",
  "3g2", "ts", "mts", "m2ts", "ogv", "vob", "qt", "asf", "rm",
  "rmvb", "f4v", "divx", "mpg", "mpeg"
]);

export const convertHeicToJpeg = async (buffer) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("HEIC conversion requires a valid image buffer.");
  }
  if (!isCloudinaryConfigured) {
    throw new Error("This HEIC image uses HEVC compression, which this server cannot decode. Configure Cloudinary or convert the image to JPEG.");
  }

  let uploadedAsset;
  try {
    uploadedAsset = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "lime/temp",
          resource_type: "image",
          eager: [{ format: "jpg" }],
          eager_async: false,
        },
        (error, result) => {
          if (error) return reject(new Error(`HEIC conversion failed: ${error.message}`));
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    const jpegUrl = uploadedAsset.eager?.[0]?.secure_url;
    if (!jpegUrl) {
      throw new Error("Cloudinary did not return a converted JPEG for this HEIC image.");
    }

    const response = await fetch(jpegUrl);
    if (!response.ok) {
      throw new Error(`Could not download converted HEIC image (HTTP ${response.status}).`);
    }
    return Buffer.from(await response.arrayBuffer());
  } finally {
    if (uploadedAsset?.public_id) {
      const deleted = await deleteFromCloudinary(uploadedAsset.public_id);
      if (!deleted) {
        console.warn(`Could not remove temporary HEIC asset [${uploadedAsset.public_id}].`);
      }
    }
  }
};

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
 * Process and save an image or video file using the advanced optimization pipeline.
 * @param {Object} file - Multer file object
 * @param {Object} options - { preset, rotation, isVideo, duration }
 * @returns {Promise<{ url: String, mediaType: String, duration?: Number, public_id: String, width?: Number, height?: Number, format?: String, bytes?: Number }>}
 */
export const processAndUploadMedia = async (file, options = {}) => {
  if (!file) throw new Error("No file uploaded");

  const isVideo = isVideoMedia(file, options);

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
            folder: "lime/videos",
          },
          (error, result) => {
            if (error) return reject(error);
            resolve({
              url: result.secure_url,
              secure_url: result.secure_url,
              public_id: result.public_id,
              mediaType: "video",
              duration: Math.round(result.duration || options.duration || 0),
              thumbnail: result.thumbnail_url || "",
              width: result.width || 0,
              height: result.height || 0,
              format: result.format || "mp4",
              bytes: result.bytes || file.size,
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
        secure_url: `/uploads/${filename}`,
        public_id: `local_${filename}`,
        mediaType: "video",
        duration: options.duration ? Number(options.duration) : 0,
        thumbnail: "",
        width: 0,
        height: 0,
        format: ext.replace(".", "") || "mp4",
        bytes: file.size,
      };
    }
  }

  // IMAGE PROCESSING: Sharp Compression, WebP Conversion, and Cloudinary Upload
  const presetKey = options.preset || "post";
  const imageBuffer = validateImageSignature(file.buffer) === "heic"
    ? await convertHeicToJpeg(file.buffer)
    : file.buffer;
  const compressed = await compressImage({ ...file, buffer: imageBuffer }, {
    preset: presetKey,
    rotation: options.rotation,
  });

  const uploadResult = await uploadToCloudinary(compressed.buffer, presetKey, {
    ...compressed.info,
    originalSize: compressed.originalSize,
    reductionPercent: compressed.reductionPercent,
  });

  return {
    url: uploadResult.secure_url,
    secure_url: uploadResult.secure_url,
    public_id: uploadResult.public_id,
    mediaType: "image",
    width: uploadResult.width,
    height: uploadResult.height,
    format: uploadResult.format,
    bytes: uploadResult.bytes,
    originalSize: uploadResult.originalSize,
    reductionPercent: uploadResult.reductionPercent,
    folder: uploadResult.folder,
  };
};

/**
 * Delete a media file from disk or Cloudinary
 * @param {string} mediaUrlOrPublicId - Stored media URL or Cloudinary public_id
 * @param {string} resourceType - "image" or "video" (default: "image")
 */
export const deleteMediaFile = async (mediaUrlOrPublicId, resourceType = "image") => {
  return deleteFromCloudinary(mediaUrlOrPublicId, resourceType);
};

export default processAndUploadMedia;
