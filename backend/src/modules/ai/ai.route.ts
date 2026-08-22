import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as AiController from "./ai.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

// LLM calls are expensive — cap chat turns per user/IP.
const chatLimiter = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false });

router.post("/chat", chatLimiter, AiController.chat);
router.get("/conversations", AiController.listConversations);
router.get("/conversations/:id", AiController.getConversation);
router.delete("/conversations/:id", AiController.deleteConversation);

export default router;
