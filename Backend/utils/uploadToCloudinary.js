import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import cloudinary, { isCloudinaryConfigured, OPTIMIZATION_PRESETS } from "../config/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");

// Ensure local uploads directory exists for fallback
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Uploads an optimized image buffer or stream directly to Cloudinary.
 * @param {Buffer} buffer - Compressed WebP buffer
 * @param {string|Object} presetOrOptions - Preset key or options object
 * @param {Object} metadataInfo - Optional metadata from compressImage (width, height, sizes)
 * @returns {Promise<{ public_id: string, secure_url: string, url: string, width: number, height: number, format: string, bytes: number, resource_type: string, folder: string }>}
 */
export const uploadToCloudinary = async (buffer, presetOrOptions = "post", metadataInfo = {}) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("uploadToCloudinary requires a valid Buffer.");
  }

  // 1. Resolve preset & upload folder
  let preset = OPTIMIZATION_PRESETS.post;
  let customFolder = "";

  if (typeof presetOrOptions === "string") {
    preset = OPTIMIZATION_PRESETS[presetOrOptions] || OPTIMIZATION_PRESETS.post;
    customFolder = preset.folder;
  } else if (typeof presetOrOptions === "object" && presetOrOptions !== null) {
    const pName = presetOrOptions.preset;
    if (pName && OPTIMIZATION_PRESETS[pName]) {
      preset = { ...OPTIMIZATION_PRESETS[pName], ...presetOrOptions };
    } else {
      preset = { ...OPTIMIZATION_PRESETS.post, ...presetOrOptions };
    }
    customFolder = presetOrOptions.folder || preset.folder;
  }

  const folder = customFolder || "lime/posts";

  // 2. Upload to Cloudinary if configured
  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder,
        resource_type: "image",
        format: "webp",
        // Use Cloudinary automated delivery optimizations
        flags: "attachment:false",
      };

      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) {
          console.error("Cloudinary upload failed:", error);
          return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        }

        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          url: result.secure_url,
          width: result.width || metadataInfo?.width || 0,
          height: result.height || metadataInfo?.height || 0,
          format: result.format || "webp",
          bytes: result.bytes || buffer.length,
          resource_type: result.resource_type || "image",
          folder,
          originalSize: metadataInfo?.originalSize || buffer.length,
          reductionPercent: metadataInfo?.reductionPercent || 0,
        });
      });

      stream.end(buffer);
    });
  }

  // 3. Resilient Local Disk Fallback (when Cloudinary not configured or in offline dev)
  const filename = `${preset.name || "img"}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}.webp`;
  const destPath = path.join(uploadsDir, filename);
  fs.writeFileSync(destPath, buffer);

  const localUrl = `/uploads/${filename}`;
  return {
    public_id: `local_${filename}`,
    secure_url: localUrl,
    url: localUrl,
    width: metadataInfo?.width || 0,
    height: metadataInfo?.height || 0,
    format: "webp",
    bytes: buffer.length,
    resource_type: "image",
    folder,
    originalSize: metadataInfo?.originalSize || buffer.length,
    reductionPercent: metadataInfo?.reductionPercent || 0,
  };
};

/**
 * Safely delete an image from Cloudinary by its public_id or URL.
 * Preserves default UI avatars and external CDN URLs.
 * @param {string} publicIdOrUrl - Cloudinary public_id or secure_url
 * @param {string} resourceType - "image" or "video" (default: "image")
 */
export const deleteFromCloudinary = async (publicIdOrUrl, resourceType = "image") => {
  if (!publicIdOrUrl || typeof publicIdOrUrl !== "string") return false;

  // Preserve default avatars, external URLs, and unsplash assets
  if (
    publicIdOrUrl.includes("ui-avatars.com") ||
    publicIdOrUrl.includes("unsplash.com") ||
    publicIdOrUrl.includes("default-avatar") ||
    publicIdOrUrl.startsWith("data:")
  ) {
    return false;
  }

  // Handle local disk fallback files
  if (publicIdOrUrl.startsWith("/uploads/") || publicIdOrUrl.startsWith("local_")) {
    const filename = path.basename(publicIdOrUrl.replace("local_", ""));
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        return true;
      } catch (_err) {
        return false;
      }
    }
    return false;
  }

  if (!isCloudinaryConfigured) return false;

  try {
    let publicId = publicIdOrUrl;

    // If a full Cloudinary URL was provided, extract the public_id
    if (publicIdOrUrl.includes("res.cloudinary.com")) {
      const match = publicIdOrUrl.match(/upload\/(?:v\d+\/)?([^\.]+)/);
      if (match && match[1]) {
        publicId = match[1];
      }
    }

    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });

    return res.result === "ok";
  } catch (err) {
    console.warn(`Failed to delete asset [${publicIdOrUrl}] from Cloudinary:`, err.message);
    return false;
  }
};

/**
 * Cleanup helper if MongoDB transaction / save fails after upload
 * @param {Array<string>|string} publicIds - Public ID or array of Public IDs to remove
 */
export const cleanupCloudinaryOnFailure = async (publicIds) => {
  if (!publicIds) return;
  const list = Array.isArray(publicIds) ? publicIds : [publicIds];
  await Promise.allSettled(
    list.map((id) => {
      if (id) return deleteFromCloudinary(id);
      return Promise.resolve();
    })
  );
};

export default uploadToCloudinary;
