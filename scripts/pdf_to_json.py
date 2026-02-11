#!/usr/bin/env python3
"""
Tarea 0.1: Extract questions, topics and answers from TestQuestions.pdf → data/questions.json
Run from repo root: python scripts/pdf_to_json.py
Or: python scripts/pdf_to_json.py path/to/TestQuestions.pdf
"""

import json
import re
import sys
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    print("Install dependencies: pip install -r scripts/requirements.txt")
    sys.exit(1)


def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract raw text from PDF (all pages concatenated)."""
    reader = PdfReader(str(pdf_path))
    parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text)
    return "\n".join(parts)


def parse_topics_from_toc(lines: list[str]) -> list[dict]:
    """
    Build topics from table-of-contents style lines.
    TOC format: "0.1 Basic background . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 5"
    We look for lines matching: number.number Title . . . page. Clean title (remove trailing dots and page).
    """
    topics = []
    seen_ids = set()
    section_by_main: dict[str, str] = {}  # e.g. "0" -> "0 Introduction"
    sort_order = 0

    # Main section: "0 Introduction 5" or "1 Relational Translation - ... 9" (ends with page number)
    # Must not match subsection "0.1 ..." so require no decimal after first digit(s)
    main_section_re = re.compile(r"^(\d+)\s+(.+?)\s+\d+\s*$")
    # Subsection: "0.1 Basic background . . . 5" (dots may have spaces between them)
    subsection_re = re.compile(r"^(\d+\.\d+)\s+([A-Za-z0-9\s\-/.]+?)\s+[.\s]+\d+\s*$")

    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Main section first so section_by_main is set for subsections
        if not re.match(r"^\d+\.\d+", line):
            m = main_section_re.match(line)
            if m:
                num, title = m.group(1), m.group(2).strip()
                section_by_main[num] = f"{num} {title}"
                continue
        m = subsection_re.match(line)
        if m:
            topic_id = m.group(1)
            title = m.group(2).strip()
            main_num = topic_id.split(".")[0]
            section = section_by_main.get(main_num, f"{main_num} ")
            if topic_id not in seen_ids:
                seen_ids.add(topic_id)
                topics.append({
                    "id": topic_id,
                    "title": title,
                    "section": section,
                    "sortOrder": sort_order,
                })
                sort_order += 1
    return topics


def parse_answers_section(lines: list[str]) -> dict[int, str]:
    """Parse 'Respostes' section: lines like '1 A', '28 B' → {1: 'A', 28: 'B'}."""
    answers: dict[int, str] = {}
    answer_line_re = re.compile(r"^(\d+)\s+([A-F])\s*$")
    for line in lines:
        line = line.strip()
        m = answer_line_re.match(line)
        if m:
            num, letter = int(m.group(1)), m.group(2)
            answers[num] = letter
    return answers


def parse_questions_and_topics_from_content(
    lines: list[str],
    answers: dict[int, str],
) -> tuple[list[dict], list[dict]]:
    """
    Parse content: section headers (0.1 Title, 1.1 Title) and questions (1. text, A. opt, B. opt, ...).
    Returns (topics, questions). Topics are built from section headers in the body.
    """
    topics: list[dict] = []
    questions: list[dict] = []
    seen_topic_ids: set[str] = set()
    section_by_main: dict[str, str] = {}
    current_topic_id: str | None = None
    current_section: str = ""
    sort_order = 0

    # Subsection in body: "0.1 Basic background" or "1.1 Design Steps" (no dots at end)
    subsection_re = re.compile(r"^(\d+\.\d+)\s+(.+)$")
    # Main section in body: "0 Introduction", "1 Relational Translation - ..."
    main_section_re = re.compile(r"^(\d+)\s+([A-Z][a-zA-Z0-9\s\-:]+)$")
    # Question start: "1. text" or "28. text" (number >= 1)
    question_start_re = re.compile(r"^(\d+)\.\s+(.*)$")
    # Option: "A. text" or "B. text"
    option_re = re.compile(r"^([A-F])\.\s*(.*)$")

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Skip empty, page markers, headers
        if not stripped or stripped.startswith("--") or stripped == "." or "Preguntes test" in stripped or "Diseny de Bases de Dades" in stripped:
            i += 1
            continue

        # Main section (e.g. "0 Introduction", "1 Relational Translation - ...")
        m_main = main_section_re.match(stripped)
        if m_main and "." not in stripped.split()[0]:
            main_num = m_main.group(1)
            title = m_main.group(2).strip()
            current_section = f"{main_num} {title}"
            i += 1
            continue

        # Subsection (e.g. "0.1 Basic background", "1.1 Design Steps")
        m_sub = subsection_re.match(stripped)
        if m_sub:
            tid = m_sub.group(1)
            title = m_sub.group(2).strip()
            # Avoid treating "1. PostgreSQL" as subsection (1. something)
            if tid not in seen_topic_ids and current_section:
                seen_topic_ids.add(tid)
                topics.append({
                    "id": tid,
                    "title": title,
                    "section": current_section,
                    "sortOrder": sort_order,
                })
                sort_order += 1
            current_topic_id = tid
            i += 1
            continue

        # Question start: "1. PostgreSQL..." or "20. El disseny..."
        m_q = question_start_re.match(stripped)
        if m_q and current_topic_id:
            qnum = int(m_q.group(1))
            if qnum < 1:
                i += 1
                continue
            qtext_parts = [m_q.group(2).strip()]
            i += 1
            options: list[dict] = []

            while i < len(lines):
                ln = lines[i]
                st = ln.strip()
                if not st:
                    i += 1
                    continue
                # Option A. B. C. ...
                m_opt = option_re.match(st)
                if m_opt:
                    opt_letter = m_opt.group(1)
                    opt_text = m_opt.group(2).strip()
                    i += 1
                    # Continuation: next line might be part of same option if it doesn't start with A-F. or N.
                    while i < len(lines):
                        next_ln = lines[i].strip()
                        if not next_ln:
                            i += 1
                            continue
                        if option_re.match(next_ln) or (question_start_re.match(next_ln) and int(question_start_re.match(next_ln).group(1)) >= 1):
                            break
                        if subsection_re.match(next_ln) or main_section_re.match(next_ln):
                            break
                        opt_text += " " + next_ln
                        i += 1
                    options.append({"letter": opt_letter, "text": opt_text.strip()})
                    continue
                # Next question
                m_next_q = question_start_re.match(st)
                if m_next_q and int(m_next_q.group(1)) >= 1:
                    break
                # Section header
                if subsection_re.match(st) or main_section_re.match(st):
                    break
                # Continuation of question text (no A-F. at start)
                qtext_parts.append(st)
                i += 1

            qtext = " ".join(qtext_parts).strip()
            correct_letter = answers.get(qnum, "A")

            questions.append({
                "id": f"q_{qnum}",
                "number": qnum,
                "topicId": current_topic_id,
                "text": qtext,
                "options": options,
                "correctLetter": correct_letter,
                "explicacion": None,
            })
            continue

        i += 1

    return topics, questions


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    if len(sys.argv) >= 2:
        pdf_path = Path(sys.argv[1]).resolve()
    else:
        pdf_path = repo_root / "TestQuestions.pdf"

    if not pdf_path.is_file():
        print(f"Error: PDF not found: {pdf_path}")
        sys.exit(1)

    print(f"Reading PDF: {pdf_path}")
    full_text = extract_text_from_pdf(pdf_path)
    lines = full_text.splitlines()

    # Find where the actual answer list starts (first line "number letter" e.g. "1 A")
    # Do NOT use "Respostes" in TOC; the real list is much later in the PDF.
    answers_start = None
    answer_line_re = re.compile(r"^\d+\s+[A-F]\s*$")
    for idx, line in enumerate(lines):
        if answer_line_re.match(line.strip()):
            answers_start = idx
            break

    if answers_start is not None:
        answer_lines = lines[answers_start:]
        answers = parse_answers_section(answer_lines)
        print(f"Parsed {len(answers)} answers.")
    else:
        answers = {}
        print("Warning: answers section not found; correctLetter will default to A.")

    # Content is everything before the answer list
    if answers_start is not None:
        content_lines = lines[:answers_start]
    else:
        content_lines = lines

    # Find where real question content starts (skip TOC). TOC lines contain " . . . " and page number.
    # Body starts with "0 Introduction" (no page) or "0.1 Basic background" (no dots) or "1. PostgreSQL"
    content_start = 0
    for idx, line in enumerate(content_lines):
        s = line.strip()
        if " . . . " in s:
            continue  # TOC line
        if s == "0 Introduction" or re.match(r"^0\.1\s+Basic background\s*$", s):
            content_start = idx
            break
        if re.match(r"^[1-9]\d*\.\s+", s):  # question line like "1. PostgreSQL"
            content_start = idx
            break

    body_lines = content_lines[content_start:]
    topics_from_body, questions = parse_questions_and_topics_from_content(body_lines, answers)

    # Use topics from TOC (clean titles); fallback to body if TOC gave none
    toc_topics = parse_topics_from_toc(lines)
    if toc_topics:
        topics = toc_topics
    else:
        topics = topics_from_body

    # Deduplicate topics by id, keep order
    seen = set()
    unique_topics = []
    for t in topics:
        if t["id"] not in seen:
            seen.add(t["id"])
            unique_topics.append(t)
    # Ensure every question topicId exists in topics (fallback for TOC misses)
    q_topic_ids = {q["topicId"] for q in questions}
    for tid in q_topic_ids:
        if tid not in seen:
            main_num = tid.split(".")[0]
            unique_topics.append({
                "id": tid,
                "title": tid,
                "section": f"{main_num} ",
                "sortOrder": len(unique_topics),
            })
            seen.add(tid)

    out = {
        "topics": unique_topics,
        "questions": questions,
    }

    data_dir = repo_root / "data"
    data_dir.mkdir(exist_ok=True)
    out_path = data_dir / "questions.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"Written: {out_path}")
    print(f"  Topics: {len(unique_topics)}")
    print(f"  Questions: {len(questions)}")
    if answers:
        missing = [q["number"] for q in questions if q["number"] not in answers]
        if missing:
            print(f"  Warning: no answer for question numbers: {missing[:20]}{'...' if len(missing) > 20 else ''}")


if __name__ == "__main__":
    main()
