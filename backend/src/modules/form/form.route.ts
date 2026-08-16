import { Router } from "express";
import * as FormController from "./form.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { uploadImage, requireCloudinary } from "../../middlewares/upload.middleware.js";

const router = Router();

router.use(verifyJWT);

router.post("/", FormController.createForm);
router.get("/", FormController.getMyForms);
router.get("/:formId", FormController.getFormDetail);
router.patch("/:formId", FormController.updateForm);
router.delete("/:formId", FormController.deleteForm);
router.post("/:formId/duplicate", FormController.duplicateForm);
router.patch("/:formId/close", FormController.closeForm);
router.patch("/:formId/reopen", FormController.reopenForm);
router.post("/:formId/publish", FormController.publishForm);
router.post("/:formId/regenerate-token", FormController.regenerateToken);
// Image upload returns a Cloudinary URL only (never touches a form doc), so it
// needs no formId — this lets the create flow set a cover before the form exists.
router.post("/upload", requireCloudinary, uploadImage, FormController.uploadImage);

export default router;
