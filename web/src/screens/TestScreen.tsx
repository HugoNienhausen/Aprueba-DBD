/**
 * Test configurable: selección de temas, aleatorio o falladas.
 * Número de preguntas configurable; si hay menos preguntas en la selección, se usan todas.
 */

import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  getTopics,
  getQuestionsByTopicId,
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
type TestKind = "by_selection" | "random" | "failed";

const QUESTION_COUNT_OPTIONS = [10, 15, 20, 25, 30, 50] as const;

function groupBySection(topics: Topic[]): { section: string; topics: Topic[] }[] {
  const bySection = new Map<string, Topic[]>();
  for (const t of topics) {
    const list = bySection.get(t.section) ?? [];
    list.push(t);
    bySection.set(t.section, list);
  }
  return Array.from(bySection.entries())
    .map(([section, list]) => ({ section, topics: list }))
    .sort((a, b) => {
      const na = parseInt(a.section, 10);
      const nb = parseInt(b.section, 10);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.section.localeCompare(b.section);
    });
}

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
  const location = useLocation();
  const repeatState = location.state as { autoStart?: boolean; kind?: TestKind; selectedTopicIds?: string[]; questionCount?: number } | null;
  const autoStartRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("config");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [failedCount, setFailedCount] = useState<number | null>(null);
  const [kind, setKind] = useState<TestKind>(() => {
    const saved = localStorage.getItem("test-selected-topics");
    return saved ? "by_selection" : "random";
  });
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("test-selected-topics") ?? "[]");
    } catch { return []; }
  });
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [loading, setLoading] = useState(true);

  const sectionsWithTopics = useMemo(() => groupBySection(topics), [topics]);

  useEffect(() => {
    if (selectedTopicIds.length > 0) {
      localStorage.setItem("test-selected-topics", JSON.stringify(selectedTopicIds));
    } else {
      localStorage.removeItem("test-selected-topics");
    }
  }, [selectedTopicIds]);

  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const toggleSection = (section: string) => {
    const sectionTopics = sectionsWithTopics.find((s) => s.section === section)?.topics ?? [];
    const ids = sectionTopics.map((t) => t.id);
    const allSelected = ids.every((id) => selectedTopicIds.includes(id));
    setSelectedTopicIds((prev) =>
      allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    );
  };

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
        // Apply repeat config if navigated from result
        if (repeatState?.autoStart && !autoStartRef.current) {
          autoStartRef.current = true;
          if (repeatState.kind) setKind(repeatState.kind);
          if (repeatState.selectedTopicIds) setSelectedTopicIds(repeatState.selectedTopicIds);
          if (repeatState.questionCount) setQuestionCount(repeatState.questionCount);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && autoStartRef.current && phase === "config") {
      autoStartRef.current = false;
      startTest();
    }
  }, [loading]);

  const startTest = async () => {
    if (kind === "by_selection" && selectedTopicIds.length === 0) return;
    if (kind === "failed" && (failedCount ?? 0) === 0) return;

    const prefs = await getPreferences();
    setCorrectAt(prefs.correctAt);

    const n = Math.max(1, questionCount);
    let qs: Question[] = [];
    const mode: TestMode = kind === "random" ? "random" : kind === "failed" ? "failed" : "by_topic";

    if (kind === "by_selection") {
      const byTopic = await Promise.all(selectedTopicIds.map((id) => getQuestionsByTopicId(id)));
      const merged = byTopic.flat().sort((a, b) => a.number - b.number);
      const unique = Array.from(new Map(merged.map((q) => [q.id, q])).values());
      qs = shuffle(unique).slice(0, n);
    } else if (kind === "random") {
      qs = await getQuestionsRandom(n);
    } else {
      const ids = await getFailedQuestionIds();
      const limited = ids.slice(0, n);
      const resolved = await Promise.all(limited.map((id) => getQuestionById(id)));
      qs = resolved.filter((q): q is Question => q != null);
    }

    if (qs.length === 0) {
      return;
    }

    const sessionIdNew = await saveTestSession({
      mode,
      topicId: null,
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
    // Prevent changing an already-answered question
    if (answers.some((a) => a.questionId === question.id)) return;
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
      finishTest(answers);
      return;
    }
    const nextIndex = currentIndex + 1;
    const existing = answers.find((a) => a.questionId === questions[nextIndex]?.id);
    setCurrentIndex(nextIndex);
    setSelectedLetter(existing?.selectedLetter ?? null);
  };

  const goPrev = () => {
    if (currentIndex <= 0) return;
    const prevIndex = currentIndex - 1;
    const existing = answers.find((a) => a.questionId === questions[prevIndex]?.id);
    setCurrentIndex(prevIndex);
    setSelectedLetter(existing?.selectedLetter ?? null);
  };

  const finishTest = async (allAnswers: AnswerRecord[]) => {
    if (!sessionId) return;
    const correctTotal = allAnswers.filter((a) => a.isCorrect).length;
    await updateTestSession(sessionId, {
      correctCount: correctTotal,
      finishedAt: new Date().toISOString(),
    });
    const allAnswerItems = allAnswers.map((a) => {
      const q = questions.find((x) => x.id === a.questionId)!;
      return { question: q, selectedLetter: a.selectedLetter, correctLetter: q.correctLetter, explicacion: q.explicacion, isCorrect: a.isCorrect };
    });
    navigate("/result", {
      state: {
        correctCount: correctTotal,
        totalQuestions: questions.length,
        allAnswers: allAnswerItems,
        testConfig: { kind, selectedTopicIds, questionCount },
      },
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
          {correctAt === "at_end" && " · Veuràs les respostes al final"}
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
            {currentIndex > 0 && (
              <button type="button" className="btn btn--secondary btn--large" onClick={goPrev}>
                ← Anterior
              </button>
            )}
            <button type="button" className="btn btn--primary btn--large" onClick={goNext}>
              {isLast ? "Veure resultat" : "Següent →"}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (loading) return <p className="muted">Carregant…</p>;

  const canStart =
    (kind === "by_selection" && selectedTopicIds.length > 0) ||
    kind === "random" ||
    (kind === "failed" && (failedCount ?? 0) > 0);

  return (
    <div className="test-config">
      <h1 className="page-title">Fer test</h1>
      <p className="test-config__intro muted">
        Tria una opció i el nombre de preguntes. Si hi ha menys preguntes a la selecció, s'usaran totes.
      </p>

      <div className="test-options">
        <button
          type="button"
          className={`test-option ${kind === "random" ? "test-option--active" : ""}`}
          onClick={() => setKind("random")}
        >
          <span className="test-option__title">Aleatori</span>
          <span className="test-option__desc">De tots els temes</span>
        </button>

        <button
          type="button"
          className={`test-option ${kind === "by_selection" ? "test-option--active" : ""}`}
          onClick={() => setKind("by_selection")}
        >
          <span className="test-option__title">Selecció de temes</span>
          <span className="test-option__desc">Tria els temes o subtemes que vulguis practicar</span>
        </button>
        {kind === "by_selection" && (
          <div className="test-option__extra test-selection">
            {selectedTopicIds.length > 0 && (
              <button
                type="button"
                className="btn btn--small btn--secondary"
                onClick={() => setSelectedTopicIds([])}
                style={{ alignSelf: "flex-end", marginBottom: "0.5rem" }}
              >
                Netejar selecció
              </button>
            )}
            {sectionsWithTopics.map(({ section, topics: sectionTopics }) => {
              const ids = sectionTopics.map((t) => t.id);
              const allInSection = ids.every((id) => selectedTopicIds.includes(id));
              return (
                <div key={section} className="test-selection__section">
                  <label className="test-selection__section-header">
                    <input
                      type="checkbox"
                      checked={allInSection}
                      onChange={() => toggleSection(section)}
                      className="test-selection__checkbox"
                    />
                    <span className="test-selection__section-title">{section}</span>
                  </label>
                  <ul className="test-selection__list">
                    {sectionTopics.map((t) => (
                      <li key={t.id}>
                        <label className="test-selection__item">
                          <input
                            type="checkbox"
                            checked={selectedTopicIds.includes(t.id)}
                            onChange={() => toggleTopic(t.id)}
                            className="test-selection__checkbox"
                          />
                          <span>{t.title}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          className={`test-option ${kind === "failed" ? "test-option--active" : ""} ${(failedCount ?? 0) === 0 ? "test-option--disabled" : ""}`}
          onClick={() => (failedCount ?? 0) > 0 && setKind("failed")}
          disabled={(failedCount ?? 0) === 0}
        >
          <span className="test-option__title">Fallades</span>
          <span className="test-option__desc">
            {(failedCount ?? 0) === 0
              ? "Fes un test abans per tenir errors"
              : `${Math.min(failedCount!, questionCount)} per repassar`}
          </span>
        </button>
        {(failedCount ?? 0) > 0 && kind === "failed" && (
          <p className="test-option__link muted">
            <Link to="/review/failed" className="link-plain">Repassar en ordre →</Link>
          </p>
        )}
      </div>

      <div className="test-config__preguntas">
        <label className="test-config__preguntas-label">
          Preguntes:{" "}
          <select
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="test-option__select"
          >
            {QUESTION_COUNT_OPTIONS.map((num) => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="test-config__actions">
        <button
          type="button"
          className="btn btn--primary btn--large"
          onClick={startTest}
          disabled={!canStart}
        >
          Començar test
        </button>
      </div>
    </div>
  );
}
