/**
 * Pantalla de inicio. Muestra estado del bootstrap (datos cargados).
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ensureDataLoaded, type BootstrapResult } from "../repos";

const EXAM_DATE = new Date("2026-04-08T13:00:00+02:00");
const EXAM_LABEL = "Primer Parcial";

function useCountdown(target: Date) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = target.getTime() - now;
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

export default function HomeScreen() {
  const [result, setResult] = useState<BootstrapResult | null>(null);
  const countdown = useCountdown(EXAM_DATE);

  useEffect(() => {
    ensureDataLoaded()
      .then(setResult)
      .catch((err) => {
        setResult({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }, []);

  if (result === null) {
    return <p className="muted">Cargando base de datos…</p>;
  }
  if (!result.ok) {
    return (
      <div>
        <p className="alert-error"><strong>Error:</strong> {result.error}</p>
      </div>
    );
  }
  return (
    <div className="home">
      <h1 className="home__title">ApruebaDBD</h1>
      <div className="home__intro">
        <p className="home__intro-line">Practica las preguntas del documento <strong>TestQuestions.pdf</strong></p>
        <p className="home__intro-line">de la asignatura <strong>Disseny de Bases de Dades (DBD)</strong> de la FIB.</p>
        <p className="home__intro-note">(entran en el examen)</p>
      </div>
      <div className="btn-group home__actions">
        <Link to="/topics" className="btn btn--primary btn--large">
          Ver temas
        </Link>
        <Link to="/test" className="btn btn--secondary btn--large">
          Hacer test
        </Link>
      </div>
      {countdown && (
        <div className="countdown">
          <p className="countdown__label">{EXAM_LABEL}</p>
          <div className="countdown__boxes">
            <div className="countdown__box"><span className="countdown__num">{countdown.days}</span><span className="countdown__unit">dies</span></div>
            <div className="countdown__box"><span className="countdown__num">{countdown.hours}</span><span className="countdown__unit">hores</span></div>
            <div className="countdown__box"><span className="countdown__num">{countdown.minutes}</span><span className="countdown__unit">min</span></div>
            <div className="countdown__box"><span className="countdown__num">{countdown.seconds}</span><span className="countdown__unit">seg</span></div>
          </div>
        </div>
      )}
      <p className="home__meta muted">
        {result.topicCount} páginas del PDF · {result.questionCount} preguntas
      </p>
    </div>
  );
}
