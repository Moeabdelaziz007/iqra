/**
 * Tests for .iqra/hooks/run-pre-commit-guards.sh
 *
 * Covers:
 *  - Static source-level assertions (shebang, structure, guard invocations)
 *  - Functional subprocess tests exercising all exit paths:
 *      1. IQRA_SKIP_GUARDS=1  → exit 0 (skip path)
 *      2. No staged files     → exit 0 (no-op path)
 *      3. tsx binary missing  → exit 1 (install prompt path)
 *      4. All guards pass     → exit 0 (happy path)
 *      5. One guard fails     → exit 1, remaining guards still run
 *      6. All guards fail     → exit 1, all three guards still run (no short-circuit)
 *
 * Functional tests spin up a temporary directory that contains:
 *   - A fake `git` wrapper (controls `git diff --cached --name-only` output)
 *   - A fake `tsx` binary under node_modules/.bin/tsx (controls guard outcomes)
 *   - Fake hook scripts (.iqra/hooks/name-validator.ts, secret-guard.ts, size-guard.ts)
 *     that exit 0 (pass) or exit 1 (fail) as needed per test.
 *
 * The script is invoked with `sh <absolute-path>` so it runs from any working
 * directory; PATH is prepended with the fake-bin dir so our fake `git` wins.
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

function readScript(): string {
  return fs.readFileSync(SCRIPT, 'utf-8');
}

// ── helpers for functional tests ─────────────────────────────────────────────

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

/**
 * Set up a temporary working directory with controlled fake binaries.
 *
 * @param stagedFiles  Lines that `git diff --cached --name-only` should print.
 *                     Pass an empty string to simulate "no staged files".
 * @param guardResults Map from guard basename to exit code (0 = pass, 1 = fail).
 *                     Defaults to all passing (exit 0).
 * @param installTsx   Whether to create a fake tsx binary (default true).
 */
function setupTmpEnv(
  stagedFiles: string,
  guardResults: Record<string, number> = {},
  installTsx = true,
): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iqra-guards-test-'));

  // -- fake git binary --------------------------------------------------------
  const fakeBinDir = path.join(tmpDir, 'fake-bin');
  fs.mkdirSync(fakeBinDir);

  const fakeGit = path.join(fakeBinDir, 'git');
  // Print staged files when called with "diff --cached --name-only", otherwise
  // forward to real git so other git calls (if any) still work.
  fs.writeFileSync(
    fakeGit,
    [
      '#!/bin/sh',
      `if [ "$1" = "diff" ] && [ "$2" = "--cached" ] && [ "$3" = "--name-only" ]; then`,
      `  printf '%s' '${stagedFiles.replace(/'/g, "'\\''")}'`,
      `  exit 0`,
      `fi`,
      // fallback: real git (if available)
      `exec "$(which git 2>/dev/null || echo /usr/bin/git)" "$@"`,
    ].join('\n'),
  );
  fs.chmodSync(fakeGit, 0o755);

  // -- fake tsx binary --------------------------------------------------------
  if (installTsx) {
    const tsxBinDir = path.join(tmpDir, 'node_modules', '.bin');
    fs.mkdirSync(tsxBinDir, { recursive: true });

    const fakeTsx = path.join(tsxBinDir, 'tsx');
    // The script calls:  "$TSX_BIN" .iqra/hooks/<guard>.ts
    // We use $1 (the script path basename-equivalent) to decide exit code.
    const cases = Object.entries(guardResults)
      .map(([name, code]) => `  *${name}*) exit ${code} ;;`)
      .join('\n');
    fs.writeFileSync(
      fakeTsx,
      [
        '#!/bin/sh',
        'case "$1" in',
        cases || '  *) exit 0 ;;',
        !cases ? '' : '  *) exit 0 ;;',
        'esac',
      ]
        .filter(Boolean)
        .join('\n'),
    );
    fs.chmodSync(fakeTsx, 0o755);
  }

  // -- fake hook TypeScript files (tsx just needs the path argument) -----------
  const hooksDir = path.join(tmpDir, '.iqra', 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });
  for (const hook of ['name-validator.ts', 'secret-guard.ts', 'size-guard.ts']) {
    fs.writeFileSync(path.join(hooksDir, hook), '// fake hook\n');
  }

  return tmpDir;
}

