import { Router, type IRouter } from "express";
import { eq, sql, desc, and } from "drizzle-orm";
import { db, studentsTable, coursesTable, questionsTable, testAttemptsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/admin/dashboard", requireAdmin, async (req, res): Promise<void> => {
  const [studentsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(studentsTable);
  const [coursesCount] = await db.select({ count: sql<number>`count(*)::int` }).from(coursesTable);
  const [questionsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(questionsTable);
  const [attemptsCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(testAttemptsTable)
    .where(eq(testAttemptsTable.status, "completed"));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(testAttemptsTable)
    .where(and(
      eq(testAttemptsTable.status, "completed"),
      sql`${testAttemptsTable.completedAt} >= ${today}`
    ));

  res.json({
    totalStudents: studentsCount?.count ?? 0,
    totalCourses: coursesCount?.count ?? 0,
    totalQuestions: questionsCount?.count ?? 0,
    totalAttempts: attemptsCount?.count ?? 0,
    todayAttempts: todayCount?.count ?? 0,
  });
});

router.get("/admin/recent-attempts", requireAdmin, async (req, res): Promise<void> => {
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

  const attempts = await db
    .select({
      attemptId: testAttemptsTable.id,
      studentDbId: testAttemptsTable.studentId,
      courseId: testAttemptsTable.courseId,
      score: testAttemptsTable.score,
      totalQuestions: testAttemptsTable.totalQuestions,
      percentage: testAttemptsTable.percentage,
      completedAt: testAttemptsTable.completedAt,
    })
    .from(testAttemptsTable)
    .where(eq(testAttemptsTable.status, "completed"))
    .orderBy(desc(testAttemptsTable.completedAt))
    .limit(limit);

  const studentIds = [...new Set(attempts.map(a => a.studentDbId))];
  const courseIds = [...new Set(attempts.map(a => a.courseId))];

  const students = studentIds.length > 0 ? await db.select().from(studentsTable) : [];
  const courses = courseIds.length > 0 ? await db.select().from(coursesTable) : [];

  const studentMap = new Map(students.map(s => [s.id, s]));
  const courseMap = new Map(courses.map(c => [c.id, c.courseName]));

  res.json(attempts.map(a => {
    const student = studentMap.get(a.studentDbId);
    return {
      attemptId: a.attemptId,
      studentId: student?.studentId ?? "",
      studentName: student?.fullName ?? "",
      courseName: courseMap.get(a.courseId) ?? "",
      score: a.score,
      totalQuestions: a.totalQuestions,
      percentage: parseFloat(String(a.percentage)),
      completedAt: a.completedAt?.toISOString() ?? new Date().toISOString(),
    };
  }));
});

router.get("/admin/course-stats", requireAdmin, async (req, res): Promise<void> => {
  const courses = await db.select().from(coursesTable);

  const stats = await Promise.all(courses.map(async course => {
    const [qr] = await db.select({ count: sql<number>`count(*)::int` }).from(questionsTable).where(eq(questionsTable.courseId, course.id));
    const [sr] = await db.select({ count: sql<number>`count(*)::int` }).from(studentsTable).where(eq(studentsTable.courseId, course.id));
    const [ar] = await db.select({ count: sql<number>`count(*)::int` }).from(testAttemptsTable).where(and(eq(testAttemptsTable.courseId, course.id), eq(testAttemptsTable.status, "completed")));
    const [avgRow] = await db.select({ avg: sql<number>`COALESCE(AVG(${testAttemptsTable.percentage}), 0)::numeric(5,2)` }).from(testAttemptsTable).where(and(eq(testAttemptsTable.courseId, course.id), eq(testAttemptsTable.status, "completed")));

    return {
      courseId: course.id,
      courseName: course.courseName,
      studentCount: sr?.count ?? 0,
      questionCount: qr?.count ?? 0,
      totalAttempts: ar?.count ?? 0,
      averagePercentage: parseFloat(String(avgRow?.avg ?? 0)),
    };
  }));

  res.json(stats);
});

export default router;
