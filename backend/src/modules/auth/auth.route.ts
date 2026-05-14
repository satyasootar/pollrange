import { Router } from "express";
import * as AuthController from "./auth.controller.js";

const authRouter = Router();

authRouter.post("/register", AuthController.register);
authRouter.post("/login", AuthController.login);
authRouter.post("/logout", AuthController.logout);
authRouter.post("/change-password", AuthController.changePassword);

// Email Verification & Password Reset
authRouter.post("/verify-email", AuthController.verifyEmail);
authRouter.post("/forgot-password", AuthController.forgotPassword);
authRouter.post("/reset-password", AuthController.resetPassword);
authRouter.post("/request-verification", AuthController.requestVerificationEmail);

export default authRouter;
