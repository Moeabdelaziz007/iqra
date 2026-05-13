/**
 * Tests for .iqra/hooks/run-pre-commit-guards.sh
 *
 * Covers:
 *  - Static structure: shebang, set -u, key guard variables present in source
 *  - IQRA_SKIP_GUARDS=1 escape hatch → exits 0 immediately
 *  - No staged files (empty git diff --cached) → exits 0 immediately
 *  - tsx binary absent → exits 1 with error message
 *  - All three guards pass → exits 0
 *  - name-validator fails → commit rejected, exits 1
 *  - secret-guard fails → commit rejected, exits 1
 *  - size-guard fails → commit rejected, exits 1
 *  - Multiple guards fail → all three run to completion, exits 1
 *  - Rejection message includes escape-hatch hint
 *  - IQRA_SKIP_GUARDS=0 → guards are NOT skipped
 *  - IQRA_SKIP_GUARDS unset → guards are NOT skipped (default 0)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, '.iqra/hooks/run-pre-commit-guards.sh');

// ── helpers ──────────────────────────────────────────────────────────────────

function readText(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

interface RunOpts {
  /** Extra env vars merged into the subprocess environment. */
  env?: Record<string, string>;
  /**
   * Lines that `git diff --cached --name-only` should emit.
   * Pass an empty string to simulate no staged files.
   */
  stagedFiles?: string;
  /**
   * Per-hook exit codes for the fake tsx binary.
   * Keys are the basename of the hook .ts file without extension.
   * Defaults to 0 (success) for each hook not listed.
   */
  tsxExitCodes?: {
    'name-validator'?: number;
    'secret-guard'?: number;
    'size-guard'?: number;
  };
  /** If true, the tsx binary is not created (simulates missing install). */
  omitTsx?: boolean;
}

let tmpDir = '';

/**
 * Spin up an isolated temp directory acting as a fake project root,
 * wire fake `git` and `tsx` binaries, then run the orchestrator script.
 */
