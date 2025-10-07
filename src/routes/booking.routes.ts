import { Router } from "express";
import { BookingController } from "../controllers/booking.controller";
import {
  authenticate,
  authenticateUser,
  authenticateAdmin,
} from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { validateBooking } from "../middleware/validation.middleware";

const router = Router();
const bookingController = new BookingController();

// Routes accessible by both users and admins
router.post(
  "/",
  authenticate,
  validateBooking,
  asyncHandler(bookingController.createBooking)
);

router.get("/", authenticate, asyncHandler(bookingController.getBookings));

router.get(
  "/:id",
  authenticate,
  asyncHandler(bookingController.getBookingById)
);

router.delete(
  "/:id",
  authenticate,
  asyncHandler(bookingController.cancelBooking)
);

// Admin-only routes
router.post(
  "/admin/create-for-user",
  authenticateAdmin,
  validateBooking,
  asyncHandler(bookingController.createBookingForUser)
);

router.patch(
  "/admin/:id/confirm",
  authenticateAdmin,
  asyncHandler(bookingController.confirmBooking)
);

router.patch(
  "/admin/:id/complete",
  authenticateAdmin,
  asyncHandler(bookingController.completeBooking)
);

export default router;
