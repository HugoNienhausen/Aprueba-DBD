#!/usr/bin/env python3
"""
Apply CORRECCIONES_MANUALES_JSON.md sections 2 and 3 to data/questions.json:
- Section 2: Remove PDF footer " . Diseny de Bases de Dades(GEI) . Preguntes test"
  and any trailing header/Respostes text.
- Section 3: Fix broken accents (e.g. informaci´ o -> informació, sin` onim -> sinònim).
Run from repo root: python scripts/fix_json_corrections.py
"""

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = REPO_ROOT / "data" / "questions.json"

# Section 2: footer and junk suffixes (with leading space, to strip from end of text)
FOOTER = " . Diseny de Bases de Dades(GEI) . Preguntes test"
JUNK_SUFFIXES = [
    " A Respostes Pregunta Resposta",
    " 1 Relational Translation - Difficulties, Criteria and Tools",
    " 2 Relational Translation - Relationships",
    " 3 Normalization",
    " 4 Data Warehousing and OLAP",
    " 5 NOSQL",
    " 6 Views",
    " 7 Physical Design",
    " 8 Query Optimization Phases: Semantic, Syntactic and Physical",
    " 9 Query Optimization Costs: Selection, Sorting and Projection",
    " 10 Query Optimization Costs: Join",
    " 11 Parametrization and Tuning",
    " 12 Transactions",
    " 0 Introduction",
]

# Section 3: accent fixes. Order matters: longer sequences first.
# Format: (pattern, replacement). Use raw strings for special chars.
ACCENT_REPLACEMENTS = [
    ("´ es", "és"),   # Només, què
    ("` es", "ès"),  # if any
    ("´ o", "ó"),    # informació, relació
    ("` o", "ò"),    # sinònim, però
    ("¨ u` encia", "üència"),  # seqüència, conseqüència
    ("¨ u` e", "üè"),         # conseqüència
    ("¨ u", "ü"),             # seqüència
    ("´ ı", "í"),    # Característica (dotless i)
    ("´ i", "í"),   # in case normal i is used
    ("´ e", "é"),   # té
    ("` e", "è"),   # è
    ("´ a", "á"),   # á
    ("` a", "à"),   # à
    ("´ u", "ú"),   # ú
    ("` u", "ù"),   # ù
    ("´ n", "ń"),   # rare
    ("` n", "ǹ"),   # rare
    # Catalan/PDF specific: ` might appear as backtick between letters
    ("at` omic", "atòmic"),
    ("at` omiques", "atòmiques"),
    ("hist` oriques", "històriques"),
    ("Econ` omic", "Econòmic"),
    ("Inst` ancia", "Instància"),
    ("Caracter´ ıstica", "Característica"),
    ("decisi´ o", "decisió"),
    ("producci´ o", "producció"),
]


def clean_text_section2(s: str) -> str:
    """Remove PDF footer and trailing junk."""
    if not s or not isinstance(s, str):
        return s
    t = s.replace(FOOTER, "")
    for suffix in JUNK_SUFFIXES:
        if t.endswith(suffix):
            t = t[: -len(suffix)]
    return t.strip()


def clean_text_section3(s: str) -> str:
    """Fix broken accents."""
    if not s or not isinstance(s, str):
        return s
    t = s
    for pattern, replacement in ACCENT_REPLACEMENTS:
        t = t.replace(pattern, replacement)
    return t


def apply_to_string(s: str) -> str:
    return clean_text_section3(clean_text_section2(s))


def main() -> None:
    if not JSON_PATH.exists():
        print(f"Error: {JSON_PATH} not found", file=sys.stderr)
        sys.exit(1)

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Apply to question.text and each option.text
    for q in data.get("questions", []):
        if "text" in q:
            q["text"] = apply_to_string(q["text"])
        for opt in q.get("options", []):
            if "text" in opt:
                opt["text"] = apply_to_string(opt["text"])

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("Applied section 2 (footer/junk) and section 3 (accents) to data/questions.json")


if __name__ == "__main__":
    main()
