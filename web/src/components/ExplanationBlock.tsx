import Markdown from "react-markdown";

const DETAIL_MARKER = "**Explicació Detallada:**";

export default function ExplanationBlock({ text }: { text: string }) {
  const idx = text.indexOf(DETAIL_MARKER);
  const summary = idx > 0 ? text.slice(0, idx).trim() : text;
  const detail = idx > 0 ? text.slice(idx).trim() : null;

  return (
    <div className="explanation-box">
      <div className="explanation-box__content">
        <Markdown>{summary}</Markdown>
      </div>
      {detail && (
        <details>
          <summary><strong>Veure explicació detallada</strong></summary>
          <div className="explanation-box__content">
            <Markdown>{detail}</Markdown>
          </div>
        </details>
      )}
      <p className="ai-disclaimer">Explicació generada per IA — pot contenir errors.</p>
    </div>
  );
}
