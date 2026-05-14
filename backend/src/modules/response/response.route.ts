import { Router } from "express";
import * as ResponseController from "./response.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import type { Request, Response, NextFunction } from "express";

import { responseRateLimiter } from "../../middlewares/rateLimit.middleware.js";

const router = Router();

// Middleware to attach user if token exists, but don't block if it doesn't
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
    verifyJWT(req, res, (err) => {
        next();
    });
};

router.post("/:pollId", responseRateLimiter, optionalAuth, ResponseController.submitResponse);

export default router;
