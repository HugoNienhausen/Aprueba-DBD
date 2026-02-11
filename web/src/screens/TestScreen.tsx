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
  const [kind, setKind] = useState<TestKind | null>(null);
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

    return (
      <div>
        <h1 className="page-title">Test de {questions.length} preguntas</h1>
        <p className="muted mb-2">
          Pregunta {currentIndex + 1} de {questions.length}
          {correctAt === "at_end" && " · Respuestas al final"}
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
            <button type="button" className="btn btn--primary" onClick={goNext}>
              {isLast ? "Ver resultado" : "Siguiente →"}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (loading) return <p className="muted">Cargando…</p>;

  return (
    <div>
      <h1 className="page-title">Hacer test</h1>
      <p className="muted mb-2">
        Elige el modo del test de {TEST_SIZE} preguntas. Luego pulsa «Comenzar».
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p className="section-heading">¿De dónde salen las preguntas?</p>

        <label className="radio-label">
          <input
            type="radio"
            name="kind"
            checked={kind === "by_section"}
            onChange={() => setKind("by_section")}
          />
          <span><strong>Por tema (sección)</strong> — 20 preguntas de un tema completo (ej. &quot;0 Introduction&quot;)</span>
        </label>
        {kind === "by_section" && (
          <div style={{ marginLeft: "1.75rem" }} className="select-wrap">
            <label>
              Tema:{" "}
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                style={{ marginTop: "0.25rem" }}
              >
                {sections.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        <label className="radio-label">
          <input
            type="radio"
            name="kind"
            checked={kind === "by_topic"}
            onChange={() => setKind("by_topic")}
          />
          <span><strong>Por subtema</strong> — 20 preguntas de un subtema concreto (ej. &quot;Basic background&quot;)</span>
        </label>
        {kind === "by_topic" && (
          <div style={{ marginLeft: "1.75rem" }} className="select-wrap">
            <label>
              Subtema:{" "}
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                style={{ marginTop: "0.25rem", minWidth: "20rem" }}
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.section} – {t.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <label className="radio-label">
          <input
            type="radio"
            name="kind"
            checked={kind === "random"}
            onChange={() => setKind("random")}
          />
          <span><strong>Aleatorio</strong> — {TEST_SIZE} preguntas de todos los temas</span>
        </label>

        <label className="radio-label">
          <input
            type="radio"
            name="kind"
            checked={kind === "failed"}
            onChange={() => setKind("failed")}
            disabled={(failedCount ?? 0) === 0}
          />
          <span>
            <strong>Preguntas falladas</strong>
            {(failedCount ?? 0) === 0
              ? " (no tienes ninguna aún)"
              : ` (${Math.min(failedCount!, TEST_SIZE)} preguntas)`}
          </span>
        </label>
        {(failedCount ?? 0) > 0 && (
          <p className="muted mt-2" style={{ marginLeft: "1.75rem" }}>
            <Link to="/review/failed" className="link-plain">Repasarlas en orden →</Link>
          </p>
        )}
      </div>

      <div className="btn-group">
        <button
          type="button"
          className="btn btn--primary"
          onClick={startTest}
          disabled={kind == null || (kind === "by_section" && !selectedSection) || (kind === "by_topic" && !selectedTopicId) || (kind === "failed" && (failedCount ?? 0) === 0)}
        >
          Comenzar test
        </button>
      </div>

      <p className="mt-2">
        <Link to="/topics" className="link-plain">← Volver a temas</Link>
      </p>
    </div>
  );
}
