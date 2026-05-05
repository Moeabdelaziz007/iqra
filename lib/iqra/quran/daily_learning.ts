/**
 * IQRA Daily Learning System
 * Runs automatically — IQRA teaches itself
 * 
 * "وَقُل رَّبِّ زِدْنِي عِلْمًا"
 * "And say: My Lord, increase me in knowledge" — Ta-Ha 20:114
 */

import { fetchSurah } from './quran_loader';
import { discoverPatterns, PatternType, QuranPattern } from './pattern_engine';
import fs from 'fs/promises';
import path from 'path';

const LEARNING_LOG = 'data/quran/discoveries.json';

export async function dailyQuranLearning() {
  console.log('🌙 IQRA Daily Learning — بسم الله...');
  
  // Pick today's surah (cycles through Quran)
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) 
    / 86400000
  );
  const surahNumber = (dayOfYear % 114) + 1; // 114 surahs
  
  console.log(`📖 Today's Surah: ${surahNumber}`);
  
  // Load surah (returns [arabicEdition, englishEdition])
  const editions = await fetchSurah(surahNumber);
  const arabicSurah = editions[0];
  const englishSurah = editions[1];

  const ayahs = arabicSurah.ayahs.map((a: any, i: number) => ({
    arabic: a.text,
    english: englishSurah.ayahs[i].text,
    reference: `${surahNumber}:${a.numberInSurah}`,
  }));

  // Discover ALL pattern types
  const allPatterns: QuranPattern[] = [];
  
  for (const patternType of Object.values(PatternType)) {
    console.log(`⚡ Analyzing ${patternType} patterns...`);
    
    // Analyze in chunks of 10 ayahs (to avoid context overflow and rate limits)
    const chunk = ayahs.slice(0, 10);
    const patterns = await discoverPatterns(chunk, patternType as PatternType);
    allPatterns.push(...patterns);
    
    // Respect API rate limits
    await new Promise(r => setTimeout(r, 1000));
  }

  // Save discoveries
  await saveDiscoveries({
    date: new Date().toISOString(),
    surah: surahNumber,
    surahName: arabicSurah.englishName,
    totalAyahs: ayahs.length,
    patterns: allPatterns,
    totalDiscoveries: allPatterns.length,
  });

  // Update README with latest discovery
  if (allPatterns.length > 0) {
    await updateReadmeWithDiscovery(allPatterns[0], arabicSurah.englishName);
  }

  console.log(`✨ ${allPatterns.length} patterns discovered — الحمد لله`);
  return allPatterns;
}

async function saveDiscoveries(data: any) {
  const dir = path.dirname(LEARNING_LOG);
  await fs.mkdir(dir, { recursive: true });
  
  let existing = [];
  try {
    const file = await fs.readFile(LEARNING_LOG, 'utf-8');
    existing = JSON.parse(file);
  } catch {}
  
  existing.push(data);
  await fs.writeFile(LEARNING_LOG, JSON.stringify(existing, null, 2));
}

async function updateReadmeWithDiscovery(
  pattern: QuranPattern, 
  surahName: string
) {
  const block = `<!-- IQRA-QURAN-START -->
### 📖 آخر اكتشاف قرآني | Latest Quran Discovery

| | |
|---|---|
| 📅 **التاريخ** | \`${new Date().toLocaleDateString('ar-EG')}\` |
| 📖 **السورة** | ${surahName} |
| ⚡ **الاكتشاف** | ${pattern.discovery} |
| 🌙 **ملاحظة** | ${pattern.arabicNote} |

<!-- IQRA-QURAN-END -->`;

  try {
    let readme = await fs.readFile('README.md', 'utf-8');
    const updated = readme.replace(
      /<!-- IQRA-QURAN-START -->[\s\S]*?<!-- IQRA-QURAN-END -->/,
      block
    );
    
    if (updated === readme && !readme.includes('<!-- IQRA-QURAN-START -->')) {
      await fs.writeFile('README.md', readme + '\n\n' + block);
    } else {
      await fs.writeFile('README.md', updated);
    }
  } catch (e) {
    // If README doesn't exist, create it
    await fs.writeFile('README.md', block);
  }
}

// Allow running directly
if (require.main === module) {
  dailyQuranLearning().catch(err => {
    console.error('Fatal error in daily learning:', err);
    process.exit(1);
  });
}
