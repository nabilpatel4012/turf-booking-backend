import { Repository } from "typeorm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../entities/user.entity";
import { Admin } from "../entities/admin.entity";
import { AppDataSource } from "../db/data.source";
import { SessionService, DeviceInfo } from "./session.service";
import { Session } from "../entities/session.entity";

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
  ): Promise<AuthResponse> {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, this.bcryptRounds);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      phone,
    });

    await this.userRepository.save(user);

    // Create session
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
      throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
      throw new Error("Account is deactivated. Please contact support.");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new Error("Invalid credentials");
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
      throw new Error("Admin already exists");
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
      throw new Error("Invalid credentials");
    }

    if (!admin.isActive) {
      throw new Error("Account is deactivated. Please contact support.");
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      throw new Error("Invalid credentials");
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
      throw new Error("Invalid refresh token");
    }

    if (new Date() > session.expiresAt) {
      throw new Error("Refresh token expired");
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
        throw new Error("User not found or inactive");
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
        throw new Error("Admin not found or inactive");
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
      throw new Error("Invalid session");
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
      throw new Error("User not found");
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);

    if (!isValidPassword) {
      throw new Error("Current password is incorrect");
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
      throw new Error("Admin not found");
    }

    const isValidPassword = await bcrypt.compare(oldPassword, admin.password);

    if (!isValidPassword) {
      throw new Error("Current password is incorrect");
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
      throw new Error("User not found");
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
      throw new Error("Admin not found");
    }

    return { message: "Password reset successfully" };
  }

  // Get session service instance
  getSessionService(): SessionService {
    return this.sessionService;
  }
}
