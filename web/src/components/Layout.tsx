/**
 * Layout principal: navegación + contenido de la ruta.
 * Aplica tema guardado al montar.
 */

import { useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { getPreferences } from "../repos";

const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/topics", label: "Temas" },
  { to: "/test", label: "Hacer test" },
  { to: "/stats", label: "Estadísticas" },
  { to: "/settings", label: "Ajustes" },
] as const;

export default function Layout() {
  const location = useLocation();

  useEffect(() => {
    getPreferences().then((prefs) => {
      document.documentElement.setAttribute("data-theme", prefs.theme);
    });
  }, []);

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
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
