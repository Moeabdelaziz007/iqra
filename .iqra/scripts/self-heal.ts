#!/usr/bin/env -S npx tsx
/**
 * IQRA Self-Heal — Phase-1 Self-Healing CI/CD
 *
 * يُشغَّل بواسطة .github/workflows/self-healing-ci.yml بعد فشل CI، أو
 * يدوياً عبر `npm run iqra:heal`. يحاول إصلاح الأعطال الآمنة فقط
 * (idempotent، بدون mutations خطيرة).
 *
 * Phase-1 يفعل الآتي ولا شيء غير ذلك:
 *
 *   1. probe:lint      — يقيس عدد أخطاء TypeScript عبر `npx tsc --noEmit`.
 *   2. probe:tests     — يحاول `vitest --run` (قابل للتعطيل بـ --skip-tests).
 *   3. heal:eslint-fix — `next lint --fix` إن وُجد، تجاهل آمن إن فشل.
 *   4. heal:reindex    — `iqra:index` لإعادة توليد IQRA_INDEX.md إذا كان قابلاً للتحديث.
 *
 * النتيجة تُكتب في:
 *   .iqra/healing_log.jsonl  — سجل دائم (append-only) لكل محاولة شفاء.
 *   .iqra/pulses.jsonl       — نبضة موحّدة كباقي محرك النمو.
 *
 * 🤖 NOTE TO FUTURE AI AGENTS:
 *   - Phase-1 لا يلامس main أبداً. الـ workflow يفتح PR بفرع جديد لمراجعة بشرية.
 *   - لا تضف commit/push داخل هذا السكريبت. الإصلاحات بقاء على القرص فقط.
 *   - كل إجراء MUST يكون idempotent — تشغيل ثانٍ على القرص النظيف = no-op.
 *   - لا تستخدم --no-verify أو git config أو force-push من هذا السكريبت.
 *   - exit code: 0 = الشفاء نجح أو لا حاجة له، 1 = عَطَل غير قابل للإصلاح.
 *   - أضف خطوات heal جديدة عبر تسجيل { name, fn } في HEALERS أدناه.
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

// ── Constants ────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const PULSES = path.join(ROOT, '.iqra', 'pulses.jsonl');
const HEALING_LOG = path.join(ROOT, '.iqra', 'healing_log.jsonl');
const STEP_TIMEOUT_MS = 10 * 60 * 1000;

// ── CLI parsing ──────────────────────────────────────────────────────────────

interface Options {
  skipTests: boolean;
  jsonSummary: boolean;
}

function parseArgs(argv: string[]): Options {
  return {
    skipTests: argv.includes('--skip-tests'),
    jsonSummary: argv.includes('--json'),
  };
}

// ── Types ────────────────────────────────────────────────────────────────────

interface ProbeResult {
  name: string;
  ok: boolean;
  detail: string;
}

interface HealResult {
  name: string;
  applied: boolean;
  changed: boolean;
  detail: string;
}

interface Summary {
  timestamp: string;
  probes: ProbeResult[];
  heals: HealResult[];
  changed_files: string[];
  exit_code: 0 | 1;
}

// ── Shell helpers (zero-deps) ────────────────────────────────────────────────

interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number;
}

function run(binary: string, args: string[]): RunResult {
  const res = spawnSync(binary, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: STEP_TIMEOUT_MS,
    // Keep shell=false so we cannot accidentally pass-through user-controlled
    // strings into a shell — this script may run on the CI runner.
    shell: false,
  });
  if (res.error) {
    return { ok: false, stdout: '', stderr: String(res.error.message || res.error), code: -1 };
  }
  const code = typeof res.status === 'number' ? res.status : -1;
  return {
    ok: code === 0,
    stdout: (res.stdout ?? '').toString(),
    stderr: (res.stderr ?? '').toString(),
    code,
  };
}

function countTscErrors(stdout: string, stderr: string): number {
  const combined = `${stdout}\n${stderr}`;
  const matches = combined.match(/error TS\d+/g);
  return matches ? matches.length : 0;
}

function listChangedFiles(): string[] {
  const r = run('git', ['status', '--porcelain']);
  if (!r.ok) return [];
  return r.stdout
    .split('\n')
    .filter((line) => line.length > 0)
    // porcelain v1 format is always "XY path" where X,Y are single status
    // chars and a single space separates them from the path. Do NOT trim
    // the line first — that would consume a leading-space status char and
    // chop the path's first character.
    .map((line) => line.slice(3).trimEnd())
    .filter((p) => p.length > 0);
}

// ── Probes (read-only, never mutate) ─────────────────────────────────────────

function probeTsc(): ProbeResult {
  const r = run('npx', ['tsc', '--noEmit']);
  const errors = countTscErrors(r.stdout, r.stderr);
  let detail: string;
  if (r.ok) {
    detail = '0 TypeScript errors';
  } else if (errors > 0) {
    detail = `${errors} TypeScript error(s)`;
  } else {
    // tsc failed for a reason that did NOT print `error TS\d+` lines
    // (missing tsconfig, Node crash, spawn failure, internal error).
    // Surface the real exit code instead of "0 TypeScript error(s)",
    // which would contradict ok=false and hide the actual failure mode.
    detail = `tsc exited with code ${r.code} (no TS errors parsed — possible config or runtime failure)`;
  }
  return { name: 'tsc', ok: r.ok && errors === 0, detail };
}

function probeTests(): ProbeResult {
  const r = run('npx', ['vitest', '--run', '--reporter=dot']);
  return {
    name: 'tests',
    ok: r.ok,
    detail: r.ok ? 'vitest passed' : `vitest exit=${r.code}`,
  };
}

// ── Healers (idempotent in-place fixes only) ─────────────────────────────────

function healEslint(): HealResult {
  // next lint --fix is the project's canonical lint command (per package.json
  // "lint": "next lint"). --fix only rewrites files when the rule is
  // auto-fixable, so this stays idempotent and safe.
  //
  // NOTE on `applied`: next lint exits 1 whenever it finds *any* lint error,
  // even after applying every fix it could. That is a benign "work remains"
  // signal, not a crash, so we treat it the same as success and only flag
  // applied=false for the abnormal-termination case (process spawn error,
  // signal kill, timeout — all normalised to code === -1 in run()).
  const before = listChangedFiles();
  const r = run('npx', ['next', 'lint', '--fix']);
  const after = listChangedFiles();
  const changed = after.filter((p) => !before.includes(p)).length > 0
    || after.length !== before.length;
  return {
    name: 'eslint-fix',
    applied: r.code !== -1,
    changed,
    detail: r.ok
      ? `next lint --fix completed${changed ? ' (files changed)' : ' (no changes)'}`
      : `next lint --fix exit=${r.code}${changed ? ' (files still changed)' : ''}`,
  };
}

function healReindex(): HealResult {
  // iqra:index is idempotent — it regenerates IQRA_INDEX.md from the layer
  // tree. If the file is already up to date, the script is a no-op.
  // Unlike the linter, the auto-indexer has no "work remains" exit code;
  // any non-zero exit is a real crash, so we mirror r.ok directly.
  const before = listChangedFiles();
  const r = run('npx', ['tsx', '.iqra/scripts/auto-indexer.ts']);
  const after = listChangedFiles();
  // Match healEslint exactly so reverts (which shrink the dirty set
  // without introducing new entries) still register as "changed".
  // `!==` covers both additions and removals; the `.some(...)` clause
  // covers the same-size swap case (one file goes from dirty → clean
  // and a different one goes clean → dirty).
  const changed = after.length !== before.length
    || after.some((p) => !before.includes(p));
  return {
    name: 'reindex',
    applied: r.ok,
    changed,
    detail: r.ok
      ? `auto-indexer completed${changed ? ' (IQRA_INDEX.md regenerated)' : ' (no changes)'}`
      : `auto-indexer exit=${r.code}`,
  };
}

const HEALERS: Array<{ name: string; fn: () => HealResult }> = [
  { name: 'eslint-fix', fn: healEslint },
  { name: 'reindex', fn: healReindex },
];

// ── Pulse / healing-log writers ──────────────────────────────────────────────

function appendJsonl(file: string, payload: Record<string, unknown>): void {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(file, JSON.stringify(payload) + '\n', 'utf8');
}

function logSummary(summary: Summary): void {
  appendJsonl(HEALING_LOG, { ...summary });
  appendJsonl(PULSES, {
    timestamp: summary.timestamp,
    action: 'self-heal',
    probes_passed: summary.probes.filter((p) => p.ok).length,
    probes_failed: summary.probes.filter((p) => !p.ok).length,
    heals_changed: summary.heals.filter((h) => h.changed).length,
    exit_code: summary.exit_code,
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  const opts = parseArgs(process.argv.slice(2));
  const filesBefore = listChangedFiles();

  console.log('🧬 [IQRA SELF-HEAL] starting Phase-1 self-healing cycle');

  // 1. Probe — measure the world before we change anything.
  const probes: ProbeResult[] = [];
  probes.push(probeTsc());
  if (!opts.skipTests) {
    probes.push(probeTests());
  }
  for (const p of probes) {
    console.log(`  • probe(${p.name}): ${p.ok ? 'OK' : 'FAIL'} — ${p.detail}`);
  }

  // 2. Heal — always run the healers; they are idempotent so a clean repo
  //    short-circuits to "no changes".
  const heals: HealResult[] = [];
  for (const h of HEALERS) {
    const result = h.fn();
    console.log(`  • heal(${result.name}): ${result.changed ? 'CHANGED' : 'no-op'} — ${result.detail}`);
    heals.push(result);
  }

  const filesAfter = listChangedFiles();
  const newFiles = filesAfter.filter((f) => !filesBefore.includes(f));

  // 3. Decide exit code. Phase-1 considers the cycle a success unless a
  //    healer itself crashed (applied=false means the child process never
  //    finished cleanly — spawn failure or signal kill). Persistent probe
  //    failures get logged but do NOT fail the script — that's the
  //    workflow's job (it inspects the diff and opens a PR for review).
  const healerCrashed = heals.some((h) => !h.applied);
  const exitCode: 0 | 1 = healerCrashed ? 1 : 0;
  if (healerCrashed) {
    const crashed = heals.filter((h) => !h.applied).map((h) => h.name).join(', ');
    console.error(`🚨 [IQRA SELF-HEAL] healer(s) crashed: ${crashed} — exiting with code 1`);
  }

  const summary: Summary = {
    timestamp: new Date().toISOString(),
    probes,
    heals,
    changed_files: newFiles,
    exit_code: exitCode,
  };

  logSummary(summary);

  if (opts.jsonSummary) {
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  } else {
    console.log(
      `🧬 [IQRA SELF-HEAL] done — probes_failed=${probes.filter((p) => !p.ok).length} ` +
        `heals_changed=${heals.filter((h) => h.changed).length} ` +
        `new_files=${newFiles.length} exit=${exitCode}`
    );
  }

  process.exit(exitCode);
}

main();
