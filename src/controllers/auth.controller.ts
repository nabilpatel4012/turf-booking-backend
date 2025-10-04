import { Response } from "express";
import { AuthService } from "../services/auth.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { UserRole } from "../entities/user.entity";
import { AppError } from "../middleware/error.middleware";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: AuthRequest, res: Response) => {
    const { email, password, name } = req.body;
    const result = await this.authService.register(email, password, name);
    res.status(201).json(result);
  };

  login = async (req: AuthRequest, res: Response) => {
    const { email, password } = req.body;
    const result = await this.authService.login(email, password);
    res.json(result);
  };

  createAdmin = async (req: AuthRequest, res: Response) => {
    const { email, password, name } = req.body;
    const result = await this.authService.register(
      email,
      password,
      name,
      UserRole.ADMIN
    );
    res.status(201).json({
      message: "Admin created successfully",
      user: result.user,
    });
  };
}
