/**
 * Resultado del test (/result).
 * X/N, porcentaje, listado de todas las preguntas (acertadas y falladas).
 */

import { useLocation, Link, useNavigate } from "react-router-dom";
import ExplanationBlock from "../components/ExplanationBlock";
import type { Question } from "../types";

interface AnswerItem {
  question: Question;
  selectedLetter: string;
  correctLetter: string;
  explicacion: string | null;
  isCorrect: boolean;
}

interface TestConfig {
  kind: string;
  selectedTopicIds: string[];
  questionCount: number;
}

interface ResultState {
  correctCount?: number;
  totalQuestions?: number;
  allAnswers?: AnswerItem[];
  message?: string;
  testConfig?: TestConfig;
}

export default function ResultScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? null) as ResultState | null;
  const testConfig = state?.testConfig ?? null;
  const correctCount = state?.correctCount ?? 0;
  const totalQuestions = state?.totalQuestions ?? 20;
  const allAnswers = state?.allAnswers ?? [];
  const hasResult = state?.correctCount !== undefined && state?.totalQuestions !== undefined;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const wrongAnswers = allAnswers.filter((a) => !a.isCorrect);
  const correctAnswers = allAnswers.filter((a) => a.isCorrect);

  return (
    <div>
      <h1 className="page-title">Resultat del test</h1>
      {hasResult ? (
        <>
          <p className="result-score">
            <strong>{correctCount}</strong> / {totalQuestions} correctes
          </p>
          <p className="muted mb-2">
            {percentage}% d'encerts
          </p>

          {wrongAnswers.length > 0 && (
            <>
              <h2 className="card-title">Preguntes fallades ({wrongAnswers.length})</h2>
              <ul className="list-plain">
                {wrongAnswers.map((item) => (
                  <li key={item.question.id} className="wrong-item">
                    <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                      Pregunta {item.question.number}. {item.question.text}
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
                            {isSelected && <span className="result-option__tag result-option__tag--yours">La teva resposta</span>}
                            {isCorrect && <span className="result-option__tag result-option__tag--correct">Correcta</span>}
                          </li>
                        );
                      })}
                    </ul>
                    {item.explicacion && (
                      <ExplanationBlock text={item.explicacion} />
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {correctAnswers.length > 0 && (
            <>
              <h2 className="card-title" style={{ marginTop: "1.5rem" }}>
                Preguntes encertades ({correctAnswers.length})
              </h2>
              <ul className="list-plain">
                {correctAnswers.map((item) => (
                  <li key={item.question.id} className="correct-item">
                    <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                      Pregunta {item.question.number}. {item.question.text}
                    </p>
                    <ul className="result-options">
                      {item.question.options.map((opt) => {
                        const isSelected = opt.letter === item.selectedLetter;
                        const optState = isSelected ? "correct" : undefined;
                        return (
                          <li key={opt.letter} className="result-option" data-state={optState}>
                            <span className="result-option__letter">{opt.letter}.</span>
                            <span className="result-option__text">{opt.text}</span>
                            {isSelected && <span className="result-option__tag result-option__tag--correct">La teva resposta</span>}
                          </li>
                        );
                      })}
                    </ul>
                    {item.explicacion && (
                      <ExplanationBlock text={item.explicacion} />
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {wrongAnswers.length === 0 && (
            <p className="success-msg mb-2">Totes correctes!</p>
          )}
        </>
      ) : (
        <p className="muted">{state?.message ?? "Resum i errors (fes un test per veure el resultat)."}</p>
      )}
      <div className="nav-questions mt-2">
        <Link to="/test" className="btn btn--secondary btn--large">← Tornar al test</Link>
        {testConfig && (
          <button
            type="button"
            className="btn btn--primary btn--large"
            onClick={() => navigate("/test", { state: { autoStart: true, ...testConfig } })}
          >
            Repetir test
          </button>
        )}
      </div>
    </div>
  );
}
