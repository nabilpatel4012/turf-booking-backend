import { Router } from "express";
import { PricingController } from "../controllers/pricing.controller";
import { AnnouncementController } from "../controllers/announcement.controller";
import { SettingController } from "../controllers/setting.controller";
import { StatsController } from "../controllers/stats.controller";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { validateAnnouncement } from "../middleware/validation.middleware";

const router = Router();
const pricingController = new PricingController();
const announcementController = new AnnouncementController();
const settingController = new SettingController();
const statsController = new StatsController();

// All admin routes require authentication and admin role
router.use(authenticate, isAdmin);

// Pricing
router.put("/pricing", asyncHandler(pricingController.updatePricing));

// Announcements
router.post(
  "/announcements",
  validateAnnouncement,
  asyncHandler(announcementController.createAnnouncement)
);
router.delete(
  "/announcements/:id",
  asyncHandler(announcementController.deleteAnnouncement)
);

// Settings
router.put(
  "/settings/disable-bookings",
  asyncHandler(settingController.updateBookingStatus)
);

// Stats
router.get("/stats", asyncHandler(statsController.getAdminStats));

export default router;
