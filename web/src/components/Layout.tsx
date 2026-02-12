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
    </div>
  );
}
