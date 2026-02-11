/**
 * Types for the DBD quiz app (ARQUITECTURA §3, JSON import §4).
 * Used by repos and UI; must match data/questions.json and SQL schema.
 */

export type CorrectAt = "immediately" | "at_end";
export type Theme = "light" | "dark";
export type TestSessionMode = "random" | "by_topic" | "failed";
export type OptionLetter = "A" | "B" | "C" | "D" | "E" | "F";

export interface Topic {
  id: string;
  title: string;
  section: string;
  sortOrder: number;
}

export interface QuestionOption {
  letter: OptionLetter;
  text: string;
}

export interface Question {
  id: string;
  number: number;
  topicId: string;
  text: string;
  options: QuestionOption[];
  correctLetter: OptionLetter;
  explicacion: string | null;
}

export interface UserAnswer {
  id: string;
  questionId: string;
  selectedLetter: OptionLetter;
  isCorrect: boolean;
  testSessionId: string | null;
  answeredAt: string; // ISO date
}

export interface TestSession {
  id: string;
  mode: TestSessionMode;
  topicId: string | null;
  totalQuestions: number;
  correctCount: number;
  startedAt: string; // ISO
  finishedAt: string | null; // ISO
}

export interface UserPreferences {
  correctAt: CorrectAt;
  theme: Theme;
}

export interface Stats {
  totalTests: number;
  totalCorrect: number;
  totalQuestions: number;
  failedCount: number;
}

/** JSON shape from data/questions.json (import from PDF). */
export interface QuestionsImport {
  topics: Topic[];
  questions: Question[];
}
