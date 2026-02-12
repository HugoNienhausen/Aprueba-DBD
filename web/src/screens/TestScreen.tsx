/**
 * Test de 20 preguntas (Tarea 1.5).
 * Modos: por tema, aleatorio, falladas. Preferencia correctAt (al momento / al final).
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getTopics,
  getQuestionsByTopicId,
  getQuestionsBySection,
  getQuestionsRandom,
  getFailedQuestionIds,
  getQuestionById,
  getPreferences,
  saveTestSession,
  updateTestSession,
  saveUserAnswer,
} from "../repos";
import type { Topic, Question, OptionLetter, TestSessionMode } from "../types";
import QuestionCard from "../components/QuestionCard";

type TestMode = TestSessionMode;
type TestKind = "by_section" | "by_topic" | "random" | "failed";
const TEST_SIZE = 20;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type Phase = "config" | "running";

interface AnswerRecord {
  questionId: string;
  selectedLetter: OptionLetter;
  isCorrect: boolean;
}

export default function TestScreen() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("config");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [failedCount, setFailedCount] = useState<number | null>(null);
  const [kind, setKind] = useState<TestKind>("by_section");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const sections = Array.from(new Set(topics.map((t) => t.section))).sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [correctAt, setCorrectAt] = useState<"immediately" | "at_end">("immediately");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<OptionLetter | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);

  useEffect(() => {
    Promise.all([getTopics(), getFailedQuestionIds()])
      .then(([t, ids]) => {
        setTopics(t);
        setFailedCount(ids.length);
        if (t.length > 0) {
          const secs = Array.from(new Set(t.map((x) => x.section))).sort((a, b) => {
            const na = parseInt(a, 10);
            const nb = parseInt(b, 10);
            if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
            return a.localeCompare(b);
          });
          setSelectedSection((prev) => (prev ? prev : secs[0] ?? ""));
          setSelectedTopicId((prev) => (prev ? prev : t[0].id));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const startTest = async () => {
    if (kind === "by_section" && !selectedSection) return;
    if (kind === "by_topic" && !selectedTopicId) return;
    if (kind === "failed" && (failedCount ?? 0) === 0) return;

    const prefs = await getPreferences();
    setCorrectAt(prefs.correctAt);

    let qs: Question[] = [];
    const mode: TestMode = kind === "random" ? "random" : kind === "failed" ? "failed" : "by_topic";
    const topicIdForSession = kind === "by_topic" ? selectedTopicId : null;

    if (kind === "by_section") {
      const all = await getQuestionsBySection(selectedSection);
      qs = shuffle(all).slice(0, TEST_SIZE);
    } else if (kind === "by_topic") {
      const all = await getQuestionsByTopicId(selectedTopicId);
      qs = shuffle(all).slice(0, TEST_SIZE);
    } else if (kind === "random") {
      qs = await getQuestionsRandom(TEST_SIZE);
    } else {
      const ids = await getFailedQuestionIds();
      const limited = ids.slice(0, TEST_SIZE);
      const resolved = await Promise.all(limited.map((id) => getQuestionById(id)));
      qs = resolved.filter((q): q is Question => q != null);
    }

    if (qs.length === 0) {
      return;
    }

    const sessionIdNew = await saveTestSession({
      mode,
      topicId: topicIdForSession,
      totalQuestions: qs.length,
      correctCount: 0,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    });

    setQuestions(qs);
    setSessionId(sessionIdNew);
    setCurrentIndex(0);
    setSelectedLetter(null);
    setAnswers([]);
    setPhase("running");
  };

  const handleSelectOption = (letter: OptionLetter) => {
    if (questions.length === 0 || !sessionId) return;
    const question = questions[currentIndex];
    if (!question) return;
    const isCorrect = letter === question.correctLetter;
    const newAnswer: AnswerRecord = { questionId: question.id, selectedLetter: letter, isCorrect };
    const newAnswers = [...answers, newAnswer];
    setSelectedLetter(letter);
    setAnswers(newAnswers);
    saveUserAnswer({
      questionId: question.id,
      selectedLetter: letter,
      isCorrect,
      testSessionId: sessionId,
      answeredAt: new Date().toISOString(),
    }).catch((err) => console.error("saveUserAnswer failed:", err));

    if (correctAt === "at_end") {
      if (currentIndex >= questions.length - 1) {
        finishTest(newAnswers);
      } else {
        setCurrentIndex((i) => i + 1);
        setSelectedLetter(null);
      }
    }
  };

  const goNext = () => {
    if (currentIndex >= questions.length - 1) {
      // En modo "immediately" answers ya incluye la última (se añadió en handleSelectOption)
      finishTest(answers);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedLetter(null);
  };

  const finishTest = async (allAnswers: AnswerRecord[]) => {
    if (!sessionId) return;
    const correctTotal = allAnswers.filter((a) => a.isCorrect).length;
    await updateTestSession(sessionId, {
      correctCount: correctTotal,
      finishedAt: new Date().toISOString(),
    });
    const wrongAnswers = allAnswers
      .filter((a) => !a.isCorrect)
      .map((a) => {
        const q = questions.find((x) => x.id === a.questionId)!;
        return { question: q, selectedLetter: a.selectedLetter, correctLetter: q.correctLetter, explicacion: q.explicacion };
      });
    navigate("/result", {
      state: { correctCount: correctTotal, totalQuestions: questions.length, wrongAnswers },
    });
  };

  if (phase === "running" && questions.length > 0) {
    const question = questions[currentIndex]!;
    const answered = selectedLetter !== null;
    const isLast = currentIndex === questions.length - 1;
    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
      <div className="test-running">
        <div className="test-progress">
          <div className="test-progress__bar" style={{ width: `${progress}%` }} />
        </div>
        <p className="test-progress__label">
          Pregunta {currentIndex + 1} de {questions.length}
          {correctAt === "at_end" && " · Verás las respuestas al final"}
        </p>

        <QuestionCard
          question={question}
          selectedLetter={selectedLetter}
          onSelect={handleSelectOption}
          disabled={answered}
          showCorrectAnswer={correctAt === "immediately"}
        />

        {answered && correctAt === "immediately" && (
          <div className="nav-questions">
            <button type="button" className="btn btn--primary btn--large" onClick={goNext}>
              {isLast ? "Ver resultado" : "Siguiente →"}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (loading) return <p className="muted">Cargando…</p>;

  const canStart =
    (kind === "by_section" && selectedSection) ||
    (kind === "by_topic" && selectedTopicId) ||
    kind === "random" ||
    (kind === "failed" && (failedCount ?? 0) > 0);

  return (
    <div className="test-config">
      <h1 className="page-title">Hacer test</h1>
      <p className="test-config__intro muted">
        {TEST_SIZE} preguntas. Elige una opción y pulsa Comenzar.
      </p>

      <div className="test-options">
        <button
          type="button"
          className={`test-option ${kind === "by_section" ? "test-option--active" : ""}`}
          onClick={() => setKind("by_section")}
        >
          <span className="test-option__title">Tema</span>
          <span className="test-option__desc">Una sección entera (ej. 0 Introduction)</span>
        </button>
        {kind === "by_section" && (
          <div className="test-option__extra">
            <label className="test-option__label">Tema</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="test-option__select"
            >
              {sections.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        <button
          type="button"
          className={`test-option ${kind === "by_topic" ? "test-option--active" : ""}`}
          onClick={() => setKind("by_topic")}
        >
          <span className="test-option__title">Subtema</span>
          <span className="test-option__desc">Un tema concreto (ej. Basic background)</span>
        </button>
        {kind === "by_topic" && (
          <div className="test-option__extra">
            <label className="test-option__label">Subtema</label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="test-option__select test-option__select--wide"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.section} – {t.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="button"
          className={`test-option ${kind === "random" ? "test-option--active" : ""}`}
          onClick={() => setKind("random")}
        >
          <span className="test-option__title">Aleatorio</span>
          <span className="test-option__desc">De todos los temas</span>
        </button>

        <button
          type="button"
          className={`test-option ${kind === "failed" ? "test-option--active" : ""} ${(failedCount ?? 0) === 0 ? "test-option--disabled" : ""}`}
          onClick={() => (failedCount ?? 0) > 0 && setKind("failed")}
          disabled={(failedCount ?? 0) === 0}
        >
          <span className="test-option__title">Falladas</span>
          <span className="test-option__desc">
            {(failedCount ?? 0) === 0
              ? "Haz antes un test para tener fallos"
              : `${Math.min(failedCount!, TEST_SIZE)} para repasar`}
          </span>
        </button>
        {(failedCount ?? 0) > 0 && kind === "failed" && (
          <p className="test-option__link muted">
            <Link to="/review/failed" className="link-plain">Repasar en orden →</Link>
          </p>
        )}
      </div>

      <div className="test-config__actions">
        <button
          type="button"
          className="btn btn--primary btn--large"
          onClick={startTest}
          disabled={!canStart}
        >
          Comenzar test
        </button>
      </div>
    </div>
  );
}
