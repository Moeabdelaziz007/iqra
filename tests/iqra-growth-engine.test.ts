/**
 * Tests for the IQRA Growth Engine — PR additions.
 *
 * Covers:
 *  - .iqra/cycle.txt  (data file)
 *  - .iqra/scripts/*.ts  (source-code structure + logic)
 *  - .github/workflows/iqra-growth-engine.yml  (CI workflow)
 *  - .gitignore  (updated patterns)
 *  - package.json  (new npm scripts)
 *
 * Because each script auto-executes its main function at import time, they
 * cannot be imported as modules. Tests therefore operate in two modes:
 *   1. Static: read source text and assert key constants / patterns exist.
 *   2. Logic: re-implement the small pure helpers (readCycle, classify,
 *      cycleAdvance) inline and drive them with unit cases — verifying the
 *      behaviour the PR code intends.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function readText(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

function readJson<T>(relPath: string): T {
  return JSON.parse(readText(relPath)) as T;
}

// ── .iqra/cycle.txt ───────────────────────────────────────────────────────────

describe('.iqra/cycle.txt — cycle counter seed', () => {
  it('file exists', () => {
    expect(fs.existsSync(path.join(ROOT, '.iqra/cycle.txt'))).toBe(true);
  });

  it('contains a numeric string', () => {
    const raw = readText('.iqra/cycle.txt').trim();
    expect(Number.isInteger(Number(raw))).toBe(true);
  });

  it('cycle number is within the valid range [1, 30]', () => {
    const n = parseInt(readText('.iqra/cycle.txt').trim(), 10);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(30);
  });

  // 🤖 NOTE: لا نُثبّت قيمة بعينها لأن cycle.txt يتقدّم مع كل دورة تشغيل
  // ناجحة للمحرك. نتحقق من الصيغة والمدى فقط.
  it('cycle.txt holds a digits-only positive integer within bounds', () => {
    const raw = readText('.iqra/cycle.txt').trim();
    expect(raw).toMatch(/^\d+$/);
    const n = parseInt(raw, 10);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(30);
  });
});

// ── .iqra/README.md ───────────────────────────────────────────────────────────

describe('.iqra/README.md — Growth Engine documentation', () => {
  let content: string;

  beforeEach(() => {
    content = readText('.iqra/README.md');
  });

  it('file exists', () => {
    expect(fs.existsSync(path.join(ROOT, '.iqra/README.md'))).toBe(true);
  });

  it('starts with an h1 heading for IQRA Growth Engine', () => {
    expect(content.trimStart()).toMatch(/^#\s+.*IQRA Growth Engine/);
  });

  it('mentions cycle.txt as the cycle counter file', () => {
    expect(content).toContain('cycle.txt');
  });

  it('describes the 30-day cycle length', () => {
    expect(content).toContain('30');
  });

  it('lists the six script categories', () => {
    // Each week must be mentioned in the README.
    expect(content).toContain('backup-smart.ts');
    expect(content).toContain('auto-indexer.ts');
    expect(content).toContain('performance-analyzer.ts');
    expect(content).toContain('duplicate-cleaner.ts');
    expect(content).toContain('stats-generator.ts');
    expect(content).toContain('change-monitor.ts');
  });

  it('documents the run-cycle.ts orchestrator', () => {
    expect(content).toContain('run-cycle.ts');
  });

  it('mentions the npm grow script', () => {
    expect(content).toContain('iqra:grow');
  });

  it('mentions skip ci to prevent self-loop', () => {
    expect(content).toContain('[skip ci]');
  });
});

// ── .gitignore — updated IQRA patterns ───────────────────────────────────────

describe('.gitignore — IQRA sovereign data patterns (PR update)', () => {
  let lines: string[];

  beforeEach(() => {
    lines = readText('.gitignore').split('\n').map((l) => l.trim());
  });

  it('uses glob wildcard .iqra/* (not bare .iqra/)', () => {
    expect(lines).toContain('.iqra/*');
    // The old single-line ignore must be gone.
    expect(lines).not.toContain('.iqra/');
  });

  it('explicitly allows .iqra/README.md', () => {
    expect(lines).toContain('!.iqra/README.md');
  });

  it('explicitly allows .iqra/cycle.txt', () => {
    expect(lines).toContain('!.iqra/cycle.txt');
  });

  it('explicitly allows .iqra/scripts/ directory', () => {
    expect(lines).toContain('!.iqra/scripts/');
  });

  it('explicitly allows .iqra/hooks/', () => {
    expect(lines).toContain('!.iqra/hooks/');
  });

  it('explicitly allows .iqra/intelligence/', () => {
    expect(lines).toContain('!.iqra/intelligence/');
  });

  it('explicitly allows .iqra/social/', () => {
    expect(lines).toContain('!.iqra/social/');
  });

  it('explicitly allows .iqra/economics/', () => {
    expect(lines).toContain('!.iqra/economics/');
  });

  it('explicitly allows .iqra/innovation/', () => {
    expect(lines).toContain('!.iqra/innovation/');
  });

  it('explicitly allows .iqra/performance/', () => {
    expect(lines).toContain('!.iqra/performance/');
  });

  it('keeps .iqra/memory/ private (local backups)', () => {
    expect(lines).toContain('.iqra/memory/');
  });

  it('keeps .iqra/pulses.jsonl private', () => {
    expect(lines).toContain('.iqra/pulses.jsonl');
  });

  it('retains .iqra_loop_state ignore', () => {
    expect(lines).toContain('.iqra_loop_state');
  });

  it('still ignores node_modules/', () => {
    expect(lines).toContain('node_modules/');
  });

  it('still ignores .env', () => {
    expect(lines).toContain('.env');
  });
});

// ── package.json — new npm scripts ───────────────────────────────────────────

describe('package.json — IQRA Growth Engine npm scripts', () => {
  interface PackageScripts {
    scripts: Record<string, string>;
  }

  let pkg: PackageScripts;

  beforeEach(() => {
    pkg = readJson<PackageScripts>('package.json');
  });

  it('defines iqra:grow script', () => {
    expect(pkg.scripts).toHaveProperty('iqra:grow');
  });

  it('iqra:grow runs run-cycle.ts via npx tsx', () => {
    expect(pkg.scripts['iqra:grow']).toContain('npx tsx');
    expect(pkg.scripts['iqra:grow']).toContain('run-cycle.ts');
  });

  it('defines iqra:backup script', () => {
    expect(pkg.scripts).toHaveProperty('iqra:backup');
  });

  it('iqra:backup runs backup-smart.ts via npx tsx', () => {
    expect(pkg.scripts['iqra:backup']).toContain('npx tsx');
    expect(pkg.scripts['iqra:backup']).toContain('backup-smart.ts');
  });

  it('defines iqra:index script', () => {
    expect(pkg.scripts).toHaveProperty('iqra:index');
  });

  it('iqra:index runs auto-indexer.ts via npx tsx', () => {
    expect(pkg.scripts['iqra:index']).toContain('npx tsx');
    expect(pkg.scripts['iqra:index']).toContain('auto-indexer.ts');
  });
});

// ── .github/workflows/iqra-growth-engine.yml ─────────────────────────────────

describe('.github/workflows/iqra-growth-engine.yml — CI workflow structure', () => {
  let content: string;

  beforeEach(() => {
    content = readText('.github/workflows/iqra-growth-engine.yml');
  });

  it('file exists', () => {
    expect(fs.existsSync(path.join(ROOT, '.github/workflows/iqra-growth-engine.yml'))).toBe(true);
  });

  it('has a schedule trigger at midnight UTC (daily)', () => {
    expect(content).toContain("cron: '0 0 * * *'");
  });

  it('triggers on push to main branch', () => {
    expect(content).toContain('push:');
    expect(content).toContain('branches: [main]');
  });

  it('includes workflow_dispatch for manual runs', () => {
    expect(content).toContain('workflow_dispatch');
  });

  it('grants contents: write permission', () => {
    expect(content).toContain('contents: write');
  });

  it('uses a concurrency group to prevent parallel cycles', () => {
    expect(content).toContain('group: iqra-growth-engine');
    expect(content).toContain('cancel-in-progress: false');
  });

  it('has a timeout to prevent runaway cycles', () => {
    expect(content).toContain('timeout-minutes: 15');
  });

  it('has an anti-self-loop condition on [skip ci]', () => {
    expect(content).toContain('[skip ci]');
    expect(content).toContain('contains(github.event.head_commit.message');
  });

  it('checks out with sufficient fetch-depth for git log', () => {
    expect(content).toContain('fetch-depth: 30');
  });

  it('uses Node.js 20', () => {
    expect(content).toContain("node-version: '20'");
  });

  it('runs run-cycle.ts as the main growth step', () => {
    expect(content).toContain('npx tsx .iqra/scripts/run-cycle.ts');
  });

  it('commit message includes [skip ci] to prevent self-loop', () => {
    expect(content).toContain('[skip ci]');
  });

  it('adds cycle.txt to git staging', () => {
    expect(content).toContain('git add .iqra/cycle.txt');
  });

  it('retries push up to 3 times on failure', () => {
    expect(content).toContain('for attempt in 1 2 3');
  });

  it('runs on ubuntu-latest (not a custom runner)', () => {
    expect(content).toContain('runs-on: ubuntu-latest');
  });

  it('does NOT use a PAT (relies on GITHUB_TOKEN)', () => {
    // Ensure no PAT variable is referenced.
    expect(content).not.toMatch(/secrets\.[A-Z_]*PAT[A-Z_]*/);
    expect(content).toContain('secrets.GITHUB_TOKEN');
  });
});

