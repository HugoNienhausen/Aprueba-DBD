/**
 * Repositorios (capa de datos). Reexporta la API de db para la app.
 * En web usa sql.js + IndexedDB; en móvil se podría cambiar por expo-sqlite.
 */

export {
  ensureDataLoaded,
  getTopics,
  getQuestionsByTopicId,
  getQuestionsBySection,
  getQuestionById,
  getQuestionsRandom,
  getFailedQuestionIds,
  saveUserAnswer,
  saveTestSession,
  updateTestSession,
  getPreferences,
  setPreferences,
  getStats,
} from "../db";
export type { BootstrapResult } from "../db";
export type { Stats } from "../types";
