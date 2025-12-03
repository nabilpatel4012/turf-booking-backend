import { Router } from "express";
import { BookingController } from "../controllers/booking.controller";
import {
  authenticate,
  authenticateUser,
  authenticateAdmin,
} from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { validateBooking } from "../middleware/validation.middleware";
import { validateApiKey } from "../middleware/api-key.middleware";

const router = Router();
const bookingController = new BookingController();

// Routes accessible by both users and admins
router.post(
  "/",
  authenticate,
  validateBooking,
  asyncHandler(bookingController.createBooking)
);

router.post(
  "/:id/verify-payment",
  authenticate,
  asyncHandler(bookingController.verifyPayment)
);

router.post(
  "/update-payment-status",
  validateApiKey,
  asyncHandler(bookingController.updatePaymentStatus)
);

router.get("/", authenticate, asyncHandler(bookingController.getBookings));

router.get(
  "/:id",
  authenticate,
  asyncHandler(bookingController.getBookingById)
);

router.get("/turf/:turfId", authenticate, bookingController.getBookingsByTurfId);
router.get("/verify-qr", authenticate, bookingController.verifyQR);

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

router.post(
  "/admin/create-by-phone",
  authenticateAdmin,
  // validateBooking, // We might need a specific validator for this, or update validateBooking
  asyncHandler(bookingController.createAdminBooking)
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
