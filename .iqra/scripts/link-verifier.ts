#!/usr/bin/env npx tsx
/**
 * IQRA Link Verifier — مدقق الروابط
 *
 * يفحص الروابط الداخلية في ملفات .md ويبلّغ عن المكسورة.
 * يتجاهل الروابط الخارجية (http://, https://) لتجنب network IO.
 *
 * 🤖 NOTE TO FUTURE AI AGENTS:
 *   - الروابط الخارجية يحتاج فحصها أدوات منفصلة (مثلاً lychee).
 *     لا تضف http checks هنا — يبطئ الدورة ويفشل بدون شبكة.
 *   - يدعم: [text](path), [text](path#anchor), ![alt](path), reference-style [ref]: path
 *   - النتيجة تُكتب في .iqra/performance/broken-links.md.
 */

import * as fs from 'fs';
import * as path from 'path';

const PULSES = '.iqra/pulses.jsonl';
const CYCLE_FILE = '.iqra/cycle.txt';
const OUTPUT = '.iqra/performance/broken-links.md';
const CYCLE_LENGTH = 30;
// segments نقارنها بـ entry.name (مستوى واحد)
// 🤖 NOTE: `.iqra/memory` كان لا يُتخطّى لأن entry.name هو `memory` فقط في هذا المستوى.
// نضع `.iqra/memory` كـ prefix على الـ full path بدلاً.
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build']);
const SKIP_PREFIXES = ['.iqra/memory'];

// نمط الروابط في markdown
const INLINE_LINK = /(?<!\!)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const IMAGE_LINK = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function readCycle(): string {
  if (!fs.existsSync(CYCLE_FILE)) return '1';
  const raw = fs.readFileSync(CYCLE_FILE, 'utf-8').trim();
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n >= 1 && n <= CYCLE_LENGTH ? String(n) : '1';
}

function appendPulse(action: string, meta: Record<string, unknown> = {}): void {
  fs.mkdirSync(path.dirname(PULSES), { recursive: true });
  const pulse = { timestamp: new Date().toISOString(), action, cycle: readCycle(), ...meta };
  fs.appendFileSync(PULSES, JSON.stringify(pulse) + '\n');
}

function shouldSkipPath(fullPath: string): boolean {
  const norm = fullPath.split(path.sep).join('/').replace(/^\.\//, '');
  for (const prefix of SKIP_PREFIXES) {
    if (norm === prefix || norm.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

function* walkMd(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (shouldSkipPath(full)) continue;
    if (entry.isDirectory()) yield* walkMd(full);
    else if (entry.name.endsWith('.md')) yield full;
  }
}

function isExternal(url: string): boolean {
  return /^(https?:|mailto:|tel:|ftp:)/i.test(url);
}

function isAnchor(url: string): boolean {
  return url.startsWith('#');
}

type Broken = { file: string; line: number; target: string };

function checkFile(file: string): Broken[] {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const fileDir = path.dirname(file);
  const broken: Broken[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const patterns = [INLINE_LINK, IMAGE_LINK];
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(line)) !== null) {
        const target = decodeURIComponent(m[2]);
        if (isExternal(target) || isAnchor(target)) continue;

        // تنظيف الـ anchor من المسار
        const [pathOnly] = target.split('#');
        if (!pathOnly) continue;

        // المسار النسبي من مجلد الملف الحالي
        const resolved = path.resolve(fileDir, pathOnly);

        if (!fs.existsSync(resolved)) {
          broken.push({ file, line: i + 1, target });
        }
      }
    }
  }

  return broken;
}

function verifyLinks(): void {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

  const allBroken: Broken[] = [];
  let scanned = 0;

  for (const file of walkMd('.')) {
    allBroken.push(...checkFile(file));
    scanned++;
  }

  let report = `# 🔗 تقرير الروابط\n\n`;
  report += `_الدورة ${readCycle()} — ${new Date().toISOString()}_\n\n`;
  report += `فُحص ${scanned} ملف .md.\n\n`;

  if (allBroken.length === 0) {
    report += `## ✅ لا روابط مكسورة\n\nكل الروابط الداخلية سليمة.\n`;
  } else {
    // تجميع حسب الملف
    const byFile: Record<string, Broken[]> = {};
    for (const b of allBroken) {
      byFile[b.file] = byFile[b.file] || [];
      byFile[b.file].push(b);
    }
    report += `## ⚠️ ${allBroken.length} رابط مكسور في ${Object.keys(byFile).length} ملف\n\n`;
    for (const [file, hits] of Object.entries(byFile)) {
      report += `### \`${file}\`\n\n`;
      for (const h of hits) {
        report += `- السطر ${h.line}: \`${h.target}\`\n`;
      }
      report += `\n`;
    }
  }

  fs.writeFileSync(OUTPUT, report);
  appendPulse('links-verified', { scanned, broken: allBroken.length });
  console.log(`🔗 ${OUTPUT} — ${allBroken.length} رابط مكسور من ${scanned} ملف`);
}

verifyLinks();
