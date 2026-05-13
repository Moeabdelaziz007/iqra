#!/usr/bin/env -S npx tsx
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
// 🤖 NOTE: regex لا يستطيع التقاط balanced parens مثل (myth)؛ نلتقط فقط
// الـ shape العام: [text]( …لا newline ولا ) عارٍ ). الـ parser في checkFile
// يأخذ أي ) متبوع بـ whitespace/EOL كنهاية للـ destination، أو يستخرج
// pointy/inline بشكل خاص. للحالة العامة، نسمح بـ () المتوازنة عبر
// regex مع تكرار محدود.
// pattern: <...> أو سلسلة غير-)/whitespace قد تحوي () متوازنة على مستوى واحد.
const DEST_PATTERN = '(?:<[^>]+>|(?:\\([^)]*\\)|[^)\\s])+)';
// 🤖 NOTE: CommonMark يدعم 3 صيغ للـ title:
//   "double"   'single'   (paren)
// السابق كان يقبل "double" فقط، فروابط بـ 'title' أو (title) تُفقَد كلياً.
const TITLE_PATTERN = '(?:\\s+(?:"[^"]*"|\'[^\']*\'|\\([^)]*\\)))?';
const INLINE_LINK = new RegExp(`(?<!\\!)\\[([^\\]]*)\\]\\((${DEST_PATTERN})${TITLE_PATTERN}\\)`, 'g');
const IMAGE_LINK = new RegExp(`!\\[([^\\]]*)\\]\\((${DEST_PATTERN})${TITLE_PATTERN}\\)`, 'g');

