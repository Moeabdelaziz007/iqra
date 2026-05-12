/**
 * IQRA Quran Loader
 * 
 * "إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ"
 * — الحجر: 9
 */

import { VectorEngine } from './vector_engine';

export async function ingestQuran(env: any) {
  const db = env.DB;
  const vectorEngine = new VectorEngine(env);

  console.log("Starting Quran ingestion...");

  // 1. Fetch Quran Data (Simple Arabic + English)
  const response = await fetch('https://api.alquran.cloud/v1/quran/en.asad');
  const data: any = await response.json();

  if (!data.data || !data.data.surahs) {
    throw new Error("Failed to fetch Quran data");
  }

  const surahs = data.data.surahs;
  const BATCH_SIZE = 50;
  let vectorBatch: { id: string; text: string; metadata: any }[] = [];
  let d1Batch: any[] = [];

  const flush = async () => {
    if (vectorBatch.length === 0) return;

    try {
      // A. Save to D1 in batch if supported, else sequential
      if (db.batch) {
        await db.batch(d1Batch);
      } else {
        for (const stmt of d1Batch) {
          await stmt.run();
        }
      }

      // B. Save to Vectorize in batch
      await vectorEngine.upsertAyahs(vectorBatch);

      // Reset batches
      vectorBatch = [];
      d1Batch = [];
    } catch (err) {
      console.error("❌ Batch flush failed:", err);
      // We could throw here or continue depending on desired robustness
    }
  };

  for (const surah of surahs) {
    console.log(`Processing Surah ${surah.number}: ${surah.name}`);
    
    for (const ayah of surah.ayahs) {
      const globalId = `${surah.number}:${ayah.numberInSurah}`;
      
      // Prepare for D1 batch
      d1Batch.push(
        db.prepare(`
          INSERT OR REPLACE INTO ayahs (surah_id, ayah_id, text, text_simple, translation_en)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          surah.number,
          ayah.numberInSurah,
          ayah.text,
          ayah.text,
          ayah.text
        )
      );

      // Prepare for Vectorize batch
      vectorBatch.push({
        id: globalId,
        text: ayah.text,
        metadata: {
          surah: surah.number,
          ayah: ayah.numberInSurah,
          reference: globalId
        }
      });

      if (vectorBatch.length >= BATCH_SIZE) {
        await flush();
      }
    }
  }

  // Final flush for remaining items
  await flush();

  console.log("Quran ingestion complete! ✨");
}

export async function fetchSurah(surahNumber: number) {
  // Fetch Arabic and English
  const arabicRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}`);
  const arabicData: any = await arabicRes.json();
  
  const englishRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/en.asad`);
  const englishData: any = await englishRes.json();

  if (!arabicData.data || !englishData.data) {
    throw new Error(`Failed to fetch Surah ${surahNumber}`);
  }

  return [arabicData.data, englishData.data];
}
