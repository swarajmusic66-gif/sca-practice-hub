import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, coursesTable, studentsTable, questionsTable } from "@workspace/db";
import { CreateCourseBody, UpdateCourseBody, GetCourseParams, UpdateCourseParams, DeleteCourseParams, ListCoursesQueryParams } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/courses", async (req, res): Promise<void> => {
  const query = ListCoursesQueryParams.safeParse(req.query);
  const statusFilter = query.success ? query.data.status : undefined;

  const courses = await db.select().from(coursesTable)
    .orderBy(coursesTable.courseName);

  const questionCounts = await db
    .select({ courseId: questionsTable.courseId, count: sql<number>`count(*)::int` })
    .from(questionsTable)
    .groupBy(questionsTable.courseId);

  const studentCounts = await db
    .select({ courseId: studentsTable.courseId, count: sql<number>`count(*)::int` })
    .from(studentsTable)
    .groupBy(studentsTable.courseId);

  const qMap = new Map(questionCounts.map(r => [r.courseId, r.count]));
  const sMap = new Map(studentCounts.map(r => [r.courseId, r.count]));

  let result = courses.map(c => ({
    ...c,
    questionCount: qMap.get(c.id) ?? 0,
    studentCount: sMap.get(c.id) ?? 0,
  }));

  if (statusFilter) {
    result = result.filter(c => c.status === statusFilter);
  }

  res.json(result);
});

router.post("/courses", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [course] = await db.insert(coursesTable).values({
    courseCode: parsed.data.courseCode,
    courseName: parsed.data.courseName,
    description: parsed.data.description ?? null,
    duration: parsed.data.duration ?? null,
    status: parsed.data.status ?? "active",
    trainerName: parsed.data.trainerName ?? null,
  }).returning();

  res.status(201).json({ ...course, questionCount: 0, studentCount: 0 });
});

router.get("/courses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, id)).limit(1);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  const [qr] = await db.select({ count: sql<number>`count(*)::int` }).from(questionsTable).where(eq(questionsTable.courseId, id));
  const [sr] = await db.select({ count: sql<number>`count(*)::int` }).from(studentsTable).where(eq(studentsTable.courseId, id));

  res.json({ ...course, questionCount: qr?.count ?? 0, studentCount: sr?.count ?? 0 });
});

router.patch("/courses/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = UpdateCourseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updates: Record<string, unknown> = {};
  if (parsed.data.courseCode !== undefined) updates.courseCode = parsed.data.courseCode;
  if (parsed.data.courseName !== undefined) updates.courseName = parsed.data.courseName;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.duration !== undefined) updates.duration = parsed.data.duration;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.trainerName !== undefined) updates.trainerName = parsed.data.trainerName;

  const [course] = await db.update(coursesTable).set(updates).where(eq(coursesTable.id, id)).returning();
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  const [qr] = await db.select({ count: sql<number>`count(*)::int` }).from(questionsTable).where(eq(questionsTable.courseId, id));
  const [sr] = await db.select({ count: sql<number>`count(*)::int` }).from(studentsTable).where(eq(studentsTable.courseId, id));

  res.json({ ...course, questionCount: qr?.count ?? 0, studentCount: sr?.count ?? 0 });
});

router.delete("/courses/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  await db.delete(coursesTable).where(eq(coursesTable.id, id));
  res.json({ success: true });
});

export default router;
