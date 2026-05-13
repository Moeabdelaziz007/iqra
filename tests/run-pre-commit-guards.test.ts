/**
 * Tests for .iqra/hooks/run-pre-commit-guards.sh
 *
 * Covers:
 *  - Static: source-code structure, shebang, required patterns, file metadata.
 *  - Behavioral: actual script execution via child_process.spawnSync with
 *    controlled environment variables, fake git binaries, and fake tsx binaries
 *    injected via PATH manipulation.
 *
 * The script cannot be imported as a module (it is a POSIX sh script), so
 * all behavioral tests use spawnSync to run it in a subprocess.
 *
 * Behavioral environment setup:
 *   - A temporary directory is created for each test group that needs it.
 *   - A fake `git` binary that prints a controlled staged-file list is placed
 *     in a temp bin dir prepended to PATH.
 *   - A fake `tsx` binary at `<tmpdir>/node_modules/.bin/tsx` is used to
 *     simulate hook pass/fail.
 *   - Stub hook files (name-validator.ts, secret-guard.ts, size-guard.ts) are
 *     placed at `<tmpdir>/.iqra/hooks/` so the script can reference them.
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
const SCRIPT_REL = '.iqra/hooks/run-pre-commit-guards.sh';
const SCRIPT_ABS = path.join(ROOT, SCRIPT_REL);

function readText(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

// ── Static: file existence & metadata ────────────────────────────────────────

describe('run-pre-commit-guards.sh — file existence and metadata', () => {
  it('file exists at .iqra/hooks/run-pre-commit-guards.sh', () => {
    expect(fs.existsSync(SCRIPT_ABS)).toBe(true);
  });

  it('file is executable (+x bit set)', () => {
    const stat = fs.statSync(SCRIPT_ABS);
    // Owner execute bit: 0o100, group: 0o010, other: 0o001
    const isExecutable = (stat.mode & 0o111) !== 0;
    expect(isExecutable).toBe(true);
  });

  it('first line is #!/bin/sh (POSIX-portable shebang)', () => {
    const firstLine = readText(SCRIPT_REL).split('\n')[0];
    expect(firstLine).toBe('#!/bin/sh');
  });
});

// ── Static: source-code structure ────────────────────────────────────────────

describe('run-pre-commit-guards.sh — source-code structure', () => {
  let src: string;

  beforeEach(() => {
    src = readText(SCRIPT_REL);
  });

  it('sets strict undefined-variable mode with "set -u"', () => {
    expect(src).toContain('set -u');
  });

  it('checks IQRA_SKIP_GUARDS env variable with safe default (:-0)', () => {
    expect(src).toContain('${IQRA_SKIP_GUARDS:-0}');
  });

  it('uses git diff --cached --name-only to detect staged files', () => {
    expect(src).toContain('git diff --cached --name-only');
  });

  it('defines TSX_BIN pointing to ./node_modules/.bin/tsx', () => {
    expect(src).toContain('TSX_BIN="./node_modules/.bin/tsx"');
  });

  it('checks tsx binary is executable with [ ! -x "$TSX_BIN" ]', () => {
    expect(src).toContain('[ ! -x "$TSX_BIN" ]');
  });

  it('runs name-validator.ts hook', () => {
    expect(src).toContain('.iqra/hooks/name-validator.ts');
  });

  it('runs secret-guard.ts hook', () => {
    expect(src).toContain('.iqra/hooks/secret-guard.ts');
  });

  it('runs size-guard.ts hook', () => {
    expect(src).toContain('.iqra/hooks/size-guard.ts');
  });

  it('initialises FAIL variable to 0 before running hooks', () => {
    expect(src).toContain('FAIL=0');
  });

  it('sets FAIL=1 on name-validator failure', () => {
    // The pattern: if ! <cmd>; then ... FAIL=1 fi  appears for each hook.
    // We verify FAIL=1 appears at least 3 times (once per hook).
    const matches = src.match(/FAIL=1/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(3);
  });

  it('prints an escape-hatch tip when commit is rejected', () => {
    expect(src).toContain('IQRA_SKIP_GUARDS=1 git commit');
  });

  it('exits with code 0 when all guards pass', () => {
    expect(src).toContain('exit 0');
  });

  it('exits with code 1 when any guard fails', () => {
    expect(src).toContain('exit 1');
  });

  it('includes a "no staged files" skip message in Arabic', () => {
    // The message contains Arabic characters — verify the key ASCII sentinel
    expect(src).toContain('staged');
  });

  it('README section documents this file in the directory tree', () => {
    const readme = readText('.iqra/README.md');
    expect(readme).toContain('run-pre-commit-guards.sh');
  });

  it('README documents the IQRA_SKIP_GUARDS escape hatch', () => {
    const readme = readText('.iqra/README.md');
    expect(readme).toContain('IQRA_SKIP_GUARDS=1 git commit');
  });

  it('README documents sh .iqra/hooks/run-pre-commit-guards.sh usage', () => {
    const readme = readText('.iqra/README.md');
    expect(readme).toContain('sh .iqra/hooks/run-pre-commit-guards.sh');
  });
});

// ── Helpers for behavioral tests ──────────────────────────────────────────────

/**
 * Create a minimal temporary working directory that mimics the repo structure
 * expected by run-pre-commit-guards.sh.
 *
 * @param opts.stagedFiles  Lines output by `git diff --cached --name-only`.
 *                          Pass [] to simulate no staged files.
 * @param opts.hasTsx       Whether ./node_modules/.bin/tsx exists and is executable.
 * @param opts.hookExitCodes Map of hook filename → exit code returned by fake tsx.
 */
