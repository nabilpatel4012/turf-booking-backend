import { Router } from "express";
import { TurfController } from "../controllers/turf.controller";
import { asyncHandler } from "../middleware/error.middleware";
import { validateTurf } from "../middleware/validation.middleware";
import {
  authenticate,
  authenticateUser,
  authenticateAdmin,
} from "../middleware/auth.middleware";

const router = Router();
const turfController = new TurfController();

// Public routes (accessible by both users and guests)
router.get("/", asyncHandler(turfController.getAllTurfs));
router.get("/:id", asyncHandler(turfController.getTurfById));

// Admin routes - Turf management
router.get(
  "/admin/my-turfs",
  authenticateAdmin,
  asyncHandler(turfController.getMyTurfs)
);

router.post(
  "/admin/create",
  authenticateAdmin,
  validateTurf,
  asyncHandler(turfController.createTurf)
);

router.put(
  "/admin/:id",
  authenticateAdmin,
  asyncHandler(turfController.updateTurf)
);

router.delete(
  "/admin/:id",
  authenticateAdmin,
  asyncHandler(turfController.deleteTurf)
);

router.delete(
  "/admin/:id/hard",
  authenticateAdmin,
  asyncHandler(turfController.hardDeleteTurf)
);

router.patch(
  "/admin/:id/status",
  authenticateAdmin,
  asyncHandler(turfController.updateTurfStatus)
);

export default router;
