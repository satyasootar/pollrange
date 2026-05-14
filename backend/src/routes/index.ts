import { Router } from "express";
import authRouter from "../modules/auth/auth.route.js";

const rootRouter = Router();

// Register all module routers here
rootRouter.use("/auth", authRouter);

export default rootRouter;
