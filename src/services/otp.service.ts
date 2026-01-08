import { Repository, LessThan } from "typeorm";
import { OTPToken } from "../entities/otp.entity";
import { AppDataSource } from "../db/data.source";
import { EmailService } from "./email.service";
import { AppError } from "../middleware/error.middleware";
import * as crypto from "crypto";

export class OTPService {
  private otpRepository: Repository<OTPToken>;
  private emailService: EmailService;
  private readonly OTP_EXPIRY_MINUTES = 10;

  constructor() {
    this.otpRepository = AppDataSource.getRepository(OTPToken);
    this.emailService = new EmailService();
  }

  /**
   * Generate a 6-digit OTP
   */
  private generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Create and send OTP for email verification
   */
  async sendOTP(email: string, userName: string): Promise<boolean> {
    // Invalidate any existing OTPs for this email
    await this.otpRepository.update(
      { email, isUsed: false },
      { isUsed: true }
    );

    // Generate new OTP
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save OTP to database
    const otpToken = this.otpRepository.create({
      email,
      otp,
      expiresAt,
      isUsed: false,
    });
    await this.otpRepository.save(otpToken);

    // Send OTP email
    const sent = await this.emailService.sendOTPEmail({
      userName,
      userEmail: email,
      otp,
      expiryMinutes: this.OTP_EXPIRY_MINUTES,
    });

    if (!sent) {
      throw new AppError("Failed to send verification email", 500);
    }

    return true;
  }

  /**
   * Verify OTP for email
   */
  async verifyOTP(email: string, otp: string): Promise<boolean> {
    const otpToken = await this.otpRepository.findOne({
      where: {
        email,
        otp,
        isUsed: false,
      },
      order: { createdAt: "DESC" },
    });

    if (!otpToken) {
      throw new AppError("Invalid verification code", 400);
    }

    if (otpToken.expiresAt < new Date()) {
      throw new AppError("Verification code has expired", 400);
    }

    // Mark OTP as used
    otpToken.isUsed = true;
    await this.otpRepository.save(otpToken);

    return true;
  }

  /**
   * Check if OTP exists and is valid (without consuming it)
   */
  async checkOTPExists(email: string): Promise<boolean> {
    const otpToken = await this.otpRepository.findOne({
      where: {
        email,
        isUsed: false,
      },
      order: { createdAt: "DESC" },
    });

    return !!otpToken && otpToken.expiresAt > new Date();
  }

  /**
   * Clean up expired OTPs (can be called by a cron job)
   */
  async cleanupExpiredOTPs(): Promise<number> {
    const result = await this.otpRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }

  /**
   * Get remaining time for OTP in seconds
   */
  async getRemainingTime(email: string): Promise<number> {
    const otpToken = await this.otpRepository.findOne({
      where: {
        email,
        isUsed: false,
      },
      order: { createdAt: "DESC" },
    });

    if (!otpToken || otpToken.expiresAt < new Date()) {
      return 0;
    }

    return Math.floor((otpToken.expiresAt.getTime() - Date.now()) / 1000);
  }
}
