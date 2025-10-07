import { Router } from "express";
import { SettingController } from "../controllers/setting.controller";
import { asyncHandler } from "../middleware/error.middleware";
import { validateSetting } from "../middleware/validation.middleware";
import { authenticateAdmin } from "../middleware/auth.middleware";

const router = Router();
const settingController = new SettingController();

// Public routes - Get settings for a turf
router.get("/", asyncHandler(settingController.getSettings));
router.get("/detail", asyncHandler(settingController.getSetting));

// Admin routes
router.put(
  "/admin/update",
  authenticateAdmin,
  validateSetting,
  asyncHandler(settingController.updateSetting)
);

router.put(
  "/admin/booking-status",
  authenticateAdmin,
  asyncHandler(settingController.updateBookingStatus)
);

router.put(
  "/admin/bulk-update",
  authenticateAdmin,
  asyncHandler(settingController.bulkUpdateSettings)
);

router.post(
  "/admin/create-default",
  authenticateAdmin,
  asyncHandler(settingController.createDefaultSettings)
);

export default router;
