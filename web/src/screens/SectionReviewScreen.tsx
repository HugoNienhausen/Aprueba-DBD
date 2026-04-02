/**
 * Repaso por tema completo (sección). Preguntas de toda la sección en orden.
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getQuestionsBySection, saveUserAnswer } from "../repos";
import type { Question, OptionLetter } from "../types";
import QuestionCard from "../components/QuestionCard";

export default function SectionReviewScreen() {
  const { sectionEncoded } = useParams<{ sectionEncoded: string }>();
  const section = sectionEncoded ? decodeURIComponent(sectionEncoded) : "";
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<OptionLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!section) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setCurrentIndex(0);
    setSelectedLetter(null);
    getQuestionsBySection(section)
      .then(setQuestions)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [section]);

  const handleSelectOption = (letter: OptionLetter) => {
    if (questions.length === 0) return;
    const question = questions[currentIndex];
    if (!question) return;
    const isCorrect = letter === question.correctLetter;
    setSelectedLetter(letter);
    saveUserAnswer({
      questionId: question.id,
      selectedLetter: letter,
      isCorrect,
      testSessionId: null,
      answeredAt: new Date().toISOString(),
    }).catch((err) => console.error("saveUserAnswer failed:", err));
  };

  if (!section) {
    return (
      <div>
        <p className="muted">Secció no especificada.</p>
        <p className="mt-2"><Link to="/topics" className="link-plain">← Tornar a temes</Link></p>
      </div>
    );
  }
  if (loading) return <p className="muted">Carregant preguntes…</p>;
  if (error) return <p className="alert-error"><strong>Error:</strong> {error}</p>;
  if (questions.length === 0) {
    return (
      <div>
        <h1 className="page-title">Repàs: {section}</h1>
        <p className="muted">No hi ha preguntes en aquest tema.</p>
        <p className="mt-2"><Link to="/topics" className="link-plain">← Tornar a temes</Link></p>
      </div>
    );
  }

  const question = questions[currentIndex]!;
  const answered = selectedLetter !== null;

  return (
    <div>
      <h1 className="page-title">Repàs: {section}</h1>
      <p className="muted mb-2">
        Tema complet · Pregunta {currentIndex + 1} de {questions.length}
      </p>

      <QuestionCard
        question={question}
        selectedLetter={selectedLetter}
        onSelect={handleSelectOption}
        disabled={answered}
      />

      <div className="nav-questions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => {
            setCurrentIndex((i) => Math.max(0, i - 1));
            setSelectedLetter(null);
          }}
          disabled={currentIndex === 0}
        >
          ← Anterior
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => {
            setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
            setSelectedLetter(null);
          }}
          disabled={currentIndex === questions.length - 1}
        >
          Següent →
        </button>
      </div>

      <p className="jumper-wrap">
        Anar a:{" "}
        {questions.slice(0, 20).map((_, i) => (
          <button
            key={i}
            type="button"
            className={currentIndex === i ? "current" : ""}
            onClick={() => { setCurrentIndex(i); setSelectedLetter(null); }}
          >
            {i + 1}
          </button>
        ))}
        {questions.length > 20 && " …"}
      </p>

      <p className="mt-2">
        <Link to="/topics" className="link-plain">← Tornar a temes</Link>
      </p>
    </div>
  );
}
