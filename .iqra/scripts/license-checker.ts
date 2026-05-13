#!/usr/bin/env -S npx tsx
/**
 * IQRA License Checker — حارس التراخيص
 *
 * يفحص وجود LICENSE في الجذر ويبلّغ إن كان مفقوداً.
 * لا ينشئ شيئاً تلقائياً — قرار الترخيص سيادي يحتاج وعي إنساني.
 *
 * 🤖 NOTE TO FUTURE AI AGENTS:
 *   - لا تفعّل الإنشاء التلقائي لـ LICENSE. الترخيص قرار قانوني، ليس routine.
 *   - يمكن توسعة الفحص ليشمل headers في الملفات (SPDX-License-Identifier).
 *   - الملاحظات تُكتب في .iqra/performance/license-report.md.
 */

import * as fs from 'fs';
import * as path from 'path';

const PULSES = '.iqra/pulses.jsonl';
const CYCLE_FILE = '.iqra/cycle.txt';
const OUTPUT = '.iqra/performance/license-report.md';
const CYCLE_LENGTH = 30;

// 🤖 NOTE: نتقبل التهجئتين American (LICENSE) و British (LICENCE).
const LICENSE_VARIANTS = [
  'LICENSE', 'LICENSE.md', 'LICENSE.txt',
  'LICENCE', 'LICENCE.md', 'LICENCE.txt',
  'COPYING', 'COPYING.md', 'COPYING.txt',
];

// 🤖 NOTE: نستخدم signature أنماط مميزة (sentence-anchored) لا مجرد substring.
// السابق كان يطابق "MIT" داخل "LIMITATIONS" أو "PERMITTED" فيُسيء التصنيف.
// كل license لها regex مميز مأخوذ من نص الترخيص الرسمي الفريد.
const LICENSE_SIGNATURES: Array<{ name: string; spdx: string; pattern: RegExp }> = [
  // MIT: السطر "MIT License" أو "Permission is hereby granted, free of charge"
  { name: 'MIT', spdx: 'MIT', pattern: /\bMIT License\b|\bPermission is hereby granted, free of charge\b/i },
  // Apache 2.0
  { name: 'Apache-2.0', spdx: 'Apache-2.0', pattern: /Apache License,?\s+Version\s+2\.0/i },
  // GPLv3
  { name: 'GPL-3.0', spdx: 'GPL-3.0', pattern: /GNU GENERAL PUBLIC LICENSE\s+Version\s+3/i },
  // GPLv2
  { name: 'GPL-2.0', spdx: 'GPL-2.0', pattern: /GNU GENERAL PUBLIC LICENSE\s+Version\s+2/i },
  // LGPL
  { name: 'LGPL', spdx: 'LGPL', pattern: /GNU LESSER GENERAL PUBLIC LICENSE/i },
  // AGPL
  { name: 'AGPL-3.0', spdx: 'AGPL-3.0', pattern: /GNU AFFERO GENERAL PUBLIC LICENSE/i },
  // BSD-3-Clause
  { name: 'BSD-3-Clause', spdx: 'BSD-3-Clause', pattern: /BSD 3-Clause|Redistributions of source code must retain.*neither the name of/is },
  // BSD-2-Clause
  { name: 'BSD-2-Clause', spdx: 'BSD-2-Clause', pattern: /BSD 2-Clause|Redistribution and use in source and binary forms/i },
  // ISC
  { name: 'ISC', spdx: 'ISC', pattern: /ISC License\b|Permission to use, copy, modify, and\/or distribute/i },
  // MPL 2.0
  { name: 'MPL-2.0', spdx: 'MPL-2.0', pattern: /Mozilla Public License Version 2\.0/i },
  // Unlicense
  { name: 'Unlicense', spdx: 'Unlicense', pattern: /This is free and unencumbered software released into the public domain/i },
];

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

function detectLicenseType(content: string): { name: string; spdx: string } {
  for (const sig of LICENSE_SIGNATURES) {
    if (sig.pattern.test(content)) return { name: sig.name, spdx: sig.spdx };
  }
  return { name: 'unknown', spdx: 'unknown' };
}

