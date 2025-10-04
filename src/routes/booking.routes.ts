import { Router } from "express";
import { BookingController } from "../controllers/booking.controller";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { validateBooking } from "../middleware/validation.middleware";

const router = Router();
const bookingController = new BookingController();

router.post(
  "/",
  authenticate,
  validateBooking,
  asyncHandler(bookingController.createBooking)
);
router.get("/", authenticate, asyncHandler(bookingController.getBookings));
router.delete(
  "/:id",
  authenticate,
  asyncHandler(bookingController.cancelBooking)
);

// Admin routes
router.post(
  "/admin",
  authenticate,
  isAdmin,
  validateBooking,
  asyncHandler(bookingController.createAdminBooking)
);

export default router;
