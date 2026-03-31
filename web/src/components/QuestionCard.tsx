/**
 * Componente de pregunta (Tarea 1.3): enunciado, opciones, corrección al momento, explicación.
 */

import Markdown from "react-markdown";
import type { Question, OptionLetter } from "../types";

interface QuestionCardProps {
  question: Question;
  selectedLetter: OptionLetter | null;
  onSelect: (letter: OptionLetter) => void;
  disabled?: boolean;
  /** Si false (modo "al final"), no se muestra la correcta ni la explicación hasta el final del test. */
  showCorrectAnswer?: boolean;
}

function getOptionState(
  letter: OptionLetter,
  selectedLetter: OptionLetter | null,
  correctLetter: OptionLetter,
  showFeedback: boolean
): "correct" | "wrong" | "selected" | undefined {
  if (!showFeedback) return selectedLetter === letter ? "selected" : undefined;
  if (letter === correctLetter) return "correct";
  if (selectedLetter === letter) return "wrong";
  return undefined;
}

export default function QuestionCard({
  question,
  selectedLetter,
  onSelect,
  disabled = false,
  showCorrectAnswer = true,
}: QuestionCardProps) {
  const answered = selectedLetter !== null;
  const showFeedback = showCorrectAnswer && answered;

  return (
    <div className="question-card">
      <p className="question-card__text">
        Pregunta {question.number}. {question.text}
      </p>
      <ul className="options-list">
        {question.options.map((opt) => {
          const state = getOptionState(opt.letter, selectedLetter, question.correctLetter, showFeedback);
          const isCorrect = state === "correct";
          const showWrong = state === "wrong";
          return (
            <li key={opt.letter}>
              <button
                type="button"
                className="option-btn"
                data-state={state ?? undefined}
                onClick={() => !disabled && onSelect(opt.letter)}
                disabled={disabled}
              >
                <strong>{opt.letter}.</strong> {opt.text}
                {isCorrect && " ✓"}
                {showWrong && " ✗"}
              </button>
            </li>
          );
        })}
      </ul>
      {showFeedback && question.explicacion && (
        <div className="explanation-box">
          <strong>Explicación:</strong>
          <Markdown>{question.explicacion}</Markdown>
          <p className="ai-disclaimer">Explicació generada per IA — pot contenir errors.</p>
        </div>
      )}
    </div>
  );
}
