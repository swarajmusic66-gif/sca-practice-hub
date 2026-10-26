import { Router, type IRouter, type Request } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, questionsTable, testAttemptsTable, coursesTable } from "@workspace/db";
import { StartTestBody, SubmitTestBody } from "@workspace/api-zod";
import { requireStudent } from "../middlewares/requireAuth";
import type { JwtPayload } from "../lib/jwt";

/** Read student identity from JWT payload (set by requireStudent) or session fallback.
 *  Throws an error response if required fields are missing — call only inside requireStudent-guarded routes. */
function getStudentCtx(req: Request & { res?: import("express").Response }): { studentDbId: number; courseId: number; courseName: string } {
  const jwt = (req as any).jwtPayload as JwtPayload | undefined;
  const studentDbId = jwt?.studentDbId ?? req.session.studentDbId;
  const courseId = jwt?.courseId ?? req.session.courseId;
  const courseName = jwt?.courseName ?? req.session.courseName ?? "";
  if (!studentDbId || !courseId) {
    throw new Error("Incomplete student token payload");
  }
  return { studentDbId, courseId, courseName };
}

const router: IRouter = Router();

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

router.post("/tests/start", requireStudent, async (req, res): Promise<void> => {
  const parsed = StartTestBody.safeParse(req.body);
  const questionCount = (parsed.success && parsed.data.questionCount) ? parsed.data.questionCount : 50;

  let studentCtx: ReturnType<typeof getStudentCtx>;
  try { studentCtx = getStudentCtx(req); } catch { res.status(401).json({ error: "Incomplete session" }); return; }
  const { studentDbId: studentId, courseId, courseName } = studentCtx;

  // Fetch all questions for the course
  const allQuestions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.courseId, courseId));

  if (allQuestions.length < 5) {
    res.status(400).json({ error: `Not enough questions in this course. Found ${allQuestions.length}, need at least 5.` });
    return;
  }

  const count = Math.min(questionCount, allQuestions.length);
  const selected = shuffle(allQuestions).slice(0, count);

  // Create attempt record
  const [attempt] = await db.insert(testAttemptsTable).values({
    studentId,
    courseId,
    totalQuestions: count,
    status: "in_progress",
    questionsJson: selected.map(q => q.id),
    score: 0,
    correct: 0,
    wrong: 0,
    skipped: 0,
    percentage: "0",
    durationSeconds: 0,
  }).returning();

  // Return questions without correct answers
  res.status(201).json({
    attemptId: attempt.id,
    courseId,
    courseName,
    totalQuestions: count,
    startedAt: attempt.startedAt.toISOString(),
    questions: selected.map(q => ({
      id: q.id,
      topic: q.topic,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
    })),
  });
});

router.post("/tests/:attemptId/submit", requireStudent, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.attemptId) ? req.params.attemptId[0] : req.params.attemptId;
  const attemptId = parseInt(rawId, 10);
  if (isNaN(attemptId)) { res.status(400).json({ error: "Invalid attempt ID" }); return; }

  const parsed = SubmitTestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { answers, durationSeconds } = parsed.data;

  // Fetch the attempt
  const [attempt] = await db
    .select()
    .from(testAttemptsTable)
    .where(and(eq(testAttemptsTable.id, attemptId), eq(testAttemptsTable.studentId, getStudentCtx(req).studentDbId)))
    .limit(1);

  if (!attempt) { res.status(404).json({ error: "Test attempt not found" }); return; }
  if (attempt.status === "completed") { res.status(400).json({ error: "Test already submitted" }); return; }

  const questionIds = (attempt.questionsJson as number[]) ?? [];

  // Fetch the questions with correct answers
  const questionsWithAnswers = await db
    .select()
    .from(questionsTable)
    .where(
      questionIds.length === 1
        ? eq(questionsTable.id, questionIds[0])
        : eq(questionsTable.courseId, attempt.courseId)
    );

  const questionMap = new Map(questionsWithAnswers.map(q => [q.id, q]));

  const answerMap = new Map(answers.map(a => [a.questionId, a.selectedAnswer]));

  let correct = 0;
  let wrong = 0;
  let skipped = 0;

  const answerReview = questionIds.map(qid => {
    const q = questionMap.get(qid);
    if (!q) return null;
    const selected = answerMap.get(qid) ?? null;
    const isCorrect = selected === q.correctAnswer;
    if (!selected) skipped++;
    else if (isCorrect) correct++;
    else wrong++;
    return {
      questionId: qid,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      selectedAnswer: selected,
      correctAnswer: q.correctAnswer,
      isCorrect,
      topic: q.topic,
    };
  }).filter(Boolean);

  const score = correct;
  const percentage = Math.round((correct / questionIds.length) * 10000) / 100;
  const completedAt = new Date();

  await db.update(testAttemptsTable).set({
    score,
    correct,
    wrong,
    skipped,
    percentage: String(percentage),
    durationSeconds,
    status: "completed",
    answersJson: answers,
    completedAt,
  }).where(eq(testAttemptsTable.id, attemptId));

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, attempt.courseId)).limit(1);

  res.json({
    attemptId,
    courseId: attempt.courseId,
    courseName: course?.courseName ?? "",
    score,
    totalQuestions: questionIds.length,
    correct,
    wrong,
    skipped,
    percentage,
    durationSeconds,
    completedAt: completedAt.toISOString(),
    answers: answerReview,
  });
});

