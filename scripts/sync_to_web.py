#!/usr/bin/env python3
"""
Copies data/questions.json into the web app (web/public/data/questions.json)
and bumps DATA_VERSION in web/src/db/bootstrap.ts, so that users who already
have the app open get the new questions/explanations automatically (without
losing their saved test history).

Run this every time you change data/questions.json and want the changes to
show up in the web app.

Usage (from repo root):
  python scripts/sync_to_web.py
  npm run sync-data          # same thing, shorter
"""

import re
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE = REPO_ROOT / "data" / "questions.json"
DEST = REPO_ROOT / "web" / "public" / "data" / "questions.json"
BOOTSTRAP = REPO_ROOT / "web" / "src" / "db" / "bootstrap.ts"

VERSION_RE = re.compile(r"(const DATA_VERSION = )(\d+)(;)")


def main() -> None:
    if not SOURCE.exists():
        print(f"Error: no existe {SOURCE}", file=sys.stderr)
        sys.exit(1)

    DEST.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(SOURCE, DEST)
    print(f"Copiado {SOURCE} -> {DEST}")

    if not BOOTSTRAP.exists():
        print(f"Aviso: no se encontró {BOOTSTRAP}; no se ha actualizado DATA_VERSION.", file=sys.stderr)
        return

    content = BOOTSTRAP.read_text(encoding="utf-8")
    match = VERSION_RE.search(content)
    if not match:
        print(f"Aviso: no se encontró DATA_VERSION en {BOOTSTRAP}; actualízalo a mano.", file=sys.stderr)
        return

    old_version = int(match.group(2))
    new_version = old_version + 1
    new_content = VERSION_RE.sub(rf"\g<1>{new_version}\g<3>", content, count=1)
    BOOTSTRAP.write_text(new_content, encoding="utf-8")
    print(f"DATA_VERSION actualizada: {old_version} -> {new_version} ({BOOTSTRAP})")
    print("\nListo. Los usuarios que abran la web recibirán los datos nuevos automáticamente.")


if __name__ == "__main__":
    main()
