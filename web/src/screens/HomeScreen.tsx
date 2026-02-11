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
    <div>
      <h1 className="page-title">App DBD – Repaso</h1>
      <p className="muted prose">
        Repasa por temas o haz tests de 20 preguntas. Los temas están organizados por sección; puedes repasar una sección entera o un subtema.
      </p>
      <p className="mb-1">
        <strong>{result.topicCount}</strong> temas, <strong>{result.questionCount}</strong> preguntas.
        {result.imported && " (Datos importados correctamente.)"}
      </p>
      <div className="btn-group">
        <Link to="/topics" className="btn btn--primary">
          Ver temas por sección
        </Link>
        <Link to="/test" className="btn btn--secondary">
          Hacer test de 20 preguntas
        </Link>
      </div>
    </div>
  );
}
