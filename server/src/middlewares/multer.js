import multer from "multer";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB to accommodate all high-res video and image formats
  },
  fileFilter: (req, file, cb) => {
    // Accept all media and file formats without rejecting
    cb(null, true);
  },
});
