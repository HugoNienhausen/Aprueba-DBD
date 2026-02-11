-- DBD quiz app: schema for sql.js (web) / expo-sqlite (mobile).
-- ARQUITECTURA §3; allows: topics, questions by topic/id/random, user_answers, test_sessions, preferences.

-- Topics from PDF index (section headers).
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  section TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

-- Questions: options stored as JSON array [{ letter, text }].
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL,
  topic_id TEXT NOT NULL REFERENCES topics(id),
  text TEXT NOT NULL,
  options TEXT NOT NULL,  -- JSON: QuestionOption[]
  correct_letter TEXT NOT NULL CHECK (correct_letter IN ('A','B','C','D','E','F')),
  explicacion TEXT,
  UNIQUE(number)
);

CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_number ON questions(number);

-- Test sessions (each run of 20 questions); must exist before user_answers.
CREATE TABLE IF NOT EXISTS test_sessions (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('random','by_topic','failed')),
  topic_id TEXT REFERENCES topics(id),
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  started_at TEXT NOT NULL,   -- ISO
  finished_at TEXT             -- ISO, null until completed
);

CREATE INDEX IF NOT EXISTS idx_test_sessions_started_at ON test_sessions(started_at);

-- User answers (for "failed" mode and stats).
CREATE TABLE IF NOT EXISTS user_answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id),
  selected_letter TEXT NOT NULL CHECK (selected_letter IN ('A','B','C','D','E','F')),
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  test_session_id TEXT REFERENCES test_sessions(id),
  answered_at TEXT NOT NULL  -- ISO date
);

CREATE INDEX IF NOT EXISTS idx_user_answers_question_id ON user_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_test_session_id ON user_answers(test_session_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_is_correct ON user_answers(is_correct);

-- User preferences (singleton: one row or key-value).
CREATE TABLE IF NOT EXISTS user_preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Store: INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('correctAt', 'immediately'|'at_end');
