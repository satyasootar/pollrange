import { Router } from "express";
import * as SiteAnalyticsController from "./site-analytics.controller.js";
import { createRateLimiter } from "../../middlewares/rateLimit.middleware.js";

const router = Router();
// Generous: a busy visitor sends a batch per navigation, but bursts beyond this are abuse.
const limiter = createRateLimiter(60 * 1000, 120, "Too many analytics requests.");

router.post("/consent", limiter, SiteAnalyticsController.recordConsent);
router.post("/events", limiter, SiteAnalyticsController.track);

export default router;