function runScript(opts: RunOpts = {}): RunResult {
  const {
    env = {},
    stagedFiles = 'src/foo.ts',
    tsxExitCodes = {},
    omitTsx = false,
  } = opts;

  // ── fake git binary ────────────────────────────────────────────────────────
  // Responds to `git diff --cached --name-only` with configurable output.
  const fakeBinDir = path.join(tmpDir, 'bin');
  fs.mkdirSync(fakeBinDir, { recursive: true });

  const fakeGit = path.join(fakeBinDir, 'git');
  // Only handle the specific subcommand the script uses; pass everything else
  // through to the real git so the script's set -u doesn't trip.
  fs.writeFileSync(
    fakeGit,
    [
      '#!/bin/sh',
      'if [ "$1 $2 $3 $4" = "diff --cached --name-only" ]; then',
      `  printf '%s' '${stagedFiles}'`,
      '  exit 0',
      'fi',
      // Fall through to the real git for any other invocation
      `exec "$(command -v git)" "$@"`,
    ].join('\n')
  );
  fs.chmodSync(fakeGit, 0o755);

  // ── fake tsx binary ────────────────────────────────────────────────────────
  // Lives at ./node_modules/.bin/tsx relative to cwd (the temp dir).
  if (!omitTsx) {
    const fakeTsxDir = path.join(tmpDir, 'node_modules', '.bin');
    fs.mkdirSync(fakeTsxDir, { recursive: true });

    const exitCode = (hook: string): number =>
      (tsxExitCodes as Record<string, number>)[hook] ?? 0;

    const nameCode = exitCode('name-validator');
    const secretCode = exitCode('secret-guard');
    const sizeCode = exitCode('size-guard');

    // The script calls: tsx .iqra/hooks/<name>.ts
    // We key on the last path component without extension.
    const fakeTsx = path.join(fakeTsxDir, 'tsx');
    fs.writeFileSync(
      fakeTsx,
      [
        '#!/bin/sh',
        'HOOK=$(basename "$1" .ts)',
        `if [ "$HOOK" = "name-validator" ]; then exit ${nameCode}; fi`,
        `if [ "$HOOK" = "secret-guard" ];   then exit ${secretCode}; fi`,
        `if [ "$HOOK" = "size-guard" ];     then exit ${sizeCode}; fi`,
        'exit 0',
      ].join('\n')
    );
    fs.chmodSync(fakeTsx, 0o755);
  }

  // ── run the orchestrator ───────────────────────────────────────────────────
  const result = spawnSync('sh', [SCRIPT], {
    cwd: tmpDir,
    env: {
      ...process.env,
      PATH: `${fakeBinDir}:${process.env.PATH}`,
      ...env,
    },
    encoding: 'utf-8',
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

// ── test lifecycle ────────────────────────────────────────────────────────────

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iqra-guards-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ══ Static / structural tests ════════════════════════════════════════════════

describe('run-pre-commit-guards.sh — static structure', () => {
  it('file exists at the expected path', () => {
    expect(fs.existsSync(SCRIPT)).toBe(true);
  });

  it('is executable (owner has execute bit)', () => {
    const mode = fs.statSync(SCRIPT).mode;
    // 0o100 = owner execute
    expect(mode & 0o100).toBeTruthy();
  });

  it('shebang is #!/bin/sh (POSIX-portable, not bash)', () => {
    const firstLine = readText('.iqra/hooks/run-pre-commit-guards.sh').split('\n')[0];
    expect(firstLine).toBe('#!/bin/sh');
  });

  it('sets -u (undefined-variable safety)', () => {
    const src = readText('.iqra/hooks/run-pre-commit-guards.sh');
    expect(src).toContain('set -u');
  });

  it('references IQRA_SKIP_GUARDS escape-hatch env var', () => {
    const src = readText('.iqra/hooks/run-pre-commit-guards.sh');
    expect(src).toContain('IQRA_SKIP_GUARDS');
  });

  it('checks git diff --cached --name-only for staged files', () => {
    const src = readText('.iqra/hooks/run-pre-commit-guards.sh');
    expect(src).toContain('git diff --cached --name-only');
  });

  it('uses ./node_modules/.bin/tsx as the tsx binary path', () => {
    const src = readText('.iqra/hooks/run-pre-commit-guards.sh');
    expect(src).toContain('./node_modules/.bin/tsx');
  });

  it('runs all three hooks: name-validator, secret-guard, size-guard', () => {
    const src = readText('.iqra/hooks/run-pre-commit-guards.sh');
    expect(src).toContain('name-validator.ts');
    expect(src).toContain('secret-guard.ts');
    expect(src).toContain('size-guard.ts');
  });

  it('accumulates failures (FAIL variable) rather than short-circuiting on first error', () => {
    const src = readText('.iqra/hooks/run-pre-commit-guards.sh');
    expect(src).toContain('FAIL=');
    // The final exit-code check is separate from the per-hook checks
    expect(src).toMatch(/FAIL.*ne.*0/);
  });
});

// ══ Functional tests ══════════════════════════════════════════════════════════

describe('run-pre-commit-guards.sh — IQRA_SKIP_GUARDS escape hatch', () => {
  it('exits 0 when IQRA_SKIP_GUARDS=1', () => {
    const r = runScript({ env: { IQRA_SKIP_GUARDS: '1' } });
    expect(r.status).toBe(0);
  });

  it('prints a skip warning when IQRA_SKIP_GUARDS=1', () => {
    const r = runScript({ env: { IQRA_SKIP_GUARDS: '1' } });
    expect(r.stdout).toContain('IQRA_SKIP_GUARDS');
  });

  it('does NOT skip when IQRA_SKIP_GUARDS=0', () => {
    // With staged files and all guards passing, exit is still 0 —
    // what matters is the code path runs (tsx binary must exist).
    const r = runScript({ env: { IQRA_SKIP_GUARDS: '0' } });
    // Guards ran and all passed → exit 0
    expect(r.status).toBe(0);
    // The skip message must NOT appear
    expect(r.stdout).not.toContain('Guards skipped');
  });

  it('does NOT skip when IQRA_SKIP_GUARDS is unset (default 0)', () => {
    // Remove the variable from the environment entirely.
    const envWithoutSkip = { ...process.env };
    delete envWithoutSkip['IQRA_SKIP_GUARDS'];

    const result = spawnSync('sh', [SCRIPT], {
      cwd: tmpDir,
      env: {
        ...envWithoutSkip,
        PATH: `${path.join(tmpDir, 'bin')}:${process.env.PATH}`,
      },
      encoding: 'utf-8',
    });

    // tsx binary not created yet → will fail with tsx-missing error, not skip
    expect(result.stdout ?? '').not.toContain('Guards skipped');
  });
});

describe('run-pre-commit-guards.sh — no staged files', () => {
  it('exits 0 when git diff --cached returns nothing', () => {
    const r = runScript({ stagedFiles: '' });
    expect(r.status).toBe(0);
  });

  it('prints a skip message when there are no staged files', () => {
    const r = runScript({ stagedFiles: '' });
    // Message contains Arabic or "staged" indicator
    expect(r.stdout).toMatch(/staged|Staged/i);
  });

  it('does not invoke tsx when there are no staged files', () => {
    // Even with tsx missing, the exit should be 0 when nothing is staged.
    const r = runScript({ stagedFiles: '', omitTsx: true });
    expect(r.status).toBe(0);
  });
});

describe('run-pre-commit-guards.sh — tsx binary absent', () => {
  it('exits 1 when node_modules/.bin/tsx does not exist', () => {
    const r = runScript({ omitTsx: true });
    expect(r.status).toBe(1);
  });

  it('prints an error message mentioning tsx when binary is missing', () => {
    const r = runScript({ omitTsx: true });
    expect(r.stdout).toContain('tsx');
  });

  it('mentions npm install in the error message', () => {
    const r = runScript({ omitTsx: true });
    expect(r.stdout).toContain('npm install');
  });
});

describe('run-pre-commit-guards.sh — all guards pass', () => {
  it('exits 0 when all three hooks succeed', () => {
    const r = runScript(); // default: all hooks return 0
    expect(r.status).toBe(0);
  });

  it('prints a success message when all guards are clean', () => {
    const r = runScript();
    expect(r.stdout).toMatch(/✅|guards|clean/i);
  });

  it('announces each hook before running it', () => {
    const r = runScript();
    expect(r.stdout).toContain('name-validator');
    expect(r.stdout).toContain('secret-guard');
    expect(r.stdout).toContain('size-guard');
  });
});

describe('run-pre-commit-guards.sh — individual guard failures', () => {
  it('exits 1 when name-validator fails', () => {
    const r = runScript({ tsxExitCodes: { 'name-validator': 1 } });
    expect(r.status).toBe(1);
  });

  it('prints rejection message when name-validator fails', () => {
    const r = runScript({ tsxExitCodes: { 'name-validator': 1 } });
    expect(r.stdout).toContain('name-validator');
    expect(r.stdout).toMatch(/رفض|reject/i);
  });

  it('exits 1 when secret-guard fails', () => {
    const r = runScript({ tsxExitCodes: { 'secret-guard': 1 } });
    expect(r.status).toBe(1);
  });

  it('prints rejection message when secret-guard fails', () => {
    const r = runScript({ tsxExitCodes: { 'secret-guard': 1 } });
    expect(r.stdout).toContain('secret-guard');
    expect(r.stdout).toMatch(/رفض|reject/i);
  });

  it('exits 1 when size-guard fails', () => {
    const r = runScript({ tsxExitCodes: { 'size-guard': 1 } });
    expect(r.status).toBe(1);
  });

  it('prints rejection message when size-guard fails', () => {
    const r = runScript({ tsxExitCodes: { 'size-guard': 1 } });
    expect(r.stdout).toContain('size-guard');
    expect(r.stdout).toMatch(/رفض|reject/i);
  });
});

describe('run-pre-commit-guards.sh — multiple guard failures', () => {
  it('exits 1 when all three guards fail', () => {
    const r = runScript({
      tsxExitCodes: { 'name-validator': 1, 'secret-guard': 1, 'size-guard': 1 },
    });
    expect(r.status).toBe(1);
  });

  it('runs all three guards even when earlier ones fail (no short-circuit)', () => {
    // If the script short-circuited on name-validator failure, neither
    // secret-guard nor size-guard would appear in the output.
    const r = runScript({
      tsxExitCodes: { 'name-validator': 1, 'secret-guard': 1, 'size-guard': 1 },
    });
    expect(r.stdout).toContain('name-validator');
    expect(r.stdout).toContain('secret-guard');
    expect(r.stdout).toContain('size-guard');
  });

  it('prints each individual rejection when multiple guards fail', () => {
    const r = runScript({
      tsxExitCodes: { 'name-validator': 1, 'secret-guard': 1, 'size-guard': 1 },
    });
    // Each rejection message should appear exactly once
    const nameCount = (r.stdout.match(/name-validator/g) ?? []).length;
    const secretCount = (r.stdout.match(/secret-guard/g) ?? []).length;
    const sizeCount = (r.stdout.match(/size-guard/g) ?? []).length;
    expect(nameCount).toBeGreaterThanOrEqual(2); // announce + reject
    expect(secretCount).toBeGreaterThanOrEqual(2);
    expect(sizeCount).toBeGreaterThanOrEqual(2);
  });

  it('shows final rejection banner with IQRA_SKIP_GUARDS hint when guards fail', () => {
    const r = runScript({
      tsxExitCodes: { 'name-validator': 1 },
    });
    expect(r.stdout).toContain('IQRA_SKIP_GUARDS');
  });

  it('exits 1 when only the last guard (size-guard) fails', () => {
    // Regression: ensure the FAIL accumulator works even for the last hook.
    const r = runScript({ tsxExitCodes: { 'size-guard': 1 } });
    expect(r.status).toBe(1);
  });
});

describe('run-pre-commit-guards.sh — boundary / regression cases', () => {
  it('runs guards when IQRA_SKIP_GUARDS is set to something other than "1"', () => {
    // Only the literal string "1" should trigger the skip.
    const r = runScript({ env: { IQRA_SKIP_GUARDS: 'true' } });
    // guards run and succeed → exit 0, but skip message absent
    expect(r.stdout).not.toContain('Guards skipped');
  });

  it('succeeds for a single staged file (typical commit scenario)', () => {
    const r = runScript({ stagedFiles: 'src/lib/my-feature.ts' });
    expect(r.status).toBe(0);
  });

  it('succeeds for multiple staged files', () => {
    const r = runScript({ stagedFiles: 'src/a.ts\nsrc/b.ts\nsrc/c.ts' });
    expect(r.status).toBe(0);
  });

  it('final success message does not appear when any guard fails', () => {
    const r = runScript({ tsxExitCodes: { 'secret-guard': 1 } });
    // "✅ [IQRA] كل guards نظيفة." should NOT appear
    expect(r.stdout).not.toMatch(/كل guards نظيفة/);
  });
});
