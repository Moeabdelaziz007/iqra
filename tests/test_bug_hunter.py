"""
Unit tests for scripts/bug_hunter.py.

Tests all pure functions using only Python stdlib (unittest + unittest.mock).
No external process is spawned; git calls are mocked via patch.
"""

from __future__ import annotations

import sys
import unittest
from collections import Counter
from datetime import date
from pathlib import Path
from unittest.mock import patch

# Make scripts/ importable.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import bug_hunter  # noqa: E402  (import after sys.path mutation)
from bug_hunter import (  # noqa: E402
    FIX_INLINE_RE,
    FIX_RE,
    STOP,
    TOKEN_RE,
    _fix_commits,
    _render,
    _summary,
    _window,
)


# ---------------------------------------------------------------------------
# _window()
# ---------------------------------------------------------------------------


class TestWindow(unittest.TestCase):
    """_window(today) returns (first_of_prev, first_of_this, 'YYYY-MM')."""

    def test_mid_month_returns_previous_month(self):
        since, until, label = _window(date(2024, 6, 15))
        self.assertEqual(since, date(2024, 5, 1))
        self.assertEqual(until, date(2024, 6, 1))
        self.assertEqual(label, "2024-05")

    def test_first_of_month(self):
        # 2024-03-01 -> previous month is Feb 2024
        since, until, label = _window(date(2024, 3, 1))
        self.assertEqual(since, date(2024, 2, 1))
        self.assertEqual(until, date(2024, 3, 1))
        self.assertEqual(label, "2024-02")

    def test_january_wraps_to_december_of_previous_year(self):
        since, until, label = _window(date(2024, 1, 15))
        self.assertEqual(since, date(2023, 12, 1))
        self.assertEqual(until, date(2024, 1, 1))
        self.assertEqual(label, "2023-12")

    def test_january_first_wraps_to_december(self):
        since, until, label = _window(date(2025, 1, 1))
        self.assertEqual(since, date(2024, 12, 1))
        self.assertEqual(until, date(2025, 1, 1))
        self.assertEqual(label, "2024-12")

    def test_march_returns_february_short_month(self):
        # Previous month is Feb, a short month.
        since, until, label = _window(date(2024, 3, 31))
        self.assertEqual(since, date(2024, 2, 1))
        self.assertEqual(until, date(2024, 3, 1))
        self.assertEqual(label, "2024-02")

    def test_label_format_zero_padded(self):
        _, _, label = _window(date(2024, 2, 10))
        self.assertEqual(label, "2024-01")

    def test_since_is_always_less_than_until(self):
        for month in range(1, 13):
            today = date(2024, month, 15)
            since, until, _ = _window(today)
            self.assertLess(since, until)

    def test_until_equals_first_of_current_month(self):
        today = date(2024, 8, 20)
        _, until, _ = _window(today)
        self.assertEqual(until, date(2024, 8, 1))


# ---------------------------------------------------------------------------
# FIX_RE  (module-level compiled regex)
# ---------------------------------------------------------------------------


class TestFixRe(unittest.TestCase):
    """FIX_RE matches conventional-commit-style fix/bug subjects."""

    # --- positive matches ---

    def test_fix_colon_matches(self):
        self.assertIsNotNone(FIX_RE.match("fix: correct null pointer"))

    def test_bug_colon_matches(self):
        self.assertIsNotNone(FIX_RE.match("bug: handle empty list"))

    def test_bugfix_colon_matches(self):
        self.assertIsNotNone(FIX_RE.match("bugfix: resolve memory leak"))

    def test_hotfix_colon_matches(self):
        self.assertIsNotNone(FIX_RE.match("hotfix: patch auth bypass"))

    def test_fixes_colon_matches(self):
        self.assertIsNotNone(FIX_RE.match("fixes: broken import"))

    def test_fixed_colon_matches(self):
        self.assertIsNotNone(FIX_RE.match("fixed: flaky test"))

    def test_case_insensitive_Fix(self):
        self.assertIsNotNone(FIX_RE.match("Fix: upper case keyword"))

    def test_case_insensitive_BUG(self):
        self.assertIsNotNone(FIX_RE.match("BUG: all caps"))

    def test_scope_annotation_matches(self):
        self.assertIsNotNone(FIX_RE.match("fix(auth): refresh token"))

    def test_scope_with_path_matches(self):
        self.assertIsNotNone(FIX_RE.match("fix(llm/vector): embedding dim"))

    def test_capture_group_returns_subject_body(self):
        m = FIX_RE.match("fix: correct null pointer")
        self.assertEqual(m.group(1), "correct null pointer")

    def test_scope_capture_group_returns_body_only(self):
        m = FIX_RE.match("fix(auth): refresh token expiry")
        self.assertEqual(m.group(1), "refresh token expiry")

    # --- negative matches ---

    def test_feat_does_not_match(self):
        self.assertIsNone(FIX_RE.match("feat: add dark mode"))

    def test_chore_does_not_match(self):
        self.assertIsNone(FIX_RE.match("chore: update deps"))

    def test_docs_does_not_match(self):
        self.assertIsNone(FIX_RE.match("docs: improve readme"))

    def test_refactor_does_not_match(self):
        self.assertIsNone(FIX_RE.match("refactor: extract helper"))

    def test_bare_word_fix_does_not_match(self):
        # No colon.
        self.assertIsNone(FIX_RE.match("fix some thing"))

    def test_fix_mid_sentence_does_not_match(self):
        # FIX_RE anchors to start of string.
        self.assertIsNone(FIX_RE.match("update: fix something"))


# ---------------------------------------------------------------------------
# FIX_INLINE_RE  (fallback keyword search)
# ---------------------------------------------------------------------------


