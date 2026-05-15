import { Router } from "express";
import * as PollController from "./poll.controller.js";

const router = Router();

// Unauthenticated Public Routes
router.get("/:shareToken", PollController.getPublicPoll);
router.get("/:shareToken/results", PollController.getPublicResults);
router.get("/:shareToken/status", PollController.getPollStatus);

export default router;
