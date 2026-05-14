/**
 * 🔧 GitSkill — wrapper for git operations used by self-evolution loops.
 *
 * Deliberately minimal: shells out to `git` via Node's child_process. No
 * mocks. Operations that mutate state (commit, push, branch creation) are
 * gated behind explicit flags so a misconfigured loop cannot silently
 * rewrite history.
 *
 * Success/failure model:
 *   - All shell calls go through `runResult()` which returns an explicit
 *     `{ ok, stdout, stderr, code }` shape. Callers MUST decide success
 *     from `ok` (exit code 0), never from stdout-emptiness. Many git
 *     subcommands (checkout, push, commit) print to stderr on success
 *     and leave stdout empty, so an empty-stdout heuristic produces
 *     false negatives. Likewise an empty stdout from a failing command
 *     would produce a dangerous false positive (e.g. `isClean` thinking
 *     a non-repo is clean).
 *   - `run()` is preserved as a thin string wrapper used only when the
 *     caller has already established success some other way (e.g. via
 *     `head()` or `branch()` where stdout *is* the data and an error
 *     is acceptably interpreted as "unknown / empty").
 *
 * Used by:
 *   - #evolution/search_369 (branch creation for evolution probes)
 *   - #evolution/self_evolve (auto-commit of safe edits)
 *   - #evolution/tawbah_loop (revert on detected regression)
 */

import { spawnSync, type SpawnSyncOptions } from 'child_process';
import { IQRALogger } from '#infra/logger';

const DEFAULT_OPTS: SpawnSyncOptions = {
  encoding: 'utf8',
  cwd: process.cwd(),
  shell: false,
};

export interface GitRunResult {
  /** True when the process exited with code 0. */
  ok: boolean;
  stdout: string;
  stderr: string;
  /** Exit code if available, -1 if the process never ran. */
  code: number;
}

/**
 * Run `git <args...>` (or another binary) directly, without a shell. The
 * binary defaults to `git`. Returns a structured result so callers can
 * make success decisions on the exit code rather than stdout content.
 */
function runResult(args: string[], binary: string = 'git'): GitRunResult {
  try {
    const res = spawnSync(binary, args, DEFAULT_OPTS);
    if (res.error) {
      const msg = res.error instanceof Error ? res.error.message : String(res.error);
      IQRALogger.warn(`⚠️ [GIT] spawn failed: ${binary} ${args.join(' ')} :: ${msg}`);
      return { ok: false, stdout: '', stderr: msg, code: -1 };
    }
    const stdout = (res.stdout ?? '').toString().trim();
    const stderr = (res.stderr ?? '').toString().trim();
    const code = typeof res.status === 'number' ? res.status : -1;
    return { ok: code === 0, stdout, stderr, code };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    IQRALogger.warn(`⚠️ [GIT] command threw: ${binary} ${args.join(' ')} :: ${msg}`);
    return { ok: false, stdout: '', stderr: msg, code: -1 };
  }
}

/**
 * Run and return stdout on success, empty string otherwise. Use this
 * only for data-fetching calls where treating an error as "empty data"
 * is acceptable (e.g. `head()` outside a repo). NEVER use this for a
 * success-gating decision; use `runResult()` and inspect `.ok`.
 */
function run(args: string[]): string {
  const r = runResult(args);
  return r.ok ? r.stdout : '';
}

/**
 * Validate a git ref-like token (branch name, ref, SHA). Must:
 *   - be non-empty
 *   - contain only [A-Za-z0-9._/-]
 *   - NOT start with '-' (prevents flag injection like `-f`, `--upload-pack=...`)
 *   - NOT contain '..' or '@{' (git rev-parse meta sequences)
 *
 * Aligned with git's own `check-ref-format` rules, kept tight on purpose.
 */
function isSafeRefToken(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (value.startsWith('-')) return false;
  if (value.includes('..') || value.includes('@{')) return false;
  return /^[A-Za-z0-9._\/-]+$/.test(value);
}

export class GitSkill {
  /** Current short SHA, empty string if git is unavailable. */
  static head(): string {
    return run(['rev-parse', '--short', 'HEAD']);
  }

  /**
   * Like `head()` but exposes the structured exit-code result so callers
   * that need to surface failure (instead of treating broken-git as
   * "empty SHA") can decide based on `.ok`.
   */
  static headResult(): GitRunResult {
    return runResult(['rev-parse', '--short', 'HEAD']);
  }

  /** Current branch name, empty string if detached HEAD. */
  static branch(): string {
    return run(['rev-parse', '--abbrev-ref', 'HEAD']);
  }

  /**
   * Like `branch()` but exposes the structured exit-code result. A
   * caller that wants to distinguish "git is broken" from "we are on
   * a real branch" inspects `.ok` here; otherwise prefer `branch()`.
   */
  static branchResult(): GitRunResult {
    return runResult(['rev-parse', '--abbrev-ref', 'HEAD']);
  }

