import { Repository, LessThan } from "typeorm";
import { Session } from "../entities/session.entity";
import { AppDataSource } from "../db/data.source";
import crypto from "crypto";
import { UAParser } from "ua-parser-js";

export interface DeviceInfo {
  deviceName: string;
  deviceType: string;
  browser?: string;
  os?: string;
  ipAddress: string;
  userAgent?: string;
}

export class SessionService {
  private sessionRepository: Repository<Session>;
  private readonly refreshTokenExpiry = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor() {
    this.sessionRepository = AppDataSource.getRepository(Session);
  }

  // Create a new session
  async createSession(
    userId: string | null,
    adminId: string | null,
    deviceInfo: DeviceInfo
  ): Promise<Session> {
    const refreshToken = this.generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiry);

    const session = this.sessionRepository.create({
      userId,
      adminId,
      refreshToken,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      expiresAt,
      lastUsedAt: new Date(),
      isActive: true,
    });

    await this.sessionRepository.save(session);
    return session;
  }

  // Find session by refresh token
  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    return await this.sessionRepository.findOne({
      where: {
        refreshToken,
        isActive: true,
      },
    });
  }

  // Update session last used time
  async updateLastUsed(sessionId: string): Promise<void> {
    await this.sessionRepository.update(
      { id: sessionId },
      { lastUsedAt: new Date() }
    );
  }

  // Get all active sessions for a user
  async getUserSessions(userId: string): Promise<Session[]> {
    return await this.sessionRepository.find({
      where: {
        userId,
        isActive: true,
      },
      order: {
        lastUsedAt: "DESC",
      },
    });
  }

  // Get all active sessions for an admin
  async getAdminSessions(adminId: string): Promise<Session[]> {
    return await this.sessionRepository.find({
      where: {
        adminId,
        isActive: true,
      },
      order: {
        lastUsedAt: "DESC",
      },
    });
  }

  // Revoke a specific session
  async revokeSession(
    sessionId: string,
    userId?: string,
    adminId?: string
  ): Promise<void> {
    const whereClause: any = { id: sessionId };

    if (userId) {
      whereClause.userId = userId;
    }
    if (adminId) {
      whereClause.adminId = adminId;
    }

    await this.sessionRepository.update(whereClause, { isActive: false });
  }

  // Revoke all sessions for a user except current
  async revokeAllUserSessionsExceptCurrent(
    userId: string,
    currentSessionId: string
  ): Promise<number> {
    const result = await this.sessionRepository
      .createQueryBuilder()
      .update(Session)
      .set({ isActive: false })
      .where("userId = :userId", { userId })
      .andWhere("id != :currentSessionId", { currentSessionId })
      .andWhere("isActive = :isActive", { isActive: true })
      .execute();

    return result.affected || 0;
  }

  // Revoke all sessions for an admin except current
  async revokeAllAdminSessionsExceptCurrent(
    adminId: string,
    currentSessionId: string
  ): Promise<number> {
    const result = await this.sessionRepository
      .createQueryBuilder()
      .update(Session)
      .set({ isActive: false })
      .where("adminId = :adminId", { adminId })
      .andWhere("id != :currentSessionId", { currentSessionId })
      .andWhere("isActive = :isActive", { isActive: true })
      .execute();

    return result.affected || 0;
  }

  // Revoke ALL sessions for a user (including current)
  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await this.sessionRepository
      .createQueryBuilder()
      .update(Session)
      .set({ isActive: false })
      .where("userId = :userId", { userId })
      .andWhere("isActive = :isActive", { isActive: true })
      .execute();

    return result.affected || 0;
  }

  // Revoke ALL sessions for an admin (including current)
  async revokeAllAdminSessions(adminId: string): Promise<number> {
    const result = await this.sessionRepository
      .createQueryBuilder()
      .update(Session)
      .set({ isActive: false })
      .where("adminId = :adminId", { adminId })
      .andWhere("isActive = :isActive", { isActive: true })
      .execute();

    return result.affected || 0;
  }

  // Clean up expired sessions
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    return result.affected || 0;
  }

  // Parse device info from request
  parseDeviceInfo(req: any): DeviceInfo {
    const userAgent = req.headers["user-agent"] || "";
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const ipAddress = (
      req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown"
    )
      .trim()
      .replace("::ffff:", "");

    const deviceType = result.device.type || "desktop";
    const browser = result.browser.name || "Unknown";
    const os = result.os.name || "Unknown";

    let deviceName = `${browser} on ${os}`;
    if (result.device.vendor && result.device.model) {
      deviceName = `${result.device.vendor} ${result.device.model}`;
    }

    return {
      deviceName,
      deviceType,
      browser,
      os,
      ipAddress,
      userAgent,
    };
  }

  // Generate a secure refresh token
  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString("hex");
  }

  // Get session by ID
  async getSessionById(sessionId: string): Promise<Session | null> {
    return await this.sessionRepository.findOne({
      where: { id: sessionId, isActive: true },
    });
  }
}
