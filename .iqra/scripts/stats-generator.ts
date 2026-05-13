#!/usr/bin/env -S npx tsx
/**
 * IQRA Stats Generator — مولد الإحصائيات
 *
 * عداد للملفات والأسطر حسب النوع.
 *
 * 🤖 NOTE TO FUTURE AI AGENTS:
 *   - أبقِ هذا السكريبت بسيطاً جداً (KISS). إذا احتجت تحليلاً عميقاً،
 *     أنشئ سكريبت منفصل في .iqra/intelligence/ بدلاً من نفخ هذا.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const PULSES = '.iqra/pulses.jsonl';
const CYCLE_FILE = '.iqra/cycle.txt';
const OUTPUT = '.iqra/performance/stats.md';
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', '.iqra']);
const TRACKED = ['.ts', '.tsx', '.js', '.md', '.py', '.go', '.yml', '.yaml', '.json'];

function* walk(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(fullPath);
    else if (TRACKED.some((e) => entry.name.endsWith(e))) yield fullPath;
  }
}

const CYCLE_LENGTH = 30;

/**
 * Read the current cycle identifier from the cycle file and validate it against the allowed range.
 *
 * @returns The cycle as a string (an integer between "1" and `CYCLE_LENGTH`); returns `"1"` if the file is missing or contains an invalid value.
 */
function readCycle(): string {
  if (!fs.existsSync(CYCLE_FILE)) return '1';
  const raw = fs.readFileSync(CYCLE_FILE, 'utf-8').trim();
  if (!/^\d+$/.test(raw)) return '1';
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= CYCLE_LENGTH ? String(n) : '1';
}

/**
 * Appends a timestamped pulse record (JSONL) to the configured pulses file, ensuring its directory exists.
 *
 * The record includes `timestamp`, `action`, `cycle`, and any additional fields provided in `meta`.
 *
 * @param action - A short string identifying the pulse action (e.g., `"stats-generated"`)
 * @param meta - Additional key/value metadata to merge into the pulse record
 */
function appendPulse(action: string, meta: Record<string, unknown> = {}): void {
  fs.mkdirSync(path.dirname(PULSES), { recursive: true });
  const pulse = { timestamp: new Date().toISOString(), action, cycle: readCycle(), ...meta };
  fs.appendFileSync(PULSES, JSON.stringify(pulse) + '\n');
}

/**
 * Count the number of lines in a file using a streaming reader to avoid loading the whole file into memory.
 *
 * Uses a streaming `readline` interface so very large files are handled without high memory usage.
 *
 * @param file - Filesystem path of the file to count lines for
 * @returns The number of lines in the file, or `0` if the file cannot be read due to an error
 */
async function countLines(file: string): Promise<number> {
  return new Promise((resolve) => {
    let count = 0;
    const stream = fs.createReadStream(file);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    rl.on('line', () => count++);
    rl.on('close', () => resolve(count));
    rl.on('error', () => resolve(0));
    stream.on('error', () => resolve(0));
  });
}

/**
 * Generate a Markdown report of tracked files and their line counts, grouped by file extension.
 *
 * Ensures the output directory exists, scans the repository (skipping configured directories),
 * counts files and lines per tracked extension, and writes a Markdown report to the configured
 * OUTPUT path. Appends a JSONL pulse record containing an ISO timestamp, the current cycle, and
 * the computed totals, and logs a completion message.
 */
async function generateStats(): Promise<void> {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

  const byExt: Record<string, { files: number; lines: number }> = {};
  let totalFiles = 0;
  let totalLines = 0;

  for (const file of walk('.')) {
    const ext = path.extname(file);
    const lines = await countLines(file);
    byExt[ext] = byExt[ext] || { files: 0, lines: 0 };
    byExt[ext].files++;
    byExt[ext].lines += lines;
    totalFiles++;
    totalLines += lines;
  }

  let report = `# 📐 إحصائيات IQRA\n\n`;
  report += `_الدورة ${readCycle()} — ${new Date().toISOString()}_\n\n`;
  report += `## الإجمالي\n\n`;
  report += `- **الملفات:** ${totalFiles}\n`;
  report += `- **الأسطر:** ${totalLines.toLocaleString()}\n\n`;
  report += `## حسب النوع\n\n`;
  report += `| الامتداد | الملفات | الأسطر |\n|----------|---------|--------|\n`;
  for (const [ext, { files, lines }] of Object.entries(byExt).sort((a, b) => b[1].lines - a[1].lines)) {
    report += `| ${ext} | ${files} | ${lines.toLocaleString()} |\n`;
  }

  fs.writeFileSync(OUTPUT, report);
  appendPulse('stats-generated', { totalFiles, totalLines });
  console.log(`📐 ${OUTPUT} — ${totalFiles} ملف, ${totalLines} سطر`);
}

generateStats().catch((err) => {
  console.error('❌ فشل توليد الإحصائيات:', err);
  process.exit(1);
});
