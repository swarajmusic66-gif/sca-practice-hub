import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_SECRET!;
const EXPIRES_IN = "24h";

export interface JwtPayload {
  role: "admin" | "student";
  adminId?: string;
  studentDbId?: number;
  studentId?: string;
  fullName?: string;
  courseId?: number;
  courseName?: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
