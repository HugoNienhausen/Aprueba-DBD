/**
 * Pantalla de inicio. Muestra estado del bootstrap (datos cargados).
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ensureDataLoaded, type BootstrapResult } from "../repos";

export default function HomeScreen() {
  const [result, setResult] = useState<BootstrapResult | null>(null);

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
      <p className="home__subtitle">
        Practica las preguntas del documento <b>TestQuestions.pdf</b> de la asignatura <b>Disseny de Bases de Dades (DBD)</b> de la FIB. 
        (entran en el examen)
      </p>
      <div className="btn-group home__actions">
        <Link to="/topics" className="btn btn--primary btn--large">
          Ver temas
        </Link>
        <Link to="/test" className="btn btn--secondary btn--large">
          Hacer test
        </Link>
      </div>
      <p className="home__meta muted">
        {result.topicCount} temas · {result.questionCount} preguntas
      </p>
    </div>
  );
}
