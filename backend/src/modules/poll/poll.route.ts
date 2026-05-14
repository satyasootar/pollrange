import { Router } from "express";
import * as PollController from "./poll.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";

const router = Router();

// Authenticated Routes
router.use(verifyJWT);

router.post("/", PollController.createPoll);
router.get("/", PollController.getMyPolls);
router.get("/:pollId", PollController.getPollDetail);
router.patch("/:pollId", PollController.updatePoll);
router.delete("/:pollId", PollController.deletePoll);
router.post("/:pollId/publish", PollController.publishPoll);

export default router;
