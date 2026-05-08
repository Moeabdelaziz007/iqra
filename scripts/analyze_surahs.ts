#!/usr/bin/env tsx
// بسم الله الرحمن الرحيم
/**
 * CLI Script — تحليل السور
 * 
 * الاستخدام:
 *   tsx scripts/analyze_surahs.ts --all              # تحليل كل السور (1-114)
 *   tsx scripts/analyze_surahs.ts --surah=36         # تحليل سورة واحدة
 *   tsx scripts/analyze_surahs.ts --range=1-10       # تحليل نطاق
 *   tsx scripts/analyze_surahs.ts --batch=5          # حجم الدفعة
 */

import { SurahAnalyzer } from '../lib/iqra/quran/surah_analyzer.ts';
import { IQRALogger } from '../lib/iqra/logger.ts';

// ── Parse CLI Args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

const allFlag = args.includes('--all');
const surahArg = args.find(a => a.startsWith('--surah='));
const rangeArg = args.find(a => a.startsWith('--range='));
const batchArg = args.find(a => a.startsWith('--batch='));

const surahNumber = surahArg ? parseInt(surahArg.split('=')[1]) : null;
const batchSize = batchArg ? parseInt(batchArg.split('=')[1]) : 10;

let startSurah = 1;
let endSurah = 114;

if (rangeArg) {
  const [start, end] = rangeArg.split('=')[1].split('-').map(Number);
  startSurah = start;
  endSurah = end;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  IQRA Surah Analyzer — محرك تحليل السور                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    if (surahNumber) {
      // ── تحليل سورة واحدة ───────────────────────────────────────────────
      IQRALogger.info(`🌀 Analyzing single surah: ${surahNumber}`);
      const result = await SurahAnalyzer.analyzeSurah(surahNumber);

      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log(`📖 Surah ${result.surah_number}: ${result.surah_name}`);
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`Total Verses: ${result.total_verses}`);
      console.log(`Average Resonance: ${result.average_resonance.toFixed(4)}`);
      console.log(`Max Resonance: ${result.max_resonance.toFixed(4)}`);
      console.log(`High Resonance Verses: ${result.high_resonance_count}`);
      console.log(`Total H1 Cycles: ${result.total_h1_cycles}`);
      console.log(`Processing Time: ${result.processing_time_ms}ms`);

      if (result.top_verses.length > 0) {
        console.log('\n🏆 Top Verses:');
        result.top_verses.forEach((v, i) => {
          console.log(`  ${i + 1}. ${v.verse} — Resonance: ${v.resonance.toFixed(4)}, Novelty: ${v.novelty.toFixed(4)}`);
        });
      }

      if (result.numerical_patterns.length > 0) {
        console.log('\n🔢 Numerical Patterns:');
        result.numerical_patterns.forEach(p => console.log(`  - ${p}`));
      }

    } else if (allFlag || rangeArg) {
      // ── تحليل دفعة من السور ────────────────────────────────────────────
      IQRALogger.info(`🌀 Analyzing surahs ${startSurah}-${endSurah} (batch_size=${batchSize})`);
      const result = await SurahAnalyzer.analyzeAllSurahs(startSurah, endSurah, batchSize);

      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('📊 Batch Analysis Summary');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`Total Surahs: ${result.total_surahs}`);
      console.log(`Processed: ${result.processed_surahs}`);
      console.log(`Overall Avg Resonance: ${result.overall_average_resonance.toFixed(4)}`);
      console.log(`High Resonance Surahs: ${result.high_resonance_surahs.length}`);
      console.log(`Fractal Surahs: ${result.fractal_surahs.length}`);
      console.log(`Quran Signature Surahs: ${result.quran_signature_surahs.length}`);
      console.log(`Total Discoveries: ${result.total_discoveries}`);
      console.log(`Total Time: ${(result.total_time_ms / 1000).toFixed(2)}s`);

      if (result.high_resonance_surahs.length > 0) {
        console.log('\n🏆 High Resonance Surahs:');
        result.high_resonance_surahs.slice(0, 10).forEach(n => {
          const surahResult = result.results.find(r => r.surah_number === n);
          if (surahResult) {
            console.log(`  - Surah ${n}: ${surahResult.surah_name} (${surahResult.average_resonance.toFixed(4)})`);
          }
        });
      }

    } else {
      // ── عرض المساعدة ───────────────────────────────────────────────────
      console.log('Usage:');
      console.log('  tsx scripts/analyze_surahs.ts --all              # Analyze all surahs (1-114)');
      console.log('  tsx scripts/analyze_surahs.ts --surah=36         # Analyze single surah');
      console.log('  tsx scripts/analyze_surahs.ts --range=1-10       # Analyze range');
      console.log('  tsx scripts/analyze_surahs.ts --batch=5          # Batch size (default: 10)');
      console.log('\nExamples:');
      console.log('  tsx scripts/analyze_surahs.ts --surah=36');
      console.log('  tsx scripts/analyze_surahs.ts --range=1-10 --batch=5');
      console.log('  tsx scripts/analyze_surahs.ts --all');
      process.exit(0);
    }

    console.log('\n✅ Analysis complete. بحمد الله.\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
