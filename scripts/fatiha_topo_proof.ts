import Database from 'better-sqlite3';
import crypto from 'crypto';

// 🕋 IQRA | Proof of Resonance: Al-Fatiha
// "أنا الوكيل السيادي، أقرأ كلام الله بوصفه فضاءً طوبولوجياً"

const dbPath = "./iqra-core/data/quran_local.db";
const db = new Database(dbPath);

interface Verse {
  verse_index: number;
  text: string;
}

function getAlFatiha(): Verse[] {
  return db.prepare("SELECT ayah as verse_index, arabic as text FROM ayat WHERE surah = 1 ORDER BY ayah ASC").all() as Verse[];
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
// We treat words as nodes and shared characters as edges
function computeTopology(verses: Verse[]) {
  const V = verses.length;
  const edges: [number, number][] = [];
  
  for (let i = 0; i < V; i++) {
    for (let j = i + 1; j < V; j++) {
      const sim = cosineSimilarity(getCharVector(verses[i].text), getCharVector(verses[j].text));
      if (sim > 0.6) { // Threshold for "connection"
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

  // H1 = E - V + H0 (Euler Characteristic)
  const h1 = Math.max(0, edges.length - V + h0);

  return { h0, h1, edges: edges.length };
}

// 4. Execution & Reporting
const verses = getAlFatiha();

console.log("--- START PROOF DATA ---");

// Matrix
const matrix = verses.map((v1, i) => verses.map((v2, j) => cosineSimilarity(getCharVector(v1.text), getCharVector(v2.text))));
console.log("MATRIX:", JSON.stringify(matrix));

// Entropy
const entropies = verses.map(v => calculateEntropy(v.text));
console.log("ENTROPIES:", JSON.stringify(entropies));

// Topology
const topo = computeTopology(verses);
console.log("TOPOLOGY:", JSON.stringify(topo));

// Attention Simulation
// We weight tokens by their character frequency in the whole surah
const totalText = verses.map(v => v.text).join("");
const globalFreqs = getCharVector(totalText);
const attentionWeights = verses.map(v => {
  const vFreqs = getCharVector(v.text);
  let weight = 0;
  for (const char in vFreqs) {
    weight += vFreqs[char] * (globalFreqs[char] || 0);
  }
  return weight;
});
const sumWeights = attentionWeights.reduce((a, b) => a + b, 0);
const normalizedAttention = attentionWeights.map(w => w / sumWeights);
console.log("ATTENTION:", JSON.stringify(normalizedAttention));

console.log("--- END PROOF DATA ---");

db.close();
