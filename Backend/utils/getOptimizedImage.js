import { isCloudinaryConfigured } from "../config/cloudinary.js";

/**
 * Generates an optimized Cloudinary delivery URL with automatic format and quality.
 * @param {string} urlOrPublicId - Cloudinary secure_url or public_id
 * @param {Object} options - Transformation options { width, height, crop, quality, format }
 * @returns {string} - Transformed optimized URL
 */
export const getOptimizedImageUrl = (urlOrPublicId, options = {}) => {
  if (!urlOrPublicId || typeof urlOrPublicId !== "string") return "";

  // Return non-Cloudinary or local paths directly
  if (!urlOrPublicId.includes("res.cloudinary.com") && !isCloudinaryConfigured) {
    return urlOrPublicId;
  }

  const {
    width,
    height,
    crop = "limit", // 'fill', 'fit', 'limit', 'thumb', 'pad'
    quality = "auto",
    format = "auto",
    dpr = "auto",
    effect,
  } = options;

  // Build transformation segments
  const transforms = [];

  if (format) transforms.push(`f_${format}`);
  if (quality) transforms.push(`q_${quality}`);
  if (dpr) transforms.push(`dpr_${dpr}`);
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (crop && (width || height)) transforms.push(`c_${crop}`);
  if (effect) transforms.push(`e_${effect}`);

  const transformString = transforms.join(",");

  // If already a Cloudinary URL, inject transformations after /upload/
  if (urlOrPublicId.includes("res.cloudinary.com")) {
    // Avoid double-injecting if already contains f_auto
    if (urlOrPublicId.includes("/f_auto") || urlOrPublicId.includes("/q_auto")) {
      return urlOrPublicId;
    }
    return urlOrPublicId.replace("/upload/", `/upload/${transformString}/`);
  }

  // If public_id was passed
  const cloudName = process.env.CLOUD_NAME;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}/${urlOrPublicId}.webp`;
};

/**
 * Returns a square thumbnail delivery URL (e.g. for grid views or avatar thumbs)
 * @param {string} urlOrPublicId
 * @param {number} size - Dimension in pixels (default: 400)
 */
export const getThumbnailUrl = (urlOrPublicId, size = 400) => {
  return getOptimizedImageUrl(urlOrPublicId, {
    width: size,
    height: size,
    crop: "fill",
    quality: "auto",
    format: "auto",
  });
};

/**
 * Generates a tiny, blurred low-quality image placeholder (LQIP)
 * for progressive image loading.
 * @param {string} urlOrPublicId
 */
export const getBlurPlaceholderUrl = (urlOrPublicId) => {
  return getOptimizedImageUrl(urlOrPublicId, {
    width: 30,
    height: 30,
    crop: "fill",
    quality: "10",
    format: "auto",
    effect: "blur:1000",
  });
};

export default {
  getOptimizedImageUrl,
  getThumbnailUrl,
  getBlurPlaceholderUrl,
};
