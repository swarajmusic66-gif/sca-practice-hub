import { Router, type IRouter } from "express";
import { eq, sql, ilike, and, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, studentsTable, coursesTable, testAttemptsTable } from "@workspace/db";
import { CreateStudentBody, UpdateStudentBody } from "@workspace/api-zod";
import { requireAdmin, requireAnyAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function generateStudentId(courseCode: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${courseCode.toUpperCase()}-${year}-`;

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studentsTable)
    .where(ilike(studentsTable.studentId, `${prefix}%`));

  const seq = (result?.count ?? 0) + 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

function buildStudentResponse(student: typeof studentsTable.$inferSelect, courseName: string) {
  return {
    id: student.id,
    studentId: student.studentId,
    fullName: student.fullName,
    mobile: student.mobile,
    email: student.email ?? null,
    dateOfBirth: student.dateOfBirth ?? null,
    gender: student.gender ?? null,
    address: student.address ?? null,
    courseId: student.courseId,
    courseName,
    batch: student.batch,
    trainer: student.trainer ?? null,
    admissionDate: student.admissionDate,
    courseDuration: student.courseDuration ?? null,
    createdAt: student.createdAt.toISOString(),
  };
}

router.get("/students", requireAdmin, async (req, res): Promise<void> => {
  const courseIdQ = req.query.courseId ? parseInt(String(req.query.courseId), 10) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;
  const batch = req.query.batch ? String(req.query.batch) : undefined;

  const conditions = [];
  if (courseIdQ && !isNaN(courseIdQ)) conditions.push(eq(studentsTable.courseId, courseIdQ));
  if (batch) conditions.push(eq(studentsTable.batch, batch));
  if (search) conditions.push(ilike(studentsTable.fullName, `%${search}%`));

  const students = await db
    .select()
    .from(studentsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(studentsTable.createdAt));

  const courses = await db.select().from(coursesTable);
  const courseMap = new Map(courses.map(c => [c.id, c.courseName]));

  res.json(students.map(s => buildStudentResponse(s, courseMap.get(s.courseId) ?? "")));
});

router.post("/students", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { courseId, password, ...rest } = parsed.data;

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
  if (!course) { res.status(400).json({ error: "Course not found" }); return; }

  const studentId = await generateStudentId(course.courseCode);
  const plainPassword = password ?? studentId; // Default password = student ID
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const [student] = await db.insert(studentsTable).values({
    studentId,
    fullName: rest.fullName,
    mobile: rest.mobile,
    email: rest.email ?? null,
    dateOfBirth: rest.dateOfBirth ?? null,
    gender: rest.gender ?? null,
    address: rest.address ?? null,
    courseId,
    batch: rest.batch,
    trainer: rest.trainer ?? null,
    admissionDate: rest.admissionDate,
    courseDuration: rest.courseDuration ?? null,
    passwordHash,
  }).returning();

  res.status(201).json(buildStudentResponse(student, course.courseName));
});

// Admin-only: get any student by DB id.
// Students get their own profile via /api/auth/me (no PII endpoint needed for students).
router.get("/students/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, student.courseId)).limit(1);
  res.json(buildStudentResponse(student, course?.courseName ?? ""));
});

router.patch("/students/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { password, ...rest } = parsed.data;
  const updates: Record<string, unknown> = { ...rest };

  if (password) {
    updates.passwordHash = await bcrypt.hash(password, 10);
    delete updates.password;
  }

  const [student] = await db.update(studentsTable).set(updates).where(eq(studentsTable.id, id)).returning();
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, student.courseId)).limit(1);
  res.json(buildStudentResponse(student, course?.courseName ?? ""));
});

router.delete("/students/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  await db.delete(studentsTable).where(eq(studentsTable.id, id));
  res.json({ success: true });
});

// Students may only fetch their own stats; admins may fetch any student's stats.
router.get("/students/:id/stats", requireAnyAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const jwt = (req as any).jwtPayload as { role?: string; studentDbId?: number } | undefined;
  const role = jwt?.role ?? req.session.role;
  const studentDbId = jwt?.studentDbId ?? req.session.studentDbId;
  const isAdmin = role === "admin";
  const isOwnRecord = role === "student" && studentDbId === id;
  if (!isAdmin && !isOwnRecord) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const attempts = await db
    .select()
    .from(testAttemptsTable)
    .where(and(eq(testAttemptsTable.studentId, id), eq(testAttemptsTable.status, "completed")))
    .orderBy(desc(testAttemptsTable.completedAt));

  const totalAttempts = attempts.length;
  const highestScore = totalAttempts > 0 ? Math.max(...attempts.map(a => a.score)) : 0;
  const averageScore = totalAttempts > 0 ? attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts : 0;
  const highestPercentage = totalAttempts > 0 ? Math.max(...attempts.map(a => parseFloat(String(a.percentage)))) : 0;
  const averagePercentage = totalAttempts > 0 ? attempts.reduce((sum, a) => sum + parseFloat(String(a.percentage)), 0) / totalAttempts : 0;

  const recentAttempts = attempts.slice(0, 5).map(a => ({
    id: a.id,
    courseId: a.courseId,
    courseName: "",
    score: a.score,
    totalQuestions: a.totalQuestions,
    correct: a.correct,
    wrong: a.wrong,
    skipped: a.skipped,
    percentage: parseFloat(String(a.percentage)),
    durationSeconds: a.durationSeconds,
    completedAt: a.completedAt?.toISOString() ?? new Date().toISOString(),
  }));

  res.json({
    totalAttempts,
    highestScore,
    averageScore: Math.round(averageScore * 10) / 10,
    highestPercentage: Math.round(highestPercentage * 10) / 10,
    averagePercentage: Math.round(averagePercentage * 10) / 10,
    recentAttempts,
  });
});

export default router;