router.get("/tests/history", requireStudent, async (req, res): Promise<void> => {
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
  const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

  const attempts = await db
    .select()
    .from(testAttemptsTable)
    .where(and(eq(testAttemptsTable.studentId, getStudentCtx(req).studentDbId), eq(testAttemptsTable.status, "completed")))
    .orderBy(desc(testAttemptsTable.completedAt))
    .limit(limit)
    .offset(offset);

  const courseIds = [...new Set(attempts.map(a => a.courseId))];
  const courses = courseIds.length > 0 ? await db.select().from(coursesTable) : [];
  const courseMap = new Map(courses.map(c => [c.id, c.courseName]));

  res.json(attempts.map(a => ({
    id: a.id,
    courseId: a.courseId,
    courseName: courseMap.get(a.courseId) ?? "",
    score: a.score,
    totalQuestions: a.totalQuestions,
    correct: a.correct,
    wrong: a.wrong,
    skipped: a.skipped,
    percentage: parseFloat(String(a.percentage)),
    durationSeconds: a.durationSeconds,
    completedAt: a.completedAt?.toISOString() ?? new Date().toISOString(),
  })));
});

router.get("/tests/:attemptId", requireStudent, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.attemptId) ? req.params.attemptId[0] : req.params.attemptId;
  const attemptId = parseInt(rawId, 10);
  if (isNaN(attemptId)) { res.status(400).json({ error: "Invalid attempt ID" }); return; }

  const [attempt] = await db
    .select()
    .from(testAttemptsTable)
    .where(and(eq(testAttemptsTable.id, attemptId), eq(testAttemptsTable.studentId, getStudentCtx(req).studentDbId)))
    .limit(1);

  if (!attempt || attempt.status !== "completed") {
    res.status(404).json({ error: "Test attempt not found" });
    return;
  }

  const questionIds = (attempt.questionsJson as number[]) ?? [];
  const submittedAnswers = (attempt.answersJson as Array<{ questionId: number; selectedAnswer: string }>) ?? [];
  const answerMap = new Map(submittedAnswers.map(a => [a.questionId, a.selectedAnswer]));

  const questionsData = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.courseId, attempt.courseId));
  const questionMap = new Map(questionsData.map(q => [q.id, q]));

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, attempt.courseId)).limit(1);

  const answerReview = questionIds.map(qid => {
    const q = questionMap.get(qid);
    if (!q) return null;
    const selected = answerMap.get(qid) ?? null;
    return {
      questionId: qid,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      selectedAnswer: selected,
      correctAnswer: q.correctAnswer,
      isCorrect: selected === q.correctAnswer,
      topic: q.topic,
    };
  }).filter(Boolean);

  res.json({
    attemptId,
    courseId: attempt.courseId,
    courseName: course?.courseName ?? "",
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    correct: attempt.correct,
    wrong: attempt.wrong,
    skipped: attempt.skipped,
    percentage: parseFloat(String(attempt.percentage)),
    durationSeconds: attempt.durationSeconds,
    completedAt: attempt.completedAt?.toISOString() ?? new Date().toISOString(),
    answers: answerReview,
  });
});

export default router;
