import { Router } from "express";
import * as DashboardController from "./dashboard.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/overview", verifyJWT, DashboardController.getOverview);

export default router;
