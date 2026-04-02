/**
 * Lista de temas agrupados por sección. Repaso por tema completo o por subtema.
 */

import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getTopics } from "../repos";
import type { Topic } from "../types";

function groupBySection(topics: Topic[]): { section: string; topics: Topic[] }[] {
  const bySection = new Map<string, Topic[]>();
  for (const t of topics) {
    const list = bySection.get(t.section) ?? [];
    list.push(t);
    bySection.set(t.section, list);
  }
  const sections = Array.from(bySection.entries())
    .map(([section, list]) => ({ section, topics: list }))
    .sort((a, b) => {
      const na = parseInt(a.section, 10);
      const nb = parseInt(b.section, 10);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.section.localeCompare(b.section);
    });
  return sections;
}

export default function TopicsScreen() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sections = useMemo(() => groupBySection(topics), [topics]);

  useEffect(() => {
    getTopics()
      .then(setTopics)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Carregant temes…</p>;
  if (error) return <p className="alert-error"><strong>Error:</strong> {error}</p>;

  return (
    <div>
      <h1 className="page-title">Temes</h1>

      {sections.map(({ section, topics: sectionTopics }) => (
        <section key={section} className="card card--section">
          <h2 className="card-title">{section}</h2>
          <p className="mb-1">
            <Link
              to={`/review/section/${encodeURIComponent(section)}`}
              className="link-plain"
              style={{ fontWeight: 600 }}
            >
              Repàs tema complet →
            </Link>
          </p>
          <ul className="list-plain">
            {sectionTopics.map((t) => (
              <li key={t.id} className="list-item-row">
                <span className="muted">{t.title}</span>
                <Link to={`/topic/${t.id}`} className="link-plain">
                  Repàs subtema →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