// 🤖 NOTE: مقارنة pkg.license بالـ SPDX المكتشف من الملف.
// pkg.license قد يكون:
//   - token مفرد:  "MIT", "Apache-2.0"
//   - SPDX expression: "(MIT OR Apache-2.0)", "MIT AND BSD-3-Clause"
//   - meta:  "SEE LICENSE IN LICENSE", "UNLICENSED"
// نتسامح مع كل هذه: لو أي token في الـ expression يطابق المكتشف، نجح.
function normalizeLicenseToken(s: string): string {
  return s.toLowerCase().replace(/[\s_.]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function extractLicenseTokens(declared: string): string[] {
  const trimmed = declared.trim();
  // "SEE LICENSE IN ..." — تأجيل إلى المحتوى المكتشف؛ نمرّر كل شيء (دائماً يطابق).
  if (/^SEE LICENSE IN/i.test(trimmed)) return ['*SEE_LICENSE*'];
  // "UNLICENSED" أو "UNKNOWN" — معروف؛ لا نقارن.
  if (/^(UNLICENSED|UNKNOWN)$/i.test(trimmed)) return ['*UNLICENSED*'];
  // SPDX expression: ضع تعابيره وأرجع كل tokens (نتجاهل OR/AND/WITH operators).
  // نزيل الأقواس ونقسم على whitespace، ثم نُزيل الكلمات المحجوزة.
  const reserved = new Set(['or', 'and', 'with']);
  return trimmed
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !reserved.has(t.toLowerCase()));
}

function licensesMatch(declared: string, detectedSpdx: string): boolean {
  if (detectedSpdx === 'unknown') return false;
  const tokens = extractLicenseTokens(declared);

  // 'SEE LICENSE IN ...' — المالك أعلن صراحة التأجيل إلى الملف، نعتبره pass.
  if (tokens.includes('*SEE_LICENSE*')) return true;

  // 'UNLICENSED' — تناقض حقيقي عند كشف ترخيص OSS في الملف.
  // 🤖 NOTE: السابق كان pass تلقائي، فيسمح بـ "license=UNLICENSED" بينما الملف
  // يحوي MIT — هذا بالضبط ما يجب أن يُكشَف، لا أن يُخفى.
  if (tokens.includes('*UNLICENSED*')) return false;

  const det = normalizeLicenseToken(detectedSpdx);
  for (const tok of tokens) {
    const d = normalizeLicenseToken(tok);
    if (!d) continue;
    if (d === det) return true;
    if (d.startsWith(det) || det.startsWith(d)) return true;
  }
  return false;
}

function checkLicense(): void {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

  const foundFiles = LICENSE_VARIANTS.filter((f) => fs.existsSync(f));
  let report = `# 📜 تقرير الترخيص\n\n`;
  report += `_الدورة ${readCycle()} — ${new Date().toISOString()}_\n\n`;

  if (foundFiles.length === 0) {
    report += `## ❌ لا يوجد ملف ترخيص\n\n`;
    report += `لم يُعثر على أي من: ${LICENSE_VARIANTS.join(', ')}.\n\n`;
    report += `**التوصية**: أضف ترخيصاً صريحاً (MIT، Apache 2.0، إلخ). بدون ترخيص، حقوق المساهمين غامضة.\n`;
    report += `راجع https://choosealicense.com للاختيار.\n`;

    appendPulse('license-missing', {});
    console.warn(`⚠️ لا يوجد ملف ترخيص — راجع ${OUTPUT}`);
  } else {
    report += `## ✅ ملف ترخيص موجود\n\n`;
    const detected: Array<{ file: string; name: string; spdx: string }> = [];
    for (const file of foundFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const { name, spdx } = detectLicenseType(content);
      const size = content.length;
      report += `- \`${file}\` — نوع: **${name}** (${size} حرف)\n`;
      detected.push({ file, name, spdx });
    }
    report += `\n`;

    // فحص package.json + مقارنة
    let pkgLicense: string | undefined;
    let mismatch = false;
    if (fs.existsSync('package.json')) {
      try {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
        pkgLicense = typeof pkg.license === 'string' ? pkg.license : undefined;
        report += `## 📦 package.json\n\n`;
        if (pkgLicense) {
          report += `- \`license\`: **${pkgLicense}**\n\n`;

          // 🤖 NOTE: مقارنة pkg.license بالـ SPDX المكتشف من الملف.
          // إذا اختلفا (MIT في package.json + Apache في LICENSE) — تناقض خطير.
          const primary = detected.find((d) => d.spdx !== 'unknown');
          if (primary) {
            if (licensesMatch(pkgLicense, primary.spdx)) {
              report += `✅ يطابق محتوى \`${primary.file}\` (${primary.spdx}).\n`;
            } else {
              mismatch = true;
              report += `### ❌ تناقض ترخيص\n\n`;
              report += `\`package.json\` يعلن \`${pkgLicense}\` لكن \`${primary.file}\` يحتوي **${primary.spdx}**.\n`;
              report += `هذا التناقض قد يضلّل المستهلكين أو يكسر فحوص الـ compliance.\n`;
              report += `**اختر واحداً**:\n`;
              report += `- إن كان \`${pkgLicense}\` هو المقصود → استبدل محتوى \`${primary.file}\` بنص ${pkgLicense} الرسمي.\n`;
              report += `- إن كان \`${primary.spdx}\` هو المقصود → عدّل \`package.json\` ليصبح \`"license": "${primary.spdx}"\`.\n`;
            }
          } else {
            report += `⚠️ لم يُكشَف نوع الترخيص من الملف، فلا يمكن التحقق من المطابقة.\n`;
          }
        } else {
          report += `⚠️ حقل \`license\` مفقود في \`package.json\`. أضفه ليطابق محتوى \`LICENSE\`.\n`;
          mismatch = true;
        }
      } catch {
        // ignore
      }
    }

    appendPulse('license-ok', { files: foundFiles, mismatch });
    if (mismatch) {
      console.warn(`⚠️ تناقض ترخيص — راجع ${OUTPUT}`);
    } else {
      console.log(`📜 ترخيص موجود (${foundFiles.length} ملف)`);
    }
  }

  fs.writeFileSync(OUTPUT, report);
}

checkLicense();