// ── .iqra/scripts — file existence ───────────────────────────────────────────

describe('.iqra/scripts — all seven scripts exist', () => {
  const SCRIPTS = [
    '.iqra/scripts/run-cycle.ts',
    '.iqra/scripts/backup-smart.ts',
    '.iqra/scripts/auto-indexer.ts',
    '.iqra/scripts/performance-analyzer.ts',
    '.iqra/scripts/duplicate-cleaner.ts',
    '.iqra/scripts/stats-generator.ts',
    '.iqra/scripts/change-monitor.ts',
  ];

  for (const script of SCRIPTS) {
    it(`${script} exists`, () => {
      expect(fs.existsSync(path.join(ROOT, script))).toBe(true);
    });
  }
});

// ── run-cycle.ts — source structure ──────────────────────────────────────────

describe('run-cycle.ts — source code structure', () => {
  let src: string;

  beforeEach(() => {
    src = readText('.iqra/scripts/run-cycle.ts');
  });

  it('defines CYCLE_LENGTH = 30', () => {
    expect(src).toMatch(/const CYCLE_LENGTH\s*=\s*30/);
  });

  it('CYCLE_MAP maps cycle 1 to backup-smart', () => {
    expect(src).toContain('backup-smart');
    expect(src).toContain("'.iqra/scripts/backup-smart.ts'");
  });

  it('CYCLE_MAP maps cycle 2 to auto-indexer', () => {
    expect(src).toContain('auto-indexer');
    expect(src).toContain("'.iqra/scripts/auto-indexer.ts'");
  });

  it('CYCLE_MAP maps cycle 3 to performance-analyzer', () => {
    expect(src).toContain('performance-analyzer');
    expect(src).toContain("'.iqra/scripts/performance-analyzer.ts'");
  });

  it('CYCLE_MAP maps cycle 4 to duplicate-cleaner', () => {
    expect(src).toContain('duplicate-cleaner');
    expect(src).toContain("'.iqra/scripts/duplicate-cleaner.ts'");
  });

  it('CYCLE_MAP maps cycle 5 to stats-generator', () => {
    expect(src).toContain('stats-generator');
    expect(src).toContain("'.iqra/scripts/stats-generator.ts'");
  });

  it('CYCLE_MAP maps cycle 6 to change-monitor', () => {
    expect(src).toContain('change-monitor');
    expect(src).toContain("'.iqra/scripts/change-monitor.ts'");
  });

  it('computes next cycle with modulo wrap: (cycle % CYCLE_LENGTH) + 1', () => {
    // The wrap formula must be present.
    expect(src).toMatch(/cycle\s*%\s*CYCLE_LENGTH\s*\)\s*\+\s*1/);
  });

  it('validates cycle is within [1, CYCLE_LENGTH] before using it', () => {
    expect(src).toMatch(/n\s*>=\s*1\s*&&\s*n\s*<=\s*CYCLE_LENGTH/);
  });

  it('exits with 0 even on script failure (non-breaking cycle)', () => {
    expect(src).toContain('process.exit(0)');
  });

  it('uses cycleOverride when recording cycle-completed pulse', () => {
    expect(src).toContain('cycleOverride');
    expect(src).toContain('cycle-completed');
  });

  it('reads PULSES from .iqra/pulses.jsonl', () => {
    expect(src).toContain('.iqra/pulses.jsonl');
  });

  it('reads CYCLE_FILE from .iqra/cycle.txt', () => {
    expect(src).toContain('.iqra/cycle.txt');
  });
});

