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
} from "../middleware/auth.middleware";

const router = Router();
const authController = new AuthController();
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
  authenticateUser,
  validatePasswordChange,
  asyncHandler(authController.changeUserPassword)
);

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

export default router;
