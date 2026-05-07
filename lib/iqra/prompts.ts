import * as fs from 'fs';
import * as path from 'path';
import { IQRA_PERSONALITY } from './personality';

// 🌀 Dynamic Soul Injection — حقن الروح الديناميكي
function loadCoreFiles(): string {
  const coreDir = path.join(process.cwd(), 'iqra-core');
  const files = ['MITHAQ.md', 'DASTUR.md', 'MURAQABAH.md', 'HISAB.md'];

  let soulContent = '';
  for (const file of files) {
    const filePath = path.join(coreDir, file);
    if (fs.existsSync(filePath)) {
      soulContent += `\n\n### ${file.replace('.md', '')}\n${fs.readFileSync(filePath, 'utf-8')}`;
    }
  }
  return soulContent;
}

const IQRA_DYNAMIC_SOUL = loadCoreFiles();
export const FULL_SYSTEM_PROMPT = `${IQRA_DYNAMIC_SOUL}\n\n${IQRA_PERSONALITY}`;
