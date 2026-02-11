/**
 * Initialize sql.js database and persist to IndexedDB (Tarea 0.3).
 * Uses localforage to store the DB binary; loads on first getDb(), creates + runs schema if empty.
 */

import initSqlJs, { type Database } from "sql.js";
import localforage from "localforage";

const DB_KEY = "app-dbd-sqlite";
const SCHEMA = `
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  section TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL,
  topic_id TEXT NOT NULL REFERENCES topics(id),
  text TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_letter TEXT NOT NULL CHECK (correct_letter IN ('A','B','C','D','E','F')),
  explicacion TEXT,
  UNIQUE(number)
);
CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_number ON questions(number);
CREATE TABLE IF NOT EXISTS test_sessions (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('random','by_topic','failed')),
  topic_id TEXT REFERENCES topics(id),
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_test_sessions_started_at ON test_sessions(started_at);
CREATE TABLE IF NOT EXISTS user_answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id),
  selected_letter TEXT NOT NULL CHECK (selected_letter IN ('A','B','C','D','E','F')),
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  test_session_id TEXT REFERENCES test_sessions(id),
  answered_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_answers_question_id ON user_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_test_session_id ON user_answers(test_session_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_is_correct ON user_answers(is_correct);
CREATE TABLE IF NOT EXISTS user_preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

let db: Database | null = null;
let initPromise: Promise<Database> | null = null;

async function loadSqlJs() {
  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      // Browser: WASM in public/ is served at /
      if (typeof window !== "undefined") return `/${file}`;
      // Node (tests): path relative to process)
      const pathPrefix = process.env.SQLJS_WASM_PATH ?? "/node_modules/sql.js/dist/";
      return pathPrefix + file;
    },
  });
  return SQL;
}

export async function getDb(): Promise<Database> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async (): Promise<Database> => {
    const SQL = await loadSqlJs();
    const stored = await localforage.getItem<ArrayBuffer>(DB_KEY);
    if (stored && stored.byteLength > 0) {
      const instance = new SQL.Database(new Uint8Array(stored));
      db = instance;
      return instance;
    }
    const instance = new SQL.Database();
    db = instance;
    instance.run(SCHEMA);
    return instance;
  })();

  return initPromise;
}

/** Persist current DB to IndexedDB. Call after mutations. */
export async function persistDb(): Promise<void> {
  if (!db) return;
  const data = db.export();
  await localforage.setItem(DB_KEY, data.buffer);
}

/** Close and clear in-memory DB (e.g. for tests). Does not clear IndexedDB. */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
  initPromise = null;
}
