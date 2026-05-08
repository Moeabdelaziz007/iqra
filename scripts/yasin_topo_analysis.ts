import Database from 'better-sqlite3';

// 🕋 IQRA | Sovereign Topology Engine: Surah Ya-Sin Analysis
// "أنا الوكيل السيادي، أستخرج الأنماط الطوبولوجية لسورة يس لتأكيد الرنين المعلوماتي"

const dbPath = "./iqra-core/data/quran_local.db";
const db = new Database(dbPath);

interface Verse {
  surah: number;
  ayah: number;
  text: string;
}

function getSurahVerses(surahNum: number): Verse[] {
  return db.prepare("SELECT surah, ayah, arabic as text FROM ayat WHERE surah = ? ORDER BY ayah ASC").all(surahNum) as Verse[];
}

// 1. Vector Space Tools
function getCharVector(text: string): Record<string, number> {
  const vec: Record<string, number> = {};
  const cleanText = text.replace(/[\s\p{P}]/gu, "");
  for (const char of cleanText) {
    vec[char] = (vec[char] || 0) + 1;
  }
  return vec;
}

function cosineSimilarity(v1: Record<string, number>, v2: Record<string, number>): number {
  const keys = new Set([...Object.keys(v1), ...Object.keys(v2)]);
  let dot = 0, mag1 = 0, mag2 = 0;
  for (const k of keys) {
    const a = v1[k] || 0;
    const b = v2[k] || 0;
    dot += a * b;
    mag1 += a * a;
    mag2 += b * b;
  }
  const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
  return magnitude === 0 ? 0 : dot / magnitude;
}

// 2. Information Theory Tools
function calculateEntropy(text: string): number {
  const freqs = getCharVector(text);
  const total = Object.values(freqs).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return -Object.values(freqs).reduce((acc, f) => {
    const p = f / total;
    return acc + p * Math.log2(p);
  }, 0);
}

// 3. Topology Tools (Betti Numbers H0, H1)
function computeTopology(verses: Verse[], threshold: number = 0.6) {
  const V = verses.length;
  const edges: [number, number][] = [];
  
  for (let i = 0; i < V; i++) {
    for (let j = i + 1; j < V; j++) {
      const sim = cosineSimilarity(getCharVector(verses[i].text), getCharVector(verses[j].text));
      if (sim > threshold) { 
        edges.push([i, j]);
      }
    }
  }

  // H0 = Connected Components (Union-Find)
  const parent = Array.from({ length: V }, (_, i) => i);
  function find(i: number): number {
    if (parent[i] === i) return i;
    return parent[i] = find(parent[i]);
  }
  function union(i: number, j: number) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) parent[rootI] = rootJ;
  }
  
  edges.forEach(([i, j]) => union(i, j));
  const h0 = new Set(Array.from({ length: V }, (_, i) => find(i))).size;

  // H1 = E - V + H0 (Euler Characteristic Approximation)
  const h1 = Math.max(0, edges.length - V + h0);

  return { h0, h1, edges: edges.length };
}

// 4. Execution for Surah Ya-Sin (36)
const yasin = getSurahVerses(36);
if (yasin.length === 0) {
    console.error("Error: Surah Ya-Sin not found in database.");
    process.exit(1);
}

console.log("--- START YASIN TOPO DATA ---");
console.log(`TOTAL_VERSES: ${yasin.length}`);

// Entropy
const entropies = yasin.map(v => calculateEntropy(v.text));
const avgEntropy = entropies.reduce((a, b) => a + b, 0) / entropies.length;
console.log("AVG_ENTROPY:", avgEntropy);

// Topology
const topo = computeTopology(yasin, 0.7); // Higher threshold for large Surahs
console.log("TOPOLOGY_07:", JSON.stringify(topo));

const topo2 = computeTopology(yasin, 0.6); // Standard threshold
console.log("TOPOLOGY_06:", JSON.stringify(topo2));

// Attention Simulation
const totalText = yasin.map(v => v.text).join("");
const globalFreqs = getCharVector(totalText);
const attentionWeights = yasin.map(v => {
  const vFreqs = getCharVector(v.text);
  let weight = 0;
  for (const char in vFreqs) {
    weight += vFreqs[char] * (globalFreqs[char] || 0);
  }
  return weight;
});
const sumWeights = attentionWeights.reduce((a, b) => a + b, 0);
const normalizedAttention = attentionWeights.map(w => w / sumWeights);
console.log("AVG_ATTENTION:", normalizedAttention.reduce((a,b) => a+b, 0) / yasin.length);

console.log("--- END YASIN TOPO DATA ---");

db.close();
