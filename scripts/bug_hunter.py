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
from datetime import date, datetime, time, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SIGNALS = ROOT / "signals"

FIX_RE = re.compile(
    r"^(?:fix|bug|bugfix|hotfix)(?:es|ed|s)?(?:\([^)]+\))?:\s*(.+)$",
    re.IGNORECASE,
)
FIX_INLINE_RE = re.compile(
    r"\b(?:fix|bug|bugfix|hotfix)(?:es|ed|s)?\b",
    re.IGNORECASE,
)
TOKEN_RE = re.compile(r"[A-Za-z][A-Za-z0-9_-]{2,}")
STOP = {"the", "a", "an", "of", "for", "in", "on", "and", "or", "to",
        "with", "from", "by", "is", "be", "issue", "error", "missing",
        "broken", "wrong", "incorrect", "fix", "fixes", "fixed", "bug",
        "bugs", "hotfix", "patch"}


def _git(*args: str) -> str:
    """
    Run a git subcommand and return stdout. Raises RuntimeError on
    non-zero exit so a transient git failure cannot be turned into
    an empty "0 fix commits" report that silently lands on main.
    """
    proc = subprocess.run(
        ["git", "-C", str(ROOT), *args],
        text=True,
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"git {' '.join(args)} failed (exit {proc.returncode}): "
            f"{proc.stderr.strip()}"
        )
    return proc.stdout


def _window(today: date) -> tuple[date, date, str]:
    first_of_this = today.replace(day=1)
    last_of_prev = first_of_this - timedelta(days=1)
    first_of_prev = last_of_prev.replace(day=1)
    return first_of_prev, first_of_this, first_of_prev.strftime("%Y-%m")


def _fix_commits(since: date, until: date) -> list[tuple[str, str, list[str]]]:
    """
    Return a list of (sha, subject, changed_files) for fix-shaped
    commits in the given window.

    Uses a single `git log --name-only` invocation rather than
    spawning a `git show` subprocess per commit, which would be
    O(n) subprocesses for n fix commits. The COMMIT: sentinel
    prefix on the metadata line keeps parsing simple regardless of
    how many files a commit touches (including zero).
    """
    # `git log --until=<DATE>` is inclusive: a commit at exactly
    # 00:00:00 on the first day of the new month would be counted in
    # the previous month's report. Compute an exclusive upper bound
    # by subtracting one second, formatted with explicit time.
    until_ts = (datetime.combine(until, time.min) - timedelta(seconds=1)).strftime(
        "%Y-%m-%d %H:%M:%S"
    )
    raw = _git(
        "log",
        f"--since={since.isoformat()} 00:00:00",
        f"--until={until_ts}",
        "--pretty=format:COMMIT:%H%x09%s",
        "--name-only",
    )
    commits: list[tuple[str, str, list[str]]] = []
    current: tuple[str, str] | None = None
    current_files: list[str] = []

    def _flush() -> None:
        if current is not None:
            commits.append((current[0], current[1], current_files))

    for raw_line in raw.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("COMMIT:"):
            # Boundary: flush the previous commit's accumulated files
            # before starting the next one.
            _flush()
            current_files = []
            payload = line[len("COMMIT:"):]
            if "\t" not in payload:
                current = None
                continue
            sha, subject = payload.split("\t", 1)
            if FIX_RE.match(subject) or FIX_INLINE_RE.search(subject[:30]):
                current = (sha, subject)
            else:
                current = None
        elif current is not None:
            # File path line for the active fix-shaped commit.
            current_files.append(line)

    _flush()
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
    try:
        commits = _fix_commits(since, until)
    except RuntimeError as exc:
        print(f"Bug Hunter: {exc}", file=sys.stderr)
        return 1
    files, words = _summary(commits)
    SIGNALS.mkdir(parents=True, exist_ok=True)
    target = SIGNALS / f"bug-hunter-{label}.md"
    target.write_text(_render(label, commits, files, words), encoding="utf-8")
    print(f"Bug Hunter: wrote {target.relative_to(ROOT)} ({len(commits)} fix commits)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
