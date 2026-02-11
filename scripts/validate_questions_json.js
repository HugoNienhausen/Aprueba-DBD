#!/usr/bin/env node
/**
 * Validates data/questions.json against Tarea 0.2 types (ARQUITECTURA §3, §4).
 * Run from repo root: node scripts/validate_questions_json.js
 */
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const jsonPath = path.join(repoRoot, "data", "questions.json");

const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];
const errors = [];

if (!data || typeof data !== "object") {
  errors.push("data must be object");
} else {
  if (!Array.isArray(data.topics)) errors.push("topics must be array");
  else {
    data.topics.forEach((t, i) => {
      if (!t.id || typeof t.title !== "string" || typeof t.section !== "string" || typeof t.sortOrder !== "number")
        errors.push(`topics[${i}]: need id, title, section, sortOrder`);
    });
  }
  if (!Array.isArray(data.questions)) errors.push("questions must be array");
  else {
    const topicIds = new Set((data.topics || []).map((t) => t.id));
    data.questions.forEach((q, i) => {
      if (!q.id || typeof q.number !== "number" || !q.topicId || typeof q.text !== "string")
        errors.push(`questions[${i}]: need id, number, topicId, text`);
      if (!topicIds.has(q.topicId)) errors.push(`questions[${i}]: topicId "${q.topicId}" not in topics`);
      if (!Array.isArray(q.options)) errors.push(`questions[${i}]: options must be array`);
      else {
        q.options.forEach((o, j) => {
          if (!OPTION_LETTERS.includes(o.letter) || typeof o.text !== "string")
            errors.push(`questions[${i}].options[${j}]: need letter A-F and text`);
        });
      }
      if (!OPTION_LETTERS.includes(q.correctLetter))
        errors.push(`questions[${i}]: correctLetter must be A-F`);
      if (q.explicacion !== null && typeof q.explicacion !== "string")
        errors.push(`questions[${i}]: explicacion must be null or string`);
    });
  }
}

if (errors.length) {
  console.error("Validation FAILED:");
  errors.forEach((e) => console.error("  -", e));
  process.exit(1);
}

console.log("OK: topics=" + data.topics.length + ", questions=" + data.questions.length);
console.log("JSON matches Tarea 0.2 types (Topic, Question, QuestionOption, correctLetter, topicId).");