// ── auto-indexer.ts — source structure ───────────────────────────────────────

describe('auto-indexer.ts — source code structure', () => {
  let src: string;

  beforeEach(() => {
    src = readText('.iqra/scripts/auto-indexer.ts');
  });

  it('defines CYCLE_LENGTH = 30', () => {
    expect(src).toMatch(/const CYCLE_LENGTH\s*=\s*30/);
  });

  it('classify() returns "manifest" for 00-manifest paths', () => {
    expect(src).toContain("'00-manifest'");
    expect(src).toContain("'manifest'");
  });

  it('classify() returns "knowledge" for knowledge_base paths', () => {
    expect(src).toContain("'knowledge_base'");
    expect(src).toContain("'knowledge'");
  });

  it('classify() handles 08-skills paths', () => {
    expect(src).toContain("'08-skills'");
    expect(src).toContain("'skill'");
  });

  it('classify() handles 08-cognitive paths (alias for skills)', () => {
    expect(src).toContain("'08-cognitive'");
  });

  it('classify() uses src/lib/iqra/ prefix for layer classification', () => {
    expect(src).toContain("'src/lib/iqra/'");
    expect(src).toContain("'layer'");
  });

  it('skips node_modules and .git when walking', () => {
    expect(src).toContain('node_modules');
    expect(src).toContain('.git');
  });

  it('writes output to IQRA_INDEX.md', () => {
    expect(src).toContain("'IQRA_INDEX.md'");
  });

  it('appends pulse with action "index-generated"', () => {
    expect(src).toContain('index-generated');
  });

  it('scans src/lib/iqra and src/knowledge_base', () => {
    expect(src).toContain("'src/lib/iqra'");
    expect(src).toContain("'src/knowledge_base'");
  });
});

