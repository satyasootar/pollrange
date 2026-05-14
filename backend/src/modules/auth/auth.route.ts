import { Router } from "express";
import passport from "passport";
import * as AuthController from "./auth.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";

import { authRateLimiter } from "../../middlewares/rateLimit.middleware.js";

const authRouter = Router();

authRouter.post("/register", authRateLimiter, AuthController.register);
authRouter.post("/login", authRateLimiter, AuthController.login);
authRouter.post("/logout", AuthController.logout);
authRouter.post("/refresh-token", AuthController.refreshAccessToken);

// Protected Routes
authRouter.get("/me", verifyJWT, AuthController.getCurrentUser);
authRouter.post("/change-password", verifyJWT, AuthController.changePassword);
authRouter.post("/request-verification", verifyJWT, AuthController.requestVerificationEmail);

// Email Verification & Password Reset (Public)
authRouter.post("/verify-email", AuthController.verifyEmail);
authRouter.post("/forgot-password", AuthController.forgotPassword);
authRouter.post("/reset-password", AuthController.resetPassword);

// Google OAuth Routes
authRouter.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));

authRouter.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/login", session: false }),
    AuthController.googleAuthCallback
);

export default authRouter;
