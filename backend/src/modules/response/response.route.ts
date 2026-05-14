import { Router } from "express";
import * as ResponseController from "./response.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// Middleware to attach user if token exists, but don't block if it doesn't
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
    // We can reuse verifyJWT but handle errors silently
    verifyJWT(req, res, (err) => {
        // Ignore error and continue
        next();
    });
};

router.post("/:pollId", optionalAuth, ResponseController.submitResponse);

export default router;