function createTmpEnv(opts: {
  stagedFiles: string[];
  hasTsx: boolean;
  hookExitCodes?: Partial<Record<'name-validator.ts' | 'secret-guard.ts' | 'size-guard.ts', number>>;
}): { tmpDir: string; binDir: string } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iqra-guards-test-'));
  const binDir = path.join(tmpDir, 'fake-bin');
  fs.mkdirSync(binDir, { recursive: true });

  // ── Fake git binary ────────────────────────────────────────────────────────
  // `git diff --cached --name-only` returns the stagedFiles list.
  // All other git sub-commands (that the script doesn't actually call) can fail
  // silently — the script only calls `git diff --cached --name-only`.
  const stagedOutput = opts.stagedFiles.join('\n');
  const fakeGit = `#!/bin/sh\nif [ "$1" = "diff" ]; then printf '%s\\n' '${stagedOutput.replace(/'/g, "'\\''")}';\nelse exit 0; fi\n`;
  const fakeGitPath = path.join(binDir, 'git');
  fs.writeFileSync(fakeGitPath, fakeGit, { mode: 0o755 });

  // ── Stub hook TypeScript files ─────────────────────────────────────────────
  const hooksDir = path.join(tmpDir, '.iqra', 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });
  for (const name of ['name-validator.ts', 'secret-guard.ts', 'size-guard.ts']) {
    fs.writeFileSync(path.join(hooksDir, name), '// stub');
  }

  // Copy the actual shell script into tmpDir so relative paths work.
  const scriptDest = path.join(hooksDir, 'run-pre-commit-guards.sh');
  fs.copyFileSync(SCRIPT_ABS, scriptDest);
  fs.chmodSync(scriptDest, 0o755);

  // ── Fake tsx binary ────────────────────────────────────────────────────────
  if (opts.hasTsx) {
    const nodeBin = path.join(tmpDir, 'node_modules', '.bin');
    fs.mkdirSync(nodeBin, { recursive: true });

    const exitCodes = opts.hookExitCodes ?? {};
    // Build a tsx stub that maps hook file names to exit codes.
    const caseLines = Object.entries(exitCodes)
      .map(([hook, code]) => `    *${hook}*) exit ${code};;`)
      .join('\n');
    const fakeTsx = `#!/bin/sh\ncase "$1" in\n${caseLines}\n    *) exit 0;;\nesac\n`;
    const fakeTsxPath = path.join(nodeBin, 'tsx');
    fs.writeFileSync(fakeTsxPath, fakeTsx, { mode: 0o755 });
  }

  return { tmpDir, binDir };
}

