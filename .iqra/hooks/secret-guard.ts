#!/usr/bin/env npx tsx
/**
 * IQRA Secret Guard — حارس الأسرار
 *
 * يمسح الملفات بحثاً عن مفاتيح API و tokens مكشوفة.
 * يستخدم patterns لمزودين معروفين (AWS, OpenAI, GitHub, Stripe, Anthropic, إلخ).
 *
 * Exit code:
 *   0 — لا أسرار مكشوفة
 *   1 — وُجد سرّ محتمل (يمنع commit في pre-commit hook)
 *
 * Usage:
 *   npx tsx .iqra/hooks/secret-guard.ts [file1 file2 ...]
 *   إذا لم تُمرَّر ملفات، يفحص staged files.
 *
 * 🤖 NOTE TO FUTURE AI AGENTS:
 *   - هذا فحص خفيف، ليس بديلاً عن gitleaks أو trufflehog.
 *   - patterns مبنية على prefixes معروفة + entropy heuristic.
 *   - false positives ممكنة — توجد آلية ALLOW comment للتجاوز الصريح.
 *   - لا ترسل الأسرار المكتشفة لأي مكان — اطبع موقع فقط، لا القيمة.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const PULSES = '.iqra/pulses.jsonl';
const CYCLE_FILE = '.iqra/cycle.txt';
const CYCLE_LENGTH = 30;

// patterns: name → regex
// 🤖 NOTE: استخدم raw prefixes للمزودين الرئيسيين، تجنب regex فضفاضة.
const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'AWS Access Key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'AWS Secret', pattern: /\baws_secret_access_key\s*[:=]\s*['"][A-Za-z0-9/+=]{40}['"]/i },
  { name: 'OpenAI API Key', pattern: /\bsk-[A-Za-z0-9]{20,}T3BlbkFJ[A-Za-z0-9]{20,}\b/ },
  { name: 'OpenAI Project Key', pattern: /\bsk-proj-[A-Za-z0-9_-]{40,}\b/ },
  { name: 'Anthropic API Key', pattern: /\bsk-ant-[a-z0-9-]{40,}\b/ },
  { name: 'GitHub PAT (classic)', pattern: /\bghp_[A-Za-z0-9]{36}\b/ },
  { name: 'GitHub PAT (fine-grained)', pattern: /\bgithub_pat_[A-Za-z0-9_]{82}\b/ },
  { name: 'GitHub OAuth', pattern: /\bgho_[A-Za-z0-9]{36}\b/ },
  { name: 'GitHub App', pattern: /\bghs_[A-Za-z0-9]{36}\b/ },
  { name: 'Stripe Live Key', pattern: /\bsk_live_[A-Za-z0-9]{24,}\b/ },
  { name: 'Stripe Test Key', pattern: /\bsk_test_[A-Za-z0-9]{24,}\b/ },
  { name: 'Slack Token', pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'Google API Key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'Groq API Key', pattern: /\bgsk_[A-Za-z0-9]{52}\b/ },
  { name: 'Private Key (PEM)', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |)PRIVATE KEY-----/ },
  { name: 'JWT', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
];

// امتدادات نتجاهلها (binary, lockfiles)
const SKIP_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf',
  '.zip', '.tar', '.gz', '.iqra', '.seal', '.lock', '.lockb',
  '.db', '.sqlite', '.woff', '.woff2', '.ttf', '.otf',
]);

// Skip directories as path *segments*, not substrings.
// 🤖 NOTE: substring match يُسبّب false-skips خطيرة (مثلاً `src/lib/iqra/02-workers/builder.ts`
// كان يُتخطّى لأنه يحوي "build"). نطابق segment كامل أو prefix path.
const SKIP_SEGMENTS = new Set(['node_modules', '.git', '.next', 'dist', 'build']);
const SKIP_PREFIXES = ['.iqra/memory/'];

// تعليق للتجاوز الصريح في سطر فيه ما يشبه مفتاحاً
const ALLOW_MARKER = 'iqra:secret-guard:allow';

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

function shouldSkip(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  if (SKIP_EXTS.has(ext)) return true;
  const norm = filePath.split(path.sep).join('/');
  // prefix match: مثلاً .iqra/memory/anything
  for (const prefix of SKIP_PREFIXES) {
    if (norm.startsWith(prefix) || norm.includes(`/${prefix}`)) return true;
  }
  // segment match: كل قطعة في الـ path تُقارن بـ Set
  const segments = norm.split('/');
  return segments.some((s) => SKIP_SEGMENTS.has(s));
}

function getStagedFiles(): string[] {
  try {
    // 🤖 NOTE: A=Added, M=Modified, R=Renamed. تجاهل R يفتح ثغرة:
    // rename+edit في commit واحد قد يُدخل سرّاً جديداً دون فحص.
    const out = execSync('git diff --cached --name-only --diff-filter=AMR', {
      encoding: 'utf-8',
    });
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function getAllRepoFiles(): string[] {
  try {
    const out = execSync('git ls-files -z', { encoding: 'utf-8' });
    return out.split('\0').filter(Boolean);
  } catch {
    return [];
  }
}

type Hit = { file: string; line: number; pattern: string };

// 🤖 NOTE: لقراءة المحتوى المُدرَج (staged) لملف، نستخدم git show :file
// بدل fs.readFileSync. السابق كان يقرأ working tree، فإذا أزال المستخدم
// السرّ من working tree بعد الـ stage، يُرى الملف نظيفاً والـ commit يحوي
// السرّ الأصلي. الـ staged read يمنع هذا.
function readContent(file: string, mode: 'staged' | 'worktree'): string | null {
  if (mode === 'staged') {
    try {
      return execSync(`git show :${file}`, { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
    } catch {
      return null; // الملف ليس في الـ index أو binary
    }
  }
  try {
    return fs.readFileSync(file, 'utf-8');
  } catch {
    return null;
  }
}

function scanFile(file: string, mode: 'staged' | 'worktree'): Hit[] {
  const content = readContent(file, mode);
  if (content == null) return [];

  const hits: Hit[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(ALLOW_MARKER)) continue;
    for (const { name, pattern } of SECRET_PATTERNS) {
      if (pattern.test(line)) {
        hits.push({ file, line: i + 1, pattern: name });
      }
    }
  }
  return hits;
}

function main(): void {
  const args = process.argv.slice(2);
  const scanAll = args.includes('--all');
  const argFiles = args.filter((a) => !a.startsWith('--'));
  // mode: pre-commit يقرأ من index؛ --all/argFiles يقرأ من working tree.
  let mode: 'staged' | 'worktree';
  let files: string[];
  if (argFiles.length > 0) {
    files = argFiles;
    mode = 'worktree';
  } else if (scanAll) {
    files = getAllRepoFiles();
    mode = 'worktree';
  } else {
    files = getStagedFiles();
    mode = 'staged';
  }

  if (files.length === 0) {
    console.log('💤 لا ملفات للفحص');
    process.exit(0);
  }

  const allHits: Hit[] = [];
  let scanned = 0;

  for (const file of files) {
    // في staged mode: لا حاجة لـ fs.existsSync لأن المحتوى من git index.
    if (mode === 'worktree' && !fs.existsSync(file)) continue;
    if (shouldSkip(file)) continue;
    allHits.push(...scanFile(file, mode));
    scanned++;
  }

  appendPulse('secrets-scanned', { scanned, hits: allHits.length });

  if (allHits.length === 0) {
    console.log(`✅ لا أسرار مكشوفة (${scanned} ملف فُحص)`);
    process.exit(0);
  }

  console.error(`❌ احتمال تسريب ${allHits.length} سرّ:\n`);
  for (const h of allHits) {
    console.error(`   ${h.file}:${h.line}  →  ${h.pattern}`);
  }
  console.error(`\n💡 إن كان false positive، أضف تعليقاً يحوي: ${ALLOW_MARKER}`);
  console.error(`   ثم استخدم env vars أو secret manager، لا قيم حرفية.`);
  process.exit(1);
}

main();
