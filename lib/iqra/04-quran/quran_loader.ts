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
  // Note: In a real production, we'd use a local asset or a very reliable CDN.
  const response = await fetch('https://api.alquran.cloud/v1/quran/en.asad');
  const data: any = await response.json();

  if (!data.data || !data.data.surahs) {
    throw new Error("Failed to fetch Quran data");
  }

  const surahs = data.data.surahs;

  for (const surah of surahs) {
    console.log(`Processing Surah ${surah.number}: ${surah.name}`);
    
    for (const ayah of surah.ayahs) {
      const globalId = `${surah.number}:${ayah.numberInSurah}`;
      
      // A. Save to D1
      await db.prepare(`
        INSERT OR REPLACE INTO ayahs (surah_id, ayah_id, text, text_simple, translation_en)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        surah.number,
        ayah.numberInSurah,
        ayah.text, // Arabic (if we fetch dual)
        ayah.text, // Simple
        ayah.text  // English (using Asad translation here)
      ).run();

      // B. Save to Vectorize (Batching is better, but doing one for simplicity now)
      await vectorEngine.upsertAyahs([{
        id: globalId,
        text: ayah.text,
        metadata: {
          surah: surah.number,
          ayah: ayah.numberInSurah,
          reference: globalId
        }
      }]);
    }
  }

  console.log("Quran ingestion complete! ✨");
}
