/**
 * Validates data/questions.json shape against QuestionsImport (Tarea 0.2 criteria).
 * Run with: npx tsx src/types/validate-import.ts (or ts-node)
 * Or from repo root: node -e "require('./data/questions.json')" then check in app.
 */

import type { QuestionsImport, Topic, Question, QuestionOption } from "./index";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(msg);
}

export function validateQuestionsImport(data: unknown): data is QuestionsImport {
  assert(data !== null && typeof data === "object", "data must be object");
  const d = data as Record<string, unknown>;
  assert(Array.isArray(d.topics), "topics must be array");
  assert(Array.isArray(d.questions), "questions must be array");

  const topics = d.topics as Topic[];
  const questions = d.questions as Question[];

  for (let i = 0; i < topics.length; i++) {
    const t = topics[i] as unknown as Record<string, unknown>;
    assert(typeof t.id === "string", `topics[${i}].id`);
    assert(typeof t.title === "string", `topics[${i}].title`);
    assert(typeof t.section === "string", `topics[${i}].section`);
    assert(typeof t.sortOrder === "number", `topics[${i}].sortOrder`);
  }

  const topicIds = new Set(topics.map((t) => t.id));

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] as unknown as Record<string, unknown>;
    assert(typeof q.id === "string", `questions[${i}].id`);
    assert(typeof q.number === "number", `questions[${i}].number`);
    assert(typeof q.topicId === "string", `questions[${i}].topicId`);
    assert(topicIds.has(q.topicId as string), `questions[${i}].topicId must exist in topics`);
    assert(typeof q.text === "string", `questions[${i}].text`);
    assert(Array.isArray(q.options), `questions[${i}].options`);
    for (const o of q.options as QuestionOption[]) {
      assert(OPTION_LETTERS.includes(o.letter), `questions[${i}].options[].letter in A-F`);
      assert(typeof o.text === "string", `questions[${i}].options[].text`);
    }
    assert(OPTION_LETTERS.includes(q.correctLetter as (typeof OPTION_LETTERS)[number]), `questions[${i}].correctLetter`);
    assert(q.explicacion === null || typeof q.explicacion === "string", `questions[${i}].explicacion`);
  }

  return true;
}
