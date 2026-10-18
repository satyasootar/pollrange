import { Router } from "express";
import * as FormController from "./form.controller.js";

const router = Router();

// Unauthenticated public routes (optionalAuth is applied at mount time)
router.get("/:shareToken", FormController.getPublicForm);
router.get("/:shareToken/status", FormController.getFormStatus);
router.get("/:shareToken/results", FormController.getPublicResults);

export default router;