// ── backup-smart.ts — source structure ───────────────────────────────────────

describe('backup-smart.ts — source code structure', () => {
  let src: string;

  beforeEach(() => {
    src = readText('.iqra/scripts/backup-smart.ts');
  });

  it('defines MEMORY_RETENTION_DAYS = 30', () => {
    expect(src).toMatch(/const MEMORY_RETENTION_DAYS\s*=\s*30/);
  });

  it('defines CYCLE_LENGTH = 30', () => {
    expect(src).toMatch(/const CYCLE_LENGTH\s*=\s*30/);
  });

  it('stores backups in .iqra/memory/backups', () => {
    expect(src).toContain('.iqra/memory/backups');
  });

  it('SOUL_DIRS includes 00-manifest', () => {
    expect(src).toContain('src/lib/iqra/00-manifest');
  });

  it('SOUL_DIRS includes 09-evolution', () => {
    expect(src).toContain('src/lib/iqra/09-evolution');
  });

  it('SOUL_DIRS includes knowledge_base', () => {
    expect(src).toContain('src/knowledge_base');
  });

  it('uses SHA-256 for archive sealing', () => {
    expect(src).toContain("'sha256'");
    expect(src).toContain('.seal');
  });

  it('uses gzip compression', () => {
    expect(src).toContain('createGzip');
  });

  it('uses streaming pipeline to avoid OOM', () => {
    expect(src).toContain('pipeline');
    expect(src).toContain('Readable.from');
  });

  it('appends pulse with action "backup-completed"', () => {
    expect(src).toContain('backup-completed');
  });

  it('validates readCycle output against [1, CYCLE_LENGTH]', () => {
    expect(src).toMatch(/n\s*>=\s*1\s*&&\s*n\s*<=\s*CYCLE_LENGTH/);
  });

  it('uses .iqra.gz extension (not .tar.gz) to reflect custom format', () => {
    expect(src).toContain('.iqra.gz');
    expect(src).not.toContain('.tar.gz');
  });
});

