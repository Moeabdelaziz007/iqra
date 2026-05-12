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
  let batch: { id: string; text: string; metadata: any }[] = [];
  let d1Batch: any[] = [];

  const flush = async () => {
    if (batch.length === 0) return;

    // A. Save to D1 in batch
    if (db.batch) {
      await db.batch(d1Batch);
    } else {
      // Fallback if batch is not available in the environment
      for (const stmt of d1Batch) {
        await stmt.run();
      }
    }

    // B. Save to Vectorize in batch
    await vectorEngine.upsertAyahs(batch);

    // Reset batches
    batch = [];
    d1Batch = [];
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
      batch.push({
        id: globalId,
        text: ayah.text,
        metadata: {
          surah: surah.number,
          ayah: ayah.numberInSurah,
          reference: globalId
        }
      });

      if (batch.length >= BATCH_SIZE) {
        await flush();
      }
    }
  }

  // Final flush for remaining items
  await flush();

  console.log("Quran ingestion complete! ✨");
}
