import { Router } from "express";
import * as AdminController from "./admin.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { requireAdmin } from "../../middlewares/admin.middleware.js";

const router = Router();

// Every admin route: authenticated AND on the ADMIN_EMAILS allowlist.
router.use(verifyJWT, requireAdmin);

router.get("/overview", AdminController.getOverview);
router.get("/users", AdminController.listUsers);
router.get("/users/:userId", AdminController.getUser);
router.patch("/users/:userId/plan", AdminController.setUserPlan);
router.get("/plan-requests", AdminController.listPlanRequests);
router.post("/plan-requests/:requestId/approve", AdminController.approvePlanRequest);
router.post("/plan-requests/:requestId/reject", AdminController.rejectPlanRequest);
router.get("/traffic", AdminController.getTraffic);
router.get("/site-analytics", AdminController.getSiteAnalytics);
router.get("/consent", AdminController.getConsent);
router.get("/system", AdminController.getSystem);
router.get("/storage", AdminController.getStorage);
router.post("/cleanup/forms/preview", AdminController.previewFormCleanup);
router.post("/cleanup/forms", AdminController.executeFormCleanup);
router.get("/audit", AdminController.getAudit);

export default router;
