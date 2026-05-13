#!/usr/bin/env -S npx tsx
/**
 * IQRA Growth Engine — Cycle Runner (المنسق)
 *
 * يقرأ .iqra/cycle.txt، يحدد سكريبتات الدورة الحالية، ينفذها بالتسلسل،
 * ثم يحرّك الدورة (1 → 30 → 1).
 *
 * الأسبوع الأول (دورات 1-6): الأساسيات.
 * الأسابيع التالية ستضيف سكريبتاتها هنا حين تجهز.
 *
 * ─────────────────────────────────────────────────────────────────────
 * 🤖 NOTE TO FUTURE AI AGENTS (للوكلاء القادمين):
 *
 * هذا المنسق هو "قلب" المحرك. عند إضافة أسابيع جديدة:
 *   1. أضف السكريبت الجديد تحت .iqra/{hooks|intelligence|social|economics|innovation}/
 *   2. سجّله في CYCLE_MAP أدناه برقم الدورة المناسب (7-30).
 *   3. استخدم نفس بنية النبض (appendPulse) للحفاظ على وحدة السجل.
 *   4. لا تكسر contract الـ exit code: فشل سكريبت ≠ فشل الدورة (نسجل ونمضي).
 *   5. كل سكريبت يجب أن يكون zero-dependency (Node stdlib فقط) — هذا قرار سيادي.
 *
 * إذا أضفت فئة جديدة (مثلاً "spiritual" أو "philosophical")، حدّث:
 *   - .iqra/README.md (جدول الفئات)
 *   - .github/workflows/iqra-growth-engine.yml (إذا احتجت permissions جديدة)
 *
 * احترم "Ratchet Effect" في .husky/pre-commit: لا تُدخل أخطاء TS جديدة.
 * سكريبتات .iqra/ خارج tsconfig.include، فهي آمنة عملياً، لكن أبقها نظيفة.
 * ─────────────────────────────────────────────────────────────────────
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

// 🤖 NOTE: 10 دقائق كحد أقصى لأي سكريبت في دورة. backup-smart قد يأخذ
// دقائق على repos كبيرة، لكن أي شيء أطول من ذلك = هنغ يجب أن يُكسَر.
const SCRIPT_TIMEOUT_MS = 10 * 60 * 1000;

const PULSES = '.iqra/pulses.jsonl';
const CYCLE_FILE = '.iqra/cycle.txt';
const CYCLE_LENGTH = 30;

type Script = { name: string; path: string; args?: string[] };

// الخريطة الدورية — كل دورة تطلق سكريبت أو أكثر.
// الدورات غير المُعرّفة تُعتبر "صمت" (no-op) حتى تكتمل الأسابيع التالية.
const CYCLE_MAP: Record<number, Script[]> = {
  // 🌱 الأسبوع 1 — الأساسيات (Foundations)
  1: [{ name: 'backup-smart', path: '.iqra/scripts/backup-smart.ts' }],
  2: [{ name: 'auto-indexer', path: '.iqra/scripts/auto-indexer.ts' }],
  3: [{ name: 'performance-analyzer', path: '.iqra/scripts/performance-analyzer.ts' }],
  4: [{ name: 'duplicate-cleaner', path: '.iqra/scripts/duplicate-cleaner.ts' }],
  5: [{ name: 'stats-generator', path: '.iqra/scripts/stats-generator.ts' }],
  6: [{ name: 'change-monitor', path: '.iqra/scripts/change-monitor.ts' }],

  // 🛡️ الأسبوع 2 — الجهاز المناعي (Immune System)
  // hooks/*.ts تعمل pre-commit محلياً على staged. في الدورة نمررها --all
  // لفحص المستودع بأكمله. الفشل لا يكسر الدورة — يُسجَّل فقط.
  7: [{ name: 'license-checker', path: '.iqra/scripts/license-checker.ts' }],
  8: [{ name: 'name-validator', path: '.iqra/hooks/name-validator.ts', args: ['--all'] }],
  9: [{ name: 'secret-guard', path: '.iqra/hooks/secret-guard.ts', args: ['--all'] }],
  10: [{ name: 'link-verifier', path: '.iqra/scripts/link-verifier.ts' }],
  11: [{ name: 'size-guard', path: '.iqra/hooks/size-guard.ts', args: ['--all'] }],

  // دورات 12-30 ستُعبّأ في الأسابيع 3-5.
};

/**
 * Reads the current cycle number from .iqra/cycle.txt, defaulting to 1 when the file is missing or invalid.
 *
 * @returns The cycle number between 1 and 30 read from the file; `1` if the file does not exist or contains an invalid value.
 */
