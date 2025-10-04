import { Response } from "express";
import { AuthService } from "../services/auth.service";
import { AuthRequest } from "../middleware/auth.middleware";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // User Registration
  registerUser = async (req: AuthRequest, res: Response) => {
    const { email, password, name, phone } = req.body;
    const result = await this.authService.registerUser(
      email,
      password,
      name,
      phone
    );
    res.status(201).json(result);
  };

  // User Login
  loginUser = async (req: AuthRequest, res: Response) => {
    const { email, password } = req.body;
    const result = await this.authService.loginUser(email, password);
    res.json(result);
  };

  // Admin Registration (Protected - only from specific IP)
  registerAdmin = async (req: AuthRequest, res: Response) => {
    const { email, password, name, phone } = req.body;
    const result = await this.authService.registerAdmin(
      email,
      password,
      name,
      phone
    );
    res.status(201).json({
      message: "Admin created successfully",
      admin: result.admin,
      token: result.token,
    });
  };

  // Admin Login
  loginAdmin = async (req: AuthRequest, res: Response) => {
    const { email, password } = req.body;
    const result = await this.authService.loginAdmin(email, password);
    res.json(result);
  };

  // Change User Password
  changeUserPassword = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { oldPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await this.authService.changeUserPassword(
      userId,
      oldPassword,
      newPassword
    );
    res.json(result);
  };

  // Change Admin Password
  changeAdminPassword = async (req: AuthRequest, res: Response) => {
    const adminId = req.user?.id;
    const { oldPassword, newPassword } = req.body;

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await this.authService.changeAdminPassword(
      adminId,
      oldPassword,
      newPassword
    );
    res.json(result);
  };
}
