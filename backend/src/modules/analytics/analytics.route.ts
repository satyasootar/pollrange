import { Router } from "express";
import * as AnalyticsController from "./analytics.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";

const router = Router();

// Analytics are generally protected as they belong to the poll creator
router.get("/:pollId/wordcloud/:questionId", verifyJWT, AnalyticsController.getWordCloud);
router.get("/:pollId/snapshot", verifyJWT, AnalyticsController.getSnapshot);
router.get("/:pollId/full", verifyJWT, AnalyticsController.getFullAnalytics);
router.get("/:pollId/summary", verifyJWT, AnalyticsController.getSummary);
router.get("/:pollId/timeline", verifyJWT, AnalyticsController.getTimeline);
router.get("/:pollId/export", verifyJWT, AnalyticsController.exportData);

export default router;