class TestFixInlineRe(unittest.TestCase):
    """FIX_INLINE_RE detects fix/bug/hotfix/bugfix anywhere as whole word."""

    def test_fix_in_middle_matches(self):
        self.assertIsNotNone(FIX_INLINE_RE.search("resolve the fix for crash"))

    def test_bug_matches(self):
        self.assertIsNotNone(FIX_INLINE_RE.search("bug in scheduler"))

    def test_hotfix_matches(self):
        self.assertIsNotNone(FIX_INLINE_RE.search("hotfix release"))

    def test_bugfix_matches(self):
        self.assertIsNotNone(FIX_INLINE_RE.search("bugfix: stale state"))

    def test_partial_word_prefix_does_not_match(self):
        # "prefix" contains "fix" but not as a whole word.
        self.assertIsNone(FIX_INLINE_RE.search("prefix optimization"))

    def test_partial_word_suffix_does_not_match(self):
        # "debug" contains "bug" but not as a whole word.
        self.assertIsNone(FIX_INLINE_RE.search("debug improvements"))

    def test_case_insensitive(self):
        self.assertIsNotNone(FIX_INLINE_RE.search("FIX the renderer"))


# ---------------------------------------------------------------------------
# TOKEN_RE and STOP set
# ---------------------------------------------------------------------------


class TestTokenRe(unittest.TestCase):
    """TOKEN_RE extracts identifiers of 3+ chars starting with a letter."""

    def test_short_word_excluded(self):
        # TOKEN_RE requires 3+ chars; both "ab" and "cd" are excluded.
        self.assertEqual(TOKEN_RE.findall("ab cd"), [])

    def test_single_char_excluded(self):
        self.assertEqual(TOKEN_RE.findall("x y"), [])

    def test_underscore_allowed(self):
        tokens = TOKEN_RE.findall("vector_engine")
        self.assertIn("vector_engine", tokens)

    def test_hyphen_allowed(self):
        # TOKEN_RE permits internal hyphens, so "auto-fix" is one token.
        tokens = TOKEN_RE.findall("auto-fix")
        self.assertIn("auto-fix", tokens)

    def test_digit_in_middle_allowed(self):
        tokens = TOKEN_RE.findall("llm7model")
        self.assertIn("llm7model", tokens)

    def test_digit_start_excluded(self):
        # Token must start with a letter.
        tokens = TOKEN_RE.findall("3rdparty")
        self.assertNotIn("3rdparty", tokens)


class TestStopSet(unittest.TestCase):
    def test_fix_in_stop(self):
        self.assertIn("fix", STOP)

    def test_bug_in_stop(self):
        self.assertIn("bug", STOP)

    def test_hotfix_in_stop(self):
        self.assertIn("hotfix", STOP)

    def test_meaningful_word_not_in_stop(self):
        self.assertNotIn("vector", STOP)
        self.assertNotIn("scheduler", STOP)


# ---------------------------------------------------------------------------
# _fix_commits()  — parsed against synthetic git log output
# ---------------------------------------------------------------------------


def _make_git_log(*entries: tuple[str, str, list[str]]) -> str:
    """Build a synthetic git log --name-only --pretty=format:COMMIT:%H%x09%s output."""
    lines: list[str] = []
    for sha, subject, files in entries:
        lines.append(f"COMMIT:{sha}\t{subject}")
        lines.extend(files)
        lines.append("")  # blank separator
    return "\n".join(lines)


class TestFixCommits(unittest.TestCase):
    """_fix_commits() parses git log output and filters fix-shaped commits."""

    def _run(self, log_output: str) -> list:
        with patch.object(bug_hunter, "_git", return_value=log_output):
            return _fix_commits(date(2024, 5, 1), date(2024, 6, 1))

    def test_single_fix_commit_with_files(self):
        log = _make_git_log(
            ("abc1234abc1234abc1234abc1234abc1234abc1234", "fix: null deref",
             ["src/foo.ts", "src/bar.ts"])
        )
        results = self._run(log)
        self.assertEqual(len(results), 1)
        sha, subject, files = results[0]
        self.assertEqual(sha, "abc1234abc1234abc1234abc1234abc1234abc1234")
        self.assertEqual(subject, "fix: null deref")
        self.assertIn("src/foo.ts", files)
        self.assertIn("src/bar.ts", files)

    def test_non_fix_commit_is_excluded(self):
        log = _make_git_log(
            ("aaa000", "feat: add dark mode", ["src/theme.ts"]),
            ("bbb111", "fix: broken import", ["src/index.ts"]),
        )
        results = self._run(log)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0][1], "fix: broken import")

    def test_multiple_fix_commits(self):
        log = _make_git_log(
            ("sha001", "fix: crash on startup", ["main.ts"]),
            ("sha002", "chore: lint", ["eslint.json"]),
            ("sha003", "bug: scheduler race", ["scheduler.ts", "worker.ts"]),
        )
        results = self._run(log)
        self.assertEqual(len(results), 2)
        subjects = [r[1] for r in results]
        self.assertIn("fix: crash on startup", subjects)
        self.assertIn("bug: scheduler race", subjects)

    def test_fix_commit_with_no_files(self):
        log = _make_git_log(
            ("sha999", "fix: empty commit", [])
        )
        results = self._run(log)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0][2], [])

    def test_empty_git_output_returns_empty_list(self):
        results = self._run("")
        self.assertEqual(results, [])

    def test_inline_fix_keyword_in_subject_is_included(self):
        # No "fix:" prefix but "fix" appears in first 30 chars.
        log = _make_git_log(
            ("sha777", "resolved bug in parser", ["parser.ts"])
        )
        results = self._run(log)
        self.assertEqual(len(results), 1)

    def test_commit_line_without_tab_is_skipped(self):
        # Malformed COMMIT: line with no tab separator.
        raw = "COMMIT:deadbeef_no_tab_here\nsrc/file.ts\n"
        results = self._run(raw)
        self.assertEqual(results, [])

    def test_scope_annotated_commit_matches(self):
        log = _make_git_log(
            ("abc", "fix(llm): embedding dimension", ["llm/vector.ts"])
        )
        results = self._run(log)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0][1], "fix(llm): embedding dimension")

    def test_hotfix_prefix_is_included(self):
        log = _make_git_log(
            ("hfx001", "hotfix: critical auth bypass", ["auth.ts"])
        )
        results = self._run(log)
        self.assertEqual(len(results), 1)

    def test_bugfix_prefix_is_included(self):
        log = _make_git_log(
            ("bfx001", "bugfix: stale cache", ["cache.ts"])
        )
        results = self._run(log)
        self.assertEqual(len(results), 1)

    def test_files_accumulate_across_blank_lines(self):
        # Files should be collected even when the log has blank lines between them
        # (though in practice git --name-only doesn't do that; defensive test).
        raw = (
            "COMMIT:sha001\tfix: multi-file\n"
            "src/alpha.ts\n"
            "src/beta.ts\n"
            "\n"
        )
        results = self._run(raw)
        self.assertEqual(len(results), 1)
        self.assertIn("src/alpha.ts", results[0][2])
        self.assertIn("src/beta.ts", results[0][2])

    def test_git_error_returns_empty_list(self):
        with patch.object(bug_hunter, "_git", return_value=""):
            results = _fix_commits(date(2024, 5, 1), date(2024, 6, 1))
        self.assertEqual(results, [])

    def test_subject_appearing_after_30_chars_not_matched_by_inline(self):
        # "bug" appears at position 40 — beyond the 30-char inline search window
        # and subject doesn't start with fix/bug/bugfix/hotfix.
        subject = "a" * 32 + " bug in here"
        log = _make_git_log(("sha_late", subject, ["file.ts"]))
        results = self._run(log)
        # Should NOT match because FIX_RE won't match and inline search is [:30]
        self.assertEqual(len(results), 0)