// 🤖 NOTE: يعيد مصفوفة boolean بطول lines.length:
// inCodeBlock[i] === true يعني أن السطر داخل fenced/indented code block.
//
// fenced: السطر يبدأ بـ (مع 0..3 spaces) ثم ``` أو ~~~ بـ 3+ متتالية.
//   - السطر الأول يفتح، السطر التالي بنفس النوع يقفل.
//   - السطر السلسلة نفسه (الـ fence) لا يُحسب كـ "داخل" (لأنه ليس link content).
// indented: السطر يبدأ بـ 4+ spaces أو tab — تقريب محافظ يلتقط معظم الـ code samples
//   لكنه يخطئ على list continuations العميقة. مقبول للحارس.
function computeCodeBlockLines(lines: string[]): boolean[] {
  const out: boolean[] = new Array(lines.length).fill(false);
  let openFence: string | null = null;
  let openIndent = 0;
  const FENCE = /^(\s{0,3})(`{3,}|~{3,})/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (openFence) {
      // داخل fenced: مرر حتى نرى fence مطابق
      const close = line.match(FENCE);
      if (close && close[2][0] === openFence[0] && close[2].length >= openFence.length) {
        out[i] = true; // سطر الـ closing fence نفسه يُحسَب داخل الـ block
        openFence = null;
      } else {
        out[i] = true;
      }
      continue;
    }

    const fence = line.match(FENCE);
    if (fence && fence[1].length < 4) {
      openFence = fence[2];
      openIndent = fence[1].length;
      void openIndent; // reserved لو احتجنا strict indentation match لاحقاً
      out[i] = true;
      continue;
    }

    // indented code block: يبدأ بـ 4+ spaces أو tab، السطر السابق فارغ أو ضمن block.
    // تقريب: نطبّق فقط على السطور بداية بـ 4 spaces/tab وفيها محتوى.
    if (/^( {4}|\t)/.test(line) && line.trim().length > 0) {
      out[i] = true;
    }
  }

  return out;
}

function stripPointyBrackets(target: string): string {
  // <path/to/file.md> → path/to/file.md
  if (target.startsWith('<') && target.endsWith('>')) {
    return target.slice(1, -1);
  }
  return target;
}
// reference-style: نمطان منفصلان
// 🤖 NOTE: CommonMark يدعم ثلاث صيغ:
//   1. full:      [text][ref]
//   2. collapsed: [text][]   (يستخدم text كـ ref)
//   3. shortcut:  [text]     (نفس الشيء، بدون []) — أصعب: نتجنّب false positives
//      عبر التأكد من عدم وجود  ](  أو  ]:  أو  ][  بعدها
const REF_USE_FULL = /(!?)\[([^\]]*)\]\[([^\]]+)\]/g;
const REF_USE_COLLAPSED = /(!?)\[([^\]]+)\]\[\]/g;
// shortcut: [text] غير متبوع بـ ( أو [ أو :
const REF_USE_SHORTCUT = /(!?)\[([^\]]+)\](?!\s*[(:\[])/g;
// تعريف المرجع: 3 صيغ destination مدعومة:
//   1.  [ref]: ./target.md "title"
//   2.  [ref]: <docs/My File.md> "title"     ← angle-bracket مع spaces
//   3.  [ref]: ./target.md                  بدون title
// 🤖 NOTE: \S+ يقطع <docs/My File.md> عند المسافة. نلتقط <...> صراحة كـ alt.
const REF_DEF = /^\s*\[([^\]]+)\]:\s*(<[^>]+>|\S+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*$/;

// 🤖 NOTE: CommonMark يطابق reference labels بقواعد whitespace:
//   - يحذف edge whitespace
//   - يطوي internal whitespace runs إلى مسافة واحدة
//   - case-insensitive (Unicode-aware)
// مثال: [Foo  bar] === [foo bar]
function normalizeRefLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ').toLowerCase();
}

function readCycle(): string {
  if (!fs.existsSync(CYCLE_FILE)) return '1';
  const raw = fs.readFileSync(CYCLE_FILE, 'utf-8').trim();
  if (!/^\d+$/.test(raw)) return '1';
  const n = Number(raw);
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

function resolveLink(target: string, fileDir: string): { resolved: string; escapes: boolean } {
  // 🤖 NOTE: المسارات التي تبدأ بـ '/' في markdown نسبية لجذر المستودع
  // (process.cwd() في الـ workflow)، ليس filesystem root.
  // لكن path.join يطبّق normalize فيعالج '/../../etc/passwd' كـ سلسلة تخرج عن المستودع.
  // نتحقق أن الـ resolved يبقى تحت root، وإلا نعتبره كسر.
  const root = path.resolve(process.cwd());
  const resolved = target.startsWith('/')
    ? path.resolve(root, '.' + target)
    : path.resolve(fileDir, target);
  const escapes = !(resolved === root || resolved.startsWith(root + path.sep));
  return { resolved, escapes };
}

function checkFile(file: string): Broken[] {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const fileDir = path.dirname(file);
  const broken: Broken[] = [];

  // 🤖 NOTE: نحدد سطور الـ code blocks مرة واحدة، نستخدمها لـ:
  //   1. تجاهلها عند بناء refDefs (الـ definitions في code blocks ليست حقيقية).
  //   2. تجاهلها في الـ scan الرئيسي (الأنماط داخل code blocks أمثلة لا روابط).
  // ندعم:
  //   - fenced blocks: ``` أو ~~~  (3+ backticks/tildes في بداية السطر مع indentation < 4)
  //   - indented blocks: سطور تبدأ بـ 4+ spaces أو tab (تقريب محافظ)
  const inCodeBlock = computeCodeBlockLines(lines);

  // 🤖 NOTE:
  // - CommonMark: عند تكرار [label]: target، التعريف الأول يفوز.
  // - تطبيع الـ label عبر normalizeRefLabel: trim + collapse whitespace + lowercase.
  //   مثال: '[Foo  bar]' ↔ '[foo bar]:' يجب أن يطابقا.
  const refDefs = new Map<string, string>();
  for (let i = 0; i < lines.length; i++) {
    if (inCodeBlock[i]) continue;
    const m = lines[i].match(REF_DEF);
    if (m) {
      const key = normalizeRefLabel(m[1]);
      if (!refDefs.has(key)) refDefs.set(key, m[2]);
    }
  }

  function checkTarget(rawTargetIn: string, lineNum: number, displayed: string): void {
    // أزل الـ pointy brackets أولاً (CommonMark angle-bracket destinations).
    const rawTarget = stripPointyBrackets(rawTargetIn);
    let target: string;
    try {
      target = decodeURIComponent(rawTarget);
    } catch {
      target = rawTarget; // malformed URI escape — افحص كما هو
    }
    if (isExternal(target) || isAnchor(target)) return;

    const [pathOnly] = target.split('#');
    if (!pathOnly) return;

    const { resolved, escapes } = resolveLink(pathOnly, fileDir);
    if (escapes) {
      // 🤖 NOTE: مسار يخرج عن جذر المستودع (مثلاً /../../etc/passwd) — كسر
      // حتى لو كان الملف موجوداً محلياً، فالـ doc-link المقصود داخلي.
      broken.push({ file, line: lineNum, target: `${displayed} (يخرج عن جذر المستودع)` });
      return;
    }
    if (!fs.existsSync(resolved)) {
      broken.push({ file, line: lineNum, target: displayed });
    }
  }

  function checkRef(refKey: string, lineNum: number, label: string): void {
    const def = refDefs.get(normalizeRefLabel(refKey));
    if (def === undefined) {
      broken.push({ file, line: lineNum, target: `[ref:${label}] (تعريف مفقود)` });
      return;
    }
    checkTarget(def, lineNum, `[${label}] → ${def}`);
  }

  for (let i = 0; i < lines.length; i++) {
    // تجاهل سطور code blocks — أمثلة لا روابط حقيقية.
    if (inCodeBlock[i]) continue;
    const line = lines[i];

    // SKIP السطور التي تحوي تعريف مرجع: [foo]: target — لا نريد فحصها كـ shortcut.
    const isDefLine = REF_DEF.test(line);

    // inline + image
    const patterns = [INLINE_LINK, IMAGE_LINK];
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(line)) !== null) {
        const rawTarget = m[2];
        checkTarget(rawTarget, i + 1, rawTarget);
      }
    }

    if (isDefLine) continue; // تخطّى الأنماط الـ reference على سطور التعريف

    // reference-style FULL: [text][ref] أو ![alt][ref]
    REF_USE_FULL.lastIndex = 0;
    let rm: RegExpExecArray | null;
    while ((rm = REF_USE_FULL.exec(line)) !== null) {
      checkRef(rm[3], i + 1, rm[3]);
    }

    // reference-style COLLAPSED: [text][] — يستخدم text كـ ref
    REF_USE_COLLAPSED.lastIndex = 0;
    while ((rm = REF_USE_COLLAPSED.exec(line)) !== null) {
      checkRef(rm[2], i + 1, rm[2]);
    }

    // reference-style SHORTCUT: [text] — text هو الـ ref
    // 🤖 NOTE: نتحقق أن السطر بعد إزالة كل inline/image/full/collapsed
    // matches يحوي shortcut حقيقي، وإلا سنطابق أي [bracketed] داخل النص.
    // الحل: نطلب أن يكون الـ ref موجوداً في refDefs (و إلا لا نُبلِّغ كسر —
    // shortcut بدون def عادة ليس link حقيقي بل نص brackets).
    REF_USE_SHORTCUT.lastIndex = 0;
    while ((rm = REF_USE_SHORTCUT.exec(line)) !== null) {
      const refKey = normalizeRefLabel(rm[2]);
      if (refDefs.has(refKey)) {
        checkRef(rm[2], i + 1, rm[2]);
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
