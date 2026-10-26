import { type Request, type Response, type NextFunction } from "express";
import { verifyToken, extractBearerToken } from "../lib/jwt";

function resolveRole(req: Request): string | undefined {
  // Prefer JWT Bearer token (works through Replit proxy)
  const token = extractBearerToken(req.headers.authorization);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      // Attach decoded payload so route handlers can read it
      (req as any).jwtPayload = payload;
      return payload.role;
    }
  }
  // Fallback: session cookie
  return req.session.role;
}

export function requireStudent(req: Request, res: Response, next: NextFunction): void {
  if (resolveRole(req) !== "student") {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (resolveRole(req) !== "admin") {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  next();
}

export function requireAnyAuth(req: Request, res: Response, next: NextFunction): void {
  if (!resolveRole(req)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}
