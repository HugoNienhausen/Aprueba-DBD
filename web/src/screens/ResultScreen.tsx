/**
 * Resultado del test (/result) — Tarea 1.5.
 * X/20, porcentaje, listado de fallos (pregunta, respuesta correcta, explicación si existe).
 */

import { useLocation, Link } from "react-router-dom";
import type { Question } from "../types";

interface WrongAnswerItem {
  question: Question;
  selectedLetter: string;
  correctLetter: string;
  explicacion: string | null;
}

interface ResultState {
  correctCount?: number;
  totalQuestions?: number;
  wrongAnswers?: WrongAnswerItem[];
  message?: string;
}

export default function ResultScreen() {
  const location = useLocation();
  const state = (location.state ?? null) as ResultState | null;
  const correctCount = state?.correctCount ?? 0;
  const totalQuestions = state?.totalQuestions ?? 20;
  const wrongAnswers = state?.wrongAnswers ?? [];
  const hasResult = state?.correctCount !== undefined && state?.totalQuestions !== undefined;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

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
          {wrongAnswers.length > 0 ? (
            <>
              <h2 className="card-title">Preguntas falladas ({wrongAnswers.length})</h2>
              <ul className="list-plain">
                {wrongAnswers.map((item, i) => (
                  <li key={item.question.id} className="wrong-item">
                    <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                      {i + 1}. {item.question.text}
                    </p>
                    <p className="wrong-item__answer--yours mb-1">
                      Tu respuesta: <strong>{item.selectedLetter}</strong>
                    </p>
                    <p className="wrong-item__answer--correct mb-1">
                      Correcta: <strong>{item.correctLetter}</strong>
                    </p>
                    {item.explicacion && (
                      <div className="explanation-box mt-2">
                        <strong>Explicación:</strong> {item.explicacion}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
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
