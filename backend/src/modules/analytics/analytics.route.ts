import { Router } from "express";
import * as AnalyticsController from "./analytics.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";

const router = Router();

// Analytics are generally protected as they belong to the poll creator
router.get("/:pollId/wordcloud/:questionId", verifyJWT, AnalyticsController.getWordCloud);
router.get("/:pollId/snapshot", verifyJWT, AnalyticsController.getSnapshot);

export default router;
