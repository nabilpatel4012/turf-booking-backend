import { Router } from "express";
import { PricingController } from "../controllers/pricing.controller";
import { asyncHandler } from "../middleware/error.middleware";
import { validatePricing } from "../middleware/validation.middleware";
import { authenticateAdmin } from "../middleware/auth.middleware";

const router = Router();
const pricingController = new PricingController();

// Public route - Get pricing for a turf
router.get("/", asyncHandler(pricingController.getPricing));

// Admin routes
router.put(
  "/admin/update",
  authenticateAdmin,
  validatePricing,
  asyncHandler(pricingController.updatePricing)
);

router.post(
  "/admin/create-default",
  authenticateAdmin,
  asyncHandler(pricingController.createDefaultPricing)
);

export default router;
