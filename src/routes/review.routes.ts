import { Router } from "express";
import { ReviewController } from "../controllers/review.controller";
import { authenticate, authenticateAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { validateReview } from "../middleware/validation.middleware";

const router = Router();
const reviewController = new ReviewController();

router.get("/", asyncHandler(reviewController.getAllReviews));
router.post(
  "/",
  authenticate,
  validateReview,
  asyncHandler(reviewController.createReview)
);
router.get("/average", asyncHandler(reviewController.getAverageRating));
router.get(
  "/distribution",
  asyncHandler(reviewController.getRatingDistribution)
);

router.get(
  "/reports",
  authenticateAdmin,
  asyncHandler(reviewController.getReviewReports)
);

router.put(
  "/:id",
  authenticate,
  asyncHandler(reviewController.updateReview)
);

router.delete(
  "/:id",
  authenticate,
  asyncHandler(reviewController.deleteReview)
);

router.post(
  "/:id/report",
  authenticate,
  asyncHandler(reviewController.reportReview)
);

export default router;
