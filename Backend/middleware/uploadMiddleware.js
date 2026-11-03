import multer from "multer";
import path from "path";

// In-memory buffer storage for direct Sharp streaming
const storage = multer.memoryStorage();

// Allowed MIME types for images and videos
const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/tiff",
  "image/bmp",
  "image/svg+xml",
  // Videos
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/avi",
  "video/x-msvideo",
  "video/x-flv",
  "video/3gpp",
  "video/mp2t",
  // Generic fallbacks for exotic OS file selectors
  "application/octet-stream",
  "application/x-matroska",
  "application/mp4",
]);

// Allowed file extensions
const ALLOWED_EXTENSIONS = new Set([
  // Images
  "jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "avif", "tiff", "tif", "bmp", "svg",
  // Videos
  "mp4", "m4v", "mov", "mkv", "webm", "avi", "wmv", "flv", "3gp", "3g2", "ts", "mts"
]);

// Max file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || "").toLowerCase();
    const ext = (path.extname(file.originalname || "").slice(1) || "").toLowerCase();

    // Check MIME type or extension
    if (ALLOWED_MIME_TYPES.has(mime) || ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${mime || ext}. Please upload a valid image or video.`));
    }
  },
});

export const uploadSingle = (fieldName = "image") => upload.single(fieldName);
export const uploadArray = (fieldName = "images", maxCount = 10) => upload.array(fieldName, maxCount);
export const uploadFields = (fields) => upload.fields(fields);
export const uploadAny = () => upload.any();

export default upload;
