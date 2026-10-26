import { Router, type IRouter } from "express";
import { eq, and, ilike, sql } from "drizzle-orm";
import { db, questionsTable, coursesTable } from "@workspace/db";
import { CreateQuestionBody, UpdateQuestionBody, BulkUploadQuestionsBody } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Only admins may browse the question bank (which includes correctAnswer).
// Students obtain questions through /api/tests/start, which strips correctAnswer.
router.get("/questions", requireAdmin, async (req, res): Promise<void> => {
  const courseIdQ = req.query.courseId ? parseInt(String(req.query.courseId), 10) : undefined;
  const topic = req.query.topic ? String(req.query.topic) : undefined;
  const difficulty = req.query.difficulty ? String(req.query.difficulty) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
  const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

  const conditions = [];
  if (courseIdQ && !isNaN(courseIdQ)) conditions.push(eq(questionsTable.courseId, courseIdQ));
  if (topic) conditions.push(eq(questionsTable.topic, topic));
  if (difficulty) conditions.push(eq(questionsTable.difficulty, difficulty));
  if (search) conditions.push(ilike(questionsTable.question, `%${search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionsTable)
    .where(where);

  const questions = await db
    .select()
    .from(questionsTable)
    .where(where)
    .limit(limit)
    .offset(offset)
    .orderBy(questionsTable.id);

  // Fetch course names
  const courseIds = [...new Set(questions.map(q => q.courseId))];
  const courses = courseIds.length > 0
    ? await db.select().from(coursesTable).where(
        courseIds.length === 1
          ? eq(coursesTable.id, courseIds[0])
          : sql`${coursesTable.id} = ANY(${courseIds})`
      )
    : [];
  const courseMap = new Map(courses.map(c => [c.id, c.courseName]));

  res.json({
    questions: questions.map(q => ({
      ...q,
      courseName: courseMap.get(q.courseId) ?? "",
      createdAt: q.createdAt.toISOString(),
    })),
    total: totalRow?.count ?? 0,
  });
});

router.post("/questions/bulk-upload", requireAdmin, async (req, res): Promise<void> => {
  const parsed = BulkUploadQuestionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { courseId, questions } = parsed.data;
  let inserted = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < questions.length; i++) {
    try {
      await db.insert(questionsTable).values({
        courseId: courseId,
        topic: questions[i].topic,
        question: questions[i].question,
        optionA: questions[i].optionA,
        optionB: questions[i].optionB,
        optionC: questions[i].optionC,
        optionD: questions[i].optionD,
        correctAnswer: questions[i].correctAnswer,
        difficulty: questions[i].difficulty,
      });
      inserted++;
    } catch (e) {
      failed++;
      errors.push(`Row ${i + 1}: ${String(e)}`);
    }
  }

  res.status(201).json({ inserted, failed, errors });
});

router.post("/questions", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, parsed.data.courseId)).limit(1);

  const [question] = await db.insert(questionsTable).values({
    courseId: parsed.data.courseId,
    topic: parsed.data.topic,
    question: parsed.data.question,
    optionA: parsed.data.optionA,
    optionB: parsed.data.optionB,
    optionC: parsed.data.optionC,
    optionD: parsed.data.optionD,
    correctAnswer: parsed.data.correctAnswer,
    difficulty: parsed.data.difficulty,
  }).returning();

  res.status(201).json({
    ...question,
    courseName: course?.courseName ?? "",
    createdAt: question.createdAt.toISOString(),
  });
});

router.patch("/questions/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = UpdateQuestionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [question] = await db.update(questionsTable).set(parsed.data).where(eq(questionsTable.id, id)).returning();
  if (!question) { res.status(404).json({ error: "Question not found" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, question.courseId)).limit(1);
  res.json({ ...question, courseName: course?.courseName ?? "", createdAt: question.createdAt.toISOString() });
});

router.delete("/questions/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  await db.delete(questionsTable).where(eq(questionsTable.id, id));
  res.json({ success: true });
});

export default router;
