import { Router } from "express";
import { UploadController } from "../controllers/upload.controller";
import { authenticateAdmin } from "../middleware/auth.middleware";

const router = Router();
const uploadController = new UploadController();

// Single file upload
router.post(
  "/upload",
  authenticateAdmin,
  uploadController.uploadMiddleware,
  uploadController.uploadImage
);

// Multiple file upload
router.post(
    "/upload-multiple",
    authenticateAdmin,
    uploadController.uploadMiddlewareMultiple,
    uploadController.uploadMultipleImages
);

export default router;
