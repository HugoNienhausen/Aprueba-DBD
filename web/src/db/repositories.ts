/**
 * Data layer: repos using sql.js (Tarea 0.3).
 * All functions use types from web/src/types; no UI dependencies.
 */

import type { Database } from "sql.js";
import type {
  Topic,
  Question,
  QuestionOption,
  UserAnswer,
  TestSession,
  UserPreferences,
  CorrectAt,
  Theme,
  Stats,
} from "../types";
import { getDb, persistDb } from "./init";

function rowToTopic(row: unknown[]): Topic {
  return {
    id: row[0] as string,
    title: row[1] as string,
    section: row[2] as string,
    sortOrder: (row[3] as number) ?? 0,
  };
}

function rowToQuestion(row: unknown[]): Question {
  const options = JSON.parse((row[4] as string) || "[]") as QuestionOption[];
  return {
    id: row[0] as string,
    number: (row[1] as number) ?? 0,
    topicId: row[2] as string,
    text: row[3] as string,
    options,
    correctLetter: row[5] as Question["correctLetter"],
    explicacion: (row[6] as string) || null,
  };
}

export async function getTopics(): Promise<Topic[]> {
  const db = await getDb();
  const stmt = db.prepare("SELECT id, title, section, sort_order FROM topics ORDER BY sort_order");
  const results: Topic[] = [];
  while (stmt.step()) results.push(rowToTopic(stmt.get()));
  stmt.free();
  return results;
}

export async function getQuestionsByTopicId(topicId: string): Promise<Question[]> {
  const db = await getDb();
  const stmt = db.prepare(
    "SELECT id, number, topic_id, text, options, correct_letter, explicacion FROM questions WHERE topic_id = ? ORDER BY number"
  );
  stmt.bind([topicId]);
  const results: Question[] = [];
  while (stmt.step()) results.push(rowToQuestion(stmt.get()));
  stmt.free();
  return results;
}

/** Todas las preguntas de una sección (tema), ordenadas por número. */
export async function getQuestionsBySection(section: string): Promise<Question[]> {
  const db = await getDb();
  const stmt = db.prepare(
    `SELECT q.id, q.number, q.topic_id, q.text, q.options, q.correct_letter, q.explicacion
     FROM questions q JOIN topics t ON q.topic_id = t.id
     WHERE t.section = ? ORDER BY q.number`
  );
  stmt.bind([section]);
  const results: Question[] = [];
  while (stmt.step()) results.push(rowToQuestion(stmt.get()));
  stmt.free();
  return results;
}

export async function getQuestionById(id: string): Promise<Question | null> {
  const db = await getDb();
  const stmt = db.prepare(
    "SELECT id, number, topic_id, text, options, correct_letter, explicacion FROM questions WHERE id = ?"
  );
  stmt.bind([id]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const q = rowToQuestion(stmt.get());
  stmt.free();
  return q;
}

export async function getQuestionsRandom(limit: number): Promise<Question[]> {
  const db = await getDb();
  const stmt = db.prepare(
    "SELECT id, number, topic_id, text, options, correct_letter, explicacion FROM questions ORDER BY RANDOM() LIMIT ?"
  );
  stmt.bind([limit]);
  const results: Question[] = [];
  while (stmt.step()) results.push(rowToQuestion(stmt.get()));
  stmt.free();
  return results;
}

/** Question IDs that have at least one incorrect user answer (for "failed" mode). */
export async function getFailedQuestionIds(): Promise<string[]> {
  const db = await getDb();
  const stmt = db.prepare(
    `SELECT DISTINCT question_id FROM user_answers WHERE is_correct = 0
     AND question_id NOT IN (
       SELECT a.question_id FROM user_answers a
       WHERE a.is_correct = 1
       AND a.answered_at = (
         SELECT MAX(a2.answered_at) FROM user_answers a2
         WHERE a2.question_id = a.question_id
       )
     )`
  );
  const ids: string[] = [];
  while (stmt.step()) ids.push((stmt.get()[0] as string) ?? "");
  stmt.free();
  return ids;
}

export async function saveUserAnswer(
  answer: Omit<UserAnswer, "id">
): Promise<void> {
  const db = await getDb();
  const id = `ua_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  db.run(
    "INSERT INTO user_answers (id, question_id, selected_letter, is_correct, test_session_id, answered_at) VALUES (?, ?, ?, ?, ?, ?)",
    [
      id,
      answer.questionId,
      answer.selectedLetter,
      answer.isCorrect ? 1 : 0,
      answer.testSessionId ?? null,
      answer.answeredAt,
    ]
  );
  await persistDb();
}

export async function saveTestSession(
  session: Omit<TestSession, "id"> & { id?: string }
): Promise<string> {
  const db = await getDb();
  const id = session.id ?? `ts_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  db.run(
    "INSERT INTO test_sessions (id, mode, topic_id, total_questions, correct_count, started_at, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      session.mode,
      session.topicId ?? null,
      session.totalQuestions,
      session.correctCount,
      session.startedAt,
      session.finishedAt ?? null,
    ]
  );
  await persistDb();
  return id;
}

export async function updateTestSession(
  sessionId: string,
  updates: { correctCount: number; finishedAt: string }
): Promise<void> {
  const db = await getDb();
  db.run(
    "UPDATE test_sessions SET correct_count = ?, finished_at = ? WHERE id = ?",
    [updates.correctCount, updates.finishedAt, sessionId]
  );
  await persistDb();
}

export async function getPreferences(): Promise<UserPreferences> {
  const db = await getDb();
  const stmt = db.prepare("SELECT key, value FROM user_preferences");
  const prefs: Record<string, string> = {};
  while (stmt.step()) {
    const row = stmt.get();
    prefs[(row[0] as string) ?? ""] = (row[1] as string) ?? "";
  }
  stmt.free();
  return {
    correctAt: (prefs.correctAt as CorrectAt) || "immediately",
    theme: (prefs.theme as Theme) || "light",
  };
}

export async function setPreferences(prefs: Partial<UserPreferences>): Promise<void> {
  const db = await getDb();
  if (prefs.correctAt !== undefined) {
    db.run("INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('correctAt', ?)", [
      prefs.correctAt,
    ]);
  }
  if (prefs.theme !== undefined) {
    db.run("INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('theme', ?)", [
      prefs.theme,
    ]);
  }
  if (prefs.correctAt !== undefined || prefs.theme !== undefined) await persistDb();
}

export async function getStats(): Promise<Stats> {
  const db = await getDb();
  const stmt = db.prepare(
    "SELECT COUNT(*) as n, COALESCE(SUM(correct_count), 0) as correct, COALESCE(SUM(total_questions), 0) as total FROM test_sessions WHERE finished_at IS NOT NULL"
  );
  stmt.step();
  const row = stmt.get();
  stmt.free();
  const totalTests = (row[0] as number) ?? 0;
  const totalCorrect = (row[1] as number) ?? 0;
  const totalQuestions = (row[2] as number) ?? 0;
  const failedStmt = db.prepare(
    "SELECT COUNT(DISTINCT question_id) FROM user_answers WHERE is_correct = 0"
  );
  failedStmt.step();
  const failedCount = (failedStmt.get()[0] as number) ?? 0;
  failedStmt.free();
  return { totalTests, totalCorrect, totalQuestions, failedCount };
}
