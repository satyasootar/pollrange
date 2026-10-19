import { Router } from "express";
import * as FormResponseController from "./form-response.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { responseRateLimiter } from "../../middlewares/rateLimit.middleware.js";
import { uploadFile, requireCloudinary } from "../../middlewares/upload.middleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// Attach user if a token is present, but don't block anonymous submissions.
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  verifyJWT(req, res, () => next());
};

router.get("/history", verifyJWT, FormResponseController.getUserHistory);
router.post("/:formId", responseRateLimiter, optionalAuth, FormResponseController.submitResponse);
router.post("/:formId/attempt", responseRateLimiter, optionalAuth, FormResponseController.startAttempt);
router.post("/:formId/upload", responseRateLimiter, optionalAuth, requireCloudinary, uploadFile, FormResponseController.uploadResponseFile);

export default router;
