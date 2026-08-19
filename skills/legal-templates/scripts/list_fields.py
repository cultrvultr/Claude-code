#!/usr/bin/env python3
"""Extract the fill-in fields from a legal template, or verify a filled draft.

Usage:
    python3 scripts/list_fields.py templates/one-way-nda.md
    python3 scripts/list_fields.py my-draft.md --check

The source templates mark customization points two ways:

  <mark>...</mark>   a span the drafter must act on. Short spans are blanks to
                     fill; long spans are usually whole optional clauses to keep,
                     delete, or adapt.
  [...]              a bracketed placeholder or an either/or choice, e.g.
                     [Company Name], [INSERT DATE], [monthly / semimonthly].

In --check mode the script exits non-zero if any of these survive, which is the
gate before delivering a draft.
"""

from __future__ import annotations

import argparse
import re
import signal
import sys
from pathlib import Path

# Stay quiet when piped into `head` and friends.
if hasattr(signal, "SIGPIPE"):
    signal.signal(signal.SIGPIPE, signal.SIG_DFL)

MARK_RE = re.compile(r"<mark>(.*?)</mark>", re.DOTALL)
# Bracketed placeholders: a bracketed run with no nested brackets, short enough
# to be a field rather than a paragraph of optional text.
BRACKET_RE = re.compile(r"\[([^\[\]]{1,300}?)\]", re.DOTALL)
# Bare blanks: three or more underscores, optionally with $ or other adornment.
BLANK_RE = re.compile(r"_{3,}")

# A <mark> span longer than this is treated as an optional clause rather than a
# blank -- the drafter decides whether it stays, not what word goes in it.
CLAUSE_CHARS = 120

# Bracketed text that is ordinary prose rather than a placeholder.
BRACKET_IGNORE = re.compile(
    r"^(sic|\d+|[ivxlcdm]+|\s*)$",
    re.IGNORECASE,
)


def squash(text: str, limit: int = 0) -> str:
    """Collapse whitespace; optionally truncate for display."""
    out = " ".join(text.split())
    if limit and len(out) > limit:
        out = out[: limit - 1].rstrip() + "…"
    return out


def line_of(source: str, offset: int) -> int:
    return source.count("\n", 0, offset) + 1


def context(source: str, start: int, end: int, width: int = 45) -> str:
    before = squash(source[max(0, start - width) : start])
    after = squash(source[end : end + width])
    return f"…{before} ⟨…⟩ {after}…"


def collect(source: str) -> dict[str, list[tuple[int, str, str]]]:
    """Return findings keyed by kind, each a (line, text, context) triple."""
    blanks: list[tuple[int, str, str]] = []
    clauses: list[tuple[int, str, str]] = []
    brackets: list[tuple[int, str, str]] = []
    bare: list[tuple[int, str, str]] = []

    marked_spans: list[tuple[int, int]] = []

    for m in MARK_RE.finditer(source):
        inner = m.group(1)
        marked_spans.append(m.span())
        entry = (
            line_of(source, m.start()),
            squash(inner, 0 if len(inner) <= CLAUSE_CHARS else 220),
            context(source, m.start(), m.end()),
        )
        (clauses if len(squash(inner)) > CLAUSE_CHARS else blanks).append(entry)

    def inside_mark(pos: int) -> bool:
        return any(s <= pos < e for s, e in marked_spans)

    for m in BRACKET_RE.finditer(source):
        raw = m.group(1)
        inner = squash(MARK_RE.sub(r"\1", raw))
        # A bracket wrapping a <mark> is already reported as that mark.
        if BRACKET_IGNORE.match(inner) or inside_mark(m.start()) or "<mark>" in raw:
            continue
        brackets.append(
            (line_of(source, m.start()), squash(inner, 160), context(source, m.start(), m.end()))
        )

    for m in BLANK_RE.finditer(source):
        if inside_mark(m.start()):
            continue
        bare.append((line_of(source, m.start()), m.group(0), context(source, m.start(), m.end())))

    return {"blanks": blanks, "clauses": clauses, "brackets": brackets, "bare": bare}


def report(found: dict[str, list[tuple[int, str, str]]]) -> None:
    sections = [
        ("blanks", "BLANKS TO FILL", "<mark> spans short enough to be a value"),
        ("clauses", "OPTIONAL CLAUSES", "<mark> spans to keep, delete, or adapt"),
        ("brackets", "BRACKETED PLACEHOLDERS", "[Company Name], [a / b / c], [INSERT DATE]"),
        ("bare", "BARE BLANKS", "underscore runs outside any <mark>"),
    ]
    for key, title, hint in sections:
        items = found[key]
        print(f"\n{title}  ({len(items)})")
        print(f"  {hint}")
        if not items:
            print("  — none —")
            continue
        for line, text, ctx in items:
            print(f"  L{line:<5} {text}")
            print(f"         {ctx}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("path", type=Path, help="template or filled draft (.md)")
    ap.add_argument(
        "--check",
        action="store_true",
        help="verify a filled draft: exit non-zero if any field remains",
    )
    args = ap.parse_args()

    try:
        source = args.path.read_text(encoding="utf-8")
    except OSError as exc:
        print(f"error: cannot read {args.path}: {exc}", file=sys.stderr)
        return 2

    found = collect(source)
    total = sum(len(v) for v in found.values())

    if not args.check:
        print(f"{args.path}: {total} field(s) to resolve")
        report(found)
        print()
        return 0

    if total == 0:
        print(f"{args.path}: clean — no unresolved fields.")
        return 0

    print(f"{args.path}: {total} unresolved field(s) — NOT ready to deliver.", file=sys.stderr)
    report(found)
    print()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
