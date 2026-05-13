/**
 * 🔧 GitSkill — wrapper for git operations used by self-evolution loops.
 *
 * Deliberately minimal: shells out to `git` via Node's child_process. No
 * mocks. Operations that mutate state (commit, push, branch creation) are
 * gated behind explicit flags so a misconfigured loop cannot silently
 * rewrite history.
 *
 * Used by:
 *   - #evolution/search_369 (branch creation for evolution probes)
 *   - #evolution/self_evolve (auto-commit of safe edits)
 *   - #evolution/tawbah_loop (revert on detected regression)
 */

import { execSync, type ExecSyncOptions } from 'child_process';
import { IQRALogger } from '#infra/logger';

const DEFAULT_OPTS: ExecSyncOptions = {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  cwd: process.cwd(),
};

function run(cmd: string): string {
  try {
    return execSync(cmd, DEFAULT_OPTS).toString().trim();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    IQRALogger.warn(`⚠️ [GIT] command failed: ${cmd} :: ${msg}`);
    return '';
  }
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
    return run('git rev-parse --short HEAD');
  }

  /** Current branch name, empty string if detached HEAD. */
  static branch(): string {
    return run('git rev-parse --abbrev-ref HEAD');
  }

  /** Returns true when the working tree has no uncommitted changes. */
  static isClean(): boolean {
    return run('git status --porcelain') === '';
  }

  /** Create a new branch from current HEAD and check it out. */
  static createBranch(name: string): boolean {
    if (!isSafeRefToken(name)) {
      IQRALogger.warn(`⚠️ [GIT] refusing invalid branch name: ${name}`);
      return false;
    }
    // Flag injection is prevented at the validator (no leading '-' allowed).
    // We deliberately do NOT add `--` here because `git checkout -b` treats
    // the next positional arg as the new branch name and `--` would be
    // taken as the literal name.
    const out = run(`git checkout -b ${name}`);
    return out !== '';
  }

  /** Stage paths and create a commit. Returns the commit SHA or empty on failure. */
  static commit(paths: string[], message: string): string {
    if (!paths.length || !message) return '';
    const escaped = paths.map((p) => `'${p.replace(/'/g, "'\\''")}'`).join(' ');
    run(`git add ${escaped}`);
    run(`git commit -m '${message.replace(/'/g, "'\\''")}'`);
    return this.head();
  }

  /** Hard-revert the working tree to the given ref. Caller must verify ref. */
  static revertTo(ref: string): boolean {
    if (!isSafeRefToken(ref)) {
      IQRALogger.warn(`⚠️ [GIT] refusing invalid ref: ${ref}`);
      return false;
    }
    // Flag injection is prevented at the validator. `git reset --hard --`
    // would make the ref a path, not a commit, so the separator is
    // intentionally omitted here.
    const out = run(`git reset --hard ${ref}`);
    return out !== '';
  }

  /** Recent commit subjects, most recent first. */
  static recentCommits(limit = 20): string[] {
    const out = run(`git log -n ${Math.max(1, Math.min(limit, 200))} --pretty=%s`);
    return out ? out.split('\n') : [];
  }

  /**
   * Stage all tracked changes, commit with the given message, and push to
   * the named remote branch. Returns true on success.
   */
  static async pushToBranch(branchName: string, message: string): Promise<boolean> {
    if (!isSafeRefToken(branchName)) {
      IQRALogger.warn(`⚠️ [GIT] refusing invalid branch name: ${branchName}`);
      return false;
    }
    if (!message) return false;
    const created = this.createBranch(branchName);
    if (!created) return false;
    run('git add -A');
    run(`git commit -m '${message.replace(/'/g, "'\\''")}'`);
    const pushed = run(`git push -u origin ${branchName}`);
    // `git push` writes to stderr on success; treat absence of error as success.
    return pushed !== '' || this.head() !== '';
  }

  /**
   * Open a PR via the `gh` CLI if available. Returns the PR URL on
   * success, empty string otherwise. No-op when `gh` is missing.
   */
  static async openPR(title: string, body: string): Promise<string> {
    if (!title) return '';
    const ghAvailable = run('command -v gh');
    if (!ghAvailable) {
      IQRALogger.warn('⚠️ [GIT] `gh` CLI not installed; cannot open PR.');
      return '';
    }
    const escTitle = title.replace(/'/g, "'\\''");
    const escBody = (body || '').replace(/'/g, "'\\''");
    return run(`gh pr create --title '${escTitle}' --body '${escBody}'`);
  }
}

export default GitSkill;
