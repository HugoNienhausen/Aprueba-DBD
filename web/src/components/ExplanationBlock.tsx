import Markdown from "react-markdown";

const DETAIL_MARKER = "**Explicació Detallada:**";
const ANALYSIS_MARKER = "**Anàlisi d'opcions falses:**";

function stripMarker(text: string, marker: string): string {
  return text.startsWith(marker) ? text.slice(marker.length).trim() : text;
}

export default function ExplanationBlock({ text }: { text: string }) {
  const detailIdx = text.indexOf(DETAIL_MARKER);
  const analysisIdx = text.indexOf(ANALYSIS_MARKER);

  const summary = detailIdx > 0 ? text.slice(0, detailIdx).trim() : text;

  const detail =
    detailIdx > 0
      ? text.slice(detailIdx, analysisIdx > detailIdx ? analysisIdx : undefined).trim()
      : null;

  const analysis = analysisIdx > 0 ? text.slice(analysisIdx).trim() : null;

  return (
    <div className="explanation-box">
      <div className="explanation-box__content">
        <Markdown>{summary}</Markdown>
      </div>
      {detail && (
        <details>
          <summary><strong>Explicació detallada</strong></summary>
          <div className="explanation-box__content">
            <Markdown>{stripMarker(detail, DETAIL_MARKER)}</Markdown>
          </div>
        </details>
      )}
      {analysis && (
        <details>
          <summary><strong>Anàlisi d'opcions falses</strong></summary>
          <div className="explanation-box__content">
            <Markdown>{stripMarker(analysis, ANALYSIS_MARKER)}</Markdown>
          </div>
        </details>
      )}
      <p className="ai-disclaimer">Explicació generada per IA — pot contenir errors.</p>
    </div>
  );
}
