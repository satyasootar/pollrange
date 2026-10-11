import { Router } from "express";
import * as BillingController from "./billing.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/me", verifyJWT, BillingController.getMyPlan);
router.post("/requests", verifyJWT, BillingController.createRequest);
router.get("/requests/me", verifyJWT, BillingController.myRequests);
router.delete("/requests/:requestId", verifyJWT, BillingController.cancelRequest);

export default router;
