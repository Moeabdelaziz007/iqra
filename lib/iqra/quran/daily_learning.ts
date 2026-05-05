/**
 * IQRA Daily Learning System
 * Runs automatically — IQRA teaches itself
 * 
 * "وَقُل رَّبِّ زِدْنِي عِلْمًا"
 * "And say: My Lord, increase me in knowledge" — Ta-Ha 20:114
 */

import { fetchSurah } from './quran_loader';
import { discoverPatterns, PatternType, QuranPattern } from './pattern_engine';
import { IQRAMemory } from '../memory';

export async function performDailyLearning() {
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
    
    // Respect API rate limits (simulate sleep)
    await new Promise(r => setTimeout(r, 1000));
  }

  // Save discoveries to Redis instead of local FS
  await saveDiscoveriesToMemory({
    date: new Date().toISOString(),
    surah: surahNumber,
    surahName: arabicSurah.englishName,
    totalAyahs: ayahs.length,
    patterns: allPatterns,
    totalDiscoveries: allPatterns.length,
  });

  console.log(`✨ ${allPatterns.length} patterns discovered — الحمد لله`);
  
  // Return the best pattern discovery to be sent to Telegram
  if (allPatterns.length > 0) {
    return allPatterns[0].discovery;
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
