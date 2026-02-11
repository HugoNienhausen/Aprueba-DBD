#!/usr/bin/env python3
"""
Tarea 2.1: Generar explicaciones con OpenAI para cada pregunta en data/questions.json.
Lee el JSON, llama a la API de OpenAI (enunciado + opción correcta) y rellena 'explicacion'.
Requiere OPENAI_API_KEY en el entorno.

Uso (desde la raíz del proyecto):
  export OPENAI_API_KEY=sk-...
  python scripts/openai_explicaciones.py [--only-null] [--limit N] [--dry-run] [--output PATH]

  --only-null   Solo preguntas con explicacion null (por defecto: True)
  --all         Procesar todas las preguntas (sobrescribe explicaciones existentes)
  --limit N     Procesar como máximo N preguntas (útil para pruebas)
  --dry-run     No guardar; solo mostrar qué se generaría
  --output PATH Guardar en PATH en lugar de sobrescribir data/questions.json
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_JSON = REPO_ROOT / "data" / "questions.json"


def get_correct_option_text(question: dict) -> str:
    """Devuelve el texto de la opción correcta (ej. 'A: Cert')."""
    letter = question.get("correctLetter", "")
    for opt in question.get("options", []):
        if opt.get("letter") == letter:
            return f"{letter}: {opt.get('text', '')}"
    return f"{letter}: (?)"


def build_prompt(question: dict) -> str:
    text = question.get("text", "")
    correct = get_correct_option_text(question)
    return (
        f"Pregunta de test (Bases de datos): {text}\n"
        f"Respuesta correcta: {correct}\n\n"
        "Genera una explicación breve (1-2 frases) en el mismo idioma (catalán o español) "
        "explicando por qué esa respuesta es la correcta. Solo la explicación, sin prefijos."
    )


def fetch_explicacion(question: dict, client, model: str = "gpt-4o-mini") -> str | None:
    """Llama a OpenAI y devuelve la explicación o None si falla."""
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "Eres un ayudante que genera explicaciones breves para respuestas de tests de bases de datos. Responde solo con la explicación, en 1-2 frases.",
                },
                {"role": "user", "content": build_prompt(question)},
            ],
            max_tokens=150,
        )
        content = resp.choices[0].message.content
        return (content or "").strip() or None
    except Exception as e:
        err_str = str(e).lower()
        if "429" in err_str or "quota" in err_str or "insufficient_quota" in err_str:
            print(
                "  [429] Cuota OpenAI agotada: revisa facturación en https://platform.openai.com/account/billing",
                file=sys.stderr,
            )
        else:
            print(f"  Error API: {e}", file=sys.stderr)
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Generar explicaciones con OpenAI para questions.json")
    parser.add_argument("--all", action="store_true", help="Procesar todas las preguntas (no solo explicacion null)")
    parser.add_argument("--limit", type=int, default=0, help="Máximo de preguntas a procesar (0 = sin límite)")
    parser.add_argument("--dry-run", action="store_true", help="No guardar; solo simular")
    parser.add_argument("--output", type=Path, default=None, help="Ruta de salida (por defecto: sobrescribe data/questions.json)")
    parser.add_argument("--input", type=Path, default=DEFAULT_JSON, help="Ruta del JSON de entrada")
    parser.add_argument("--model", type=str, default="gpt-4o-mini", help="Modelo OpenAI (ej. gpt-4o-mini, gpt-4o)")
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: define OPENAI_API_KEY en el entorno.", file=sys.stderr)
        sys.exit(1)

    if not args.input.exists():
        print(f"Error: no existe {args.input}", file=sys.stderr)
        sys.exit(1)

    try:
        from openai import OpenAI
    except ImportError:
        print("Error: instala el paquete openai: pip install openai", file=sys.stderr)
        sys.exit(1)

    with open(args.input, encoding="utf-8") as f:
        data = json.load(f)

    questions = data.get("questions", [])
    only_null = not args.all
    to_process = [q for q in questions if (only_null and q.get("explicacion") is None) or (not only_null)]
    if args.limit > 0:
        to_process = to_process[: args.limit]

    if not to_process:
        print("No hay preguntas que procesar.")
        return

    client = OpenAI(api_key=api_key)
    updated = 0
    for i, q in enumerate(to_process):
        idx = questions.index(q)
        qid = q.get("id", "?")
        print(f"[{i+1}/{len(to_process)}] {qid}...", end=" ", flush=True)
        expl = fetch_explicacion(q, client, model=args.model)
        if expl:
            questions[idx]["explicacion"] = expl
            updated += 1
            print("OK")
        else:
            print("skip")
        if i < len(to_process) - 1:
            time.sleep(0.5)

    if not args.dry_run and updated > 0:
        out = args.output or args.input
        if out == args.input:
            backup = args.input.with_suffix(args.input.suffix + ".bak")
            with open(backup, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"Respaldo en {backup}")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Guardado: {out} ({updated} explicaciones)")
    elif args.dry_run:
        print(f"[dry-run] Se habrían actualizado {updated} preguntas.")


if __name__ == "__main__":
    main()
