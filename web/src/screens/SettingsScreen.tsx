/**
 * Ajustes / preferencias (Tarea 1.4 + 2.2).
 * correctAt, theme; persistir con getPreferences/setPreferences.
 */

import { useEffect, useState } from "react";
import { getPreferences, setPreferences } from "../repos";
import type { CorrectAt, Theme } from "../types";

const CORRECT_AT_LABELS: Record<CorrectAt, string> = {
  immediately: "Mostrar resposta en respondre",
  at_end: "Mostrar respostes al final del test",
};

const THEME_LABELS: Record<Theme, string> = {
  light: "Clar",
  dark: "Fosc",
};

export default function SettingsScreen() {
  const [correctAt, setCorrectAt] = useState<CorrectAt>("immediately");
  const [theme, setTheme] = useState<Theme>("light");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPreferences()
      .then((prefs) => {
        setCorrectAt(prefs.correctAt);
        setTheme(prefs.theme);
        document.documentElement.setAttribute("data-theme", prefs.theme);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleCorrectAt = (value: CorrectAt) => {
    setCorrectAt(value);
    setPreferences({ correctAt: value }).catch((err) =>
      console.error("setPreferences failed:", err)
    );
  };

  const handleTheme = (value: Theme) => {
    setTheme(value);
    document.documentElement.setAttribute("data-theme", value);
    setPreferences({ theme: value }).catch((err) =>
      console.error("setPreferences failed:", err)
    );
  };

  if (loading) return <p className="muted">Carregant preferències…</p>;
  if (error) return <p className="alert-error"><strong>Error:</strong> {error}</p>;

  return (
    <div>
      <h1 className="page-title">Ajustos</h1>

      <section className="mb-2">
        <h2 className="section-heading">Aparença</h2>
        <fieldset className="fieldset-reset">
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
        </fieldset>
      </section>

      <section className="mb-2">
        <h2 className="section-heading">Test de 20 preguntes</h2>
        <p className="muted mb-1">Quan veure la resposta correcta:</p>
        <fieldset className="fieldset-reset">
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
        </fieldset>
        <p className="muted mt-2" style={{ fontSize: "0.9rem" }}>
          La preferència es desa automàticament.
        </p>
      </section>
    </div>
  );
}
