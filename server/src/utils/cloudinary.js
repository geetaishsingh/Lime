import { v2 as cloudinary } from "cloudinary";
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_API_KEY,
});

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