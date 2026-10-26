import "express-session";

declare module "express-session" {
  interface SessionData {
    role?: "student" | "admin";
    studentDbId?: number;
    studentId?: string;
    fullName?: string;
    courseId?: number;
    courseName?: string;
    adminId?: string;
  }
}
