import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { asyncHandler } from "../middleware/error.middleware";
import {
  validateRegister,
  validateLogin,
  validatePasswordChange,
} from "../middleware/validation.middleware";
import {
  restrictToIP,
  authenticateUser,
  authenticateAdmin,
  authenticate,
} from "../middleware/auth.middleware";
import { OTPController } from "../controllers/otp.controller";

const router = Router();
const authController = new AuthController();
const otpController = new OTPController();
const adminIP = process.env.ADMIN_IP || "65.0.11.156";

// User Routes
router.post(
  "/user/register",
  validateRegister,
  asyncHandler(authController.registerUser)
);

router.post(
  "/user/login",
  validateLogin,
  asyncHandler(authController.loginUser)
);

router.post(
  "/user/change-password",
  authenticate,
  validatePasswordChange,
  asyncHandler(authController.changeUserPassword)
);

router.post("/user/logout", authenticate, asyncHandler(authController.logout));

// Admin Routes
router.post(
  "/admin/register",
  restrictToIP(adminIP),
  validateRegister,
  asyncHandler(authController.registerAdmin)
);

router.post(
  "/admin/login",
  validateLogin,
  asyncHandler(authController.loginAdmin)
);

router.post(
  "/admin/change-password",
  authenticateAdmin,
  validatePasswordChange,
  asyncHandler(authController.changeAdminPassword)
);

router.post(
  "/admin/logout",
  authenticateAdmin,
  asyncHandler(authController.logout)
);

// Token Refresh Routes - separate for users and admins
router.post("/user/refresh-token", asyncHandler(authController.refreshUserToken));
router.post("/admin/refresh-token", asyncHandler(authController.refreshAdminToken));

// Backward compatible route (uses smart refresh token detection)
router.post("/refresh-token", asyncHandler(authController.generalRefreshToken));

// Session Management Routes (for both users and admins)
router.get("/sessions", authenticate, asyncHandler(authController.getSessions));

router.delete(
  "/sessions/:sessionId",
  authenticate,
  asyncHandler(authController.revokeSession)
);

router.delete(
  "/sessions/revoke/others",
  authenticate,
  asyncHandler(authController.revokeAllOtherSessions)
);

router.delete(
  "/sessions/revoke/all",
  authenticate,
  asyncHandler(authController.revokeAllSessions)
);




router.post("/user/verify-otp", asyncHandler(otpController.verifyOTP));
router.post("/user/resend-otp", asyncHandler(otpController.resendOTP));

export default router;
