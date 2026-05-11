/**
 * Data Factory — مصنع البيانات
 * 
 * Injects sample ayahs into the Vector Engine for performance stress testing.
 */

import { VectorEngine } from '#quran/vector_engine';

export async function runDataFactory(env: any) {
  const engine = new VectorEngine(env);
  
  const sampleAyahs = [
    { id: '1:1', text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ', metadata: { surah: 1, ayah: 1 } },
    { id: '1:2', text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', metadata: { surah: 1, ayah: 2 } },
    { id: '2:255', text: 'اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ', metadata: { surah: 2, ayah: 255 } },
    { id: '112:1', text: 'قُلْ هُوَ اللَّهُ أَحَدٌ', metadata: { surah: 112, ayah: 1 } },
    { id: '96:1', text: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ', metadata: { surah: 96, ayah: 1 } }
  ];

  console.log("🏭 Starting Data Factory — Injecting Ayahs...");
  const start = Date.now();
  
  await engine.upsertAyahs(sampleAyahs);
  
  const duration = Date.now() - start;
  console.log(`✅ Injection complete in ${duration}ms`);
  
  return { success: true, duration, count: sampleAyahs.length };
}
