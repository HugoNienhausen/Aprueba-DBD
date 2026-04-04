export { getDb, persistDb, closeDb } from "./init";
export { importFromJson } from "./import";
export { ensureDataLoaded, type BootstrapResult } from "./bootstrap";
export {
  getTopics,
  getQuestionsByTopicId,
  getQuestionsBySection,
  getQuestionById,
  getQuestionsRandom,
  getFailedQuestionIds,
  getUnansweredQuestionIds,
  saveUserAnswer,
  saveTestSession,
  updateTestSession,
  getPreferences,
  setPreferences,
  getStats,
} from "./repositories";