function runScript(tmpDir: string, env: Record<string, string> = {}): RunResult {
  const result = spawnSync('sh', [SCRIPT], {
    cwd: tmpDir,
    env: {
      ...process.env,
      PATH: `${path.join(tmpDir, 'fake-bin')}:${process.env.PATH ?? '/usr/bin:/bin'}`,
      IQRA_SKIP_GUARDS: '0', // default off; individual tests override
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

// ── 1. Static source-level assertions ────────────────────────────────────────

describe('run-pre-commit-guards.sh — shebang and portability', () => {
  it('first line is #!/bin/sh (POSIX portable shebang)', () => {
    const firstLine = readScript().split('\n')[0];
    expect(firstLine).toBe('#!/bin/sh');
  });

  it('uses set -u to catch undefined variable references', () => {
    expect(readScript()).toContain('set -u');
  });
});

// ── 2. Static: IQRA_SKIP_GUARDS escape hatch ─────────────────────────────────

describe('run-pre-commit-guards.sh — IQRA_SKIP_GUARDS escape hatch in source', () => {
  it('source checks IQRA_SKIP_GUARDS variable', () => {
    expect(readScript()).toContain('IQRA_SKIP_GUARDS');
  });

  it('source uses ":-0" default so unset variable is treated as "0"', () => {
    expect(readScript()).toContain('${IQRA_SKIP_GUARDS:-0}');
  });

  it('source exits 0 when guard is skipped', () => {
    // The skip branch must exit 0 (not 1)
    const src = readScript();
    // Find the skip block: after IQRA_SKIP_GUARDS check, exit 0
    expect(src).toMatch(/IQRA_SKIP_GUARDS.*[\s\S]*?exit 0/);
  });
});

// ── 3. Static: staged-files early-exit ───────────────────────────────────────

describe('run-pre-commit-guards.sh — staged-files early-exit in source', () => {
  it('uses "git diff --cached --name-only" to check staged files', () => {
    expect(readScript()).toContain('git diff --cached --name-only');
  });

  it('wraps git diff in $() for command substitution', () => {
    expect(readScript()).toContain('$(git diff --cached --name-only)');
  });

  it('exits 0 (not 1) when no staged files are found', () => {
    // Both occurrences of the staged-files check should exit 0
    const src = readScript();
    const lines = src.split('\n');
    // Find lines that contain the staged-files guard pattern and verify exit 0 follows
    const emptyCheckIdx = lines.findIndex((l) => l.includes('git diff --cached --name-only'));
    expect(emptyCheckIdx).toBeGreaterThan(-1);
    // Within the next 3 lines after the check, exit 0 should appear
    const followingLines = lines.slice(emptyCheckIdx, emptyCheckIdx + 4).join('\n');
    expect(followingLines).toContain('exit 0');
  });
});

// ── 4. Static: tsx binary resolution ─────────────────────────────────────────

describe('run-pre-commit-guards.sh — tsx binary resolution in source', () => {
  it('uses ./node_modules/.bin/tsx (direct, not npx)', () => {
    expect(readScript()).toContain('./node_modules/.bin/tsx');
  });

  it('does NOT call tsx via npx', () => {
    // npx tsx is slower and subject to resolution issues; direct path is preferred
    expect(readScript()).not.toMatch(/npx\s+tsx/);
  });

  it('stores tsx path in TSX_BIN variable', () => {
    expect(readScript()).toContain('TSX_BIN=');
  });

  it('exits 1 when tsx binary is not executable', () => {
    const src = readScript();
    // The check uses [ ! -x "$TSX_BIN" ] and exits 1
    expect(src).toContain('! -x "$TSX_BIN"');
    expect(src).toMatch(/! -x "\$TSX_BIN"[\s\S]*?exit 1/);
  });
});

// ── 5. Static: guard invocation sequence ─────────────────────────────────────

describe('run-pre-commit-guards.sh — guard invocation in source', () => {
  it('invokes name-validator.ts', () => {
    expect(readScript()).toContain('.iqra/hooks/name-validator.ts');
  });

  it('invokes secret-guard.ts', () => {
    expect(readScript()).toContain('.iqra/hooks/secret-guard.ts');
  });

  it('invokes size-guard.ts', () => {
    expect(readScript()).toContain('.iqra/hooks/size-guard.ts');
  });

  it('invokes all three guards in the correct order', () => {
    const src = readScript();
    const nameIdx = src.indexOf('name-validator.ts');
    const secretIdx = src.indexOf('secret-guard.ts');
    const sizeIdx = src.indexOf('size-guard.ts');
    expect(nameIdx).toBeLessThan(secretIdx);
    expect(secretIdx).toBeLessThan(sizeIdx);
  });

  it('initialises FAIL=0 before running guards', () => {
    expect(readScript()).toContain('FAIL=0');
  });

  it('does NOT use "exit" immediately on first guard failure (no short-circuit)', () => {
    const src = readScript();
    // Verify that after name-validator failure block, the script continues to
    // secret-guard and size-guard (i.e., there is no `exit 1` directly inside
    // the individual guard failure `if` blocks — only FAIL=1 is set).
    //
    // Strategy: locate the name-validator failure block and confirm it sets
    // FAIL=1 without an exit statement inside it.
    const nameValidatorBlock = src.match(
      /name-validator[\s\S]*?then\s*([\s\S]*?)fi\s*\n/,
    );
    expect(nameValidatorBlock).not.toBeNull();
    const blockBody = nameValidatorBlock![1];
    expect(blockBody).toContain('FAIL=1');
    expect(blockBody).not.toContain('exit');
  });

  it('exits 1 with rejection message when FAIL is non-zero', () => {
    const src = readScript();
    expect(src).toContain('FAIL" -ne 0');
    expect(src).toMatch(/FAIL.*-ne 0[\s\S]*?exit 1/);
  });

  it('exits 0 with clean message when all guards pass', () => {
    const src = readScript();
    // The final success exit
    const lines = src.split('\n');
    const lastExitLine = [...lines].reverse().find((l) => l.trim().startsWith('exit '));
    expect(lastExitLine?.trim()).toBe('exit 0');
  });
});

// ── 6. Functional: skip path (IQRA_SKIP_GUARDS=1) ────────────────────────────

describe('run-pre-commit-guards.sh (functional) — IQRA_SKIP_GUARDS=1 skip path', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = setupTmpEnv('src/foo.ts\n');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 0 when IQRA_SKIP_GUARDS=1', () => {
    const result = runScript(tmpDir, { IQRA_SKIP_GUARDS: '1' });
    expect(result.status).toBe(0);
  });

  it('prints a skip warning message when IQRA_SKIP_GUARDS=1', () => {
    const result = runScript(tmpDir, { IQRA_SKIP_GUARDS: '1' });
    expect(result.stdout).toContain('IQRA_SKIP_GUARDS=1');
  });

  it('does NOT run any guards when IQRA_SKIP_GUARDS=1 (tsx not invoked)', () => {
    // Replace tsx with a script that records invocations
    const tsxBin = path.join(tmpDir, 'node_modules', '.bin', 'tsx');
    const logFile = path.join(tmpDir, 'tsx-invocations.log');
    fs.writeFileSync(
      tsxBin,
      `#!/bin/sh\necho "tsx called: $@" >> '${logFile}'\nexit 0\n`,
    );
    fs.chmodSync(tsxBin, 0o755);

    runScript(tmpDir, { IQRA_SKIP_GUARDS: '1' });
    expect(fs.existsSync(logFile)).toBe(false);
  });

  it('IQRA_SKIP_GUARDS="" (empty string) does NOT trigger the skip path', () => {
    // Only the literal value "1" should trigger skipping
    const result = runScript(tmpDir, { IQRA_SKIP_GUARDS: '' });
    // Script continues past skip check — exits 0 only because guards pass
    expect(result.stdout).not.toContain('IQRA_SKIP_GUARDS=1');
  });

  it('IQRA_SKIP_GUARDS=0 does NOT trigger the skip path', () => {
    const result = runScript(tmpDir, { IQRA_SKIP_GUARDS: '0' });
    expect(result.stdout).not.toContain('IQRA_SKIP_GUARDS=1');
  });
});

// ── 7. Functional: no staged files path ──────────────────────────────────────

describe('run-pre-commit-guards.sh (functional) — no staged files', () => {
  let tmpDir: string;

  beforeEach(() => {
    // Empty string → git diff --cached --name-only prints nothing
    tmpDir = setupTmpEnv('');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 0 when there are no staged files', () => {
    const result = runScript(tmpDir);
    expect(result.status).toBe(0);
  });

  it('prints a "no staged files" message', () => {
    const result = runScript(tmpDir);
    // Both Arabic and the key phrase appear in the output
    expect(result.stdout).toMatch(/staged/i);
  });

  it('does NOT invoke tsx when there are no staged files', () => {
    const tsxBin = path.join(tmpDir, 'node_modules', '.bin', 'tsx');
    const logFile = path.join(tmpDir, 'tsx-invocations.log');
    fs.writeFileSync(
      tsxBin,
      `#!/bin/sh\necho "tsx called: $@" >> '${logFile}'\nexit 0\n`,
    );
    fs.chmodSync(tsxBin, 0o755);

    runScript(tmpDir);
    expect(fs.existsSync(logFile)).toBe(false);
  });
});

// ── 8. Functional: tsx binary missing ────────────────────────────────────────

describe('run-pre-commit-guards.sh (functional) — tsx binary missing', () => {
  let tmpDir: string;

  beforeEach(() => {
    // installTsx=false → no tsx binary created
    tmpDir = setupTmpEnv('src/foo.ts\n', {}, false);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 1 when tsx is not present in node_modules/.bin', () => {
    const result = runScript(tmpDir);
    expect(result.status).toBe(1);
  });

  it('prints a message directing user to run npm install', () => {
    const result = runScript(tmpDir);
    expect(result.stdout).toMatch(/npm install/i);
  });

  it('does NOT produce a clean "guards passed" message when tsx is missing', () => {
    const result = runScript(tmpDir);
    // The success message must NOT appear
    expect(result.stdout).not.toMatch(/guards.*clean|clean.*guards/i);
  });
});

// ── 9. Functional: all guards pass ───────────────────────────────────────────

describe('run-pre-commit-guards.sh (functional) — all guards pass', () => {
  let tmpDir: string;

  beforeEach(() => {
    // All guards exit 0 by default (no guardResults overrides)
    tmpDir = setupTmpEnv('src/foo.ts\n');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 0 when all three guards succeed', () => {
    const result = runScript(tmpDir);
    expect(result.status).toBe(0);
  });

  it('prints a success / clean message', () => {
    const result = runScript(tmpDir);
    // The script echoes "✅ [IQRA] كل guards نظيفة."
    expect(result.stdout).toContain('[IQRA]');
  });

  it('does NOT print a rejection message when all guards pass', () => {
    const result = runScript(tmpDir);
    expect(result.stdout).not.toMatch(/مرفوض|IQRA_SKIP_GUARDS/);
  });

  it('invokes all three guards', () => {
    const logFile = path.join(tmpDir, 'tsx-invocations.log');
    const tsxBin = path.join(tmpDir, 'node_modules', '.bin', 'tsx');
    fs.writeFileSync(
      tsxBin,
      `#!/bin/sh\necho "$1" >> '${logFile}'\nexit 0\n`,
    );
    fs.chmodSync(tsxBin, 0o755);

    runScript(tmpDir);

    const invocations = fs.existsSync(logFile)
      ? fs.readFileSync(logFile, 'utf-8')
      : '';
    expect(invocations).toContain('name-validator.ts');
    expect(invocations).toContain('secret-guard.ts');
    expect(invocations).toContain('size-guard.ts');
  });
});

// ── 10. Functional: single guard fails ───────────────────────────────────────

describe('run-pre-commit-guards.sh (functional) — single guard failure', () => {
  let tmpDir: string;

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 1 when only name-validator fails', () => {
    tmpDir = setupTmpEnv('src/BadName.ts\n', { 'name-validator.ts': 1 });
    const result = runScript(tmpDir);
    expect(result.status).toBe(1);
  });

  it('exits 1 when only secret-guard fails', () => {
    tmpDir = setupTmpEnv('src/foo.ts\n', { 'secret-guard.ts': 1 });
    const result = runScript(tmpDir);
    expect(result.status).toBe(1);
  });

  it('exits 1 when only size-guard fails', () => {
    tmpDir = setupTmpEnv('src/foo.ts\n', { 'size-guard.ts': 1 });
    const result = runScript(tmpDir);
    expect(result.status).toBe(1);
  });

  it('prints a commit rejection message on failure', () => {
    tmpDir = setupTmpEnv('src/foo.ts\n', { 'secret-guard.ts': 1 });
    const result = runScript(tmpDir);
    expect(result.stdout).toContain('[IQRA]');
    // Rejection message should mention IQRA_SKIP_GUARDS as the escape hatch
    expect(result.stdout).toContain('IQRA_SKIP_GUARDS');
  });
});