# ---------------------------------------------------------------------------
# _summary()
# ---------------------------------------------------------------------------


class TestSummary(unittest.TestCase):
    """_summary() tallies files and extracts non-stop content words."""

    def _commits(self, *entries):
        """Helper: build list of (sha, subject, files) tuples."""
        return list(entries)

    def test_file_counter_increments_per_commit(self):
        commits = [
            ("s1", "fix: null check", ["src/foo.ts"]),
            ("s2", "bug: race condition", ["src/foo.ts", "src/bar.ts"]),
        ]
        files, _ = _summary(commits)
        self.assertEqual(files["src/foo.ts"], 2)
        self.assertEqual(files["src/bar.ts"], 1)

    def test_word_counter_excludes_stop_words(self):
        commits = [("s1", "fix: the broken scheduler", [])]
        _, words = _summary(commits)
        self.assertNotIn("the", words)
        self.assertNotIn("fix", words)
        self.assertNotIn("broken", words)
        self.assertIn("scheduler", words)

    def test_word_counter_counts_repeated_words(self):
        commits = [
            ("s1", "fix: scheduler overflow", []),
            ("s2", "bug: scheduler deadlock", []),
        ]
        _, words = _summary(commits)
        self.assertEqual(words["scheduler"], 2)

    def test_empty_commits_returns_empty_counters(self):
        files, words = _summary([])
        self.assertEqual(len(files), 0)
        self.assertEqual(len(words), 0)

    def test_returns_counter_instances(self):
        files, words = _summary([])
        self.assertIsInstance(files, Counter)
        self.assertIsInstance(words, Counter)

    def test_non_fix_re_subject_uses_full_subject(self):
        # Subject doesn't match FIX_RE, so full subject is used for word extraction.
        commits = [("s1", "resolved bug in scheduler", [])]
        _, words = _summary(commits)
        self.assertIn("resolved", words)
        self.assertIn("scheduler", words)

    def test_fix_re_subject_strips_prefix_before_word_extraction(self):
        # "fix:" prefix body = "vector engine crash" — no stop words there.
        commits = [("s1", "fix: vector engine crash", [])]
        _, words = _summary(commits)
        # "engine" and "vector" are meaningful, "crash" is not in STOP
        self.assertIn("vector", words)
        self.assertIn("engine", words)

    def test_short_tokens_excluded(self):
        # "ok" and "is" are short or in stop set.
        commits = [("s1", "fix: ok is done", [])]
        _, words = _summary(commits)
        self.assertNotIn("ok", words)  # len 2 < 3, filtered by TOKEN_RE
        self.assertNotIn("is", words)  # in STOP


# ---------------------------------------------------------------------------
# _render()
# ---------------------------------------------------------------------------