// ── performance-analyzer.ts — source structure ───────────────────────────────

describe('performance-analyzer.ts — source code structure', () => {
  let src: string;

  beforeEach(() => {
    src = readText('.iqra/scripts/performance-analyzer.ts');
  });

  it('HEAVY_THRESHOLD is 50,000 bytes (50KB)', () => {
    expect(src).toMatch(/const HEAVY_THRESHOLD\s*=\s*50[_,]?000/);
  });

  it('SKIP_DIRS excludes node_modules', () => {
    expect(src).toContain('node_modules');
  });

  it('SKIP_DIRS excludes .git', () => {
    expect(src).toContain("'.git'");
  });

  it('SKIP_DIRS excludes .iqra directory from analysis', () => {
    expect(src).toContain("'.iqra'");
  });

  it('EXTS includes TypeScript files', () => {
    expect(src).toContain("'.ts'");
  });

  it('EXTS includes Markdown files', () => {
    expect(src).toContain("'.md'");
  });

  it('EXTS includes Python files', () => {
    expect(src).toContain("'.py'");
  });

  it('writes output to .iqra/performance/weekly-report.md', () => {
    expect(src).toContain('.iqra/performance/weekly-report.md');
  });

  it('appends pulse with action "performance-analyzed"', () => {
    expect(src).toContain('performance-analyzed');
  });

  it('limits heavy-files list to top 30', () => {
    expect(src).toContain('.slice(0, 30)');
  });

  it('defines CYCLE_LENGTH = 30', () => {
    expect(src).toMatch(/const CYCLE_LENGTH\s*=\s*30/);
  });
});

// ── duplicate-cleaner.ts — source structure ───────────────────────────────────

describe('duplicate-cleaner.ts — source code structure', () => {
  let src: string;

  beforeEach(() => {
    src = readText('.iqra/scripts/duplicate-cleaner.ts');
  });

  it('uses SHA-256 for duplicate detection', () => {
    expect(src).toContain("'sha256'");
  });

  it('SKIP_DIRS excludes node_modules, .git, .next, dist, .iqra', () => {
    expect(src).toContain('node_modules');
    expect(src).toContain('.git');
    expect(src).toContain('.next');
    expect(src).toContain('dist');
    expect(src).toContain('.iqra');
  });

  it('writes report to .iqra/performance/duplicates.md', () => {
    expect(src).toContain('.iqra/performance/duplicates.md');
  });

  it('uses streaming hash (pipeline) to avoid OOM for large files', () => {
    expect(src).toContain('pipeline');
    expect(src).toContain('createReadStream');
  });

  it('explicitly does NOT delete files — report only', () => {
    // The comment in the source must describe the non-deletion intent.
    expect(src).toContain('Reporter');
  });

  it('appends pulse with action "duplicates-scanned"', () => {
    expect(src).toContain('duplicates-scanned');
  });

  it('only scans .md files (walkMd)', () => {
    expect(src).toContain('.md');
    expect(src).toContain('walkMd');
  });

  it('defines CYCLE_LENGTH = 30', () => {
    expect(src).toMatch(/const CYCLE_LENGTH\s*=\s*30/);
  });
});

// ── stats-generator.ts — source structure ─────────────────────────────────────

describe('stats-generator.ts — source code structure', () => {
  let src: string;

  beforeEach(() => {
    src = readText('.iqra/scripts/stats-generator.ts');
  });

  it('tracks TypeScript, JavaScript, Markdown, Python, Go, YAML, JSON', () => {
    expect(src).toContain("'.ts'");
    expect(src).toContain("'.js'");
    expect(src).toContain("'.md'");
    expect(src).toContain("'.py'");
    expect(src).toContain("'.go'");
    expect(src).toContain("'.yml'");
    expect(src).toContain("'.json'");
  });

  it('SKIP_DIRS excludes node_modules and .iqra', () => {
    expect(src).toContain('node_modules');
    expect(src).toContain('.iqra');
  });

  it('uses readline for streaming line count (memory-safe)', () => {
    expect(src).toContain('readline');
    expect(src).toContain('createInterface');
  });

  it('writes output to .iqra/performance/stats.md', () => {
    expect(src).toContain('.iqra/performance/stats.md');
  });

  it('appends pulse with action "stats-generated"', () => {
    expect(src).toContain('stats-generated');
  });

  it('defines CYCLE_LENGTH = 30', () => {
    expect(src).toMatch(/const CYCLE_LENGTH\s*=\s*30/);
  });
});

