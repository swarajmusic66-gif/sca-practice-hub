import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, studentsTable, coursesTable } from "@workspace/db";
import { StudentLoginBody, AdminLoginBody } from "@workspace/api-zod";
import { signToken, verifyToken, extractBearerToken } from "../lib/jwt";
import "../types/session";

const router: IRouter = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
  console.warn(
    "[SECURITY WARNING] ADMIN_USERNAME / ADMIN_PASSWORD env vars are not set. " +
    "Default credentials (admin / admin123) are active. " +
    "Set these variables before exposing this service publicly."
  );
}

router.post("/auth/student-login", async (req, res): Promise<void> => {
  const parsed = StudentLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { studentId, password } = parsed.data;

  const [student] = await db
    .select({
      id: studentsTable.id,
      studentId: studentsTable.studentId,
      fullName: studentsTable.fullName,
      courseId: studentsTable.courseId,
      passwordHash: studentsTable.passwordHash,
    })
    .from(studentsTable)
    .where(eq(studentsTable.studentId, studentId))
    .limit(1);

  if (!student) {
    res.status(401).json({ error: "Invalid student ID or password" });
    return;
  }

  const valid = await bcrypt.compare(password, student.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid student ID or password" });
    return;
  }

  const [course] = await db
    .select({ courseName: coursesTable.courseName })
    .from(coursesTable)
    .where(eq(coursesTable.id, student.courseId))
    .limit(1);

  // Session (cookie-based, may not work through all proxies)
  req.session.role = "student";
  req.session.studentDbId = student.id;
  req.session.studentId = student.studentId;
  req.session.fullName = student.fullName;
  req.session.courseId = student.courseId;
  req.session.courseName = course?.courseName ?? "";

  // JWT token (header-based, always works)
  const token = signToken({
    role: "student",
    studentDbId: student.id,
    studentId: student.studentId,
    fullName: student.fullName,
    courseId: student.courseId,
    courseName: course?.courseName ?? "",
  });

  const user = {
    role: "student" as const,
    studentDbId: student.id,
    studentId: student.studentId,
    fullName: student.fullName,
    courseId: student.courseId,
    courseName: course?.courseName ?? "",
    adminId: null,
  };

  req.session.save(() => {
    res.json({ role: "student", token, user });
  });
});

router.post("/auth/admin-login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid admin credentials" });
    return;
  }

  // Session (cookie-based)
  req.session.role = "admin";
  req.session.adminId = username;

  // JWT token (header-based, always works)
  const token = signToken({ role: "admin", adminId: username });

  const user = {
    role: "admin" as const,
    studentDbId: null,
    studentId: null,
    fullName: null,
    courseId: null,
    courseName: null,
    adminId: username,
  };

  req.session.save(() => {
    res.json({ role: "admin", token, user });
  });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get("/auth/me", (req, res): void => {
  // Try JWT Bearer token first
  const bearerToken = extractBearerToken(req.headers.authorization);
  if (bearerToken) {
    const payload = verifyToken(bearerToken);
    if (payload) {
      res.json({
        role: payload.role,
        studentDbId: payload.studentDbId ?? null,
        studentId: payload.studentId ?? null,
        fullName: payload.fullName ?? null,
        courseId: payload.courseId ?? null,
        courseName: payload.courseName ?? null,
        adminId: payload.adminId ?? null,
      });
      return;
    }
  }

  // Fallback: session cookie
  if (!req.session.role) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.json({
    role: req.session.role,
    studentDbId: req.session.studentDbId ?? null,
    studentId: req.session.studentId ?? null,
    fullName: req.session.fullName ?? null,
    courseId: req.session.courseId ?? null,
    courseName: req.session.courseName ?? null,
    adminId: req.session.adminId ?? null,
  });
});

export default router;
