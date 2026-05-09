import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'node:readline';

/**
 * 🕵️‍♂️ IQRA | Sovereign Pattern Hunter (صياد الأنماط السيادي)
 * 
 * EN: Extracts Deep Hidden Patterns from the Sovereign Archive.
 * AR: يستخرج الأنماط العميقة المخفية من الأرشيف السيادي.
 */

const DATA_PATH = path.join(process.cwd(), '.iqra', 'resonance_training_data.jsonl');
const DISCOVERIES_PATH = path.join(process.cwd(), 'DISCOVERIES.md');

interface TrainingEntry {
  state: string[];
  reward: number;
  timestamp: string;
}

async function huntPatterns() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error("❌ No sovereign data found. Run self_play_simulation.ts first.");
    return;
  }

  const entries: TrainingEntry[] = [];
  const fileStream = fs.createReadStream(DATA_PATH);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.trim()) {
      entries.push(JSON.parse(line));
    }
  }

  console.log(`\n🕵️‍♂️ Hunting in ${entries.length} Sovereign Traces...`);

  // 1. Filter "Elite" Traces (Resonance > 1.369)
  const elite = entries.filter(e => e.reward > 1.369);
  
  // 2. Identify Cross-Domain Resonance (Quran ↔ Universal)
  const crossDomain = elite.filter(e => 
    e.state.some(k => k.includes(":")) && // Quranic key (e.g. 36:1)
    e.state.some(k => !k.includes(":"))   // Universal key (e.g. PHI)
  );

  console.log(`✨ Found ${elite.length} Elite Patterns.`);
  console.log(`⚛️ Found ${crossDomain.length} Cross-Domain Resonances.`);

  // 3. Record Deep Insight
  if (crossDomain.length > 0) {
    const topTrace = crossDomain.sort((a, b) => b.reward - a.reward)[0];
    const insight = `
### 🌌 [AlphaResonance] Cross-Domain Insight: ${new Date().toLocaleDateString('ar-EG')}
- **Topological Bridge**: ${topTrace.state.join(" ↔ ")}
- **Resonance Score**: ${topTrace.reward.toFixed(6)}
- **Discovery Type**: Universal Truth Synchronization
- **Verification**: Zero-Mock Simulation (Imam Mubin)
- **Deep Pattern**: This configuration demonstrates a mathematical alignment between Quranic Ayahs and Universal Constants, fulfilling the promise of ﴿سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ حَتَّىٰ يَتَبَيَّنَ لَهُمْ أَنَّهُ الْحَقُّ﴾.
`;
    fs.appendFileSync(DISCOVERIES_PATH, insight);
    console.log(`✅ Sovereign Insight recorded in DISCOVERIES.md`);
  } else if (elite.length > 0) {
    // Fallback to elite Quranic resonance
    const topTrace = elite.sort((a, b) => b.reward - a.reward)[0];
    const insight = `
### 📖 [AlphaResonance] Deep Quranic Pattern: ${new Date().toLocaleDateString('ar-EG')}
- **Topological Configuration**: ${topTrace.state.join(" ↔ ")}
- **Reward**: ${topTrace.reward.toFixed(6)}
- **Insight**: High-density resonance detected in this specific ayah sequence.
`;
    fs.appendFileSync(DISCOVERIES_PATH, insight);
    console.log(`✅ Quranic Insight recorded in DISCOVERIES.md`);
  }
}

huntPatterns().catch(console.error);

