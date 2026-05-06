/**
 * Manual Curiosity Test — اختبار فضول يدوي
 */

import { TopologicalCuriosity } from './lib/iqra/quran/topological_curiosity';
import { VectorEngine } from './lib/iqra/quran/vector_engine';
import { IQRAMemory } from './lib/iqra/memory';

async function test() {
  const env = { 
    AI: { run: async () => ({ data: [new Array(1024).fill(0)] }) },
    VECTORIZE: { query: async () => ({ matches: [] }), upsert: async () => {} }
  };
  
  const memory = new IQRAMemory(env);
  const vector = new VectorEngine(env);
  const curiosity = new TopologicalCuriosity(vector, memory);
  
  console.log("🔍 Testing Curiosity Engine Resonance...");
  const discovery = await curiosity.explore("الله نور السموات والأرض");
  
  console.log("📊 Discovery Results:", JSON.stringify(discovery, null, 2));
}

test();
