import cloudinary, { isCloudinaryConfigured, OPTIMIZATION_PRESETS } from "../config/cloudinary.js";

const uploadOnCloudinary = async (fileUrl) => {
  try {
    if (!fileUrl) {
      throw new Error("No file data provided");
    }
    const result = await cloudinary.uploader.upload(fileUrl);
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error.message);
    throw error;
  }
};

export default uploadOnCloudinary;
export { cloudinary, isCloudinaryConfigured, OPTIMIZATION_PRESETS, uploadOnCloudinary };