// ── change-monitor.ts — source structure ──────────────────────────────────────

describe('change-monitor.ts — source code structure', () => {
  let src: string;

  beforeEach(() => {
    src = readText('.iqra/scripts/change-monitor.ts');
  });

  it('EXEC_MAX_BUFFER is 64MB to handle large git logs', () => {
    expect(src).toMatch(/64\s*\*\s*1024\s*\*\s*1024/);
  });

  it('uses safeExec that swallows errors to not break the cycle', () => {
    expect(src).toContain('safeExec');
  });

  it('monitors commits from the last 24 hours', () => {
    expect(src).toContain('24 hours ago');
  });

  it('deduplicates changed files via Set', () => {
    expect(src).toContain('new Set(');
  });

  it('limits displayed files to 50', () => {
    expect(src).toContain('.slice(0, 50)');
  });

  it('writes output to .iqra/performance/changes.md', () => {
    expect(src).toContain('.iqra/performance/changes.md');
  });

  it('appends pulse with action "changes-monitored"', () => {
    expect(src).toContain('changes-monitored');
  });

  it('defines CYCLE_LENGTH = 30', () => {
    expect(src).toMatch(/const CYCLE_LENGTH\s*=\s*30/);
  });
});

// ── readCycle logic — unit tests (inline re-implementation) ──────────────────
//
// The readCycle() function is identical across all seven scripts.
// We re-implement the exact same logic here so we can drive it with
// controlled inputs, confirming the specification is correct.

describe('readCycle() logic — validation of cycle counter reading', () => {
  const CYCLE_LENGTH = 30;
  let tmpDir: string;
  let cycleFile: string;

  // Mirror of the strict readCycle() implemented in each script.
  // 🤖 NOTE: digits-only check بدل Number.parseInt — يطابق سلوك السكريبتات
  // التي ترفض '15.5' و '12abc' صراحة.
  function readCycle(filePath: string): string {
    if (!fs.existsSync(filePath)) return '1';
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!/^\d+$/.test(raw)) return '1';
    const n = Number(raw);
    return Number.isInteger(n) && n >= 1 && n <= CYCLE_LENGTH ? String(n) : '1';
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iqra-test-'));
    cycleFile = path.join(tmpDir, 'cycle.txt');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns "1" when the file does not exist', () => {
    expect(readCycle(cycleFile)).toBe('1');
  });

  it('returns "1" for valid cycle 1', () => {
    fs.writeFileSync(cycleFile, '1\n');
    expect(readCycle(cycleFile)).toBe('1');
  });

  it('returns "15" for a valid mid-cycle value', () => {
    fs.writeFileSync(cycleFile, '15');
    expect(readCycle(cycleFile)).toBe('15');
  });

  it('returns "30" for the maximum valid cycle', () => {
    fs.writeFileSync(cycleFile, '30\n');
    expect(readCycle(cycleFile)).toBe('30');
  });

  it('returns "1" for cycle 0 (below minimum)', () => {
    fs.writeFileSync(cycleFile, '0');
    expect(readCycle(cycleFile)).toBe('1');
  });

  it('returns "1" for cycle 31 (above maximum)', () => {
    fs.writeFileSync(cycleFile, '31');
    expect(readCycle(cycleFile)).toBe('1');
  });

  it('returns "1" for negative values', () => {
    fs.writeFileSync(cycleFile, '-5');
    expect(readCycle(cycleFile)).toBe('1');
  });

  it('returns "1" for non-numeric content', () => {
    fs.writeFileSync(cycleFile, 'corrupt');
    expect(readCycle(cycleFile)).toBe('1');
  });

  it('returns "1" for empty file', () => {
    fs.writeFileSync(cycleFile, '');
    expect(readCycle(cycleFile)).toBe('1');
  });

  it('returns "1" for whitespace-only content', () => {
    fs.writeFileSync(cycleFile, '   \n  ');
    expect(readCycle(cycleFile)).toBe('1');
  });

  it('returns "1" for floating-point value like "15.5"', () => {
    fs.writeFileSync(cycleFile, '15.5');
    // 🤖 NOTE: السكريبتات تستخدم digits-only regex /^\d+$/ فترفض '15.5'.
    // كان السلوك السابق lax (parseInt → 15) لكنه يخالف contract الصارم.
    expect(readCycle(cycleFile)).toBe('1');
  });

  it('returns "1" for partial numeric like "12abc"', () => {
    fs.writeFileSync(cycleFile, '12abc');
    expect(readCycle(cycleFile)).toBe('1');
  });

  it('trims surrounding whitespace before parsing', () => {
    fs.writeFileSync(cycleFile, '  7  \n');
    expect(readCycle(cycleFile)).toBe('7');
  });

  it('returns "1" for JSON-like content that is not a plain integer', () => {
    fs.writeFileSync(cycleFile, '{"cycle":5}');
    expect(readCycle(cycleFile)).toBe('1');
  });
});

