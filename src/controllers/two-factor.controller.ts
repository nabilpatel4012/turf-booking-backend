import { Response } from "express";
import { TwoFactorService } from "../services/two-factor.service";
import { OwnerSettingService } from "../services/owner-setting.service";
import { AuthService } from "../services/auth.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { AppError } from "../middleware/error.middleware";
import { Repository } from "typeorm";
import { Admin } from "../entities/admin.entity";
import { User } from "../entities/user.entity";
import { AppDataSource } from "../db/data.source";
import bcrypt from "bcryptjs";

export class TwoFactorController {
  private twoFactorService: TwoFactorService;
  private ownerSettingService: OwnerSettingService;
  private authService: AuthService;
  private adminRepository: Repository<Admin>;
  private userRepository: Repository<User>;

  constructor() {
    this.twoFactorService = new TwoFactorService();
    this.ownerSettingService = new OwnerSettingService();
    this.authService = new AuthService();
    this.adminRepository = AppDataSource.getRepository(Admin);
    this.userRepository = AppDataSource.getRepository(User);
  }

  // Step 1: Setup 2FA - Generate QR code and backup codes
  setup2FA = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role;

    // Get user email based on role
    let userEmail: string;
    if (role === "admin") {
      const admin = await this.adminRepository.findOne({
        where: { id: userId },
      });
      if (!admin) {
        throw new AppError("Admin not found", 404);
      }
      userEmail = admin.email;
    } else {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      if (!user) {
        throw new AppError("User not found", 404);
      }
      userEmail = user.email;
    }

    const result = await this.twoFactorService.setup2FA(
      userId,
      userEmail,
      "TurfBooking"
    );

    res.json({
      success: true,
      message:
        "2FA setup initiated. Please scan the QR code with your authenticator app.",
      data: {
        qrCodeUrl: result.qrCodeUrl,
        manualEntryKey: result.secret,
        backupCodes: result.backupCodes,
      },
    });
  };

  // Step 2: Verify and enable 2FA
  verify2FA = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Verification token is required" });
    }

    await this.twoFactorService.verify2FA(userId, token);

    // Update owner settings only for admin users
    if (role === "admin") {
      await this.ownerSettingService.enable2FA(userId, "authenticator");
    }

    res.json({
      success: true,
      message:
        "2FA enabled successfully. Save your backup codes in a safe place!",
    });
  };

  // Disable 2FA
  disable2FA = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { password } = req.body;

    if (!password) {
      return res
        .status(400)
        .json({ error: "Password is required to disable 2FA" });
    }

    // Verify password based on role
    let isPasswordValid = false;
    if (role === "admin") {
      const admin = await this.adminRepository
        .createQueryBuilder("admin")
        .where("admin.id = :userId", { userId })
        .addSelect("admin.password")
        .getOne();

      if (!admin) {
        throw new AppError("Admin not found", 404);
      }

      isPasswordValid = await bcrypt.compare(password, admin.password);
    } else {
      const user = await this.userRepository
        .createQueryBuilder("user")
        .where("user.id = :userId", { userId })
        .addSelect("user.password")
        .getOne();

      if (!user) {
        throw new AppError("User not found", 404);
      }

      isPasswordValid = await bcrypt.compare(password, user.password);
    }

    if (!isPasswordValid) {
      throw new AppError("Invalid password", 401);
    }

    await this.twoFactorService.disable2FA(userId, password);

    // Update owner settings only for admin users
    if (role === "admin") {
      await this.ownerSettingService.disable2FA(userId);
    }

    res.json({
      success: true,
      message: "2FA disabled successfully",
    });
  };

  // Validate 2FA token (used during login)
  validate2FA = async (req: AuthRequest, res: Response) => {
    const { userId, token, useBackupCode, sessionId, deviceInfo } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: "User ID and token are required" });
    }

    let isValid = false;

    if (useBackupCode) {
      isValid = await this.twoFactorService.validateBackupCode(userId, token);
    } else {
      isValid = await this.twoFactorService.validateToken(userId, token);
    }

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: useBackupCode
          ? "Invalid backup code"
          : "Invalid verification code",
      });
    }

    // Check if this is admin or user
    const admin = await this.adminRepository.findOne({
      where: { id: userId, isActive: true },
    });

    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!admin && !user) {
      throw new AppError("User not found or inactive", 404);
    }

    // Validate the sessionId from temporary token
    const sessionService = this.authService.getSessionService();
    const session = await sessionService.getSessionById(sessionId);

    if (!session) {
      throw new AppError("Invalid session", 401);
    }

    // Update session to mark as fully authenticated
    await sessionService.updateLastUsed(sessionId);

    // Generate new access token (fully authenticated, no temp2FA flag)
    const accessToken = this.generateFullAccessToken(
      userId,
      admin ? "admin" : "user",
      sessionId
    );

    res.json({
      success: true,
      message: "2FA validation successful",
      data: {
        accessToken,
        refreshToken: session.refreshToken,
        ...(admin
          ? {
              admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                phone: admin.phone,
                role: "admin",
              },
            }
          : {
              user: {
                id: user!.id,
                email: user!.email,
                name: user!.name,
                phone: user!.phone,
                role: "user",
              },
            }),
      },
    });
  };

  // Generate full access token after 2FA validation
  private generateFullAccessToken(
    userId: string,
    role: string,
    sessionId: string
  ): string {
    const jwt = require("jsonwebtoken");
    const jwtSecret =
      process.env.JWT_SECRET || "your-secret-key-change-in-production";

    return jwt.sign(
      {
        id: userId,
        role,
        sessionId,
        // No temp2FA flag - this is a fully authenticated token
      },
      jwtSecret,
      { expiresIn: "15m" }
    );
  }

  // Get 2FA status
  get2FAStatus = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const status = await this.twoFactorService.get2FAStatus(userId);

    res.json({
      success: true,
      data: status,
    });
  };

  // Regenerate backup codes
  regenerateBackupCodes = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: "Password is required to regenerate backup codes",
      });
    }

    // Verify password based on role
    let isPasswordValid = false;
    if (role === "admin") {
      const admin = await this.adminRepository
        .createQueryBuilder("admin")
        .where("admin.id = :userId", { userId })
        .addSelect("admin.password")
        .getOne();

      if (!admin) {
        throw new AppError("Admin not found", 404);
      }

      isPasswordValid = await bcrypt.compare(password, admin.password);
    } else {
      const user = await this.userRepository
        .createQueryBuilder("user")
        .where("user.id = :userId", { userId })
        .addSelect("user.password")
        .getOne();

      if (!user) {
        throw new AppError("User not found", 404);
      }

      isPasswordValid = await bcrypt.compare(password, user.password);
    }

    if (!isPasswordValid) {
      throw new AppError("Invalid password", 401);
    }

    const backupCodes = await this.twoFactorService.regenerateBackupCodes(
      userId
    );

    res.json({
      success: true,
      message:
        "Backup codes regenerated successfully. Save them in a safe place!",
      data: {
        backupCodes,
      },
    });
  };
}
