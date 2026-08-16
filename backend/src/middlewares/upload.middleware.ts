import multer from "multer";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ApiError } from "../utils/ApiError.js";
import { isCloudinaryConfigured } from "../config/cloudinary.js";

/**
 * Fails fast with a clear 503 (before buffering the file) when Cloudinary isn't
 * configured — otherwise uploads die deep in the controller with a cryptic 500.
 */
export const requireCloudinary = (_req: Request, _res: Response, next: NextFunction) => {
  if (!isCloudinaryConfigured()) {
    return next(
      new ApiError(503, "File uploads are not configured. Set the CLOUDINARY_* keys in the backend .env and restart the server.")
    );
  }
  next();
};

// Executables and script-bearing types are always rejected regardless of the
// per-question allowlist — never trust the client-reported type for these.
const BLOCKED_MIME = new Set([
  "image/svg+xml",
  "text/html",
  "application/x-msdownload",
  "application/x-sh",
  "application/x-httpd-php",
]);

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (BLOCKED_MIME.has(file.mimetype) || !ALLOWED_MIME.has(file.mimetype)) {
    cb(new Error(`File type not allowed: ${file.mimetype}`));
    return;
  }
  cb(null, true);
};

// Memory storage — buffers are streamed straight to Cloudinary, never touch disk.
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/") || file.mimetype === "image/svg+xml") {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
}).single("file");

const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
}).single("file");

/** Wraps a multer handler so size/type rejections surface as ApiError(400). */
function wrap(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err: any) => {
      if (err) return next(new ApiError(400, err.message || "File upload failed"));
      next();
    });
  };
}

export const uploadImage = wrap(imageUpload);
export const uploadFile = wrap(fileUpload);
