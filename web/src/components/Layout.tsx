/**
 * Layout principal: navegación + contenido de la ruta.
 * Ajustes (tema, correctAt) en un panel discreto al lado del nav.
 */

import { useEffect, useState, useRef } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { getPreferences, setPreferences } from "../repos";
import type { CorrectAt, Theme } from "../types";

const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/topics", label: "Temas" },
  { to: "/test", label: "Hacer test" },
] as const;

const THEME_LABELS: Record<Theme, string> = { light: "Claro", dark: "Oscuro" };
const CORRECT_AT_LABELS: Record<CorrectAt, string> = {
  immediately: "Ver respuesta al responder",
  at_end: "Ver respuestas al final",
};

export default function Layout() {
  const location = useLocation();
  const [theme, setTheme] = useState<Theme>("light");
  const [correctAt, setCorrectAt] = useState<CorrectAt>("immediately");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPreferences().then((prefs) => {
      setTheme(prefs.theme);
      setCorrectAt(prefs.correctAt);
      document.documentElement.setAttribute("data-theme", prefs.theme);
    });
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const close = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [settingsOpen]);

  const handleTheme = (value: Theme) => {
    setTheme(value);
    document.documentElement.setAttribute("data-theme", value);
    setPreferences({ theme: value }).catch(() => {});
  };

  const handleCorrectAt = (value: CorrectAt) => {
    setCorrectAt(value);
    setPreferences({ correctAt: value }).catch(() => {});
  };

  return (
    <div className="app-wrap">
      <nav className="nav">
        {NAV.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`nav-link ${location.pathname === to ? "nav-link--active" : ""}`}
          >
            {label}
          </Link>
        ))}
        <div className="nav-settings" ref={panelRef}>
          <button
            type="button"
            className="nav-link nav-settings-trigger"
            onClick={() => setSettingsOpen((o) => !o)}
            title="Ajustes"
            aria-expanded={settingsOpen}
          >
            ⚙ Ajustes
          </button>
          {settingsOpen && (
            <div className="settings-panel">
              <div className="settings-panel__row">
                <span className="settings-panel__label">Tema</span>
                <div className="settings-panel__options">
                  {(["light", "dark"] as const).map((value) => (
                    <label key={value} className="radio-label">
                      <input
                        type="radio"
                        name="theme"
                        value={value}
                        checked={theme === value}
                        onChange={() => handleTheme(value)}
                      />
                      <span>{THEME_LABELS[value]}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="settings-panel__row">
                <span className="settings-panel__label">Test</span>
                <div className="settings-panel__options">
                  {(["immediately", "at_end"] as const).map((value) => (
                    <label key={value} className="radio-label">
                      <input
                        type="radio"
                        name="correctAt"
                        value={value}
                        checked={correctAt === value}
                        onChange={() => handleCorrectAt(value)}
                      />
                      <span>{CORRECT_AT_LABELS[value]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
      <footer className="app-footer">
        <p className="ai-disclaimer">Les respostes corresponen a les del PDF i han sigut validades manualment. Les explicacions son generades per IA i poden contenir errors.</p>
        <p className="app-footer__name">Hugo Nienhausen</p>
        <div className="app-footer__links">
          <a href="https://github.com/HugoNienhausen/Aprueba-DBD" target="_blank" rel="noopener noreferrer" className="app-footer__link" title="GitHub" aria-label="GitHub">
            <svg className="app-footer__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.63-.735-3.63-.735-.39-.99-.96-1.255-.96-1.255-.78-.53.06-.52.06-.52.765.055 1.17.795 1.17.795.765 1.305 2.025.93 2.52.71.075-.555.3-.93.54-1.14-1.875-.21-3.855-.945-3.855-4.215 0-.93.33-1.695.87-2.295-.09-.21-.375-1.065.09-2.22 0 0 .705-.225 2.31.855.675-.195 1.395-.285 2.115-.285.72 0 1.44.09 2.115.285 1.605-1.08 2.31-.855 2.31-.855.465 1.155.18 2.01.09 2.22.54.6.87 1.365.87 2.295 0 3.27-1.95 4.005-3.81 4.215.3.255.57.765.57 1.53 0 1.11-.015 2.01-.015 2.28 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>GitHub</span>
          </a>
          <a href="https://www.linkedin.com/in/hugonienhausen/" target="_blank" rel="noopener noreferrer" className="app-footer__link" title="LinkedIn" aria-label="LinkedIn">
            <svg className="app-footer__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            <span>LinkedIn</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
