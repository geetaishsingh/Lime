import sharp from "sharp";
import { OPTIMIZATION_PRESETS } from "../config/cloudinary.js";

// Max pixel limit to guard against decompression bombs (~50 Megapixels)
const MAX_ALLOWED_PIXELS = 50 * 1000 * 1000;

/**
 * Validates file signature (magic numbers) to detect genuine image content.
 * @param {Buffer} buffer - File buffer
 * @returns {string|null} - Detected format name or null if invalid
 */
export const validateImageSignature = (buffer) => {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }

  // WebP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }

  // GIF: GIF87a or GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return "gif";
  }

  // BMP: 42 4D (BM)
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return "bmp";
  }

  // TIFF: II*. (49 49 2A 00) or MM.* (4D 4D 00 2A)
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
    (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a)
  ) {
    return "tiff";
  }

  // ISO Base Media File Format: HEIC, HEIF, AVIF (contains 'ftyp' at offset 4)
  const ftypStr = buffer.toString("ascii", 4, 12);
  if (ftypStr.startsWith("ftyp")) {
    const brand = ftypStr.slice(4).toLowerCase();
    if (["avif", "avis"].some((b) => brand.includes(b))) return "avif";
    if (["heic", "heix", "mif1", "msf1", "hevc"].some((b) => brand.includes(b))) return "heic";
    return "isobmff";
  }

  return null;
};

/**
 * Advanced Image Compression & Optimization Pipeline
 * @param {Buffer|Object} input - File buffer or Multer file object
 * @param {Object|string} optionsOrPreset - Preset name ("profile", "cover", "post", "chat", "story", "thumbnail") or options object
 * @returns {Promise<{ buffer: Buffer, info: Object, originalSize: number, reductionPercent: number, mimeType: string }>}
 */
export const compressImage = async (input, optionsOrPreset = "post") => {
  const buffer = Buffer.isBuffer(input) ? input : input?.buffer;
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("Invalid image input: expected a valid Buffer");
  }

  const originalSize = buffer.length;

  // 1. Resolve Preset Configuration
  let preset = OPTIMIZATION_PRESETS.post;
  let customOptions = {};

  if (typeof optionsOrPreset === "string") {
    preset = OPTIMIZATION_PRESETS[optionsOrPreset] || OPTIMIZATION_PRESETS.post;
  } else if (typeof optionsOrPreset === "object" && optionsOrPreset !== null) {
    const presetName = optionsOrPreset.preset;
    if (presetName && OPTIMIZATION_PRESETS[presetName]) {
      preset = { ...OPTIMIZATION_PRESETS[presetName], ...optionsOrPreset };
    } else {
      preset = { ...OPTIMIZATION_PRESETS.post, ...optionsOrPreset };
    }
    customOptions = optionsOrPreset;
  }

  // 2. Validate File Signature (Magic Bytes)
  const detectedFormat = validateImageSignature(buffer);
  if (!detectedFormat) {
    // If signature not detected directly, allow sharp to try parsing before throwing
    try {
      await sharp(buffer).metadata();
    } catch (_e) {
      throw new Error("Invalid or corrupted image format. Please upload a supported image (JPG, PNG, WebP, GIF, HEIC, AVIF).");
    }
  }

  // 3. Inspect Image Metadata & Guard Against Pixel/Decompression Bombs
  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch (err) {
    throw new Error(`Failed to decode image metadata: ${err.message}`);
  }

  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const totalPixels = width * height;

  if (totalPixels > MAX_ALLOWED_PIXELS) {
    throw new Error(`Image resolution too large (${width}x${height} = ${(totalPixels / 1e6).toFixed(1)}MP). Max limit is 50 Megapixels.`);
  }

  // 4. Build Sharp Processing Pipeline
  let pipeline = sharp(buffer);

  // Orientation handling
  const manualRotation = Number(customOptions.rotation) || 0;
  if (manualRotation) {
    pipeline = pipeline.rotate(manualRotation);
  } else {
    pipeline = pipeline.rotate(); // Auto-orient via EXIF
  }

  // Resizing: scale down if larger than preset, without enlarging smaller images
  pipeline = pipeline.resize({
    width: preset.width,
    height: preset.height,
    fit: preset.fit || "inside",
    withoutEnlargement: true,
  });

  // Quality & Format Conversion: Static images convert to WebP
  const quality = Number(preset.quality) || 55;
  pipeline = pipeline.webp({
    quality,
    effort: 4, // Balanced CPU effort for production speed and compression ratio
    lossless: false,
  });

  // 5. Execute compression
  const { data: outputBuffer, info } = await pipeline.toBuffer({ resolveWithObject: true });

  const newSize = outputBuffer.length;
  const reductionPercent = originalSize > 0
    ? Number((((originalSize - newSize) / originalSize) * 100).toFixed(1))
    : 0;

  return {
    buffer: outputBuffer,
    info: {
      width: info.width,
      height: info.height,
      format: "webp",
      size: newSize,
      channels: info.channels,
    },
    originalSize,
    reductionPercent,
    mimeType: "image/webp",
    presetName: preset.name || "custom",
  };
};

export default compressImage;
