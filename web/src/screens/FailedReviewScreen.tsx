/**
 * Repaso falladas (Tarea 1.6). Preguntas falladas en orden, corrección al momento, saveUserAnswer (testSessionId: null).
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFailedQuestionIds, getQuestionById, saveUserAnswer } from "../repos";
import type { Question, OptionLetter } from "../types";
import QuestionCard from "../components/QuestionCard";

interface AnswerRecord {
  questionId: string;
  selectedLetter: OptionLetter;
}

export default function FailedReviewScreen() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<OptionLetter | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setCurrentIndex(0);
    setSelectedLetter(null);
    setAnswers([]);
    getFailedQuestionIds()
      .then((ids) => Promise.all(ids.map((id) => getQuestionById(id))))
      .then((resolved) => {
        const qs = resolved.filter((q): q is Question => q != null);
        qs.sort((a, b) => a.number - b.number);
        setQuestions(qs);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectOption = (letter: OptionLetter) => {
    if (questions.length === 0) return;
    const question = questions[currentIndex];
    if (!question) return;
    if (answers.some((a) => a.questionId === question.id)) return;
    const isCorrect = letter === question.correctLetter;
    setSelectedLetter(letter);
    setAnswers((prev) => [...prev, { questionId: question.id, selectedLetter: letter }]);
    saveUserAnswer({
      questionId: question.id,
      selectedLetter: letter,
      isCorrect,
      testSessionId: null,
      answeredAt: new Date().toISOString(),
    }).catch((err) => console.error("saveUserAnswer failed:", err));
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

  if (loading) return <p className="muted">Carregant preguntes fallades…</p>;
  if (error) return <p className="alert-error"><strong>Error:</strong> {error}</p>;
  if (questions.length === 0) {
    return (
      <div>
        <h1 className="page-title">Repàs: preguntes fallades</h1>
        <p className="muted">No tens preguntes fallades. Fes un test per acumular respostes incorrectes.</p>
        <p className="mt-2">
          <Link to="/test" className="link-plain">Fer test</Link> · <Link to="/topics" className="link-plain">← Tornar a temes</Link>
        </p>
      </div>
    );
  }

  const question = questions[currentIndex]!;
  const answered = selectedLetter !== null;

  return (
    <div>
      <h1 className="page-title">Repàs: preguntes fallades</h1>
      <p className="muted mb-2">
        {questions.length} pregunta{questions.length !== 1 ? "es" : ""} fallada
        {questions.length !== 1 ? "es" : ""} · Pregunta {currentIndex + 1} de {questions.length}
      </p>

      <QuestionCard
        question={question}
        selectedLetter={selectedLetter}
        onSelect={handleSelectOption}
        disabled={answered}
      />

      <div className="nav-questions">
        {currentIndex > 0 && (
          <button type="button" className="btn btn--secondary" onClick={goPrev}>
            ← Anterior
          </button>
        )}
        {currentIndex < questions.length - 1 && (
          <button type="button" className="btn btn--secondary" onClick={goNext}>
            Següent →
          </button>
        )}
      </div>

      <p className="jumper-wrap">
        Anar a:{" "}
        {questions.map((_, i) => (
          <button
            key={i}
            type="button"
            className={currentIndex === i ? "current" : ""}
            onClick={() => goTo(i)}
          >
            {i + 1}
          </button>
        ))}
      </p>

      <p className="mt-2">
        <Link to="/topics" className="link-plain">← Tornar a temes</Link> · <Link to="/test" className="link-plain">Fer test</Link>
      </p>
    </div>
  );
}
