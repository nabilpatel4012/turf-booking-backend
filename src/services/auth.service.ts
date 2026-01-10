import { Repository } from "typeorm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../entities/user.entity";
import { Admin } from "../entities/admin.entity";
import { AppDataSource } from "../db/data.source";
import { SessionService, DeviceInfo } from "./session.service";
import { Session } from "../entities/session.entity";
import { OTPService } from "./otp.service";
import { AppError } from "../middleware/error.middleware";
import { ErrorCode, ErrorMessages, ErrorStatusCodes } from "../utils/error-codes";

export enum AuthRole {
  USER = "user",
  ADMIN = "admin",
}

interface TokenPayload {
  id: string;
  role: AuthRole;
  sessionId?: string;
}

interface AuthResponse {
  accessToken?: string;
  refreshToken: string;
  user?: any;
  admin?: any;
}

export class AuthService {
  private userRepository: Repository<User>;
  private adminRepository: Repository<Admin>;
  private sessionService: SessionService;
  private readonly jwtSecret: string;
  private readonly bcryptRounds: number;
  private readonly accessTokenExpiry = "15m"; // Short-lived access token
  private readonly refreshTokenExpiry = "30d";

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.adminRepository = AppDataSource.getRepository(Admin);
    this.sessionService = new SessionService();
    this.jwtSecret =
      process.env.JWT_SECRET || "your-secret-key-change-in-production";
    this.bcryptRounds = 10;
  }

  // User Registration with session
  async registerUser(
    email: string,
    password: string,
    name: string,
    deviceInfo: DeviceInfo,
    phone?: string
  ): Promise<{ message: string; email: string }> {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      // If user exists but not verified, resend OTP
      if (!existingUser.isVerified) {
        const otpService = new OTPService();
        await otpService.sendOTP(email, existingUser.name);
        return {
          message: "Verification code sent to your email",
          email,
        };
      }
      throw new AppError(ErrorMessages[ErrorCode.AUTH_USER_EXISTS], ErrorStatusCodes[ErrorCode.AUTH_USER_EXISTS], ErrorCode.AUTH_USER_EXISTS);
    }

    const hashedPassword = await bcrypt.hash(password, this.bcryptRounds);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      phone,
      isVerified: false,
    });

    await this.userRepository.save(user);

    // Send OTP for verification
    const otpService = new OTPService();
    await otpService.sendOTP(email, name);

    return {
      message: "Verification code sent to your email",
      email,
    };
  }

  // User Login with session
  async loginUser(
    email: string,
    password: string,
    deviceInfo: DeviceInfo
  ): Promise<AuthResponse> {
    const user = await this.userRepository
      .createQueryBuilder("user")
      .where("user.email = :email", { email })
      .addSelect("user.password")
      .getOne();

    if (!user) {
      throw new AppError(ErrorMessages[ErrorCode.AUTH_INVALID_CREDENTIALS], ErrorStatusCodes[ErrorCode.AUTH_INVALID_CREDENTIALS], ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      throw new AppError(ErrorMessages[ErrorCode.AUTH_ACCOUNT_DEACTIVATED], ErrorStatusCodes[ErrorCode.AUTH_ACCOUNT_DEACTIVATED], ErrorCode.AUTH_ACCOUNT_DEACTIVATED);
    }

    if (!user.isVerified) {
      // Resend OTP if not verified
      const otpService = new OTPService();
      await otpService.sendOTP(email, user.name);
      throw new AppError(ErrorMessages[ErrorCode.AUTH_EMAIL_NOT_VERIFIED], ErrorStatusCodes[ErrorCode.AUTH_EMAIL_NOT_VERIFIED], ErrorCode.AUTH_EMAIL_NOT_VERIFIED);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new AppError(ErrorMessages[ErrorCode.AUTH_INVALID_CREDENTIALS], ErrorStatusCodes[ErrorCode.AUTH_INVALID_CREDENTIALS], ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    // Create new session
    const session = await this.sessionService.createSession(
      user.id,
      null,
      deviceInfo
    );

    const accessToken = this.generateAccessToken(
      user.id,
      AuthRole.USER,
      session.id
    );

    return {
      accessToken,
      refreshToken: session.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: AuthRole.USER,
      },
    };
  }

  // Admin Registration with session
  async registerAdmin(
    email: string,
    password: string,
    name: string,
    deviceInfo: DeviceInfo,
    phone?: string
  ): Promise<AuthResponse> {
    const existingAdmin = await this.adminRepository.findOne({
      where: { email },
    });

    if (existingAdmin) {
      throw new AppError(ErrorMessages[ErrorCode.AUTH_ADMIN_EXISTS], ErrorStatusCodes[ErrorCode.AUTH_ADMIN_EXISTS], ErrorCode.AUTH_ADMIN_EXISTS);
    }

    const hashedPassword = await bcrypt.hash(password, this.bcryptRounds);

    const admin = this.adminRepository.create({
      email,
      password: hashedPassword,
      name,
      phone,
    });

    await this.adminRepository.save(admin);

    // Create session
    const session = await this.sessionService.createSession(
      null,
      admin.id,
      deviceInfo
    );

    const accessToken = this.generateAccessToken(
      admin.id,
      AuthRole.ADMIN,
      session.id
    );

    return {
      accessToken,
      refreshToken: session.refreshToken,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        phone: admin.phone,
        role: AuthRole.ADMIN,
      },
    };
  }

  // Admin Login with session
  async loginAdmin(
    email: string,
    password: string,
    deviceInfo: DeviceInfo
  ): Promise<AuthResponse> {
    const admin = await this.adminRepository
      .createQueryBuilder("admin")
      .where("admin.email = :email", { email })
      .addSelect("admin.password")
      .getOne();

    if (!admin) {
      throw new AppError(ErrorMessages[ErrorCode.AUTH_INVALID_CREDENTIALS], ErrorStatusCodes[ErrorCode.AUTH_INVALID_CREDENTIALS], ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    if (!admin.isActive) {
      throw new AppError(ErrorMessages[ErrorCode.AUTH_ACCOUNT_DEACTIVATED], ErrorStatusCodes[ErrorCode.AUTH_ACCOUNT_DEACTIVATED], ErrorCode.AUTH_ACCOUNT_DEACTIVATED);
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      throw new AppError(ErrorMessages[ErrorCode.AUTH_INVALID_CREDENTIALS], ErrorStatusCodes[ErrorCode.AUTH_INVALID_CREDENTIALS], ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    // Create new session
    const session = await this.sessionService.createSession(
      null,
      admin.id,
      deviceInfo
    );

    const accessToken = this.generateAccessToken(
      admin.id,
      AuthRole.ADMIN,
      session.id
    );

    return {
      accessToken,
      refreshToken: session.refreshToken,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        phone: admin.phone,
        role: AuthRole.ADMIN,
      },
    };
  }

  // Refresh access token using refresh token
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    user?: any;
    admin?: any;
  }> {
    const session = await this.sessionService.findByRefreshToken(refreshToken);

    if (!session) {
      throw new AppError(ErrorMessages[ErrorCode.AUTH_INVALID_REFRESH_TOKEN], ErrorStatusCodes[ErrorCode.AUTH_INVALID_REFRESH_TOKEN], ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
    }

    if (new Date() > session.expiresAt) {
      throw new AppError(ErrorMessages[ErrorCode.AUTH_REFRESH_TOKEN_EXPIRED], ErrorStatusCodes[ErrorCode.AUTH_REFRESH_TOKEN_EXPIRED], ErrorCode.AUTH_REFRESH_TOKEN_EXPIRED);
    }

    // Update last used time
    await this.sessionService.updateLastUsed(session.id);

    let userData = null;
    let role: AuthRole;

    if (session.userId) {
      const user = await this.userRepository.findOne({
        where: { id: session.userId, isActive: true },
      });

      if (!user) {
        throw new AppError("User not found or inactive", ErrorStatusCodes[ErrorCode.NOT_USER], ErrorCode.NOT_USER);
      }

      userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: AuthRole.USER,
      };
      role = AuthRole.USER;
    } else if (session.adminId) {
      const admin = await this.adminRepository.findOne({
        where: { id: session.adminId, isActive: true },
      });

      if (!admin) {
        throw new AppError("Admin not found or inactive", ErrorStatusCodes[ErrorCode.NOT_ADMIN], ErrorCode.NOT_ADMIN);
      }

      userData = {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        phone: admin.phone,
        role: AuthRole.ADMIN,
      };
      role = AuthRole.ADMIN;
    } else {
      throw new AppError(ErrorMessages[ErrorCode.AUTH_INVALID_SESSION], ErrorStatusCodes[ErrorCode.AUTH_INVALID_SESSION], ErrorCode.AUTH_INVALID_SESSION);
    }

    const accessToken = this.generateAccessToken(userData.id, role, session.id);

    return {
      accessToken,
      ...(role === AuthRole.USER ? { user: userData } : { admin: userData }),
    };
  }

  // Generate short-lived access token
  private generateAccessToken(
    id: string,
    role: AuthRole,
    sessionId: string
  ): string {
    return jwt.sign({ id, role, sessionId }, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry,
    });
  }

  // Verify access token
  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, this.jwtSecret) as TokenPayload;
  }

  // Logout (revoke session)
  async logout(sessionId: string): Promise<void> {
    await this.sessionService.revokeSession(sessionId);
  }

  // User Password Change
  async changeUserPassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ) {
    const user = await this.userRepository
      .createQueryBuilder("user")
      .where("user.id = :userId", { userId })
      .addSelect("user.password")
      .getOne();

    if (!user) {
      throw new AppError(ErrorMessages[ErrorCode.NOT_USER], ErrorStatusCodes[ErrorCode.NOT_USER], ErrorCode.NOT_USER);
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);

    if (!isValidPassword) {
      throw new AppError(ErrorMessages[ErrorCode.AUTH_INCORRECT_PASSWORD], ErrorStatusCodes[ErrorCode.AUTH_INCORRECT_PASSWORD], ErrorCode.AUTH_INCORRECT_PASSWORD);
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);
    user.password = hashedPassword;

    await this.userRepository.save(user);

    return { message: "Password changed successfully" };
  }

  // Admin Password Change
  async changeAdminPassword(
    adminId: string,
    oldPassword: string,
    newPassword: string
  ) {
    const admin = await this.adminRepository
      .createQueryBuilder("admin")
      .where("admin.id = :adminId", { adminId })
      .addSelect("admin.password")
      .getOne();

    if (!admin) {
      throw new AppError(ErrorMessages[ErrorCode.NOT_ADMIN], ErrorStatusCodes[ErrorCode.NOT_ADMIN], ErrorCode.NOT_ADMIN);
    }

    const isValidPassword = await bcrypt.compare(oldPassword, admin.password);

    if (!isValidPassword) {
      throw new AppError(ErrorMessages[ErrorCode.AUTH_INCORRECT_PASSWORD], ErrorStatusCodes[ErrorCode.AUTH_INCORRECT_PASSWORD], ErrorCode.AUTH_INCORRECT_PASSWORD);
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);
    admin.password = hashedPassword;

    await this.adminRepository.save(admin);

    return { message: "Password changed successfully" };
  }

  // User Password Reset
  async resetUserPassword(userId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);

    const result = await this.userRepository.update(
      { id: userId },
      { password: hashedPassword }
    );

    if (result.affected === 0) {
      throw new AppError(ErrorMessages[ErrorCode.NOT_USER], ErrorStatusCodes[ErrorCode.NOT_USER], ErrorCode.NOT_USER);
    }

    return { message: "Password reset successfully" };
  }

  // Admin Password Reset
  async resetAdminPassword(adminId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);

    const result = await this.adminRepository.update(
      { id: adminId },
      { password: hashedPassword }
    );

    if (result.affected === 0) {
      throw new AppError(ErrorMessages[ErrorCode.NOT_ADMIN], ErrorStatusCodes[ErrorCode.NOT_ADMIN], ErrorCode.NOT_ADMIN);
    }

    return { message: "Password reset successfully" };
  }

  // Get session service instance
  getSessionService(): SessionService {
    return this.sessionService;
  }
}
