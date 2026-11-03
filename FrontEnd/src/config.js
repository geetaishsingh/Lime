export const serverUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const getMediaUrl = (url) => {
  if (!url) return "";
  let formatted = url;
  // If it's a Cloudinary HEIC/HEIF photo, transform to JPG on the fly
  if (formatted.includes("cloudinary.com") && formatted.toLowerCase().match(/\.(heic|heif)$/)) {
    formatted = formatted.replace(/\.(heic|heif)$/i, ".jpg");
  }
  if (
    formatted.startsWith("http://") ||
    formatted.startsWith("https://") ||
    formatted.startsWith("blob:") ||
    formatted.startsWith("data:")
  ) {
    return formatted;
  }
  return `${serverUrl}${formatted.startsWith("/") ? "" : "/"}${formatted}`;
};

export default {
  serverUrl,
  getMediaUrl,
};