// ── 11. Functional: no short-circuit — all guards run even on failure ─────────

describe('run-pre-commit-guards.sh (functional) — no short-circuit on failure', () => {
  let tmpDir: string;

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('runs all three guards even when name-validator fails', () => {
    tmpDir = setupTmpEnv('src/BadFile.ts\n', { 'name-validator.ts': 1 });
    const logFile = path.join(tmpDir, 'tsx-invocations.log');
    const tsxBin = path.join(tmpDir, 'node_modules', '.bin', 'tsx');

    fs.writeFileSync(
      tsxBin,
      [
        '#!/bin/sh',
        `echo "$1" >> '${logFile}'`,
        // name-validator exits 1, others exit 0
        'case "$1" in',
        '  *.iqra/hooks/name-validator.ts*|*name-validator.ts) exit 1 ;;',
        '  *) exit 0 ;;',
        'esac',
      ].join('\n'),
    );
    fs.chmodSync(tsxBin, 0o755);

    runScript(tmpDir);

    const invocations = fs.existsSync(logFile)
      ? fs.readFileSync(logFile, 'utf-8')
      : '';
    // Despite name-validator failing, the other two must still have been called
    expect(invocations).toContain('secret-guard.ts');
    expect(invocations).toContain('size-guard.ts');
  });

  it('runs all three guards even when all three fail', () => {
    tmpDir = setupTmpEnv('src/BadFile.ts\n');
    const logFile = path.join(tmpDir, 'tsx-invocations.log');
    const tsxBin = path.join(tmpDir, 'node_modules', '.bin', 'tsx');

    fs.writeFileSync(
      tsxBin,
      `#!/bin/sh\necho "$1" >> '${logFile}'\nexit 1\n`,
    );
    fs.chmodSync(tsxBin, 0o755);

    const result = runScript(tmpDir);

    expect(result.status).toBe(1);
    const invocations = fs.existsSync(logFile)
      ? fs.readFileSync(logFile, 'utf-8')
      : '';
    expect(invocations).toContain('name-validator.ts');
    expect(invocations).toContain('secret-guard.ts');
    expect(invocations).toContain('size-guard.ts');
  });

  it('exits 1 when all three guards fail', () => {
    tmpDir = setupTmpEnv('src/foo.ts\n', {
      'name-validator.ts': 1,
      'secret-guard.ts': 1,
      'size-guard.ts': 1,
    });
    const result = runScript(tmpDir);
    expect(result.status).toBe(1);
  });
});

