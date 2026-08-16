import { v2 as cloudinary } from "cloudinary";
// Import config so dotenv has definitely loaded and env access is centralized.
import config from "./config.js";

export const isCloudinaryConfigured = () =>
  !!(config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET);

/**
 * Streams a memory buffer to Cloudinary and resolves with the secure CDN URL.
 * Config is applied per call (cheap) so it always reflects the current env.
 */
export function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string,
  mimeType: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      reject(new Error("Cloudinary is not configured (missing env keys)"));
      return;
    }
    cloudinary.config({
      cloud_name: config.CLOUDINARY_CLOUD_NAME,
      api_key: config.CLOUDINARY_API_KEY,
      api_secret: config.CLOUDINARY_API_SECRET,
      secure: true,
    });
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: mimeType.startsWith("image/") ? "image" : "auto" },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

export default cloudinary;
