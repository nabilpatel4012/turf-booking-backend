import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { UserRole } from "../entities/user.entity";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
  };
}

const authService = new AuthService();

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (token) {
      req.user = authService.verifyToken(token);
    }
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

export const restrictToIP = (allowedIP: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = (
      req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
      req.socket.remoteAddress ||
      ""
    )
      .trim()
      .replace("::ffff:", "");

    if (clientIP !== allowedIP) {
      return res
        .status(403)
        .json({ error: "Access denied from this IP address" });
    }
    next();
  };
};