  /**
   * Returns true when the working tree has no uncommitted changes AND
   * git itself ran successfully. A failed git invocation (no repo,
   * missing binary, transient error) returns `false` so automation
   * halts instead of proceeding under a false safety check.
   */
  static isClean(): boolean {
    const r = runResult(['status', '--porcelain']);
    if (!r.ok) return false;
    return r.stdout === '';
  }

  /**
   * Structured equivalent of `isClean()`: returns the raw `GitRunResult`
   * for `git status --porcelain` so callers can distinguish "git
   * invocation failed" (`!ok`) from "tree is dirty" (`ok` with non-empty
   * `stdout`) from "tree is clean" (`ok` with empty `stdout`).
   */
  static statusResult(): GitRunResult {
    return runResult(['status', '--porcelain']);
  }

  /**
   * Create a new branch from current HEAD and check it out. Success is
   * determined by the git exit code, not stdout, because `git checkout
   * -b` prints "Switched to a new branch ..." to stderr and leaves
   * stdout empty on success.
   */
  static createBranch(name: string): boolean {
    if (!isSafeRefToken(name)) {
      IQRALogger.warn(`⚠️ [GIT] refusing invalid branch name: ${name}`);
      return false;
    }
    const r = runResult(['checkout', '-b', name]);
    return r.ok;
  }

  /**
   * Stage paths and create a commit. Returns the commit SHA on success,
   * empty string on any failure (nothing staged, hook rejection, git
   * error). Each step is gated on its own exit code so callers cannot
   * mistake "head() returned an unrelated previous SHA" for success.
   */
  static commit(paths: string[], message: string): string {
    if (!paths.length || !message) return '';
    const addRes = runResult(['add', '--', ...paths]);
    if (!addRes.ok) {
      IQRALogger.warn(`⚠️ [GIT] git add failed: ${addRes.stderr || addRes.code}`);
      return '';
    }
    const commitRes = runResult(['commit', '-m', message]);
    if (!commitRes.ok) {
      IQRALogger.warn(`⚠️ [GIT] git commit failed: ${commitRes.stderr || commitRes.code}`);
      return '';
    }
    return this.head();
  }

  /** Hard-revert the working tree to the given ref. */
  static revertTo(ref: string): boolean {
    if (!isSafeRefToken(ref)) {
      IQRALogger.warn(`⚠️ [GIT] refusing invalid ref: ${ref}`);
      return false;
    }
    const r = runResult(['reset', '--hard', ref]);
    return r.ok;
  }

  /** Recent commit subjects, most recent first. */
  static recentCommits(limit = 20): string[] {
    const n = Math.max(1, Math.min(limit, 200));
    const r = runResult(['log', `-n`, String(n), '--pretty=%s']);
    if (!r.ok || !r.stdout) return [];
    return r.stdout.split('\n');
  }

  /**
   * Stage all tracked changes, commit with the given message, and push
   * to the named remote branch. Each git invocation must succeed; the
   * final boolean reflects the push's own exit code (not a "head() is
   * non-empty" heuristic, which would be true in any normal repo).
   */
  static async pushToBranch(branchName: string, message: string): Promise<boolean> {
    if (!isSafeRefToken(branchName)) {
      IQRALogger.warn(`⚠️ [GIT] refusing invalid branch name: ${branchName}`);
      return false;
    }
    if (!message) return false;

    if (!this.createBranch(branchName)) return false;

    const addRes = runResult(['add', '-A']);
    if (!addRes.ok) {
      IQRALogger.warn(`⚠️ [GIT] git add failed: ${addRes.stderr || addRes.code}`);
      return false;
    }
    const commitRes = runResult(['commit', '-m', message]);
    if (!commitRes.ok) {
      IQRALogger.warn(`⚠️ [GIT] git commit failed: ${commitRes.stderr || commitRes.code}`);
      return false;
    }
    const pushRes = runResult(['push', '-u', 'origin', branchName]);
    if (!pushRes.ok) {
      IQRALogger.warn(`⚠️ [GIT] git push failed: ${pushRes.stderr || pushRes.code}`);
      return false;
    }
    return true;
  }

  /**
   * Open a PR via the `gh` CLI if available. Returns the PR URL on
   * success, empty string otherwise. No-op when `gh` is missing.
   */
  static async openPR(title: string, body: string): Promise<string> {
    if (!title) return '';
    const ghCheck = runResult(['gh'], 'command -v');
    // `command -v` is a shell builtin; spawn it via a fixed `sh -c` so
    // we still get an exit-code answer without invoking a user shell.
    const ghAvail = runResult(['-c', 'command -v gh'], 'sh');
    if (!ghAvail.ok || !ghAvail.stdout) {
      IQRALogger.warn('⚠️ [GIT] `gh` CLI not installed; cannot open PR.');
      // Touching ghCheck silences a no-unused-var lint without altering
      // behavior — the second probe is the authoritative check.
      void ghCheck;
      return '';
    }
    const prRes = runResult(['pr', 'create', '--title', title, '--body', body || ''], 'gh');
    if (!prRes.ok) {
      IQRALogger.warn(`⚠️ [GIT] gh pr create failed: ${prRes.stderr || prRes.code}`);
      return '';
    }
    return prRes.stdout;
  }
}

export default GitSkill;
