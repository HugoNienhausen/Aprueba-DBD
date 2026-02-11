/**
 * Repaso ordenado por tema (/topic/:topicId) — Tarea 1.3.
 * Preguntas en orden, corrección al momento, explicación, saveUserAnswer (testSessionId: null).
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getTopics, getQuestionsByTopicId, saveUserAnswer } from "../repos";
import type { Topic, Question, OptionLetter } from "../types";
import QuestionCard from "../components/QuestionCard";

export default function TopicScreen() {
  const { topicId } = useParams<{ topicId: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<OptionLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setCurrentIndex(0);
    setSelectedLetter(null);
    Promise.all([getTopics(), getQuestionsByTopicId(topicId)])
      .then(([topics, qs]) => {
        const t = topics.find((x) => x.id === topicId) ?? null;
        setTopic(t ?? null);
        setQuestions(qs);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [topicId]);

  const handleSelectOption = (letter: OptionLetter) => {
    if (!topicId || questions.length === 0) return;
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

  if (!topicId) {
    return (
      <div>
        <p className="muted">Tema no especificado.</p>
        <p className="mt-2"><Link to="/topics" className="link-plain">← Volver a temas</Link></p>
      </div>
    );
  }
  if (loading) return <p className="muted">Cargando preguntas…</p>;
  if (error) return <p className="alert-error"><strong>Error:</strong> {error}</p>;
  if (questions.length === 0) {
    return (
      <div>
        <h1 className="page-title">Repaso: {topic?.title ?? topicId}</h1>
        <p className="muted">No hay preguntas en este tema.</p>
        <p className="mt-2"><Link to="/topics" className="link-plain">← Volver a temas</Link></p>
      </div>
    );
  }

  const question = questions[currentIndex];
  const answered = selectedLetter !== null;

  return (
    <div>
      <h1 className="page-title">Repaso: {topic?.title ?? topicId}</h1>
      <p className="muted mb-2">
        {topic?.section ?? ""} · Pregunta {currentIndex + 1} de {questions.length}
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
          Siguiente →
        </button>
      </div>
      <p className="jumper-wrap">
        Ir a:{" "}
        {questions.map((_, i) => (
          <button
            key={i}
            type="button"
            className={currentIndex === i ? "current" : ""}
            onClick={() => {
              setCurrentIndex(i);
              setSelectedLetter(null);
            }}
          >
            {i + 1}
          </button>
        ))}
      </p>

      <p className="mt-2">
        <Link to="/topics" className="link-plain">← Volver a temas</Link>
      </p>
    </div>
  );
}
