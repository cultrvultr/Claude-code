#!/usr/bin/env python3
"""Render a filled legal-template markdown file to a signable .docx.

Usage:
    python3 scripts/build_docx.py filled-draft.md "Mutual NDA - Acme - 2026-08-19.docx"

Handles the markup the General Legal templates actually use: bold (**x**),
italic (*x*), bold-italic (***x***), numbered clause hierarchy by indentation,
pipe tables, horizontal rules, and signature blocks written as dash lists.

Refuses to run if the draft still contains <mark> tags or bracketed placeholders
-- run `list_fields.py --check` and finish the draft first. Pass --force to
override (for a deliberate [TO CONFIRM: ...] left in for the user).

Requires python-docx:  pip install python-docx
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

try:
    from docx import Document
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Inches, Pt
except ImportError:  # pragma: no cover - environment-dependent
    sys.exit(
        "error: python-docx is not installed.\n"
        "  fix:  pip install python-docx\n"
        "  else: use the `docx` skill, or deliver the filled markdown instead."
    )

# ***bold italic***, **bold**, *italic* -- longest delimiter first.
INLINE_RE = re.compile(r"(\*\*\*.+?\*\*\*|\*\*.+?\*\*|\*.+?\*)", re.DOTALL)

# The templates were machine-converted from .docx and carry emphasis artifacts
# that no markdown parser reads the way the original document meant them.
# Normalize the two shapes that actually occur before parsing.
ARTIFACTS = (
    # **"*Control***  ->  "***Control***
    (re.compile(r'\*\*(["\u201c])\*'), r"\1***"),
    # ***Effective **Date***  ->  ***Effective Date***
    (re.compile(r"\*\*\*([^*]+?)\s\*\*([^*]+?)\*\*\*"), r"***\1 \2***"),
)


def normalize(text: str) -> str:
    for pattern, replacement in ARTIFACTS:
        text = pattern.sub(replacement, text)
    return text
# "1. ", "1.1 ", "(a) " and friends at the head of a line.
CLAUSE_RE = re.compile(r"^(\(?[0-9a-zA-Z]+[.)](?:[0-9]+[.)])*)\s+(.*)$")
LEFTOVER_RE = re.compile(r"<mark>|\[[^\[\]]{1,200}\]|_{3,}")

# A "# heading" longer than this is really a sentence; render it as bold text.
HEADING_CHARS = 120

BODY_FONT = "Calibri"
BODY_SIZE = Pt(10.5)


def add_runs(paragraph, text: str) -> None:
    """Write text into a paragraph, honouring markdown emphasis."""
    for piece in INLINE_RE.split(normalize(text)):
        if not piece:
            continue
        bold = italic = False
        if piece.startswith("***") and piece.endswith("***") and len(piece) > 6:
            piece, bold, italic = piece[3:-3], True, True
        elif piece.startswith("**") and piece.endswith("**") and len(piece) > 4:
            piece, bold = piece[2:-2], True
        elif piece.startswith("*") and piece.endswith("*") and len(piece) > 2:
            piece, italic = piece[1:-1], True
        # Drop any asterisk that survived normalization rather than printing it.
        piece = piece.replace("*", "")
        if not piece:
            continue
        run = paragraph.add_run(piece.replace("<mark>", "").replace("</mark>", ""))
        run.bold = bold
        run.italic = italic


def new_paragraph(doc, text: str, indent: float = 0.0, space_after: int = 8, align=None):
    p = doc.add_paragraph()
    if indent:
        p.paragraph_format.left_indent = Inches(indent)
    p.paragraph_format.space_after = Pt(space_after)
    if align is not None:
        p.alignment = align
    add_runs(p, text)
    return p


def split_table_row(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def is_divider(line: str) -> bool:
    return bool(re.fullmatch(r"\|?[\s:|-]{3,}\|?", line.strip())) and "-" in line


def emit_table(doc, rows: list[list[str]]) -> None:
    if not rows:
        return
    width = max(len(r) for r in rows)
    table = doc.add_table(rows=0, cols=width)
    table.style = "Table Grid"
    for index, row in enumerate(rows):
        cells = table.add_row().cells
        for col in range(width):
            cell = cells[col]
            cell.paragraphs[0].text = ""
            text = row[col] if col < len(row) else ""
            add_runs(cell.paragraphs[0], text)
            if index == 0:
                for run in cell.paragraphs[0].runs:
                    run.bold = True
    doc.add_paragraph()


def convert(source: str, title: str) -> "Document":
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = BODY_FONT
    style.font.size = BODY_SIZE

    for section in doc.sections:
        section.left_margin = section.right_margin = Inches(1.0)
        section.top_margin = section.bottom_margin = Inches(1.0)

    lines = source.splitlines()
    pending_table: list[list[str]] = []
    first_block = True
    i = 0

    while i < len(lines):
        raw = lines[i]
        line = raw.strip()

        if line.startswith("|") and "|" in line[1:]:
            if not is_divider(line):
                pending_table.append(split_table_row(line))
            i += 1
            continue
        if pending_table:
            emit_table(doc, pending_table)
            pending_table = []

        if not line:
            i += 1
            continue

        if re.fullmatch(r"-{3,}|\*{3,}|_{3,}", line):
            new_paragraph(doc, "", space_after=6)
            i += 1
            continue

        if line.startswith("#"):
            level = len(line) - len(line.lstrip("#"))
            body = line.lstrip("#").strip()
            # The source conversion turned some full sentences into headings.
            # Anything that long reads better as a bold lead-in paragraph.
            if len(body) > HEADING_CHARS:
                new_paragraph(doc, f"**{body}**", space_after=8)
            else:
                heading = doc.add_heading("", level=min(level, 4))
                add_runs(heading, body)
            i += 1
            first_block = False
            continue

        indent = (len(raw) - len(raw.lstrip(" "))) / 4.0 * 0.35

        if line.startswith(("- ", "* ", "+ ")):
            new_paragraph(doc, line[2:].strip(), indent=max(indent, 0.25), space_after=3)
            i += 1
            continue

        clause = CLAUSE_RE.match(line)
        if clause:
            number, body = clause.groups()
            p = new_paragraph(doc, "", indent=indent, space_after=8)
            run = p.add_run(f"{number} ")
            run.bold = True
            add_runs(p, body)
            i += 1
            first_block = False
            continue

        # A short all-bold opening line is the document title.
        if first_block and line.startswith("**") and line.endswith("**") and len(line) < 120:
            new_paragraph(doc, line, space_after=14, align=WD_ALIGN_PARAGRAPH.CENTER)
            first_block = False
            i += 1
            continue

        new_paragraph(doc, line, indent=indent)
        first_block = False
        i += 1

    if pending_table:
        emit_table(doc, pending_table)

    doc.core_properties.title = title
    return doc


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", type=Path, help="filled markdown draft")
    ap.add_argument("output", type=Path, help="destination .docx")
    ap.add_argument("--force", action="store_true", help="build even with unresolved fields")
    args = ap.parse_args()

    try:
        text = args.source.read_text(encoding="utf-8")
    except OSError as exc:
        print(f"error: cannot read {args.source}: {exc}", file=sys.stderr)
        return 2

    leftovers = LEFTOVER_RE.findall(text)
    if leftovers and not args.force:
        print(
            f"error: {args.source} still has {len(leftovers)} unresolved field(s).\n"
            f"  run:  python3 scripts/list_fields.py {args.source} --check\n"
            f"  or:   re-run with --force if a placeholder is intentional",
            file=sys.stderr,
        )
        return 1

    doc = convert(text, args.output.stem)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    doc.save(args.output)
    print(f"wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
