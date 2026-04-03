/**
 * Pantalla de inicio. Muestra estado del bootstrap (datos cargados).
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ensureDataLoaded, type BootstrapResult } from "../repos";

const GITHUB_REPO = "https://github.com/HugoNienhausen/Aprueba-DBD";

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
    return <p className="muted">Carregant base de dades…</p>;
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
        <p className="home__intro-line">Practica les preguntes del document <strong>TestQuestions.pdf</strong></p>
        <p className="home__intro-line">de l'assignatura <strong>Disseny de Bases de Dades (DBD)</strong> de la FIB.</p>
        <p className="home__intro-note">(entren a l'examen)</p>
      </div>
      <div className="btn-group home__actions">
        <Link to="/topics" className="btn btn--primary btn--large">
          Veure temes
        </Link>
        <Link to="/test" className="btn btn--secondary btn--large">
          Fer test
        </Link>
      </div>
      <p className="home__meta muted">
        {result.topicCount} pàgines del PDF · {result.questionCount} preguntes
      </p>
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
      <div className="star-banner">
          <p className="star-banner__text">
            T'està ajudant a estudiar? Dona suport al projecte perquè segueixi actiu pel <strong>segon parcial</strong>!
          </p>
          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="star-banner__btn">
            <svg className="star-banner__gh" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.63-.735-3.63-.735-.39-.99-.96-1.255-.96-1.255-.78-.53.06-.52.06-.52.765.055 1.17.795 1.17.795.765 1.305 2.025.93 2.52.71.075-.555.3-.93.54-1.14-1.875-.21-3.855-.945-3.855-4.215 0-.93.33-1.695.87-2.295-.09-.21-.375-1.065.09-2.22 0 0 .705-.225 2.31.855.675-.195 1.395-.285 2.115-.285.72 0 1.44.09 2.115.285 1.605-1.08 2.31-.855 2.31-.855.465 1.155.18 2.01.09 2.22.54.6.87 1.365.87 2.295 0 3.27-1.95 4.005-3.81 4.215.3.255.57.765.57 1.53 0 1.11-.015 2.01-.015 2.28 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Dona-li una ⭐ a GitHub
          </a>
      </div>
    </div>
  );
}
