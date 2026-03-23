/**
 * Resultado del test (/result).
 * X/N, porcentaje, listado de todas las preguntas (acertadas y falladas).
 */

import { useLocation, Link } from "react-router-dom";
import type { Question } from "../types";

interface AnswerItem {
  question: Question;
  selectedLetter: string;
  correctLetter: string;
  explicacion: string | null;
  isCorrect: boolean;
}

interface ResultState {
  correctCount?: number;
  totalQuestions?: number;
  allAnswers?: AnswerItem[];
  message?: string;
}

export default function ResultScreen() {
  const location = useLocation();
  const state = (location.state ?? null) as ResultState | null;
  const correctCount = state?.correctCount ?? 0;
  const totalQuestions = state?.totalQuestions ?? 20;
  const allAnswers = state?.allAnswers ?? [];
  const hasResult = state?.correctCount !== undefined && state?.totalQuestions !== undefined;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const wrongAnswers = allAnswers.filter((a) => !a.isCorrect);
  const correctAnswers = allAnswers.filter((a) => a.isCorrect);

  return (
    <div>
      <h1 className="page-title">Resultado del test</h1>
      {hasResult ? (
        <>
          <p className="result-score">
            <strong>{correctCount}</strong> / {totalQuestions} correctas
          </p>
          <p className="muted mb-2">
            {percentage}% de aciertos
          </p>

          {wrongAnswers.length > 0 && (
            <>
              <h2 className="card-title">Preguntas falladas ({wrongAnswers.length})</h2>
              <ul className="list-plain">
                {wrongAnswers.map((item, i) => (
                  <li key={item.question.id} className="wrong-item">
                    <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                      {i + 1}. {item.question.text}
                    </p>
                    <ul className="result-options">
                      {item.question.options.map((opt) => {
                        const isSelected = opt.letter === item.selectedLetter;
                        const isCorrect = opt.letter === item.correctLetter;
                        const optState = isCorrect ? "correct" : isSelected ? "wrong" : undefined;
                        return (
                          <li key={opt.letter} className="result-option" data-state={optState}>
                            <span className="result-option__letter">{opt.letter}.</span>
                            <span className="result-option__text">{opt.text}</span>
                            {isSelected && <span className="result-option__tag result-option__tag--yours">Tu respuesta</span>}
                            {isCorrect && <span className="result-option__tag result-option__tag--correct">Correcta</span>}
                          </li>
                        );
                      })}
                    </ul>
                    {item.explicacion && (
                      <div className="explanation-box mt-2">
                        <strong>Explicación:</strong> {item.explicacion}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {correctAnswers.length > 0 && (
            <>
              <h2 className="card-title" style={{ marginTop: "1.5rem" }}>
                Preguntas acertadas ({correctAnswers.length})
              </h2>
              <ul className="list-plain">
                {correctAnswers.map((item, i) => (
                  <li key={item.question.id} className="correct-item">
                    <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                      {i + 1}. {item.question.text}
                    </p>
                    <ul className="result-options">
                      {item.question.options.map((opt) => {
                        const isSelected = opt.letter === item.selectedLetter;
                        const optState = isSelected ? "correct" : undefined;
                        return (
                          <li key={opt.letter} className="result-option" data-state={optState}>
                            <span className="result-option__letter">{opt.letter}.</span>
                            <span className="result-option__text">{opt.text}</span>
                            {isSelected && <span className="result-option__tag result-option__tag--correct">Tu respuesta</span>}
                          </li>
                        );
                      })}
                    </ul>
                    {item.explicacion && (
                      <div className="explanation-box mt-2">
                        <strong>Explicación:</strong> {item.explicacion}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {wrongAnswers.length === 0 && (
            <p className="success-msg mb-2">¡Todas correctas!</p>
          )}
        </>
      ) : (
        <p className="muted">{state?.message ?? "Resumen y fallos (realiza un test para ver el resultado)."}</p>
      )}
      <p className="mt-2">
        <Link to="/test" className="link-plain">← Volver al test</Link>
      </p>
    </div>
  );
}
