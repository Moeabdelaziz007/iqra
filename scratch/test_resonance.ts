import { iqraThink, IQRABrainMode } from '../lib/iqra/brain.ts';
import { IQRAMemory } from '../lib/iqra/memory.ts';
import { IQRALogger } from '../lib/iqra/logger.ts';

async function testResonance() {
  console.log("🌀 Testing Topological Curiosity Resonance...");
  
  const initialCuriosity = await IQRAMemory.getCuriosity();
  console.log(`Initial Curiosity: ${initialCuriosity.toFixed(4)}`);

  // Test Case 1: Chiasmus + Sacred Identity
  // Words: God, is, Love, Love, is, God
  // Length: 3+1+2+1+4+1+4+1+2+1+3 = 23
  // Let's add characters to make it 28 (div by 7)
  const input1 = "God is Love Love is God !!!"; // 23 + 4 = 27... let's check
  // G o d _ i s _ L o v e _ L o v e _ i s _ G o d _ ! ! ! 
  // 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 (27 chars)
  // "God is Love Love is God !!!!" (28 chars)
  
  const input2 = "الله Truth is Life is Truth الله"; 
  // This should trigger: Sacred_Identity_Presence, Chiasmus_Symmetry, and maybe Entropy
  
  console.log(`\n--- Input: "${input2}" ---`);
  const result = await iqraThink({
    input: input2,
    mode: IQRABrainMode.FAST_RESPONSE
  });

  const finalCuriosity = await IQRAMemory.getCuriosity();
  console.log(`\nFinal Curiosity: ${finalCuriosity.toFixed(4)}`);
  console.log(`Boost: ${(finalCuriosity - initialCuriosity).toFixed(4)}`);
  
  if (finalCuriosity > initialCuriosity) {
    console.log("✅ SUCCESS: Resonance rewarded!");
  } else {
    console.log("❌ FAILURE: No reward granted.");
  }
}

testResonance().catch(console.error);