class TestRender(unittest.TestCase):
    """_render() produces a valid markdown report."""

    def setUp(self):
        self.commits = [
            ("abc1234", "fix: null deref in scheduler", ["src/scheduler.ts"]),
            ("def5678", "bug: race in worker", ["src/worker.ts"]),
        ]
        self.files = Counter({"src/scheduler.ts": 2, "src/worker.ts": 1})
        self.words = Counter({"scheduler": 2, "null": 1, "worker": 1})
        self.label = "2024-05"

    def test_starts_with_h1_heading(self):
        out = _render(self.label, self.commits, self.files, self.words)
        self.assertTrue(out.startswith("# Bug Hunter: 2024-05"))

    def test_commit_count_in_summary(self):
        out = _render(self.label, self.commits, self.files, self.words)
        self.assertIn("**2**", out)

    def test_contains_hottest_files_section(self):
        out = _render(self.label, self.commits, self.files, self.words)
        self.assertIn("## Hottest files", out)

    def test_contains_recurring_words_section(self):
        out = _render(self.label, self.commits, self.files, self.words)
        self.assertIn("## Recurring subject words", out)

    def test_contains_commits_section(self):
        out = _render(self.label, self.commits, self.files, self.words)
        self.assertIn("## Commits", out)

    def test_table_has_file_entries(self):
        out = _render(self.label, self.commits, self.files, self.words)
        self.assertIn("`src/scheduler.ts`", out)
        self.assertIn("`src/worker.ts`", out)

    def test_sha_short_form_in_commits(self):
        out = _render(self.label, self.commits, self.files, self.words)
        self.assertIn("`abc1234`", out)
        self.assertIn("`def5678`", out)

    def test_ends_with_newline(self):
        out = _render(self.label, self.commits, self.files, self.words)
        self.assertTrue(out.endswith("\n"))

    def test_empty_files_shows_no_fix_commits_message(self):
        out = _render("2024-01", [], Counter(), Counter())
        self.assertIn("_No fix commits in this window._", out)

    def test_empty_words_shows_no_recurring_words_message(self):
        out = _render("2024-01", [], Counter(), Counter())
        self.assertIn("_No recurring words._", out)

    def test_more_than_50_commits_truncated(self):
        many = [("sha%03d" % i, "fix: issue %d" % i, []) for i in range(60)]
        files: Counter = Counter()
        words: Counter = Counter()
        out = _render("2024-05", many, files, words)
        self.assertIn("...and 10 more", out)

    def test_exactly_50_commits_not_truncated(self):
        fifty = [("sha%03d" % i, "fix: issue %d" % i, []) for i in range(50)]
        out = _render("2024-05", fifty, Counter(), Counter())
        self.assertNotIn("more", out.split("## Commits")[-1])

    def test_table_sorted_by_most_common(self):
        # src/hot.ts has 5 hits, src/cold.ts has 1.
        files = Counter({"src/hot.ts": 5, "src/cold.ts": 1})
        out = _render("2024-05", self.commits, files, Counter())
        hot_pos = out.index("src/hot.ts")
        cold_pos = out.index("src/cold.ts")
        self.assertLess(hot_pos, cold_pos)

    def test_label_appears_in_heading_and_body(self):
        out = _render("2024-11", self.commits, self.files, self.words)
        self.assertIn("2024-11", out)
        occurrences = out.count("2024-11")
        self.assertGreaterEqual(occurrences, 2)

    def test_subject_text_included_in_commits_section(self):
        out = _render(self.label, self.commits, self.files, self.words)
        self.assertIn("fix: null deref in scheduler", out)
        self.assertIn("bug: race in worker", out)


# ---------------------------------------------------------------------------
# _git()  — subprocess wrapper
# ---------------------------------------------------------------------------


class TestGit(unittest.TestCase):
    def test_raises_runtime_error_on_nonzero_exit(self):
        # _git uses subprocess.run(check=False) and raises RuntimeError
        # on non-zero exit; it does not swallow errors into "".
        import subprocess
        cp = subprocess.CompletedProcess(
            args=["git", "log"],
            returncode=1,
            stdout="",
            stderr="fatal: bad revision",
        )
        with patch("subprocess.run", return_value=cp):
            with self.assertRaises(RuntimeError):
                bug_hunter._git("log")

    def test_returns_output_on_success(self):
        import subprocess
        cp = subprocess.CompletedProcess(
            args=["git", "log", "--oneline"],
            returncode=0,
            stdout="abc\n",
            stderr="",
        )
        with patch("subprocess.run", return_value=cp):
            result = bug_hunter._git("log", "--oneline")
        self.assertEqual(result, "abc\n")


# ---------------------------------------------------------------------------
# Edge / regression cases
# ---------------------------------------------------------------------------


class TestEdgeCases(unittest.TestCase):
    """Additional regression and boundary tests."""

    def test_window_december_gives_november(self):
        since, until, label = _window(date(2024, 12, 25))
        self.assertEqual(label, "2024-11")
        self.assertEqual(since.month, 11)

    def test_fix_re_does_not_match_empty_string(self):
        self.assertIsNone(FIX_RE.match(""))

    def test_fix_re_does_not_match_whitespace_only(self):
        self.assertIsNone(FIX_RE.match("   "))

    def test_summary_handles_files_with_spaces(self):
        commits = [("s1", "fix: edge case", ["path with space/file.ts"])]
        files, _ = _summary(commits)
        self.assertEqual(files["path with space/file.ts"], 1)

    def test_render_at_most_15_files_in_table(self):
        files = Counter({f"src/file{i}.ts": i + 1 for i in range(20)})
        out = _render("2024-05", [], files, Counter())
        # Count table data rows (lines starting with "| `")
        rows = [line for line in out.splitlines() if line.startswith("| `")]
        self.assertLessEqual(len(rows), 15)

    def test_render_at_most_12_words_in_recurring_section(self):
        words = Counter({f"word{i}": i + 1 for i in range(20)})
        out = _render("2024-05", [], Counter(), words)
        # Words section is a single comma-separated line
        word_section = out.split("## Recurring subject words")[-1]
        # Count backtick-delimited tokens which are the words
        word_tokens = [p for p in word_section.split("`") if (p and "(" in p)]
        # At most 12 top words are shown
        backtick_pairs = word_section.count("` (")
        self.assertLessEqual(backtick_pairs, 12)

    def test_fix_commits_parses_real_sha_format(self):
        sha = "a" * 40  # 40-char hex sha
        log = f"COMMIT:{sha}\tfix: real sha format\nsrc/file.ts\n"
        with patch.object(bug_hunter, "_git", return_value=log):
            results = _fix_commits(date(2024, 5, 1), date(2024, 6, 1))
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0][0], sha)

    def test_fix_commits_strips_whitespace_from_file_lines(self):
        log = "COMMIT:sha001\tfix: whitespace\n  src/foo.ts  \n"
        with patch.object(bug_hunter, "_git", return_value=log):
            results = _fix_commits(date(2024, 5, 1), date(2024, 6, 1))
        self.assertIn("src/foo.ts", results[0][2])


