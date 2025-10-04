import { Router } from "express";
import { ReviewController } from "../controllers/review.controller";
import { authenticate } from "../middleware/auth.middleware";
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

export default router;
