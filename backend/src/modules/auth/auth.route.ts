import { Router } from "express";
import * as AuthController from "./auth.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";

const authRouter = Router();

authRouter.post("/register", AuthController.register);
authRouter.post("/login", AuthController.login);
authRouter.post("/logout", AuthController.logout);

// Protected Routes
authRouter.get("/me", verifyJWT, AuthController.getCurrentUser);
authRouter.post("/change-password", verifyJWT, AuthController.changePassword);
authRouter.post("/request-verification", verifyJWT, AuthController.requestVerificationEmail);

// Email Verification & Password Reset (Public)
authRouter.post("/verify-email", AuthController.verifyEmail);
authRouter.post("/forgot-password", AuthController.forgotPassword);
authRouter.post("/reset-password", AuthController.resetPassword);

export default authRouter;
