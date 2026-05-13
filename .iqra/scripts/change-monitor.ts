#!/usr/bin/env -S npx tsx
/**
 * IQRA Change Monitor — مراقب التغييرات
 *
 * يلخص آخر 24 ساعة من commits.
 *
 * 🤖 NOTE TO FUTURE AI AGENTS:
 *   - يعتمد على git CLI. في CI تأكد من fetch-depth كافٍ (>= 30 موصى به).
 *   - safeExec يبتلع الأخطاء عمداً — السكريبت لا يجب أن يكسر الدورة.
 *   - إذا أضفت إشعارات Slack/Discord، اجعلها opt-in عبر ENV vars.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const PULSES = '.iqra/pulses.jsonl';
const CYCLE_FILE = '.iqra/cycle.txt';
const OUTPUT = '.iqra/performance/changes.md';
const CYCLE_LENGTH = 30;

// 🤖 NOTE: تحقق من قيمة cycle.txt — نقبل فقط عدداً صحيحاً ضمن [1, CYCLE_LENGTH].
/**
 * Read and validate the current cycle value from the cycle file.
 *
 * Reads the cycle value from CYCLE_FILE and returns it as a string if it is
 * an integer between 1 and CYCLE_LENGTH. If the file is missing or contains
 * an invalid value, returns `'1'`.
 *
 * @returns The validated cycle value as a string; `'1'` when missing or invalid.
 */
function readCycle(): string {
  if (!fs.existsSync(CYCLE_FILE)) return '1';
  const raw = fs.readFileSync(CYCLE_FILE, 'utf-8').trim();
  if (!/^\d+$/.test(raw)) return '1';
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= CYCLE_LENGTH ? String(n) : '1';
}

/**
 * Appends a pulse entry to the pulses JSONL file recording an action and optional metadata.
 *
 * @param action - Short identifier of the action to record (for example, `"changes-monitored"`)
 * @param meta - Additional fields to merge into the pulse object written to the file
 */
function appendPulse(action: string, meta: Record<string, unknown> = {}): void {
  fs.mkdirSync(path.dirname(PULSES), { recursive: true });
  const pulse = { timestamp: new Date().toISOString(), action, cycle: readCycle(), ...meta };
  fs.appendFileSync(PULSES, JSON.stringify(pulse) + '\n');
}

// 🤖 NOTE: maxBuffer الافتراضي 1MB يقطع git log الكبيرة بصمت.
// نرفعه لـ 64MB حتى المستودعات الكبيرة تعطي ملخصاً صحيحاً.
const EXEC_MAX_BUFFER = 64 * 1024 * 1024;

/**
 * Runs a shell command and returns its trimmed standard output.
 *
 * If execution fails, logs a warning and returns an empty string.
 *
 * @param cmd - The shell command to run
 * @returns The command's stdout trimmed of surrounding whitespace, or an empty string if execution fails
 */
function safeExec(cmd: string): string {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: EXEC_MAX_BUFFER,
    }).trim();
  } catch (err) {
    // لا نخفي الفشل بصمت — نسجله للتشخيص دون كسر الدورة.
    console.warn(`⚠️ safeExec failed: ${cmd}`, err instanceof Error ? err.message : err);
    return '';
  }
}

/**
 * Generate a Markdown report of git activity from the last 24 hours, write it to the configured output, and record a JSONL pulse.
 *
 * The report includes the current cycle and timestamp, a table of commits, and a capped list of affected files. This function writes the report file, appends a pulse entry with commit and file counts, and logs the output path and commit count to the console.
 */
function monitorChanges(): void {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

  const since = '24 hours ago';
  const commits = safeExec(`git log --since='${since}' --pretty=format:'%h|%an|%ar|%s'`);
  const filesChanged = safeExec(`git log --since='${since}' --name-only --pretty=format:''`)
    .split('\n')
    .filter(Boolean);
  const uniqueFiles = Array.from(new Set(filesChanged));

  let report = `# 🌊 سجل التغييرات\n\n`;
  report += `_آخر 24 ساعة — الدورة ${readCycle()}_\n\n`;
  report += `_${new Date().toISOString()}_\n\n`;

  if (!commits) {
    report += `## ⏸️ لا توجد commits في آخر 24 ساعة\n`;
  } else {
    const lines = commits.split('\n').filter(Boolean);
    report += `## 📝 ${lines.length} commit\n\n`;
    report += `| hash | المؤلف | متى | الرسالة |\n|------|--------|-----|----------|\n`;
    for (const line of lines) {
      const [hash, author, when, ...msg] = line.split('|');
      const safeMsg = (msg.join('|') || '').replace(/\|/g, '\\|');
      report += `| \`${hash}\` | ${author} | ${when} | ${safeMsg} |\n`;
    }
    report += `\n## 📂 ${uniqueFiles.length} ملف تأثر\n\n`;
    for (const file of uniqueFiles.slice(0, 50)) {
      report += `- \`${file}\`\n`;
    }
    if (uniqueFiles.length > 50) {
      report += `\n_... و ${uniqueFiles.length - 50} ملف آخر_\n`;
    }
  }

  fs.writeFileSync(OUTPUT, report);
  appendPulse('changes-monitored', {
    commits: commits ? commits.split('\n').length : 0,
    filesChanged: uniqueFiles.length,
  });
  console.log(`🌊 ${OUTPUT} — ${commits ? commits.split('\n').length : 0} commits`);
}

monitorChanges();
