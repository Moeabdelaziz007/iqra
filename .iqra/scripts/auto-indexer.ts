#!/usr/bin/env -S npx tsx
/**
 * IQRA Auto Indexer — الفهرس الموحد
 *
 * يولّد IQRA_INDEX.md من جميع ملفات .md في:
 *  - src/lib/iqra/ (الطبقات 14)
 *  - src/knowledge_base/
 *  - الجذر (روائز التعريف)
 *
 * 🤖 NOTE TO FUTURE AI AGENTS:
 *   - SCAN_DIRS و ROOT_MARKERS قابلة للتوسعة بحرية.
 *   - دالة classify() تصنّف الملفات حسب موقعها. أضف فئات إذا ظهرت طبقات
 *     جديدة في src/lib/iqra/ (مثلاً 14-spiritual أو 15-quantum).
 *   - الناتج IQRA_INDEX.md في الجذر — لا تنقله بدون تحديث README الرئيسي.
 */

import * as fs from 'fs';
import * as path from 'path';

const PULSES = '.iqra/pulses.jsonl';
const CYCLE_FILE = '.iqra/cycle.txt';
const OUTPUT = 'IQRA_INDEX.md';

const SCAN_DIRS = ['src/lib/iqra', 'src/knowledge_base'];
const ROOT_MARKERS = ['README.md', 'SOVEREIGN_ROADMAP.md', 'WISDOM_7.md', 'REFLECTION.md'];

function* walkMd(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      yield* walkMd(fullPath);
    } else if (entry.name.endsWith('.md')) {
      yield fullPath;
    }
  }
}

const CYCLE_LENGTH = 30;

/**
 * Get the current cycle number from the cycle file, defaulting to 1 when the file is missing or contains an invalid value.
 *
 * @returns The cycle number as a string between "1" and "30"; returns "1" if the cycle file is absent or contains a value outside that range or otherwise invalid.
 */
function readCycle(): string {
  if (!fs.existsSync(CYCLE_FILE)) return '1';
  const raw = fs.readFileSync(CYCLE_FILE, 'utf-8').trim();
  if (!/^\d+$/.test(raw)) return '1';
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= CYCLE_LENGTH ? String(n) : '1';
}

/**
 * Record an event pulse to the persistent pulses log.
 *
 * Ensures the pulses file directory exists and appends a newline-delimited JSON object containing an ISO timestamp, the provided `action`, the current cycle, and any supplied metadata.
 *
 * @param action - Event name or action identifier to record
 * @param meta - Additional metadata to include in the pulse
 */
function appendPulse(action: string, meta: Record<string, unknown> = {}): void {
  fs.mkdirSync(path.dirname(PULSES), { recursive: true });
  const pulse = { timestamp: new Date().toISOString(), action, cycle: readCycle(), ...meta };
  fs.appendFileSync(PULSES, JSON.stringify(pulse) + '\n');
}

/**
 * Determine which IQRA content category a Markdown file belongs to based on its path.
 *
 * @param file - File path (absolute or relative). Path separators are normalized for cross-platform matching.
 * @returns `'manifest'` if the path contains `00-manifest`, `'knowledge'` if it contains `knowledge_base`, `'skill'` if it contains `08-skills` or `08-cognitive`, `'layer'` if it begins with `src/lib/iqra/`, otherwise `'root'`.
 */
function classify(file: string): 'manifest' | 'knowledge' | 'skill' | 'layer' | 'root' {
  // تطبيع المسار إلى posix-style لضمان عمل startsWith/includes على Windows أيضاً.
  const normalized = file.split(path.sep).join('/');
  if (normalized.includes('00-manifest')) return 'manifest';
  if (normalized.includes('knowledge_base')) return 'knowledge';
  if (normalized.includes('08-skills') || normalized.includes('08-cognitive')) return 'skill';
  if (normalized.startsWith('src/lib/iqra/')) return 'layer';
  return 'root';
}

/**
 * Generate the IQRA_INDEX.md documentation index at the repository root.
 *
 * Scans the configured directories and any present root marker Markdown files for candidates,
 * classifies them into manifest, knowledge, skill, layer, and root sections, and builds a
 * categorized Markdown index with per-section counts and an overall total. Writes the index to
 * the configured OUTPUT file, records an `index-generated` pulse containing the total file count,
 * and prints a completion message to the console.
 */
function generateIqraIndex(): void {
  const all: string[] = [];
  for (const dir of SCAN_DIRS) {
    for (const md of walkMd(dir)) all.push(md);
  }
  for (const marker of ROOT_MARKERS) {
    if (fs.existsSync(marker)) all.push(marker);
  }

  const grouped: Record<string, string[]> = {
    manifest: [],
    knowledge: [],
    skill: [],
    layer: [],
    root: [],
  };
  for (const file of all) grouped[classify(file)].push(file);

  const stamp = new Date().toISOString().slice(0, 10);
  let index = `# 📚 فهرس معرفة IQRA\n\n`;
  index += `_تولد تلقائياً بواسطة IQRA Growth Engine — ${stamp}_\n\n`;
  index += `_الدورة الحالية: ${readCycle()} / 30_\n\n`;
  index += `---\n\n`;

  const sections: Array<[string, string, keyof typeof grouped]> = [
    ['🌟', 'المنفست (Manifest)', 'manifest'],
    ['🧠', 'المهارات (Skills)', 'skill'],
    ['🏛️', 'الطبقات (Architecture Layers)', 'layer'],
    ['📖', 'قاعدة المعرفة (Knowledge Base)', 'knowledge'],
    ['🪪', 'وثائق الجذر (Root Docs)', 'root'],
  ];

  let totalCount = 0;
  for (const [icon, title, key] of sections) {
    const files = grouped[key].sort();
    if (files.length === 0) continue;
    index += `## ${icon} ${title} (${files.length})\n\n`;
    for (const file of files) {
      const name = path.basename(file, '.md');
      // 🤖 NOTE: الـ markdown links تتطلب forward slashes حتى على Windows.
      // path.sep قد يكون '\' فنُحوّله إلى '/' لضمان أن GitHub يفهم الرابط.
      const linkPath = file.split(path.sep).join('/');
      index += `- [${name}](./${linkPath})\n`;
    }
    index += `\n`;
    totalCount += files.length;
  }

  index += `---\n\n`;
  index += `**إجمالي الملفات المفهرسة:** ${totalCount}\n`;

  fs.writeFileSync(OUTPUT, index);
  appendPulse('index-generated', { files: totalCount });
  console.log(`📚 ${OUTPUT} تم توليده — ${totalCount} ملف`);
}

generateIqraIndex();