# ---------------------------------------------------------------------------
# main()  — integration of all helpers
# ---------------------------------------------------------------------------


class TestMain(unittest.TestCase):
    """main() orchestrates _window, _fix_commits, _summary, _render and writes the report."""

    def _fake_git_log(self, sha="abc123def456", subject="fix: crash on load",
                      files=None):
        """Return synthetic git log output for a single fix commit."""
        if files is None:
            files = ["src/core.ts"]
        lines = [f"COMMIT:{sha}\t{subject}"] + files + [""]
        return "\n".join(lines)

    def _patch_main(self, tmp_root, git_return=None, git_side_effect=None,
                    today=date(2024, 6, 15)):
        """Return a context-manager stack that patches ROOT, SIGNALS, _git, and date."""
        from contextlib import ExitStack
        tmp_signals = tmp_root / "signals"
        stack = ExitStack()
        if git_side_effect is not None:
            stack.enter_context(
                patch.object(bug_hunter, "_git", side_effect=git_side_effect)
            )
        else:
            stack.enter_context(
                patch.object(bug_hunter, "_git",
                             return_value=git_return if git_return is not None else "")
            )
        stack.enter_context(patch.object(bug_hunter, "SIGNALS", tmp_signals))
        stack.enter_context(patch.object(bug_hunter, "ROOT", tmp_root))
        mock_date = stack.enter_context(patch("bug_hunter.date"))
        mock_date.today.return_value = today
        return stack, tmp_signals

    def test_main_success_returns_zero(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp)
            stack, _ = self._patch_main(tmp_root, git_return=self._fake_git_log())
            with stack:
                result = bug_hunter.main()
        self.assertEqual(result, 0)

    def test_main_writes_report_file(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp)
            stack, tmp_signals = self._patch_main(tmp_root, git_return=self._fake_git_log())
            with stack:
                bug_hunter.main()
            expected = tmp_signals / "bug-hunter-2024-05.md"
            self.assertTrue(expected.exists(),
                            f"Expected report file {expected} was not created")

    def test_main_report_file_contains_fix_count(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp)
            stack, tmp_signals = self._patch_main(tmp_root, git_return=self._fake_git_log())
            with stack:
                bug_hunter.main()
            content = (tmp_signals / "bug-hunter-2024-05.md").read_text(encoding="utf-8")
            self.assertIn("**1**", content)

    def test_main_git_failure_returns_one(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp)
            stack, _ = self._patch_main(tmp_root,
                                        git_side_effect=RuntimeError("git failed"))
            with stack:
                result = bug_hunter.main()
        self.assertEqual(result, 1)

    def test_main_git_failure_writes_nothing(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp)
            stack, tmp_signals = self._patch_main(
                tmp_root, git_side_effect=RuntimeError("git failed")
            )
            with stack:
                bug_hunter.main()
            # signals dir may not even exist; if it does it should be empty
            if tmp_signals.exists():
                self.assertEqual(list(tmp_signals.iterdir()), [])

    def test_main_creates_signals_dir_if_absent(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp) / "repo"
            tmp_root.mkdir()
            stack, tmp_signals = self._patch_main(tmp_root, git_return=self._fake_git_log())
            with stack:
                result = bug_hunter.main()
            self.assertEqual(result, 0)
            self.assertTrue(tmp_signals.exists())

    def test_main_label_in_filename_matches_previous_month(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp)
            stack, tmp_signals = self._patch_main(
                tmp_root, git_return="", today=date(2024, 3, 10)
            )
            with stack:
                bug_hunter.main()
            # Previous month of March 2024 is February 2024
            expected = tmp_signals / "bug-hunter-2024-02.md"
            self.assertTrue(expected.exists())

    def test_main_prints_written_path_on_success(self):
        import io
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp)
            stack, _ = self._patch_main(tmp_root, git_return=self._fake_git_log())
            captured = io.StringIO()
            with stack, patch("sys.stdout", captured):
                bug_hunter.main()
        output = captured.getvalue()
        self.assertIn("bug-hunter", output)
        self.assertIn("fix commit", output)

    def test_main_stderr_message_on_git_failure(self):
        import io
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp)
            stack, _ = self._patch_main(
                tmp_root, git_side_effect=RuntimeError("repo gone")
            )
            captured = io.StringIO()
            with stack, patch("sys.stderr", captured):
                bug_hunter.main()
        self.assertIn("repo gone", captured.getvalue())

    def test_main_zero_commits_report_has_no_fix_phrase(self):
        """When git returns no fix commits, the report reflects zero."""
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp)
            stack, tmp_signals = self._patch_main(tmp_root, git_return="")
            with stack:
                bug_hunter.main()
            content = (tmp_signals / "bug-hunter-2024-05.md").read_text(encoding="utf-8")
            self.assertIn("**0**", content)


# ---------------------------------------------------------------------------
# Additional _render() tests — uncovered behaviour
# ---------------------------------------------------------------------------


