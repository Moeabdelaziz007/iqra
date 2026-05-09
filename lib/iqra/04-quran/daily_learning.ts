/**
 * IQRA Daily Learning System
 * Runs automatically — IQRA teaches itself
 * 
 * "وَقُل رَّبِّ زِدْنِي عِلْمًا"
 * "And say: My Lord, increase me in knowledge" — Ta-Ha 20:114
 */

import { fetchSurah } from './quran_loader';
import { discoverPatterns, PatternType, QuranPattern } from './pattern_engine';
import { IQRAMemory } from '../03-memory/memory';

export async function performDailyLearning() {
  console.log('🌙 IQRA Daily Learning — بسم الله...');
  
  // Pick today's surah and focus on deep understanding
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) 
    / 86400000
  );
  const surahNumber = (dayOfYear % 114) + 1; 
  
  console.log(`📖 IQRA Deep Understanding — Surah: ${surahNumber}`);
  
  const editions = await fetchSurah(surahNumber);
  const arabicSurah = editions[0];
  const englishSurah = editions[1];

  const ayahs = arabicSurah.ayahs.map((a: any, i: number) => ({
    arabic: a.text,
    english: englishSurah.ayahs[i].text,
    reference: `${surahNumber}:${a.numberInSurah}`,
  }));

  // Rule: Understand every single word by its pattern and context
  console.log('💎 Extracting Spiritual Patterns and Semantic Roots...');
  
  const allPatterns: QuranPattern[] = [];
  
  // Strategy: Analyze 5 ayahs deeply instead of 10 shallowly
  const deepSlice = ayahs.slice(0, 5);
  
  for (const patternType of Object.values(PatternType)) {
    const patterns = await discoverPatterns(deepSlice, patternType as PatternType);
    allPatterns.push(...patterns);
    await new Promise(r => setTimeout(r, 500));
  }

  // Record self-review in SovereignEngine for growth
  await SovereignEngine.recordSelfReview(
    `LEARNING:SURAH:${surahNumber}`,
    allPatterns.map(p => p.discovery).join(' | '),
    allPatterns.length > 0 ? 0.9 : 0.4
  );

  await saveDiscoveriesToMemory({
    date: new Date().toISOString(),
    surah: surahNumber,
    patterns: allPatterns,
  });

  if (allPatterns.length > 0) {
    const bestPattern = allPatterns[0];
    
    // Append to DISCOVERIES.md for the people
    const discoveryEntry = `
## 💎 اكتشاف جديد: ${bestPattern.discovery}
**السورة:** ${surahNumber}
**التدبر:** ${bestPattern.arabicNote}
**التوثيق:** ${bestPattern.verification}
---
`;
    // Note: In Cloudflare, we use R2, but for local/dev we log it
    console.log(`📝 Discovery for the people: ${bestPattern.discovery}`);
    
    return bestPattern.discovery;
  }
  return null;
}

async function saveDiscoveriesToMemory(data: any) {
  try {
    // We use the IQRAMemory list feature
    await IQRAMemory.appendList('quran_discoveries', data);
  } catch (err) {
    console.error("Failed to save discovery to memory:", err);
  }
}
