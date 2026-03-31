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

export type BootstrapResult =
  | { ok: true; imported: true; topicCount: number; questionCount: number }
  | { ok: true; imported: false; topicCount: number; questionCount: number }
  | { ok: false; error: string };

/**
 * Ensures the DB has topics and questions. If empty, fetches questions.json
 * and runs the importer. Idempotent; does not overwrite existing data.
 */
export async function ensureDataLoaded(): Promise<BootstrapResult> {
  try {
    const db = await getDb();
    const topics = await getTopics();

    if (topics.length > 0) {
      const stmt = db.prepare("SELECT COUNT(*) FROM questions");
      stmt.step();
      const questionCount = (stmt.get()[0] as number) ?? 0;
      stmt.free();
      return { ok: true, imported: false, topicCount: topics.length, questionCount };
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
