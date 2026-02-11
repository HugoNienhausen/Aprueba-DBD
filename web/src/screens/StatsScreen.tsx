/**
 * Estadísticas (Tarea 2.2). Resumen de tests y respuestas usando test_sessions y user_answers.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStats } from "../repos";
import type { Stats } from "../types";

export default function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Cargando estadísticas…</p>;
  if (error) return <p className="alert-error"><strong>Error:</strong> {error}</p>;
  if (!stats) return null;

  const percentage =
    stats.totalQuestions > 0
      ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100)
      : 0;

  return (
    <div>
      <h1 className="page-title">Estadísticas</h1>
      <p className="muted mb-2">
        Resumen de tus tests completados y respuestas.
      </p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__label">Tests completados</div>
          <div className="stat-card__value">{stats.totalTests}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Respuestas correctas</div>
          <div className="stat-card__value">
            {stats.totalCorrect} / {stats.totalQuestions}
          </div>
          <div className="muted" style={{ fontSize: "0.95rem", marginTop: "0.25rem" }}>
            {percentage}% de aciertos
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Preguntas falladas (distintas)</div>
          <div className="stat-card__value">{stats.failedCount}</div>
          <div className="mt-2">
            <Link to="/review/failed" className="link-plain">Repasar falladas →</Link>
          </div>
        </div>
      </div>

      <p>
        <Link to="/test" className="link-plain">Hacer test</Link> · <Link to="/topics" className="link-plain">Temas</Link>
      </p>
    </div>
  );
}
