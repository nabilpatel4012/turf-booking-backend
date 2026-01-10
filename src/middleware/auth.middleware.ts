import { Request, Response, NextFunction } from "express";
import { AuthService, AuthRole } from "../services/auth.service";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: AuthRole;
    sessionId?: string;
  };
}

const authService = new AuthService();

// Base authentication - extracts and verifies token from either user or admin cookie
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token;

    // INTELLIGENT TOKEN RESOLUTION:
    // If route contains "/admin", prioritize Admin Token.
    // Otherwise, prioritize User Token.
    // This fixes the conflict if both tokens exist in cookie (Multi-App Login).
    const isAdminRoute = req.originalUrl.includes("/admin");

    if (isAdminRoute) {
       token = req.cookies?.aAccessToken || req.cookies?.uAccessToken;
    } else {
       token = req.cookies?.uAccessToken || req.cookies?.aAccessToken;
    }

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    req.user = authService.verifyToken(token);
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Authenticate User only - only checks uAccessToken
export const authenticateUser = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Only look for user token (uAccessToken)
    let token = req.cookies?.uAccessToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = authService.verifyToken(token);

    if (decoded.role !== AuthRole.USER) {
      return res.status(403).json({ error: "Access denied. Users only." });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Authenticate Admin only - only checks aAccessToken
export const authenticateAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Only look for admin token (aAccessToken)
    let token = req.cookies?.aAccessToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = authService.verifyToken(token);

    if (decoded.role !== AuthRole.ADMIN) {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Optional authentication - populates req.user if token present, otherwise valid guest
export const authenticateOptional = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token = req.cookies?.uAccessToken || req.cookies?.aAccessToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (token) {
      req.user = authService.verifyToken(token);
    }
    
    // If no token, or token verification failed (caught below), we just proceed as guest (user undefined)
    next();
  } catch (error) {
    // If token is invalid, allow proceeding as guest (ignore bad token) for optional routes
    // OR enforce 401 if a token was attempted but failed. 
    // Generally "Optional" means "If you have a badge, show it. If it's fake, we kick you out."
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Legacy isAdmin check (for backward compatibility)
export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== AuthRole.ADMIN) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// IP restriction middleware
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
