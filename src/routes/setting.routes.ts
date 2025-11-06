import { Router } from "express";
import { SettingController } from "../controllers/setting.controller";
import { asyncHandler } from "../middleware/error.middleware";
import { authenticateAdmin } from "../middleware/auth.middleware";

const router = Router();
const settingController = new SettingController();

router.get("/turf", asyncHandler(settingController.getTurfSettings));

router.get(
  "/turf/booking-allowed",
  asyncHandler(settingController.checkBookingAllowed)
);

router.put(
  "/turf/update",
  authenticateAdmin,
  asyncHandler(settingController.updateTurfSettings)
);

router.put(
  "/turf/toggle-booking",
  authenticateAdmin,
  asyncHandler(settingController.toggleBookingStatus)
);

router.put(
  "/turf/toggle-maintenance",
  authenticateAdmin,
  asyncHandler(settingController.toggleMaintenanceMode)
);

router.get(
  "/owner",
  authenticateAdmin,
  asyncHandler(settingController.getOwnerSettings)
);

router.put(
  "/owner/update",
  authenticateAdmin,
  asyncHandler(settingController.updateOwnerSettings)
);

router.post(
  "/owner/2fa/enable",
  authenticateAdmin,
  asyncHandler(settingController.enable2FA)
);

router.post(
  "/owner/2fa/disable",
  authenticateAdmin,
  asyncHandler(settingController.disable2FA)
);

router.put(
  "/owner/notifications",
  authenticateAdmin,
  asyncHandler(settingController.updateNotificationPreferences)
);

router.get(
  "/owner/notification-channels",
  authenticateAdmin,
  asyncHandler(settingController.getNotificationChannels)
);

export default router;