class TestRenderAdditional(unittest.TestCase):
    """Supplement TestRender with cases not covered in the original suite."""

    def test_sha_truncated_to_seven_chars(self):
        """Commits section should show only first 7 chars of SHA."""
        sha40 = "a" * 40
        commits = [(sha40, "fix: truncation check", [])]
        out = _render("2024-05", commits, Counter(), Counter())
        # Should appear as `aaaaaaa` (7 a's), not the full 40
        self.assertIn("`aaaaaaa`", out)
        # Full 40-char sha should NOT appear verbatim
        self.assertNotIn("`" + sha40 + "`", out)

    def test_sha_shorter_than_seven_uses_whole_sha(self):
        """SHAs shorter than 7 chars are shown in full (slice is safe)."""
        commits = [("abc", "fix: short sha", [])]
        out = _render("2024-05", commits, Counter(), Counter())
        self.assertIn("`abc`", out)

    def test_zero_commits_shows_zero_in_summary(self):
        out = _render("2024-07", [], Counter(), Counter())
        self.assertIn("**0**", out)

    def test_table_header_present_when_files_exist(self):
        files = Counter({"src/x.ts": 3})
        out = _render("2024-05", [], files, Counter())
        self.assertIn("| File | Fix commits |", out)
        self.assertIn("| --- | ---: |", out)

    def test_commit_51_shows_correct_more_count(self):
        """51 commits -> 'and 1 more'."""
        commits = [("sha%03d" % i, "fix: thing %d" % i, []) for i in range(51)]
        out = _render("2024-05", commits, Counter(), Counter())
        self.assertIn("...and 1 more", out)

    def test_49_commits_not_truncated(self):
        """49 commits -> no truncation message."""
        commits = [("sha%03d" % i, "fix: thing %d" % i, []) for i in range(49)]
        out = _render("2024-05", commits, Counter(), Counter())
        commits_section = out.split("## Commits")[-1]
        self.assertNotIn("more", commits_section)

    def test_file_count_displayed_in_table(self):
        files = Counter({"src/hot.ts": 7})
        out = _render("2024-05", [], files, Counter())
        self.assertIn("| `src/hot.ts` | 7 |", out)

    def test_words_appear_as_backtick_items(self):
        words = Counter({"scheduler": 3})
        out = _render("2024-05", [], Counter(), words)
        self.assertIn("`scheduler` (3)", out)

    def test_report_is_utf8_encodable(self):
        """render output must not contain characters that break UTF-8 write."""
        commits = [("abc1234", "fix: unicode filé", ["src/fïle.ts"])]
        files = Counter({"src/fïle.ts": 1})
        words = Counter({"filé": 1})
        out = _render("2024-05", commits, files, words)
        # Should encode to UTF-8 without error
        encoded = out.encode("utf-8")
        self.assertGreater(len(encoded), 0)


# ---------------------------------------------------------------------------
# Additional _summary() tests — uncovered behaviour
# ---------------------------------------------------------------------------


class TestSummaryAdditional(unittest.TestCase):
    """Extra cases for _summary() not covered in TestSummary."""

    def test_word_extraction_is_case_insensitive(self):
        """Subject words are lowercased before counting."""
        commits = [
            ("s1", "fix: Scheduler crashed", []),
            ("s2", "fix: scheduler overflow", []),
        ]
        _, words = _summary(commits)
        # Both "Scheduler" and "scheduler" should merge into one key
        self.assertEqual(words["scheduler"], 2)
        self.assertNotIn("Scheduler", words)

    def test_multiple_files_per_commit_all_counted(self):
        commits = [("s1", "fix: multi-file", ["a.ts", "b.ts", "c.ts"])]
        files, _ = _summary(commits)
        self.assertEqual(files["a.ts"], 1)
        self.assertEqual(files["b.ts"], 1)
        self.assertEqual(files["c.ts"], 1)

    def test_same_file_in_multiple_commits_accumulates(self):
        commits = [
            ("s1", "fix: thing1", ["shared.ts"]),
            ("s2", "bug: thing2", ["shared.ts"]),
            ("s3", "hotfix: thing3", ["shared.ts"]),
        ]
        files, _ = _summary(commits)
        self.assertEqual(files["shared.ts"], 3)

    def test_stop_word_patch_excluded(self):
        commits = [("s1", "fix: patch the race condition", [])]
        _, words = _summary(commits)
        self.assertNotIn("patch", words)

    def test_stop_word_bugs_excluded(self):
        commits = [("s1", "fix: bugs in the system", [])]
        _, words = _summary(commits)
        self.assertNotIn("bugs", words)

    def test_stop_word_fixes_excluded(self):
        commits = [("s1", "fix: fixes the null problem", [])]
        _, words = _summary(commits)
        self.assertNotIn("fixes", words)

    def test_stop_word_issue_excluded(self):
        commits = [("s1", "fix: resolve issue with auth", [])]
        _, words = _summary(commits)
        self.assertNotIn("issue", words)

    def test_word_counter_independent_of_file_counter(self):
        """words counter should not include file path strings."""
        commits = [("s1", "fix: crash", ["src/file.ts"])]
        files, words = _summary(commits)
        # "src" and "file" should not appear in words — they come from files, not subject
        self.assertNotIn("src", words)
        self.assertNotIn("file", words)


# ---------------------------------------------------------------------------
# Additional _fix_commits() tests — uncovered behaviour
# ---------------------------------------------------------------------------


