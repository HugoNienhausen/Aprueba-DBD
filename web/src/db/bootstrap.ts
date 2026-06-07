/**
 * Tarea 0.4: ensure data is loaded on app startup.
 * If DB has no topics/questions, fetch questions.json and import.
 */

import type { QuestionsImport } from "../types";
import { validateQuestionsImport } from "../types/validate-import";
import { importFromJson } from "./import";
import { getDb } from "./init";
import { getTopics } from "./repositories";

const QUESTIONS_JSON_URL = "/data/questions_new.json";

/**
 * Bump this version whenever questions data changes.
 * Users with an older version will get a transparent re-import
 * without losing their test history (user_answers, test_sessions).
 */
const DATA_VERSION = 6;
const DATA_VERSION_KEY = "data_version";

export type BootstrapResult =
  | { ok: true; imported: true; topicCount: number; questionCount: number }
  | { ok: true; imported: false; topicCount: number; questionCount: number }
  | { ok: false; error: string };

function getStoredVersion(db: import("sql.js").Database): number {
  try {
    const stmt = db.prepare("SELECT value FROM user_preferences WHERE key = ?");
    stmt.bind([DATA_VERSION_KEY]);
    if (stmt.step()) {
      const v = Number(stmt.get()[0]);
      stmt.free();
      return v;
    }
    stmt.free();
  } catch { /* table may not exist yet */ }
  return 0;
}

function setStoredVersion(db: import("sql.js").Database, version: number): void {
  db.run(
    "INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)",
    [DATA_VERSION_KEY, String(version)]
  );
}

/**
 * Ensures the DB has topics and questions. If empty or outdated,
 * fetches questions JSON and re-imports. Preserves user history.
 */
export async function ensureDataLoaded(): Promise<BootstrapResult> {
  try {
    const db = await getDb();
    const topics = await getTopics();
    const storedVersion = getStoredVersion(db);
    const needsUpdate = storedVersion < DATA_VERSION;

    if (topics.length > 0 && !needsUpdate) {
      const stmt = db.prepare("SELECT COUNT(*) FROM questions");
      stmt.step();
      const questionCount = (stmt.get()[0] as number) ?? 0;
      stmt.free();
      return { ok: true, imported: false, topicCount: topics.length, questionCount };
    }

    // Clear old question data (keep user history)
    if (needsUpdate && topics.length > 0) {
      db.run("DELETE FROM questions");
      db.run("DELETE FROM topics");
    }

    const res = await fetch(QUESTIONS_JSON_URL);
    if (!res.ok) {
      return { ok: false, error: `No se pudo cargar ${QUESTIONS_JSON_URL}: ${res.status}` };
    }
    const data: unknown = await res.json();
    if (!validateQuestionsImport(data)) {
      return { ok: false, error: "El JSON de preguntas no tiene la estructura esperada." };
    }

    await importFromJson(db, data as QuestionsImport);
    setStoredVersion(db, DATA_VERSION);

    const topicsAfter = await getTopics();
    const stmt = db.prepare("SELECT COUNT(*) FROM questions");
    stmt.step();
    const questionCount = (stmt.get()[0] as number) ?? 0;
    stmt.free();

    return {
      ok: true,
      imported: true,
      topicCount: topicsAfter.length,
      questionCount,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
