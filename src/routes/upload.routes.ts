import { Router } from "express";
import { UploadController } from "../controllers/upload.controller";
import { authenticateAdmin } from "../middleware/auth.middleware";

const router = Router();
const uploadController = new UploadController();

// Single file upload (Generic)
router.post(
  "/upload",
  authenticateAdmin,
  uploadController.uploadMiddleware,
  uploadController.uploadImage
);

// Multiple file upload (Generic)
router.post(
    "/upload-multiple",
    authenticateAdmin,
    uploadController.uploadMiddlewareMultiple,
    uploadController.uploadMultipleImages
);

// Venue specific upload
router.post(
  "/venues/:venueId/upload",
  authenticateAdmin,
  uploadController.uploadMiddleware,
  uploadController.uploadVenueImage
);

export default router;
