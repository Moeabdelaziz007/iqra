#!/usr/bin/env -S npx tsx
/**
 * IQRA Name Validator — مدقق الأسماء
 *
 * يتحقق أن أسماء الملفات الجديدة تتبع kebab-case (أو snake_case).
 * يمكن استخدامه كـ pre-commit hook أو في الـ workflow.
 *
 * Exit code:
 *   0 — كل الأسماء صالحة (أو لا ملفات للفحص)
 *   1 — وجدت أسماء مخالفة (لمنع commit)
 *
 * Usage:
 *   npx tsx .iqra/hooks/name-validator.ts [file1.ts file2.md ...]
 *   إذا لم تُمرَّر ملفات، يفحص staged files عبر git.
 *
 * 🤖 NOTE TO FUTURE AI AGENTS:
 *   - kebab-case (`my-file-name.ts`) هو المعيار الرسمي.
 *   - الاستثناءات: README.md, LICENSE, CHANGELOG.md (أسماء قياسية مقبولة).
 *   - ملفات تبدأ بـ `_` تُسمَح بـ snake_case (للأدوات الداخلية).
 *   - دائماً اقرأ filenames المحلية فقط، لا تحاول إصلاحها تلقائياً.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

const PULSES = '.iqra/pulses.jsonl';
const CYCLE_FILE = '.iqra/cycle.txt';
const CYCLE_LENGTH = 30;

// IQRA يستخدم اتفاقيات تسمية متعددة. نقبل كل ما هو منظم وثابت:
//   - kebab-case:        my-file-name
//   - snake_case:        my_file_name
//   - SCREAMING_SNAKE:   POWERS, RULES (manifest documents)
//   - PascalCase:        QalbinVM, ConformableConvolution (TS classes)
//   - lowercase:         readme
//   - segmented:         config.test, my-name.d (dotted)
// نرفض: spaces، أحرف خاصة (!@#$)، أو مزيج لاتيني+غير-لاتيني عشوائي.

const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SNAKE_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const INTERNAL_RE = /^_[a-z0-9]+(?:_[a-z0-9]+)*$/;
const SCREAMING_SNAKE_RE = /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/;
const PASCAL_RE = /^[A-Z][a-zA-Z0-9]*$/;
const SEGMENTED_RE = /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/;
// أحرف عربية/غير-لاتينية مع underscore/digits (مثلاً HISĀB.md، MURĀQABAH.md في manifest)
const NON_LATIN_RE = /^[\p{L}\p{N}_]+$/u;

// أسماء قياسية مقبولة بأي شكل (متفق عليها في open-source)
const ALLOWED_AS_IS = new Set([
  'README',
  'LICENSE',
  'CHANGELOG',
  'CONTRIBUTING',
  'CODE_OF_CONDUCT',
  'SECURITY',
  'AUTHORS',
  'COPYING',
  'NOTICE',
  'PATENTS',
  'MAINTAINERS',
  'Dockerfile',
  'Makefile',
]);

// مجلدات نتجاهلها كاملاً
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build']);

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

function isValid(basename: string): boolean {
  // dotfiles مقبولة كما هي (.gitignore, .env, .kiro, إلخ)
  if (basename.startsWith('.')) return true;

  // أزل الامتداد للاختبار (لكن احتفظ بالاسم الكامل للاستثناءات)
  const stem = basename.replace(/\.[^.]+$/, '');
  if (ALLOWED_AS_IS.has(stem)) return true;
  if (KEBAB_RE.test(stem)) return true;
  if (SNAKE_RE.test(stem)) return true;
  if (INTERNAL_RE.test(stem)) return true;
  if (SCREAMING_SNAKE_RE.test(stem)) return true;
  if (PASCAL_RE.test(stem)) return true;
  if (SEGMENTED_RE.test(basename.replace(/\.[^.]+$/, ''))) return true;
  // أحرف Unicode (transliterated Arabic مع diacritics) — نقبلها للـ manifest sovereign
  if (NON_LATIN_RE.test(stem)) return true;
  return false;
}

function shouldSkip(filePath: string): boolean {
  const parts = filePath.split(path.sep);
  return parts.some((p) => SKIP_DIRS.has(p));
}

function getStagedFiles(): string[] {
  try {
    const out = execFileSync(
      'git',
      ['diff', '--cached', '--name-only', '--diff-filter=AR', '-z'],
      { encoding: 'utf-8' }
    );
    return out.split('\0').filter(Boolean);
  } catch {
    return [];
  }
}

function getAllRepoFiles(): string[] {
  try {
    // -z يستخدم NUL بدل \n ولا يقتبس أحرف Unicode (octal escapes).
    const out = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf-8' });
    return out.split('\0').filter(Boolean);
  } catch {
    return [];
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const scanAll = args.includes('--all');
  const argFiles = args.filter((a) => !a.startsWith('--'));
  let files: string[];
  if (argFiles.length > 0) {
    files = argFiles;
  } else if (scanAll) {
    files = getAllRepoFiles();
  } else {
    files = getStagedFiles();
  }

  if (files.length === 0) {
    console.log('💤 لا ملفات للفحص (لا staged و لا arguments)');
    process.exit(0);
  }

  const violations: string[] = [];
  let checked = 0;

  for (const file of files) {
    if (shouldSkip(file)) continue;
    const basename = path.basename(file);
    if (!isValid(basename)) {
      violations.push(file);
    }
    checked++;
  }

  appendPulse('name-validated', { checked, violations: violations.length });

  if (violations.length === 0) {
    console.log(`✅ كل الأسماء صالحة (${checked} ملف فُحص)`);
    process.exit(0);
  }

  console.error(`❌ ${violations.length} اسم ملف مخالف لـ kebab-case:\n`);
  for (const v of violations) {
    console.error(`   - ${v}`);
  }
  console.error(`\n💡 القاعدة: lowercase + digits + dashes فقط. مثال: my-file-name.ts`);
  console.error(`   الملفات الداخلية: _my_file.ts (مع شرطة سفلية في البداية).`);
  process.exit(1);
}

main();