// ── 12. Functional: regression — escape hatch message mentions the flag ───────

describe('run-pre-commit-guards.sh (functional) — escape hatch instructions on failure', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = setupTmpEnv('src/foo.ts\n', { 'name-validator.ts': 1 });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('rejection output mentions IQRA_SKIP_GUARDS=1 as the emergency bypass', () => {
    const result = runScript(tmpDir);
    expect(result.stdout).toContain('IQRA_SKIP_GUARDS=1');
  });
});

// ── 13. Static: README documents the new script ───────────────────────────────

describe('.iqra/README.md — documents run-pre-commit-guards.sh', () => {
  const readmeText = fs.readFileSync(
    path.join(ROOT, '.iqra/README.md'),
    'utf-8',
  );

  it('README lists run-pre-commit-guards.sh in the directory tree', () => {
    expect(readmeText).toContain('run-pre-commit-guards.sh');
  });

  it('README documents the IQRA_SKIP_GUARDS=1 escape hatch', () => {
    expect(readmeText).toContain('IQRA_SKIP_GUARDS=1');
  });

  it('README provides the husky integration command', () => {
    expect(readmeText).toContain('sh .iqra/hooks/run-pre-commit-guards.sh');
  });

  it('README mentions that the script is for husky pre-commit integration', () => {
    expect(readmeText.toLowerCase()).toContain('husky');
  });

  it('README describes the orchestrator role (runs 3 hooks in sequence)', () => {
    // The README should mention that all three hooks run
    expect(readmeText).toContain('name-validator');
    expect(readmeText).toContain('secret-guard');
    expect(readmeText).toContain('size-guard');
  });
});
