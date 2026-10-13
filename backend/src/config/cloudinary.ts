import { v2 as cloudinary } from "cloudinary";
// Import config so dotenv has definitely loaded and env access is centralized.
import config from "./config.js";
import { ApiError } from "../utils/ApiError.js";

export const isCloudinaryConfigured = () =>
  !!(config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET);

// SDK default is 60s; a 5–10 MB file needs far less, and users shouldn't stare at a spinner for a minute.
const UPLOAD_TIMEOUT_MS = 30_000;

/** Cloudinary errors carry `http_code`, not `statusCode`, so they'd otherwise surface as an opaque 500. */
function toUploadError(error: any) {
  if (error?.http_code === 499 || error?.name === "TimeoutError" || error?.code === "ETIMEDOUT")
    return new ApiError(504, "Upload timed out reaching the file storage service. Check your connection and try again.");
  if (error?.http_code && error.http_code < 500) return new ApiError(400, error.message || "Upload rejected by file storage");
  return new ApiError(502, "File storage is unavailable right now. Please try again.");
}

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
      { folder, resource_type: mimeType.startsWith("image/") ? "image" : "auto", timeout: UPLOAD_TIMEOUT_MS },
      (error, result) => {
        if (error || !result) return reject(toUploadError(error));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

export default cloudinary;

export interface CloudinaryAsset {
  publicId: string;
  resourceType: "image" | "video" | "raw";
}

/**
 * Maps a stored secure_url back to its public_id. Returns null for anything that isn't
 * on our cloud or outside our "kollects/" upload folders, so cleanup can never touch
 * foreign or hand-managed assets.
 */
export function assetFromUrl(url: string | undefined | null, cloudName = config.CLOUDINARY_CLOUD_NAME): CloudinaryAsset | null {
  if (!url || !cloudName) return null;
  const escaped = cloudName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = url.match(new RegExp(`^https://res\\.cloudinary\\.com/${escaped}/(image|video|raw)/upload/(?:v\\d+/)?([^?#]+)`));
  if (!m) return null;
  const resourceType = m[1] as CloudinaryAsset["resourceType"];
  let path: string;
  try {
    path = decodeURIComponent(m[2]!);
  } catch {
    return null;
  }
  if (!path.startsWith("kollects/")) return null;
  // Raw assets keep their extension in the public_id; images/videos don't.
  return { resourceType, publicId: resourceType === "raw" ? path : path.replace(/\.[^/.]+$/, "") };
}

/** Deletes assets in batches of 100 per resource type. Never throws; reports counts. */
export async function deleteCloudinaryAssets(assets: CloudinaryAsset[]) {
  const result = { deleted: 0, notFound: 0, failed: 0 };
  if (!assets.length || !isCloudinaryConfigured()) {
    result.failed = assets.length;
    return result;
  }
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true,
  });
  for (const type of ["image", "video", "raw"] as const) {
    const ids = [...new Set(assets.filter((a) => a.resourceType === type).map((a) => a.publicId))];
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      try {
        const res = await cloudinary.api.delete_resources(batch, { resource_type: type, type: "upload" });
        for (const status of Object.values(res?.deleted ?? {})) {
          if (status === "deleted") result.deleted++;
          else if (status === "not_found") result.notFound++;
          else result.failed++;
        }
      } catch {
        result.failed += batch.length;
      }
    }
  }
  return result;
}
