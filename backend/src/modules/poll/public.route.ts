import { Router } from "express";
import * as PollController from "./poll.controller.js";

const router = Router();

// Unauthenticated Public Routes
router.get("/:shareToken", PollController.getPublicPoll);

export default router;