function runScript(
  tmpDir: string,
  binDir: string,
  extraEnv: Record<string, string> = {},
): ReturnType<typeof spawnSync> {
  const scriptPath = path.join(tmpDir, '.iqra', 'hooks', 'run-pre-commit-guards.sh');
  return spawnSync('sh', [scriptPath], {
    cwd: tmpDir,
    encoding: 'utf-8',
    env: {
      // Minimal env — override PATH so our fake git takes precedence.
      PATH: `${binDir}:/usr/bin:/bin`,
      HOME: os.homedir(),
      ...extraEnv,
    },
  });
}

// ── Behavioral: IQRA_SKIP_GUARDS=1 ────────────────────────────────────────────

describe('run-pre-commit-guards.sh — IQRA_SKIP_GUARDS=1 escape hatch', () => {
  let tmpDir: string;
  let binDir: string;

  beforeEach(() => {
    ({ tmpDir, binDir } = createTmpEnv({ stagedFiles: ['src/foo.ts'], hasTsx: false }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits with code 0 when IQRA_SKIP_GUARDS=1', () => {
    const result = runScript(tmpDir, binDir, { IQRA_SKIP_GUARDS: '1' });
    expect(result.status).toBe(0);
  });

  it('prints a warning message when guards are skipped', () => {
    const result = runScript(tmpDir, binDir, { IQRA_SKIP_GUARDS: '1' });
    expect(result.stdout).toContain('IQRA_SKIP_GUARDS=1');
  });

  it('does NOT print guard-running messages when skipped', () => {
    const result = runScript(tmpDir, binDir, { IQRA_SKIP_GUARDS: '1' });
    expect(result.stdout).not.toContain('name-validator');
    expect(result.stdout).not.toContain('secret-guard');
    expect(result.stdout).not.toContain('size-guard');
  });

  it('does not require tsx to be present when skipping', () => {
    // tsx does not exist in tmpDir — skip should still succeed.
    const result = runScript(tmpDir, binDir, { IQRA_SKIP_GUARDS: '1' });
    expect(result.status).toBe(0);
  });

  it('value "0" (default) does NOT trigger skip', () => {
    // IQRA_SKIP_GUARDS=0 must NOT skip — script should proceed to staged-files check.
    // With hasTsx=false and staged files present → tsx missing → exit 1.
    const result = runScript(tmpDir, binDir, { IQRA_SKIP_GUARDS: '0' });
    // Exit code 1 means skip was NOT triggered (went past the guard check).
    expect(result.status).toBe(1);
  });
});

// ── Behavioral: no staged files ───────────────────────────────────────────────

describe('run-pre-commit-guards.sh — no staged files', () => {
  let tmpDir: string;
  let binDir: string;

  beforeEach(() => {
    // Empty stagedFiles → git diff --cached --name-only returns nothing.
    ({ tmpDir, binDir } = createTmpEnv({ stagedFiles: [], hasTsx: false }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits with code 0 when there are no staged files', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.status).toBe(0);
  });

  it('prints a "no staged files" skip message', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.stdout).toContain('staged');
  });

  it('does NOT invoke any hook when there are no staged files', () => {
    const result = runScript(tmpDir, binDir);
    // None of the hook names should appear in output.
    expect(result.stdout).not.toContain('name-validator');
    expect(result.stdout).not.toContain('secret-guard');
    expect(result.stdout).not.toContain('size-guard');
  });
});

// ── Behavioral: tsx binary missing ───────────────────────────────────────────

describe('run-pre-commit-guards.sh — tsx binary missing', () => {
  let tmpDir: string;
  let binDir: string;

  beforeEach(() => {
    ({ tmpDir, binDir } = createTmpEnv({
      stagedFiles: ['src/changed.ts'],
      hasTsx: false,
    }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits with code 1 when tsx is not found', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.status).toBe(1);
  });

  it('prints an error message mentioning npm install', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.stdout).toContain('npm install');
  });

  it('does NOT run any hook when tsx is missing', () => {
    const result = runScript(tmpDir, binDir);
    // Hooks should not have been invoked.
    expect(result.stdout).not.toContain('name-validator');
    expect(result.stdout).not.toContain('secret-guard');
    expect(result.stdout).not.toContain('size-guard');
  });
});

// ── Behavioral: all hooks pass ────────────────────────────────────────────────

describe('run-pre-commit-guards.sh — all hooks pass', () => {
  let tmpDir: string;
  let binDir: string;

  beforeEach(() => {
    ({ tmpDir, binDir } = createTmpEnv({
      stagedFiles: ['src/index.ts'],
      hasTsx: true,
      hookExitCodes: {
        'name-validator.ts': 0,
        'secret-guard.ts': 0,
        'size-guard.ts': 0,
      },
    }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits with code 0 when all three hooks pass', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.status).toBe(0);
  });

  it('prints a success message when all guards are clean', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.stdout).toContain('guards');
  });

  it('prints the name-validator guard banner', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.stdout).toContain('name-validator');
  });

  it('prints the secret-guard guard banner', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.stdout).toContain('secret-guard');
  });

  it('prints the size-guard guard banner', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.stdout).toContain('size-guard');
  });

  it('does NOT print any rejection message', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.stdout).not.toContain('commit مرفوض');
    expect(result.stdout).not.toContain('\uD83D\uDEAB'); // 🚫
  });
});

