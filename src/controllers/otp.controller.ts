import { Response } from "express";
import { OTPService } from "../services/otp.service";
import { AuthService } from "../services/auth.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { AppDataSource } from "../db/data.source";
import { User } from "../entities/user.entity";
import { SessionService, DeviceInfo } from "../services/session.service";

const otpService = new OTPService();
const authService = new AuthService();
const userRepository = AppDataSource.getRepository(User);
const sessionService = new SessionService();

export class OTPController {
  /**
   * Verify OTP and complete registration
   */
  verifyOTP = async (req: AuthRequest, res: Response) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    try {
      // Verify the OTP
      await otpService.verifyOTP(email, otp);

      // Update user as verified
      const user = await userRepository.findOne({ where: { email } });
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      user.isVerified = true;
      await userRepository.save(user);

      // Get device info for session creation
      const deviceInfo: DeviceInfo = {
        userAgent: req.headers["user-agent"] || "Unknown",
        ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip || "Unknown",
        deviceName: "Web Browser",
        deviceType: "web",
      };

      // Create session and return tokens
      const session = await sessionService.createSession(user.id, null, deviceInfo);
      const accessToken = authService["generateAccessToken"](
        user.id,
        "user" as any,
        session.id
      );

      // Set access token in cookie
      res.cookie("access_token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken: session.refreshToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: "user",
          },
        },
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Verification failed",
      });
    }
  };

  /**
   * Resend OTP
   */
  resendOTP = async (req: AuthRequest, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      const user = await userRepository.findOne({ where: { email } });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.isVerified) {
        return res.status(400).json({ error: "User is already verified" });
      }

      await otpService.sendOTP(email, user.name);

      res.json({
        success: true,
        message: "Verification code sent to your email",
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to send OTP",
      });
    }
  };
}
