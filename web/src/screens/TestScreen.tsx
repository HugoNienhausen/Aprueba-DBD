/**
 * Test configurable: selección de temas, aleatorio o falladas.
 * Número de preguntas configurable; si hay menos preguntas en la selección, se usan todas.
 */

import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  getTopics,
  getQuestionsByTopicId,
  getFailedQuestionIds,
  getUnansweredQuestionIds,
  getUnansweredCountByTopic,
  getQuestionById,
  getPreferences,
  saveTestSession,
  updateTestSession,
  saveUserAnswer,
} from "../repos";
import type { Topic, Question, OptionLetter, TestSessionMode } from "../types";
import QuestionCard from "../components/QuestionCard";
import Jumper, { type JumperItemState } from "../components/Jumper";

type TestMode = TestSessionMode;
type TestKind = "by_selection" | "failed" | "unanswered";

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
  const [unansweredCount, setUnansweredCount] = useState<number | null>(null);
  const [unansweredByTopic, setUnansweredByTopic] = useState<Record<string, number>>({});
  const [unansweredTopicIds, setUnansweredTopicIds] = useState<string[]>([]);
  const [kind, setKind] = useState<TestKind>("by_selection");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("test-selected-topics") ?? "[]");
    } catch { return []; }
  });
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [flashMode, setFlashMode] = useState(false);
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
    Promise.all([getTopics(), getFailedQuestionIds(), getUnansweredQuestionIds(), getUnansweredCountByTopic()])
      .then(([t, failedIds, unansweredIds, byTopic]) => {
        setTopics(t);
        setFailedCount(failedIds.length);
        setUnansweredCount(unansweredIds.length);
        setUnansweredByTopic(byTopic);
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
    if (kind === "unanswered") {
      const effectiveCount = unansweredTopicIds.length > 0
        ? unansweredTopicIds.reduce((sum, id) => sum + (unansweredByTopic[id] ?? 0), 0)
        : (unansweredCount ?? 0);
      if (effectiveCount === 0) return;
    }

    const prefs = await getPreferences();
    setCorrectAt(prefs.correctAt);

    const n = Math.max(1, questionCount);
    let qs: Question[] = [];
    const mode: TestMode = kind === "failed" ? "failed" : "by_topic";

    if (kind === "by_selection") {
      const byTopic = await Promise.all(selectedTopicIds.map((id) => getQuestionsByTopicId(id)));
      const merged = byTopic.flat().sort((a, b) => a.number - b.number);
      const unique = Array.from(new Map(merged.map((q) => [q.id, q])).values());
      qs = shuffle(unique).slice(0, n);
    } else if (kind === "unanswered") {
      const ids = await getUnansweredQuestionIds(unansweredTopicIds.length > 0 ? unansweredTopicIds : undefined);
      const limited = shuffle(ids).slice(0, n);
      const resolved = await Promise.all(limited.map((id) => getQuestionById(id)));
      qs = resolved.filter((q): q is Question => q != null);
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

    // Flash mode: auto-advance after brief delay
    if (flashMode && correctAt === "immediately") {
      setTimeout(() => {
        if (currentIndex >= questions.length - 1) {
          finishTest(newAnswers);
        } else {
          setCurrentIndex((i) => i + 1);
          setSelectedLetter(null);
        }
      }, 800);
    }
  };

  const goNext = () => {
    if (currentIndex >= questions.length - 1) return;
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

  const goTo = (i: number) => {
    const existing = answers.find((a) => a.questionId === questions[i]?.id);
    setCurrentIndex(i);
    setSelectedLetter(existing?.selectedLetter ?? null);
  };

  const getJumperState = (i: number): JumperItemState => {
    const a = answers.find((a) => a.questionId === questions[i]?.id);
    if (!a) return undefined;
    if (correctAt === "immediately") return a.isCorrect ? "correct" : "wrong";
    return "answered";
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
    const allAnswered = answers.length >= questions.length;
    const progress = ((answers.length) / questions.length) * 100;
    const correctSoFar = answers.filter((a) => a.isCorrect).length;
    const wrongSoFar = answers.length - correctSoFar;

    if (flashMode) {
      return (
        <div className="test-running test-running--flash">
          <div className="test-progress">
            <div className="test-progress__bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="flash-header">
            <span className="flash-counter flash-counter--correct">✓ {correctSoFar}</span>
            <span className="flash-counter flash-counter--wrong">✗ {wrongSoFar}</span>
            <span className="muted">{answers.length} / {questions.length}</span>
          </div>

          <QuestionCard
            question={question}
            selectedLetter={selectedLetter}
            onSelect={handleSelectOption}
            disabled={answered}
            showCorrectAnswer={correctAt === "immediately"}
            hideExplanation
          />
          <p className="mt-2">
            <button type="button" className="link-plain" onClick={() => setPhase("config")}>← Sortir del test</button>
          </p>
        </div>
      );
    }

    return (
      <div className="test-running">
        <div className="test-progress">
          <div className="test-progress__bar" style={{ width: `${progress}%` }} />
        </div>
        <p className="test-progress__label">
          Pregunta {currentIndex + 1} de {questions.length} · {answers.length} respostes
          {correctAt === "at_end" && " · Veuràs les respostes al final"}
        </p>

        <Jumper total={questions.length} current={currentIndex} onJump={goTo} getState={getJumperState} />

        <QuestionCard
          question={question}
          selectedLetter={selectedLetter}
          onSelect={handleSelectOption}
          disabled={answered}
          showCorrectAnswer={correctAt === "immediately"}
        />

        <div className="nav-questions">
          {currentIndex > 0 && (
            <button type="button" className="btn btn--secondary btn--large" onClick={goPrev}>
              ← Anterior
            </button>
          )}
          {currentIndex < questions.length - 1 && (
            <button type="button" className="btn btn--secondary btn--large" onClick={goNext}>
              Següent →
            </button>
          )}
          {allAnswered && (
            <button type="button" className="btn btn--primary btn--large" onClick={() => finishTest(answers)}>
              Veure resultat
            </button>
          )}
        </div>
        <p className="mt-2">
          <Link to="/test" className="link-plain">← Sortir del test</Link>
        </p>
      </div>
    );
  }

  if (loading) return <p className="muted">Carregant…</p>;

  const canStart =
    (kind === "by_selection" && selectedTopicIds.length > 0) ||
    (kind === "failed" && (failedCount ?? 0) > 0) ||
    (kind === "unanswered" && (unansweredCount ?? 0) > 0);

  return (
    <div className="test-config">
      <h1 className="page-title">Fer test</h1>
      <p className="test-config__intro muted">
        Tria una opció i el nombre de preguntes. Si hi ha menys preguntes a la selecció, s'usaran totes.
      </p>

      <div className="test-options">
        <button
          type="button"
          className={`test-option ${kind === "by_selection" ? "test-option--active" : ""}`}
          onClick={() => setKind("by_selection")}
        >
          <span className="test-option__radio" />
          <div>
            <span className="test-option__title">Aleatori per temes</span>
            <span className="test-option__desc">Tria els temes o subtemes que vulguis practicar</span>
          </div>
        </button>
        {kind === "by_selection" && (
          <div className="test-option__extra test-selection">
            {selectedTopicIds.length > 0 && (
              <button
                type="button"
                className="clear-selection-btn"
                onClick={() => setSelectedTopicIds([])}
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
          <span className="test-option__radio" />
          <div>
            <span className="test-option__title">Fallades</span>
            <span className="test-option__desc">
              {(failedCount ?? 0) === 0
                ? "Fes un test abans per tenir errors"
                : `${Math.min(failedCount!, questionCount)} per repassar`}
            </span>
            {(failedCount ?? 0) > 0 && kind === "failed" && (
              <Link to="/review/failed" className="link-plain test-option__inline-link" onClick={(e) => e.stopPropagation()}>Repassar en ordre →</Link>
            )}
          </div>
        </button>

        <button
          type="button"
          className={`test-option ${kind === "unanswered" ? "test-option--active" : ""} ${(unansweredCount ?? 0) === 0 ? "test-option--disabled" : ""}`}
          onClick={() => (unansweredCount ?? 0) > 0 && setKind("unanswered")}
          disabled={(unansweredCount ?? 0) === 0}
        >
          <span className="test-option__radio" />
          <div>
            <span className="test-option__title">No intentades</span>
            <span className="test-option__desc">
              {(unansweredCount ?? 0) === 0
                ? "Ja has respost totes les preguntes!"
                : `${unansweredCount} preguntes per descobrir`}
            </span>
          </div>
        </button>
        {kind === "unanswered" && (unansweredCount ?? 0) > 0 && (
          <div className="test-option__extra test-selection">
            {unansweredTopicIds.length > 0 && (
              <button
                type="button"
                className="clear-selection-btn"
                onClick={() => setUnansweredTopicIds([])}
              >
                Netejar selecció
              </button>
            )}
            {sectionsWithTopics.map(({ section, topics: sectionTopics }) => {
              const sectionUnanswered = sectionTopics.reduce((sum, t) => sum + (unansweredByTopic[t.id] ?? 0), 0);
              if (sectionUnanswered === 0) return null;
              const ids = sectionTopics.filter((t) => (unansweredByTopic[t.id] ?? 0) > 0).map((t) => t.id);
              const allInSection = ids.every((id) => unansweredTopicIds.includes(id));
              return (
                <div key={section} className="test-selection__section">
                  <label className="test-selection__section-header">
                    <input
                      type="checkbox"
                      checked={allInSection}
                      onChange={() => {
                        setUnansweredTopicIds((prev) =>
                          allInSection ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]
                        );
                      }}
                      className="test-selection__checkbox"
                    />
                    <span className="test-selection__section-title">{section}</span>
                    <span className="muted" style={{ marginLeft: "0.5rem", fontSize: "0.8rem" }}>({sectionUnanswered})</span>
                  </label>
                  <ul className="test-selection__list">
                    {sectionTopics.map((t) => {
                      const count = unansweredByTopic[t.id] ?? 0;
                      if (count === 0) return null;
                      return (
                        <li key={t.id}>
                          <label className="test-selection__item">
                            <input
                              type="checkbox"
                              checked={unansweredTopicIds.includes(t.id)}
                              onChange={() => {
                                setUnansweredTopicIds((prev) =>
                                  prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                                );
                              }}
                              className="test-selection__checkbox"
                            />
                            <span>{t.title}</span>
                            <span className="muted" style={{ marginLeft: "0.35rem", fontSize: "0.8rem" }}>({count})</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
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

      <div className="test-config__flash">
        <label className="flash-toggle">
          <input
            type="checkbox"
            checked={flashMode}
            onChange={(e) => setFlashMode(e.target.checked)}
          />
          <span>⚡ Mode Flash</span>
          <span className="muted" style={{ fontSize: "0.8rem", marginLeft: "0.35rem" }}>sense explicacions, resposta ràpida</span>
        </label>
      </div>

      <div className="test-config__actions">
        <button
          type="button"
          className="btn btn--primary btn--large"
          onClick={startTest}
          disabled={!canStart}
        >
          {flashMode ? "⚡ Començar Flash" : "Començar test"}
        </button>
      </div>
    </div>
  );
}
