import * as fs from 'fs';
import * as path from 'path';
import { IQRA_PERSONALITY } from './personality';

// 🌀 Dynamic Soul Injection — حقن الروح الديناميكي
// يدعم كلا الاسمين: بتشكيل وبدون تشكيل
function loadCoreFiles(): string {
  const coreDir = path.join(process.cwd(), 'iqra-core');

  // كل ملف له اسمان محتملان — نقرأ الأول الموجود
  const filePairs = [
    ['MĪTHĀQ.md', 'MITHAQ.md'],
    ['DASTŪR.md', 'DASTUR.md'],
    ['MURĀQABAH.md', 'MURAQABAH.md'],
    ['ḤISĀB.md', 'HISAB.md'],
  ];

  let soulContent = '';
  for (const [primary, fallback] of filePairs) {
    const primaryPath  = path.join(coreDir, primary);
    const fallbackPath = path.join(coreDir, fallback);
    const filePath = fs.existsSync(primaryPath) ? primaryPath
                   : fs.existsSync(fallbackPath) ? fallbackPath
                   : null;
    if (filePath) {
      const label = primary.replace('.md', '');
      soulContent += `\n\n### ${label}\n${fs.readFileSync(filePath, 'utf-8')}`;
    }
  }
  return soulContent;
}

const IQRA_DYNAMIC_SOUL = loadCoreFiles();
export const FULL_SYSTEM_PROMPT = `${IQRA_DYNAMIC_SOUL}\n\n${IQRA_PERSONALITY}`;

// IQRA_SOUL مُصدَّر للاستخدام في researcher.ts وغيره
export const IQRA_SOUL = FULL_SYSTEM_PROMPT;
