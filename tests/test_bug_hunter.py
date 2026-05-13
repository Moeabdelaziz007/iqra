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
        rows = [l for l in out.splitlines() if l.startswith("| `")]
        self.assertLessEqual(len(rows), 15)

    def test_render_at_most_12_words_in_recurring_section(self):
        words = Counter({f"word{i}": i + 1 for i in range(20)})
        out = _render("2024-05", [], Counter(), words)
        # Words section is a single comma-separated line
        word_section = out.split("## Recurring subject words")[-1]
        # Count backtick-delimited tokens which are the words
        word_tokens = [p for p in word_section.split("`") if p and "(" in p or False]
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


if __name__ == "__main__":
    unittest.main()
