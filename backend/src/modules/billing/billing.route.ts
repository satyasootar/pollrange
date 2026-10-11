import { Router } from "express";
import * as BillingController from "./billing.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/me", verifyJWT, BillingController.getMyPlan);

export default router;
