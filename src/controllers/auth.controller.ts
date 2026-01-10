import { Response } from "express";
import { AuthService } from "../services/auth.service";
import { AuthRequest } from "../middleware/auth.middleware";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Base cookie options without domain restriction.
   * Using different cookie names for user vs admin prevents collisions.
   */
  private getCookieOptions(maxAge: number) {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge,
      path: '/',
    };
  }

  // --- USER COOKIE HELPERS ---
  private setUserAccessTokenCookie(res: Response, accessToken: string) {
    res.cookie("uAccessToken", accessToken, this.getCookieOptions(15 * 60 * 1000));
  }

  private setUserRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie("uRefreshToken", refreshToken, this.getCookieOptions(30 * 24 * 60 * 60 * 1000));
  }

  private clearUserCookies(res: Response) {
    res.clearCookie("uAccessToken", { path: '/' });
    res.clearCookie("uRefreshToken", { path: '/' });
  }

  // --- ADMIN COOKIE HELPERS ---
  private setAdminAccessTokenCookie(res: Response, accessToken: string) {
    res.cookie("aAccessToken", accessToken, this.getCookieOptions(15 * 60 * 1000));
  }

  private setAdminRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie("aRefreshToken", refreshToken, this.getCookieOptions(30 * 24 * 60 * 60 * 1000));
  }

  private clearAdminCookies(res: Response) {
    res.clearCookie("aAccessToken", { path: '/' });
    res.clearCookie("aRefreshToken", { path: '/' });
  }

  // Legacy helper for backward compatibility - clears based on role
  private clearAuthCookies(res: Response, role?: string) {
    if (role === 'admin') {
      this.clearAdminCookies(res);
    } else {
      this.clearUserCookies(res);
    }
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

    // Registration now requires OTP verification - return message to user
    res.status(201).json({
      message: result.message,
      email: result.email,
      requiresVerification: true,
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

    // Set user access token as HTTP-only cookie
    this.setUserAccessTokenCookie(res, result.accessToken!);

    // Set user refresh token as HTTP-only cookie
    this.setUserRefreshTokenCookie(res, result.refreshToken);

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

    // Set admin access token as HTTP-only cookie
    this.setAdminAccessTokenCookie(res, result.accessToken!);

    // Set admin refresh token as HTTP-only cookie
    this.setAdminRefreshTokenCookie(res, result.refreshToken);

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

    // Set admin access token as HTTP-only cookie
    this.setAdminAccessTokenCookie(res, result.accessToken!);

    // Set admin refresh token as HTTP-only cookie
    this.setAdminRefreshTokenCookie(res, result.refreshToken);

    res.json({
      message: "Login successful",
      admin: result.admin,
    });
  };

  // Refresh User Access Token
  refreshUserToken = async (req: AuthRequest, res: Response) => {
    const refreshToken = req.cookies.uRefreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token not provided" });
    }

    const result = await this.authService.refreshAccessToken(refreshToken);

    // Set new user access token as HTTP-only cookie
    this.setUserAccessTokenCookie(res, result.accessToken);

    res.json({
      message: "Token refreshed successfully",
      user: result.user,
    });
  };

  // Refresh Admin Access Token
  refreshAdminToken = async (req: AuthRequest, res: Response) => {
    const refreshToken = req.cookies.aRefreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token not provided" });
    }

    const result = await this.authService.refreshAccessToken(refreshToken);

    // Set new admin access token as HTTP-only cookie
    this.setAdminAccessTokenCookie(res, result.accessToken);

    res.json({
      message: "Token refreshed successfully",
      admin: result.admin,
    });
  };

  // Logout (revoke current session)
  logout = async (req: AuthRequest, res: Response) => {
    const sessionId = req.user?.sessionId;
    const role = req.user?.role;

    if (!sessionId) {
      return res.status(400).json({ error: "No active session" });
    }

    await this.authService.logout(sessionId);

    // Clear cookies based on role
    this.clearAuthCookies(res, role);

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

    // If revoking current session, clear cookies based on role
    if (sessionId === req.user?.sessionId) {
      this.clearAuthCookies(res, role);
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

    // Clear cookies based on role
    this.clearAuthCookies(res, role);

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