// ── Behavioral: name-validator fails ─────────────────────────────────────────

describe('run-pre-commit-guards.sh — name-validator fails', () => {
  let tmpDir: string;
  let binDir: string;

  beforeEach(() => {
    ({ tmpDir, binDir } = createTmpEnv({
      stagedFiles: ['src/BadName.ts'],
      hasTsx: true,
      hookExitCodes: {
        'name-validator.ts': 1,
        'secret-guard.ts': 0,
        'size-guard.ts': 0,
      },
    }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits with code 1 when name-validator fails', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.status).toBe(1);
  });

  it('still runs secret-guard after name-validator fails', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.stdout).toContain('secret-guard');
  });

  it('still runs size-guard after name-validator fails', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.stdout).toContain('size-guard');
  });

  it('prints rejection message mentioning escape hatch', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.stdout).toContain('IQRA_SKIP_GUARDS=1');
  });
});

// ── Behavioral: secret-guard fails ───────────────────────────────────────────

describe('run-pre-commit-guards.sh — secret-guard fails', () => {
  let tmpDir: string;
  let binDir: string;

  beforeEach(() => {
    ({ tmpDir, binDir } = createTmpEnv({
      stagedFiles: ['src/config.ts'],
      hasTsx: true,
      hookExitCodes: {
        'name-validator.ts': 0,
        'secret-guard.ts': 1,
        'size-guard.ts': 0,
      },
    }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits with code 1 when secret-guard fails', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.status).toBe(1);
  });

  it('still runs size-guard after secret-guard fails', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.stdout).toContain('size-guard');
  });

  it('prints rejection message when secret-guard fails', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.stdout).toContain('IQRA_SKIP_GUARDS=1');
  });
});

// ── Behavioral: size-guard fails ─────────────────────────────────────────────

describe('run-pre-commit-guards.sh — size-guard fails', () => {
  let tmpDir: string;
  let binDir: string;

  beforeEach(() => {
    ({ tmpDir, binDir } = createTmpEnv({
      stagedFiles: ['assets/large-video.mp4'],
      hasTsx: true,
      hookExitCodes: {
        'name-validator.ts': 0,
        'secret-guard.ts': 0,
        'size-guard.ts': 1,
      },
    }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits with code 1 when size-guard fails', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.status).toBe(1);
  });

  it('prints rejection message when size-guard fails', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.stdout).toContain('IQRA_SKIP_GUARDS=1');
  });
});

// ── Behavioral: multiple hooks fail ───────────────────────────────────────────

