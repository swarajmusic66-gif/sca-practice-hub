import { pgTable, serial, text, timestamp, integer, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const testAttemptsTable = pgTable("test_attempts", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  courseId: integer("course_id").notNull(),
  score: integer("score").notNull().default(0),
  totalQuestions: integer("total_questions").notNull(),
  correct: integer("correct").notNull().default(0),
  wrong: integer("wrong").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull().default("0"),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  status: text("status").notNull().default("in_progress"),
  questionsJson: jsonb("questions_json"),
  answersJson: jsonb("answers_json"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertTestAttemptSchema = createInsertSchema(testAttemptsTable).omit({ id: true, startedAt: true });
export type InsertTestAttempt = z.infer<typeof insertTestAttemptSchema>;
export type TestAttempt = typeof testAttemptsTable.$inferSelect;
