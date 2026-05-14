import { Router } from "express";
import * as AuthController from "./auth.controller.js";

const authRouter = Router();

authRouter.post("/register", AuthController.register);
authRouter.post("/login", AuthController.login);
authRouter.post("/logout", AuthController.logout);
authRouter.post("/change-password", AuthController.changePassword);

export default authRouter;
