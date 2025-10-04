import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { asyncHandler } from "../middleware/error.middleware";
import {
  validateRegister,
  validateLogin,
} from "../middleware/validation.middleware";
import { restrictToIP } from "../middleware/auth.middleware";

const router = Router();
const authController = new AuthController();
const adminIP = process.env.ADMIN_IP || "65.0.11.156";

router.post(
  "/register",
  validateRegister,
  asyncHandler(authController.register)
);
router.post("/login", validateLogin, asyncHandler(authController.login));
router.post(
  "/create-admin",
  restrictToIP(adminIP),
  validateRegister,
  asyncHandler(authController.createAdmin)
);

export default router;
