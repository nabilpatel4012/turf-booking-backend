import { Response } from "express";
import { AuthService } from "../services/auth.service";
import { AuthRequest } from "../middleware/auth.middleware";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // Helper to set HTTP-only cookie
  private setAccessTokenCookie(res: Response, accessToken: string) {
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "none",
      maxAge: 15 * 60 * 1000,
    });
  }

  // Helper to clear cookies
  private clearAuthCookies(res: Response) {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
  }

  // User Registration
  registerUser = async (req: AuthRequest, res: Response) => {
    const { email, password, name, phone } = req.body;
    const sessionService = this.authService.getSessionService();
    const deviceInfo = sessionService.parseDeviceInfo(req);

    const result = await this.authService.registerUser(
      email,
      password,
      name,
      deviceInfo,
      phone
    );

    // Set access token as HTTP-only cookie
    this.setAccessTokenCookie(res, result.accessToken!);

    // Set refresh token as HTTP-only cookie (long-lived)
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(201).json({
      message: "User registered successfully",
      user: result.user,
    });
  };

  // User Login
  loginUser = async (req: AuthRequest, res: Response) => {
    const { email, password } = req.body;
    const sessionService = this.authService.getSessionService();
    const deviceInfo = sessionService.parseDeviceInfo(req);

    const result = await this.authService.loginUser(
      email,
      password,
      deviceInfo
    );

    // Set access token as HTTP-only cookie
    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 15 * 60 * 1000,
    });

    // Set refresh token as HTTP-only cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Login successful",
      user: result.user,
    });
  };

  // Admin Registration
  registerAdmin = async (req: AuthRequest, res: Response) => {
    const { email, password, name, phone } = req.body;
    const sessionService = this.authService.getSessionService();
    const deviceInfo = sessionService.parseDeviceInfo(req);

    const result = await this.authService.registerAdmin(
      email,
      password,
      name,
      deviceInfo,
      phone
    );

    // Set access token as HTTP-only cookie
    res.cookie("accessToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 15 * 60 * 1000,
    });

    // Set refresh token as HTTP-only cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: "Admin created successfully",
      admin: result.admin,
    });
  };

  // Admin Login
  loginAdmin = async (req: AuthRequest, res: Response) => {
    const { email, password } = req.body;
    const sessionService = this.authService.getSessionService();
    const deviceInfo = sessionService.parseDeviceInfo(req);

    const result = await this.authService.loginAdmin(
      email,
      password,
      deviceInfo
    );

    // Set access token as HTTP-only cookie
    this.setAccessTokenCookie(res, result.accessToken!);

    // Set refresh token as HTTP-only cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none", //TODO: Make it strict later
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Login successful",
      admin: result.admin,
    });
  };

  // Refresh Access Token
  refreshToken = async (req: AuthRequest, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token not provided" });
    }

    const result = await this.authService.refreshAccessToken(refreshToken);

    // Set new access token as HTTP-only cookie
    this.setAccessTokenCookie(res, result.accessToken);

    res.json({
      message: "Token refreshed successfully",
      ...(result.user ? { user: result.user } : { admin: result.admin }),
    });
  };

  // Logout (revoke current session)
  logout = async (req: AuthRequest, res: Response) => {
    const sessionId = req.user?.sessionId;

    if (!sessionId) {
      return res.status(400).json({ error: "No active session" });
    }

    await this.authService.logout(sessionId);

    // Clear cookies
    this.clearAuthCookies(res);

    res.json({ message: "Logged out successfully" });
  };

  // Get all active sessions
  getSessions = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessionService = this.authService.getSessionService();
    let sessions;

    if (role === "user") {
      sessions = await sessionService.getUserSessions(userId);
    } else {
      sessions = await sessionService.getAdminSessions(userId);
    }

    // Format sessions for response
    const formattedSessions = sessions.map((session) => ({
      id: session.id,
      deviceName: session.deviceName,
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      lastUsedAt: session.lastUsedAt,
      createdAt: session.createdAt,
      isCurrent: session.id === req.user?.sessionId,
    }));

    res.json({ sessions: formattedSessions });
  };

  // Revoke a specific session
  revokeSession = async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessionService = this.authService.getSessionService();

    if (role === "user") {
      await sessionService.revokeSession(sessionId, userId, undefined);
    } else {
      await sessionService.revokeSession(sessionId, undefined, userId);
    }

    // If revoking current session, clear cookies
    if (sessionId === req.user?.sessionId) {
      this.clearAuthCookies(res);
    }

    res.json({ message: "Session revoked successfully" });
  };

  // Revoke all sessions except current
  revokeAllOtherSessions = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const sessionId = req.user?.sessionId;
    const role = req.user?.role;

    if (!userId || !sessionId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessionService = this.authService.getSessionService();
    let revokedCount;

    if (role === "user") {
      revokedCount = await sessionService.revokeAllUserSessionsExceptCurrent(
        userId,
        sessionId
      );
    } else {
      revokedCount = await sessionService.revokeAllAdminSessionsExceptCurrent(
        userId,
        sessionId
      );
    }

    res.json({
      message: "All other sessions revoked successfully",
      revokedCount,
    });
  };

  // Revoke ALL sessions (including current) - sign out everywhere
  revokeAllSessions = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessionService = this.authService.getSessionService();
    let revokedCount;

    if (role === "user") {
      revokedCount = await sessionService.revokeAllUserSessions(userId);
    } else {
      revokedCount = await sessionService.revokeAllAdminSessions(userId);
    }

    // Clear cookies
    this.clearAuthCookies(res);

    res.json({
      message:
        "All sessions revoked successfully. You have been signed out from all devices.",
      revokedCount,
    });
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