describe('run-pre-commit-guards.sh — multiple hooks fail', () => {
  let tmpDir: string;
  let binDir: string;

  beforeEach(() => {
    ({ tmpDir, binDir } = createTmpEnv({
      stagedFiles: ['src/BadName.ts', 'assets/large.mp4'],
      hasTsx: true,
      hookExitCodes: {
        'name-validator.ts': 1,
        'secret-guard.ts': 1,
        'size-guard.ts': 1,
      },
    }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits with code 1 when all three hooks fail', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.status).toBe(1);
  });

  it('runs all three hooks even when earlier ones fail (non-short-circuit)', () => {
    const result = runScript(tmpDir, binDir);
    // All three guard banners must appear, proving none short-circuited.
    expect(result.stdout).toContain('name-validator');
    expect(result.stdout).toContain('secret-guard');
    expect(result.stdout).toContain('size-guard');
  });

  it('prints a single rejection block at the end (not per-hook)', () => {
    const result = runScript(tmpDir, binDir);
    // The final rejection banner "IQRA_SKIP_GUARDS=1 git commit" appears once.
    const count = (result.stdout.match(/IQRA_SKIP_GUARDS=1 git commit/g) ?? []).length;
    expect(count).toBe(1);
  });
});

// ── Behavioral: IQRA_SKIP_GUARDS not set (unset variable, set -u) ─────────────

describe('run-pre-commit-guards.sh — IQRA_SKIP_GUARDS unset (set -u compatibility)', () => {
  let tmpDir: string;
  let binDir: string;

  beforeEach(() => {
    // hasTsx=true, no staged files → should exit 0 (no-staged path).
    ({ tmpDir, binDir } = createTmpEnv({ stagedFiles: [], hasTsx: true }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('does not crash when IQRA_SKIP_GUARDS is not set (uses :-0 default)', () => {
    // Do NOT pass IQRA_SKIP_GUARDS — the script uses ${IQRA_SKIP_GUARDS:-0}.
    // With set -u, referencing an unset var without :- would crash.
    const result = runScript(tmpDir, binDir);
    // Should exit 0 via the no-staged-files path, not crash (exit code 1 from sh error).
    expect(result.status).toBe(0);
  });
});

// ── Behavioral: tsx exists but is not executable ──────────────────────────────

describe('run-pre-commit-guards.sh — tsx exists but not executable', () => {
  let tmpDir: string;
  let binDir: string;

  beforeEach(() => {
    ({ tmpDir, binDir } = createTmpEnv({
      stagedFiles: ['src/index.ts'],
      hasTsx: true,
    }));
    // Remove execute permission from the tsx binary.
    const tsxPath = path.join(tmpDir, 'node_modules', '.bin', 'tsx');
    fs.chmodSync(tsxPath, 0o644); // readable, not executable
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits with code 1 when tsx exists but is not executable', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.status).toBe(1);
  });

  it('prints the npm install error message for non-executable tsx', () => {
    const result = runScript(tmpDir, binDir);
    expect(result.stdout).toContain('npm install');
  });
});

// ── README documentation tests ────────────────────────────────────────────────

describe('.iqra/README.md — run-pre-commit-guards.sh documentation (PR additions)', () => {
  let content: string;

  beforeEach(() => {
    content = readText('.iqra/README.md');
  });

  it('README documents the hooks directory tree entry for the orchestrator', () => {
    expect(content).toContain('run-pre-commit-guards.sh');
  });

  it('README documents the husky integration instruction', () => {
    expect(content).toContain('.husky/pre-commit');
  });

  it('README shows the husky line verbatim: sh .iqra/hooks/run-pre-commit-guards.sh || exit $?', () => {
    expect(content).toContain('sh .iqra/hooks/run-pre-commit-guards.sh || exit $?');
  });

  it('README documents the IQRA_SKIP_GUARDS escape hatch with example git commit', () => {
    expect(content).toContain('IQRA_SKIP_GUARDS=1 git commit -m');
  });

  it('README documents manual test command', () => {
    expect(content).toContain('sh .iqra/hooks/run-pre-commit-guards.sh');
  });

  it('README mentions the 3 orchestrated hooks by category', () => {
    // The README section states the orchestrator runs the 3 hooks.
    expect(content).toContain('name-validator');
    expect(content).toContain('secret-guard');
    expect(content).toContain('size-guard');
  });

  it('README states hooks are inactive by default and require opt-in', () => {
    // The documentation says hooks are available but not active on commit.
    expect(content).toContain('غير نشطة'); // Arabic for "inactive"
  });
});