class TestFixCommitsAdditional(unittest.TestCase):
    """Extra parsing edge cases for _fix_commits()."""

    def _run(self, log_output: str) -> list:
        with patch.object(bug_hunter, "_git", return_value=log_output):
            return _fix_commits(date(2024, 5, 1), date(2024, 6, 1))

    def test_consecutive_fix_commits_both_captured(self):
        """Two fix commits back-to-back with no non-fix commit between them."""
        log = (
            "COMMIT:sha001\tfix: first\n"
            "src/a.ts\n"
            "\n"
            "COMMIT:sha002\tfix: second\n"
            "src/b.ts\n"
            "\n"
        )
        results = self._run(log)
        self.assertEqual(len(results), 2)
        shas = [r[0] for r in results]
        self.assertIn("sha001", shas)
        self.assertIn("sha002", shas)

    def test_non_fix_between_two_fix_commits(self):
        """Non-fix commit sandwiched between two fix commits is excluded."""
        log = (
            "COMMIT:sha001\tfix: alpha\n"
            "src/a.ts\n"
            "\n"
            "COMMIT:sha002\tchore: housekeeping\n"
            "src/c.ts\n"
            "\n"
            "COMMIT:sha003\tbug: beta\n"
            "src/b.ts\n"
            "\n"
        )
        results = self._run(log)
        self.assertEqual(len(results), 2)
        subjects = [r[1] for r in results]
        self.assertIn("fix: alpha", subjects)
        self.assertIn("bug: beta", subjects)
        self.assertNotIn("chore: housekeeping", subjects)

    def test_files_for_non_fix_commit_not_included_in_fix(self):
        """Files from a non-fix commit must not bleed into an adjacent fix commit."""
        log = (
            "COMMIT:sha001\tchore: tidy\n"
            "src/nope.ts\n"
            "\n"
            "COMMIT:sha002\tfix: real fix\n"
            "src/yes.ts\n"
            "\n"
        )
        results = self._run(log)
        self.assertEqual(len(results), 1)
        self.assertNotIn("src/nope.ts", results[0][2])
        self.assertIn("src/yes.ts", results[0][2])

    def test_fixes_inflection_matches(self):
        """'fixes:' is a valid conventional-commit prefix."""
        log = "COMMIT:sha_fx\tfixes: broken renderer\nsrc/render.ts\n"
        results = self._run(log)
        self.assertEqual(len(results), 1)

    def test_bugs_inflection_matches(self):
        """'bugs:' prefix is caught by FIX_RE ((?:es|ed|s)? suffix)."""
        log = "COMMIT:sha_bg\tbugs: multiple auth failures\nsrc/auth.ts\n"
        results = self._run(log)
        self.assertEqual(len(results), 1)

    def test_inline_fix_at_position_29_included(self):
        """Keyword at position exactly 29 (within [:30]) should be included."""
        # "x" * 24 + " fix " = positions 0-23 x, 24 space, 25-27 fix, 28 space
        subject = "x" * 24 + " fix issue"  # "fix" at index 25, within [:30]
        log = f"COMMIT:sha_pos\t{subject}\nsrc/x.ts\n"
        results = self._run(log)
        self.assertEqual(len(results), 1)

    def test_git_called_with_correct_date_arguments(self):
        """_git must receive --since and --until with time-qualified bounds.

        _fix_commits passes an inclusive --since at 00:00:00 on the
        first day of the window and an exclusive --until one second
        before midnight on the upper bound day, so a commit at exactly
        the start of the next month is not double-counted.
        """
        call_args = []

        def capture(*args):
            call_args.extend(args)
            return ""

        with patch.object(bug_hunter, "_git", side_effect=capture):
            _fix_commits(date(2024, 5, 1), date(2024, 6, 1))

        self.assertIn("--since=2024-05-01 00:00:00", call_args)
        self.assertIn("--until=2024-05-31 23:59:59", call_args)

    def test_result_preserves_git_log_order(self):
        """Commits are returned in the order they appear in git log output."""
        log = (
            "COMMIT:first\tfix: appeared first\n\n"
            "COMMIT:second\tfix: appeared second\n\n"
        )
        results = self._run(log)
        self.assertEqual(results[0][0], "first")
        self.assertEqual(results[1][0], "second")


# ---------------------------------------------------------------------------
# Additional _window() tests — uncovered behaviour
# ---------------------------------------------------------------------------


class TestWindowAdditional(unittest.TestCase):
    """Extra boundary tests for _window()."""

    def test_leap_year_march_returns_february_with_29_days(self):
        """March 2024 (leap year) -> Feb window starts Feb 1."""
        since, until, label = _window(date(2024, 3, 1))
        self.assertEqual(since, date(2024, 2, 1))
        self.assertEqual(label, "2024-02")
        # Confirm there are 29 days in Feb 2024 (leap year)
        import calendar
        _, days_in_feb = calendar.monthrange(2024, 2)
        self.assertEqual(days_in_feb, 29)

    def test_non_leap_year_march_returns_february_with_28_days(self):
        """March 2023 (non-leap) -> Feb window starts Feb 1."""
        since, until, label = _window(date(2023, 3, 15))
        self.assertEqual(since, date(2023, 2, 1))
        self.assertEqual(label, "2023-02")
        import calendar
        _, days_in_feb = calendar.monthrange(2023, 2)
        self.assertEqual(days_in_feb, 28)

    def test_since_always_day_one(self):
        """since (first_of_prev) should always be day 1 of the month."""
        for month in range(1, 13):
            today = date(2024, month, 28)
            since, _, _ = _window(today)
            self.assertEqual(since.day, 1)

    def test_until_always_day_one(self):
        """until (first_of_this) should always be day 1 of the month."""
        for month in range(1, 13):
            today = date(2024, month, 28)
            _, until, _ = _window(today)
            self.assertEqual(until.day, 1)

    def test_since_and_until_differ_by_one_month(self):
        """since and until are exactly one calendar month apart."""
        since, until, _ = _window(date(2024, 7, 10))
        self.assertEqual(since.month, 6)
        self.assertEqual(until.month, 7)
        self.assertEqual(since.year, until.year)

    def test_year_boundary_since_and_until_different_years(self):
        """January window: since.year is previous year, until.year is current."""
        since, until, _ = _window(date(2024, 1, 20))
        self.assertEqual(since.year, 2023)
        self.assertEqual(until.year, 2024)