function readCycle(): number {
  if (!fs.existsSync(CYCLE_FILE)) return 1;
  const raw = fs.readFileSync(CYCLE_FILE, 'utf-8').trim();
  // 🤖 NOTE: parseInt يقبل "12abc" و "15.5" كـ 12 و 15. نرفض الـ partial
  // numeric strings صراحة للحفاظ على ثبات contract الـ docstring.
  if (!/^\d+$/.test(raw)) return 1;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 && n <= CYCLE_LENGTH ? n : 1;
}

/**
 * Persist the given cycle number to the cycle file, creating the parent directory if it does not exist.
 *
 * @param n - The cycle number to store (expected to be between 1 and CYCLE_LENGTH)
 */
function writeCycle(n: number): void {
  fs.mkdirSync(path.dirname(CYCLE_FILE), { recursive: true });
  fs.writeFileSync(CYCLE_FILE, `${n}\n`);
}

// 🤖 NOTE: cycleOverride ضروري عند تسجيل cycle-completed بعد writeCycle(next)،
/**
 * Append a timestamped pulse event as a single JSON line to the pulses log.
 *
 * The written object always includes `timestamp`, `action`, and `cycle`. If
 * `cycleOverride` is provided its value is recorded as `cycle`; otherwise the
 * current cycle is read from disk and recorded. Additional fields from `meta`
 * are merged into the pulse object.
 *
 * @param action - A short string identifying the pulse action (e.g., `"cycle-started"`).
 * @param meta - Extra key/value pairs to include in the pulse object.
 * @param cycleOverride - Optional explicit cycle number to record instead of reading the current cycle.
 */
function appendPulse(
  action: string,
  meta: Record<string, unknown> = {},
  cycleOverride?: number
): void {
  fs.mkdirSync(path.dirname(PULSES), { recursive: true });
  const pulse = {
    timestamp: new Date().toISOString(),
    action,
    cycle: cycleOverride ?? readCycle(),
    ...meta,
  };
  fs.appendFileSync(PULSES, JSON.stringify(pulse) + '\n');
}

/**
 * Executes a mapped script using `npx tsx` and logs its start and any failure.
 *
 * @param script - Script object whose `path` is executed and whose `name` is used in log messages
 * @returns `true` if the script completed successfully, `false` if execution failed
 */
function runScript(script: Script): boolean {
  const args = script.args ?? [];
  // عرض الـ command للسجل فقط — التنفيذ الفعلي عبر execFileSync بـ array.
  const cmdDisplay = `npx tsx ${script.path}${args.length ? ' ' + args.join(' ') : ''}`;
  console.log(`\n▶️  ${script.name} (${cmdDisplay})`);
  try {
    // 🤖 NOTE: execFileSync بدل execSync لتجنّب shell interpolation
    // (يمنع command injection لو دخل path غير مأمون مستقبلاً)،
    // و timeout يمنع هَنْج workflow كامل لو علق سكريبت.
    // الـ args تُمرّر كـ array — آمنة من spaces و special chars بدون quoting.
    execFileSync('npx', ['tsx', script.path, ...args], {
      stdio: 'inherit',
      timeout: SCRIPT_TIMEOUT_MS,
    });
    return true;
  } catch (err) {
    console.error(`❌ ${script.name} فشل:`, err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Orchestrates a single cycle run: reads the current cycle, executes its scheduled scripts in order, advances and persists the next cycle, and records start/completion pulses.
 *
 * The function logs progress to the console, appends `cycle-started` and `cycle-completed` events to the pulses log (including per-script results and the next cycle), and, if any script failed, logs a warning and exits the process with code 0 to avoid failing the surrounding workflow.
 */
function main(): void {
  const cycle = readCycle();
  const scripts = CYCLE_MAP[cycle] || [];

  console.log(`\n🧠 IQRA Growth Engine — Cycle ${cycle} / ${CYCLE_LENGTH}`);
  console.log(`📋 سكريبتات مجدولة: ${scripts.length}`);

  appendPulse('cycle-started', { scriptCount: scripts.length }, cycle);

  const results: Array<{ name: string; ok: boolean }> = [];
  for (const script of scripts) {
    const ok = runScript(script);
    results.push({ name: script.name, ok });
  }

  const next = (cycle % CYCLE_LENGTH) + 1;
  writeCycle(next);

  // مرّر cycle الأصلي صراحةً — readCycle() الآن يعيد next.
  appendPulse(
    'cycle-completed',
    {
      completedCycle: cycle,
      nextCycle: next,
      results,
    },
    cycle
  );

  console.log(`\n✅ الدورة ${cycle} اكتملت. التالية: ${next}`);
  const failed = results.filter((r) => !r.ok).length;
  if (failed > 0) {
    console.warn(`⚠️  ${failed} سكريبت فشل في هذه الدورة`);
    process.exit(0); // لا نكسر الـ workflow — نسجل النبضة فقط
  }
}

main();
