/**
 * Unit Tests: GitSkill
 *
 * GitSkill shells out via `spawnSync` (not `execSync`) — args are passed
 * as an argv array, which eliminates shell injection and removes the
 * need for single-quote escaping. The mocks below mirror that contract:
 * each test stubs `spawnSync` to return `{ status, stdout, stderr }`
 * and asserts on `mockSpawn.mock.calls[i]` argv arrays.
 *
 * Covers:
 *  - isSafeRefToken validation (exposed indirectly through createBranch / revertTo)
 *  - createBranch() — valid name succeeds, invalid names are rejected
 *  - revertTo() — safe ref succeeds, dangerous ref is rejected
 *  - head() / branch() / isClean() — happy and sad paths
 *  - recentCommits() — limit clamping to [1, 200]
 *  - commit() — empty paths / message guard
 *  - pushToBranch() — guards and flow
 *  - openPR() — empty title guard
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock child_process.spawnSync (the real API GitSkill uses) before
// importing GitSkill so the module picks up the mock at import time.
vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
}));

// Also mock IQRALogger to capture warnings without side effects.
vi.mock('#infra/logger', () => ({
  IQRALogger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { spawnSync } from 'child_process';
import { GitSkill } from '#skills/git_skill';
import { IQRALogger } from '#infra/logger';

const mockSpawn = vi.mocked(spawnSync);

/** Convenience: build the spawnSync result shape GitSkill expects. */
function ok(stdout: string = '', stderr: string = '') {
  return { status: 0, stdout, stderr, signal: null, output: [], pid: 0 } as any;
}
function fail(stderr: string = 'error', status: number = 1) {
  return { status, stdout: '', stderr, signal: null, output: [], pid: 0 } as any;
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── head() ────────────────────────────────────────────────────────────────────

describe('GitSkill.head()', () => {
  it('returns the short SHA from git output', () => {
    mockSpawn.mockReturnValueOnce(ok('abc1234\n'));
    expect(GitSkill.head()).toBe('abc1234');
    expect(mockSpawn.mock.calls[0][0]).toBe('git');
    expect(mockSpawn.mock.calls[0][1]).toEqual(['rev-parse', '--short', 'HEAD']);
  });

  it('returns empty string when git exits non-zero', () => {
    mockSpawn.mockReturnValueOnce(fail('not a git repo'));
    expect(GitSkill.head()).toBe('');
  });

  it('returns empty string when spawnSync reports an error', () => {
    mockSpawn.mockReturnValueOnce({ ...fail(), error: new Error('ENOENT') } as any);
    expect(GitSkill.head()).toBe('');
  });
});

// ── branch() ─────────────────────────────────────────────────────────────────

describe('GitSkill.branch()', () => {
  it('returns the branch name', () => {
    mockSpawn.mockReturnValueOnce(ok('main\n'));
    expect(GitSkill.branch()).toBe('main');
    expect(mockSpawn.mock.calls[0][1]).toEqual(['rev-parse', '--abbrev-ref', 'HEAD']);
  });

  it('returns empty string on detached HEAD (non-zero exit)', () => {
    mockSpawn.mockReturnValueOnce(fail('HEAD detached'));
    expect(GitSkill.branch()).toBe('');
  });
});

// ── isClean() ─────────────────────────────────────────────────────────────────

describe('GitSkill.isClean()', () => {
  it('returns true when porcelain output is empty AND git exits 0', () => {
    mockSpawn.mockReturnValueOnce(ok(''));
    expect(GitSkill.isClean()).toBe(true);
  });

  it('returns false when there are uncommitted changes', () => {
    mockSpawn.mockReturnValueOnce(ok(' M src/index.ts\n'));
    expect(GitSkill.isClean()).toBe(false);
  });

  it('returns false (not silently true) when git itself fails', () => {
    // No-repo or transient git failure must NOT be reported as clean.
    mockSpawn.mockReturnValueOnce(fail('fatal: not a git repository'));
    expect(GitSkill.isClean()).toBe(false);
  });
});

// ── createBranch() ────────────────────────────────────────────────────────────

describe('GitSkill.createBranch() — ref validation + exit code', () => {
  it('returns true for a valid branch name when git exits 0', () => {
    mockSpawn.mockReturnValueOnce(ok('', "Switched to a new branch 'feature/test'\n"));
    expect(GitSkill.createBranch('feature/test')).toBe(true);
    expect(mockSpawn.mock.calls[0][1]).toEqual(['checkout', '-b', 'feature/test']);
  });

  it('treats success-on-stderr-only as success (exit-code semantics)', () => {
    // git checkout -b commonly prints to stderr; stdout may be empty.
    mockSpawn.mockReturnValueOnce(ok('', 'Switched to a new branch ...'));
    expect(GitSkill.createBranch('ok-branch')).toBe(true);
  });

  it('rejects a branch name starting with "-"', () => {
    expect(GitSkill.createBranch('-bad-branch')).toBe(false);
    expect(IQRALogger.warn).toHaveBeenCalledWith(expect.stringContaining('refusing invalid branch name'));
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('rejects a branch name containing ".."', () => {
    expect(GitSkill.createBranch('refs..bad')).toBe(false);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('rejects a branch name containing "@{"', () => {
    expect(GitSkill.createBranch('branch@{yesterday}')).toBe(false);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('rejects a branch name with special shell characters', () => {
    // The regex only allows [A-Za-z0-9._/-]
    expect(GitSkill.createBranch('branch; rm -rf /')).toBe(false);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('rejects an empty branch name', () => {
    expect(GitSkill.createBranch('')).toBe(false);
  });

  it('accepts valid branch names with dots and slashes', () => {
    mockSpawn.mockReturnValueOnce(ok());
    expect(GitSkill.createBranch('fix/1.0.2-patch')).toBe(true);
  });

  it('returns false when git exits non-zero (branch already exists, etc.)', () => {
    mockSpawn.mockReturnValueOnce(fail("fatal: A branch named 'foo' already exists"));
    expect(GitSkill.createBranch('foo')).toBe(false);
  });
});

// ── revertTo() ────────────────────────────────────────────────────────────────

describe('GitSkill.revertTo() — ref validation + exit code', () => {
  it('returns true for a valid ref on exit 0', () => {
    mockSpawn.mockReturnValueOnce(ok('HEAD is now at abc1234'));
    expect(GitSkill.revertTo('abc1234')).toBe(true);
    expect(mockSpawn.mock.calls[0][1]).toEqual(['reset', '--hard', 'abc1234']);
  });

  it('rejects a ref starting with "-" (flag injection guard)', () => {
    expect(GitSkill.revertTo('-f')).toBe(false);
    expect(IQRALogger.warn).toHaveBeenCalledWith(expect.stringContaining('refusing invalid ref'));
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('rejects a ref containing ".."', () => {
    expect(GitSkill.revertTo('HEAD..main')).toBe(false);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('returns false when git exits non-zero on a valid ref', () => {
    mockSpawn.mockReturnValueOnce(fail('fatal: ambiguous argument'));
    expect(GitSkill.revertTo('abc1234')).toBe(false);
  });
});

// ── commit() ─────────────────────────────────────────────────────────────────

describe('GitSkill.commit()', () => {
  it('returns empty string for empty paths array', () => {
    expect(GitSkill.commit([], 'my message')).toBe('');
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('returns empty string for empty message', () => {
    expect(GitSkill.commit(['src/index.ts'], '')).toBe('');
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('calls git add and git commit and returns head SHA on success', () => {
    mockSpawn
      .mockReturnValueOnce(ok())              // git add
      .mockReturnValueOnce(ok())              // git commit
      .mockReturnValueOnce(ok('abc123\n'));   // git rev-parse --short HEAD

    const sha = GitSkill.commit(['src/file.ts'], 'feat: add feature');
    expect(sha).toBe('abc123');
    expect(mockSpawn).toHaveBeenCalledTimes(3);
    expect(mockSpawn.mock.calls[0][1]).toEqual(['add', '--', 'src/file.ts']);
    expect(mockSpawn.mock.calls[1][1]).toEqual(['commit', '-m', 'feat: add feature']);
  });

  it('passes paths verbatim (no manual quoting; argv array is safe)', () => {
    mockSpawn
      .mockReturnValueOnce(ok())
      .mockReturnValueOnce(ok())
      .mockReturnValueOnce(ok('abc'));
    GitSkill.commit(["path/with'quote.ts", 'plain.ts'], 'msg');
    expect(mockSpawn.mock.calls[0][1]).toEqual(['add', '--', "path/with'quote.ts", 'plain.ts']);
  });

  it('returns empty string when git add fails', () => {
    mockSpawn.mockReturnValueOnce(fail('cannot add'));
    expect(GitSkill.commit(['src/file.ts'], 'msg')).toBe('');
  });

  it('returns empty string when git commit fails (e.g. nothing staged)', () => {
    mockSpawn
      .mockReturnValueOnce(ok())                                // add
      .mockReturnValueOnce(fail('nothing to commit', 1));       // commit
    expect(GitSkill.commit(['src/file.ts'], 'msg')).toBe('');
  });
});

// ── recentCommits() ───────────────────────────────────────────────────────────

describe('GitSkill.recentCommits()', () => {
  it('returns an array of commit subjects', () => {
    mockSpawn.mockReturnValueOnce(ok('feat: A\nfix: B\nchore: C\n'));
    expect(GitSkill.recentCommits(3)).toEqual(['feat: A', 'fix: B', 'chore: C']);
  });

  it('clamps limit to minimum of 1', () => {
    mockSpawn.mockReturnValueOnce(ok('commit A\n'));
    GitSkill.recentCommits(0);
    expect(mockSpawn.mock.calls[0][1]).toEqual(['log', '-n', '1', '--pretty=%s']);
  });

  it('clamps limit to maximum of 200', () => {
    mockSpawn.mockReturnValueOnce(ok('commit A\n'));
    GitSkill.recentCommits(9999);
    expect(mockSpawn.mock.calls[0][1]).toEqual(['log', '-n', '200', '--pretty=%s']);
  });

  it('returns empty array when git fails', () => {
    mockSpawn.mockReturnValueOnce(fail('no repo'));
    expect(GitSkill.recentCommits()).toEqual([]);
  });
});

// ── pushToBranch() ────────────────────────────────────────────────────────────

describe('GitSkill.pushToBranch()', () => {
  it('returns false for invalid branch name', async () => {
    expect(await GitSkill.pushToBranch('-bad', 'message')).toBe(false);
    expect(IQRALogger.warn).toHaveBeenCalled();
  });

  it('returns false for empty message', async () => {
    expect(await GitSkill.pushToBranch('valid-branch', '')).toBe(false);
  });

  it('returns false when createBranch fails', async () => {
    mockSpawn.mockReturnValueOnce(fail('branch exists')); // createBranch
    expect(await GitSkill.pushToBranch('existing-branch', 'msg')).toBe(false);
  });

  it('returns false when git push itself fails (not just empty stdout)', async () => {
    // createBranch ok, add ok, commit ok, push FAILS.
    mockSpawn
      .mockReturnValueOnce(ok())                          // checkout -b
      .mockReturnValueOnce(ok())                          // add -A
      .mockReturnValueOnce(ok())                          // commit
      .mockReturnValueOnce(fail('Permission denied'));    // push -u origin
    expect(await GitSkill.pushToBranch('valid-branch', 'msg')).toBe(false);
  });

  it('returns true only when push exits 0', async () => {
    mockSpawn
      .mockReturnValueOnce(ok())  // checkout -b
      .mockReturnValueOnce(ok())  // add -A
      .mockReturnValueOnce(ok())  // commit
      .mockReturnValueOnce(ok('', 'To origin/...'));  // push (stdout empty, success on stderr)
    expect(await GitSkill.pushToBranch('valid-branch', 'msg')).toBe(true);
    expect(mockSpawn.mock.calls[3][1]).toEqual(['push', '-u', 'origin', 'valid-branch']);
  });
});

// ── openPR() ─────────────────────────────────────────────────────────────────

describe('GitSkill.openPR()', () => {
  it('returns empty string when title is empty', async () => {
    expect(await GitSkill.openPR('', 'body')).toBe('');
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('returns empty string when gh is not installed', async () => {
    // command -v gh runs through sh; the implementation invokes
    // `runResult(['-c', 'command -v gh'], 'sh')` which we stub here.
    mockSpawn.mockReturnValueOnce(fail('not found'));
    expect(await GitSkill.openPR('My PR', 'body text')).toBe('');
    expect(IQRALogger.warn).toHaveBeenCalledWith(expect.stringContaining('`gh` CLI not installed'));
  });

  it('returns PR URL when gh is available', async () => {
    mockSpawn
      .mockReturnValueOnce(ok('/usr/bin/gh\n'))                                // sh -c "command -v gh"
      .mockReturnValueOnce(ok('https://github.com/org/repo/pull/1\n'));        // gh pr create
    expect(await GitSkill.openPR('feat: new PR', 'description')).toBe(
      'https://github.com/org/repo/pull/1',
    );
  });

  it('passes title and body as argv (no manual quote escaping needed)', async () => {
    mockSpawn
      .mockReturnValueOnce(ok('/usr/bin/gh\n'))
      .mockReturnValueOnce(ok('https://github.com/org/repo/pull/2\n'));

    await GitSkill.openPR("it's a feature", "O'Brien's PR");
    expect(mockSpawn.mock.calls[1][0]).toBe('gh');
    expect(mockSpawn.mock.calls[1][1]).toEqual([
      'pr',
      'create',
      '--title',
      "it's a feature",
      '--body',
      "O'Brien's PR",
    ]);
  });

  it('returns empty string when gh pr create itself fails', async () => {
    mockSpawn
      .mockReturnValueOnce(ok('/usr/bin/gh\n'))                                // sh
      .mockReturnValueOnce(fail('GraphQL: not authorized'));                   // gh
    expect(await GitSkill.openPR('My PR', 'body')).toBe('');
  });
});