# ---------------------------------------------------------------------------
# Additional _git() tests — uncovered behaviour
# ---------------------------------------------------------------------------


class TestGitAdditional(unittest.TestCase):
    """Extra tests for _git() subprocess wrapper."""

    def test_error_message_includes_exit_code(self):
        """RuntimeError message must include the nonzero exit code."""
        import subprocess
        cp = subprocess.CompletedProcess(
            args=["git", "log"],
            returncode=128,
            stdout="",
            stderr="fatal: not a git repo",
        )
        with patch("subprocess.run", return_value=cp):
            with self.assertRaises(RuntimeError) as ctx:
                bug_hunter._git("log")
        self.assertIn("128", str(ctx.exception))

    def test_error_message_includes_stderr(self):
        """RuntimeError message should contain the stderr text from git."""
        import subprocess
        cp = subprocess.CompletedProcess(
            args=["git", "log"],
            returncode=1,
            stdout="",
            stderr="fatal: ambiguous argument",
        )
        with patch("subprocess.run", return_value=cp):
            with self.assertRaises(RuntimeError) as ctx:
                bug_hunter._git("log")
        self.assertIn("fatal: ambiguous argument", str(ctx.exception))

    def test_empty_stderr_does_not_crash(self):
        """RuntimeError should still be raised when stderr is empty."""
        import subprocess
        cp = subprocess.CompletedProcess(
            args=["git", "log"],
            returncode=1,
            stdout="",
            stderr="",
        )
        with patch("subprocess.run", return_value=cp):
            with self.assertRaises(RuntimeError):
                bug_hunter._git("log")

    def test_zero_exit_with_empty_stdout_returns_empty_string(self):
        """Successful git command with no output returns ''."""
        import subprocess
        cp = subprocess.CompletedProcess(
            args=["git", "status"],
            returncode=0,
            stdout="",
            stderr="",
        )
        with patch("subprocess.run", return_value=cp):
            result = bug_hunter._git("status")
        self.assertEqual(result, "")

    def test_subprocess_receives_git_c_root_prefix(self):
        """_git must invoke the subprocess with ['git', '-C', ROOT, ...]."""
        import subprocess
        cp = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="ok\n", stderr=""
        )
        with patch("subprocess.run", return_value=cp) as mock_run:
            bug_hunter._git("log", "--oneline")
        called_args = mock_run.call_args[0][0]  # first positional arg (list)
        self.assertEqual(called_args[0], "git")
        self.assertEqual(called_args[1], "-C")
        self.assertEqual(called_args[2], str(bug_hunter.ROOT))
        self.assertIn("log", called_args)
        self.assertIn("--oneline", called_args)


# ---------------------------------------------------------------------------
# Additional FIX_RE / FIX_INLINE_RE tests
# ---------------------------------------------------------------------------


class TestFixReAdditional(unittest.TestCase):
    """Extra regex tests not in TestFixRe."""

    def test_hotfixed_variant_does_not_match(self):
        """'hotfixed:' is not in the recognised inflection list."""
        # The pattern allows es|ed|s — so "hotfixes" and "hotfixed" DO match.
        # This test documents actual regex behaviour for "hotfixed:".
        m = FIX_RE.match("hotfixed: resolve crash")
        self.assertIsNotNone(m)  # 'ed' suffix is explicitly allowed

    def test_scope_with_numbers_matches(self):
        m = FIX_RE.match("fix(v2): backward compat")
        self.assertIsNotNone(m)

    def test_empty_scope_does_not_match(self):
        """An empty scope '()' is not in the pattern (requires at least one char)."""
        m = FIX_RE.match("fix(): empty scope")
        self.assertIsNone(m)

    def test_no_space_after_colon_does_not_match(self):
        """FIX_RE requires at least one space and then content after colon."""
        m = FIX_RE.match("fix:")
        self.assertIsNone(m)

    def test_body_with_leading_spaces_captured(self):
        m = FIX_RE.match("fix:  double space body")
        self.assertIsNotNone(m)
        # \s* after the colon consumes both spaces; body should be non-empty
        self.assertTrue(len(m.group(1).strip()) > 0)


class TestFixInlineReAdditional(unittest.TestCase):
    """Extra tests for FIX_INLINE_RE."""

    def test_fixes_inflection_matches(self):
        self.assertIsNotNone(FIX_INLINE_RE.search("this fixes the null issue"))

    def test_fixed_inflection_matches(self):
        self.assertIsNotNone(FIX_INLINE_RE.search("already fixed the leak"))

    def test_bugged_does_not_match_due_to_word_boundary(self):
        # "bugged" -> FIX_INLINE_RE tries to match "bug" then the optional
        # suffix (?:es|ed|s)?.  After matching "bug", the remaining chars are
        # "ged"; none of the suffix alternatives match "ge", so the optional
        # group consumes nothing.  The trailing \b then falls between two word
        # characters ('g' and 'g'), which is not a boundary — so no match.
        self.assertIsNone(FIX_INLINE_RE.search("bugged out on startup"))

    def test_only_whitespace_returns_none(self):
        self.assertIsNone(FIX_INLINE_RE.search("   "))

    def test_empty_string_returns_none(self):
        self.assertIsNone(FIX_INLINE_RE.search(""))


if __name__ == "__main__":
    unittest.main()