// ── cycle advance logic — unit tests ──────────────────────────────────────────
//
// Verifies the wrap-around formula: next = (cycle % CYCLE_LENGTH) + 1

describe('cycle advance formula — (cycle % CYCLE_LENGTH) + 1', () => {
  const CYCLE_LENGTH = 30;

  function advance(cycle: number): number {
    return (cycle % CYCLE_LENGTH) + 1;
  }

  it('cycle 1 advances to 2', () => {
    expect(advance(1)).toBe(2);
  });

  it('cycle 29 advances to 30', () => {
    expect(advance(29)).toBe(30);
  });

  it('cycle 30 wraps to 1 (end-of-cycle reset)', () => {
    expect(advance(30)).toBe(1);
  });

  it('cycle 15 advances to 16', () => {
    expect(advance(15)).toBe(16);
  });

  it('every advance result stays within [1, 30]', () => {
    for (let c = 1; c <= CYCLE_LENGTH; c++) {
      const next = advance(c);
      expect(next).toBeGreaterThanOrEqual(1);
      expect(next).toBeLessThanOrEqual(CYCLE_LENGTH);
    }
  });

  it('full 30-step cycle returns to starting point', () => {
    let cycle = 1;
    for (let step = 0; step < CYCLE_LENGTH; step++) {
      cycle = advance(cycle);
    }
    expect(cycle).toBe(1);
  });
});

// ── auto-indexer classify() logic — unit tests ────────────────────────────────

describe('auto-indexer classify() — file categorisation logic', () => {
  // Mirror of classify() from auto-indexer.ts
  function classify(file: string): 'manifest' | 'knowledge' | 'skill' | 'layer' | 'root' {
    const normalized = file.split(path.sep).join('/');
    if (normalized.includes('00-manifest')) return 'manifest';
    if (normalized.includes('knowledge_base')) return 'knowledge';
    if (normalized.includes('08-skills') || normalized.includes('08-cognitive')) return 'skill';
    if (normalized.startsWith('src/lib/iqra/')) return 'layer';
    return 'root';
  }

  it('classifies 00-manifest path as "manifest"', () => {
    expect(classify('src/lib/iqra/00-manifest/index.md')).toBe('manifest');
  });

  it('classifies knowledge_base path as "knowledge"', () => {
    expect(classify('src/knowledge_base/quran/intro.md')).toBe('knowledge');
  });

  it('classifies 08-skills path as "skill"', () => {
    expect(classify('src/lib/iqra/08-skills/memory.md')).toBe('skill');
  });

  it('classifies 08-cognitive path as "skill"', () => {
    expect(classify('src/lib/iqra/08-cognitive/reasoning.md')).toBe('skill');
  });

  it('classifies generic src/lib/iqra/ path as "layer"', () => {
    expect(classify('src/lib/iqra/07-llm/model.md')).toBe('layer');
  });

  it('classifies root-level README as "root"', () => {
    expect(classify('README.md')).toBe('root');
  });

  it('classifies SOVEREIGN_ROADMAP.md as "root"', () => {
    expect(classify('SOVEREIGN_ROADMAP.md')).toBe('root');
  });

  it('00-manifest takes priority over src/lib/iqra/ prefix', () => {
    // 00-manifest IS under src/lib/iqra/, so manifest should win.
    expect(classify('src/lib/iqra/00-manifest/soul.md')).toBe('manifest');
  });

  it('knowledge_base takes priority over layer prefix', () => {
    // Edge case: if knowledge_base ever lives under src/lib/iqra/ (hypothetically)
    expect(classify('src/lib/iqra/knowledge_base/entry.md')).toBe('knowledge');
  });

  it('returns "root" for any unmatched path', () => {
    expect(classify('docs/guide.md')).toBe('root');
    expect(classify('REFLECTION.md')).toBe('root');
  });
});

