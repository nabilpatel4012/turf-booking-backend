import { Router } from "express";
import { PricingController } from "../controllers/pricing.controller";
import { AnnouncementController } from "../controllers/announcement.controller";
import { SettingController } from "../controllers/setting.controller";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();
const pricingController = new PricingController();
const announcementController = new AnnouncementController();
const settingController = new SettingController();

router.get("/pricing", asyncHandler(pricingController.getPricing));
router.get(
  "/announcements",
  asyncHandler(announcementController.getAnnouncements)
);
router.get("/settings", asyncHandler(settingController.getSettings));

export default router;
