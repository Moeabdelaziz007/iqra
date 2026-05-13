#!/usr/bin/env python3
"""
Bug Hunter: monthly analysis of fix/bug commits to surface recurring
failure patterns in the codebase.

Reads `git log` for the previous calendar month, picks commits whose
subject matches a `fix:` / `bug:` / `bugfix:` prefix (or contains
those keywords near the start), and tallies the affected files plus
the first noun-like word after the keyword. Writes a single markdown
report to `signals/bug-hunter-YYYY-MM.md` that the maintainers can
skim in a minute.

The point is not statistical rigor; the point is to make patterns
visible. If `src/lib/iqra/07-llm/vector_engine.ts` shows up in three
fix commits in one month, that file is asking for attention.

Zero cost: pure stdlib + git.
"""

from __future__ import annotations

import re
import subprocess
import sys
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SIGNALS = ROOT / "signals"

FIX_RE = re.compile(r"^(?:fix|bug|bugfix|hotfix)(?:\([^)]+\))?:\s*(.+)$", re.IGNORECASE)
FIX_INLINE_RE = re.compile(r"\b(?:fix|bug|bugfix|hotfix)\b", re.IGNORECASE)
TOKEN_RE = re.compile(r"[A-Za-z][A-Za-z0-9_-]{2,}")
STOP = {"the", "a", "an", "of", "for", "in", "on", "and", "or", "to",
        "with", "from", "by", "is", "be", "issue", "error", "missing",
        "broken", "wrong", "incorrect", "fix", "fixes", "fixed", "bug",
        "bugs", "hotfix", "patch"}


def _git(*args: str) -> str:
    try:
        return subprocess.check_output(["git", "-C", str(ROOT), *args], text=True)
    except subprocess.CalledProcessError:
        return ""


def _window(today: date) -> tuple[date, date, str]:
    first_of_this = today.replace(day=1)
    last_of_prev = first_of_this - timedelta(days=1)
    first_of_prev = last_of_prev.replace(day=1)
    return first_of_prev, first_of_this, first_of_prev.strftime("%Y-%m")


def _fix_commits(since: date, until: date) -> list[tuple[str, str, list[str]]]:
    """Return list of (sha, subject, changed_files) for fix-shaped commits."""
    raw = _git(
        "log",
        f"--since={since.isoformat()}",
        f"--until={until.isoformat()}",
        "--pretty=format:%H%x09%s",
    )
    commits: list[tuple[str, str, list[str]]] = []
    for line in raw.splitlines():
        if "\t" not in line:
            continue
        sha, subject = line.split("\t", 1)
        if not (FIX_RE.match(subject) or FIX_INLINE_RE.search(subject[:30])):
            continue
        files_raw = _git("show", "--pretty=format:", "--name-only", sha)
        files = [f for f in files_raw.splitlines() if f.strip()]
        commits.append((sha, subject, files))
    return commits


def _summary(commits: list[tuple[str, str, list[str]]]) -> tuple[Counter, Counter]:
    file_counter: Counter = Counter()
    word_counter: Counter = Counter()
    for _, subject, files in commits:
        for f in files:
            file_counter[f] += 1
        # Extract content words from subject for theme detection.
        m = FIX_RE.match(subject)
        body = m.group(1) if m else subject
        for tok in TOKEN_RE.findall(body.lower()):
            if tok in STOP:
                continue
            word_counter[tok] += 1
    return file_counter, word_counter


def _render(label: str, commits: list[tuple[str, str, list[str]]],
            files: Counter, words: Counter) -> str:
    out: list[str] = []
    out.append(f"# Bug Hunter: {label}")
    out.append("")
    out.append(
        f"Found **{len(commits)}** fix-shaped commits in {label}. "
        "Top files touched and most common subject words below; treat as "
        "a heatmap for where to spend review attention next month."
    )
    out.append("")

    out.append("## Hottest files (most fix commits)")
    out.append("")
    if files:
        out.append("| File | Fix commits |")
        out.append("| --- | ---: |")
        for f, n in files.most_common(15):
            out.append(f"| `{f}` | {n} |")
    else:
        out.append("_No fix commits in this window._")
    out.append("")

    out.append("## Recurring subject words")
    out.append("")
    if words:
        top = ", ".join(f"`{w}` ({n})" for w, n in words.most_common(12))
        out.append(top)
    else:
        out.append("_No recurring words._")
    out.append("")

    out.append("## Commits")
    out.append("")
    for sha, subject, _ in commits[:50]:
        out.append(f"- `{sha[:7]}` {subject}")
    if len(commits) > 50:
        out.append(f"- _...and {len(commits) - 50} more_")
    out.append("")
    return "\n".join(out) + "\n"


def main() -> int:
    today = date.today()
    since, until, label = _window(today)
    commits = _fix_commits(since, until)
    files, words = _summary(commits)
    SIGNALS.mkdir(parents=True, exist_ok=True)
    target = SIGNALS / f"bug-hunter-{label}.md"
    target.write_text(_render(label, commits, files, words), encoding="utf-8")
    print(f"Bug Hunter: wrote {target.relative_to(ROOT)} ({len(commits)} fix commits)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