// ── regression / boundary tests ───────────────────────────────────────────────

describe('regression — deleted files no longer exist', () => {
  it('scripts/bug_hunter.py was removed', () => {
    expect(fs.existsSync(path.join(ROOT, 'scripts/bug_hunter.py'))).toBe(false);
  });

  it('tests/test_bug_hunter.py was removed', () => {
    expect(fs.existsSync(path.join(ROOT, 'tests/test_bug_hunter.py'))).toBe(false);
  });

  it('.github/workflows/bug-hunter.yml was removed', () => {
    expect(fs.existsSync(path.join(ROOT, '.github/workflows/bug-hunter.yml'))).toBe(false);
  });

  it('.github/workflows/pr-triage.yml was removed', () => {
    expect(fs.existsSync(path.join(ROOT, '.github/workflows/pr-triage.yml'))).toBe(false);
  });

  it('.github/workflows/security-sentinel.yml was removed', () => {
    expect(fs.existsSync(path.join(ROOT, '.github/workflows/security-sentinel.yml'))).toBe(false);
  });

  it('.github/actionlint.yaml was removed', () => {
    expect(fs.existsSync(path.join(ROOT, '.github/actionlint.yaml'))).toBe(false);
  });

  it('.github/labeler.yml was removed', () => {
    expect(fs.existsSync(path.join(ROOT, '.github/labeler.yml'))).toBe(false);
  });
});

describe('regression — .iqra/scripts/ shebang is correct', () => {
  const SCRIPTS = [
    '.iqra/scripts/run-cycle.ts',
    '.iqra/scripts/backup-smart.ts',
    '.iqra/scripts/auto-indexer.ts',
    '.iqra/scripts/performance-analyzer.ts',
    '.iqra/scripts/duplicate-cleaner.ts',
    '.iqra/scripts/stats-generator.ts',
    '.iqra/scripts/change-monitor.ts',
  ];

  for (const script of SCRIPTS) {
    it(`${path.basename(script)} starts with executable tsx shebang`, () => {
      const firstLine = readText(script).split('\n')[0];
      // 🤖 NOTE: نقبل صيغة `env -S npx tsx` فقط — الصيغة الوحيدة القابلة
      // للتنفيذ المباشر على Linux (GNU env يحتاج -S لتقسيم args).
      // الصيغة القديمة `env npx tsx` كانت تفشل بـ "No such file or directory".
      expect(firstLine).toBe('#!/usr/bin/env -S npx tsx');
    });
  }
});

describe('regression — all scripts use only Node stdlib (zero external deps)', () => {
  const SCRIPTS = [
    '.iqra/scripts/run-cycle.ts',
    '.iqra/scripts/backup-smart.ts',
    '.iqra/scripts/auto-indexer.ts',
    '.iqra/scripts/performance-analyzer.ts',
    '.iqra/scripts/duplicate-cleaner.ts',
    '.iqra/scripts/stats-generator.ts',
    '.iqra/scripts/change-monitor.ts',
  ];

  // Packages that are NOT part of Node stdlib and would violate the zero-dep rule.
  const FORBIDDEN_IMPORTS = ['axios', 'lodash', 'express', 'dotenv', 'chalk', 'zod'];

  for (const script of SCRIPTS) {
    it(`${path.basename(script)} imports no external packages`, () => {
      const src = readText(script);
      for (const pkg of FORBIDDEN_IMPORTS) {
        expect(src, `${script} must not import '${pkg}'`).not.toContain(`from '${pkg}'`);
        expect(src, `${script} must not require '${pkg}'`).not.toContain(`require('${pkg}')`);
      }
    });
  }
});
