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
  const [isModalOpen, setIsModalOpen] = useState(false); // Estado para controlar el modal
  const countdown = useCountdown(EXAM_DATE);

  // 1. Carga de los datos de la base de datos
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

  // 2. Renderizar TikTok cuando se abre el modal
  useEffect(() => {
    if (isModalOpen) {
      // Damos un pequeñísimo margen para que React pinte el HTML antes de que TikTok lo busque
      setTimeout(() => {
        if ((window as any).tiktokEmbed) {
          (window as any).tiktokEmbed.lib.render();
        } else {
          const scriptId = "tiktok-embed-script";
          if (!document.getElementById(scriptId)) {
            const script = document.createElement("script");
            script.id = scriptId;
            script.src = "https://www.tiktok.com/embed.js";
            script.async = true;
            document.body.appendChild(script);
          }
        }
      }, 100);
    }
  }, [isModalOpen]);

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
      <div className="home__center">
        <h1 className="home__title">ApruebaDBD</h1>
        <div className="home__intro">
          <p className="home__intro-line">Practica les preguntes del document <strong>TestQuestions.pdf</strong></p>
          <p className="home__intro-line">de l'assignatura <strong>Disseny de Bases de Dades (DBD)</strong> de la FIB.</p>
        </div>

        {/* Botones principales actualizados */}
        <div className="btn-group home__actions">
          <Link to="/topics" className="btn btn--primary btn--large">
            Veure temes
          </Link>
          <Link to="/test" className="btn btn--secondary btn--large">
            Fer test
          </Link>
          {/* NUEVO BOTÓN DE MOTIVACIÓN */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn--secondary btn--large"
            style={{ borderColor: "#1DA1F2", color: "inherit" }} // Toque de estilo opcional
          >
            💪 Motivación
          </button>
        </div>

        <p className="home__meta muted">
          {result.topicCount} pàgines del PDF · {result.questionCount} preguntes
        </p>
      </div>

      <div className="home__sidebar">
        {countdown && (
          <div className="home__sidebar-card">
            <p className="home__sidebar-label">{EXAM_LABEL}</p>
            <p className="home__sidebar-value">{countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s</p>
          </div>
        )}

        <div className="home__sidebar-card home__sidebar-card--star">
          <p className="home__sidebar-label">T'està ajudant?</p>
          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="home__star-link">
            <svg className="home__star-gh" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.63-.735-3.63-.735-.39-.99-.96-1.255-.96-1.255-.78-.53.06-.52.06-.52.765.055 1.17.795 1.17.795.765 1.305 2.025.93 2.52.71.075-.555.3-.93.54-1.14-1.875-.21-3.855-.945-3.855-4.215 0-.93.33-1.695.87-2.295-.09-.21-.375-1.065.09-2.22 0 0 .705-.225 2.31.855.675-.195 1.395-.285 2.115-.285.72 0 1.44.09 2.115.285 1.605-1.08 2.31-.855 2.31-.855.465 1.155.18 2.01.09 2.22.54.6.87 1.365.87 2.295 0 3.27-1.95 4.005-3.81 4.215.3.255.57.765.57 1.53 0 1.11-.015 2.01-.015 2.28 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            ⭐ Dona suport a GitHub
          </a>
        </div>
      </div>

      {/* --- MODAL (TARJETA FLOTANTE) --- */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
          onClick={() => setIsModalOpen(false)} // Cierra al hacer clic fuera
        >
          <div
            style={{
              backgroundColor: "var(--bg-card, #ffffff)", // Soporte para modo claro/oscuro
              color: "var(--text-main, #000)",
              borderRadius: "16px",
              padding: "20px",
              position: "relative",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
            }}
            onClick={(e) => e.stopPropagation()} // Evita que se cierre al hacer clic dentro
          >
            {/* Botón de cerrar */}
            <button
              onClick={() => setIsModalOpen(false)}
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "inherit",
                lineHeight: "1"
              }}
              aria-label="Cerrar modal"
            >
              &times;
            </button>

            <h2 style={{ marginTop: 0, textAlign: "center", fontSize: "1.5rem" }}>¡A por el parcial! 🐐</h2>

            {/* Contenedor del vídeo de TikTok */}
            <div style={{ display: "flex", justifyContent: "center", overflow: "hidden", marginTop: "15px" }}>
              <blockquote
                className="tiktok-embed"
                cite="https://www.tiktok.com/@bicho_lover19/video/7643591450864651552"
                data-video-id="7643591450864651552"
                style={{ maxWidth: "100%", width: "325px", margin: "0 auto" }}
              >
                <section>
                  <a target="_blank" rel="noreferrer" title="@bicho_lover19" href="https://www.tiktok.com/@bicho_lover19?refer=embed">@bicho_lover19</a>
                </section>
              </blockquote>
            </div>

            <button
              className="btn btn--primary"
              style={{ width: "100%", marginTop: "15px" }}
              onClick={() => setIsModalOpen(false)}
            >
              Cerrar y seguir estudiando
            </button>
          </div>
        </div>
      )}
    </div>
  );
}