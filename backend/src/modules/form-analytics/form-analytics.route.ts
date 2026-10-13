import { Router } from "express";
import * as FormAnalyticsController from "./form-analytics.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/:formId/summary", verifyJWT, FormAnalyticsController.getSummary);
router.get("/:formId/timeline", verifyJWT, FormAnalyticsController.getTimeline);
router.get("/:formId/questions", verifyJWT, FormAnalyticsController.getQuestions);
router.get("/:formId/responses", verifyJWT, FormAnalyticsController.getResponses);
router.post("/:formId/responses/:responseId/receipt", verifyJWT, FormAnalyticsController.resendReceipt);
router.get("/:formId/export", verifyJWT, FormAnalyticsController.exportData);

export default router;
