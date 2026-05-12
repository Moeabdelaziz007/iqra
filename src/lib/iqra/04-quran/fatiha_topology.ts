/**
 * Fatiha Topology Module
 * Implements topological analysis for Quranic patterns, specifically focusing on Surah Al-Fatiha.
 * Used for "Pulse 3-6-9" state checks and memory resonance analysis.
 */

export interface TopologyResult {
  h0: number; // Connected components
  h1: number; // First Betti number (loops)
  edges: number;
}

export type CharVector = Record<string, number>;

/**
 * Generates a character frequency vector from text.
 */
export function getCharVector(text: string): CharVector {
  const vec: CharVector = {};
  // Clean text: remove spaces and punctuation
  const cleanText = text.replace(/[\s\p{P}]/gu, "");
  for (const char of cleanText) {
    vec[char] = (vec[char] || 0) + 1;
  }
  return vec;
}

/**
 * Calculates cosine similarity between two character vectors.
 */
export function cosineSimilarity(v1: CharVector, v2: CharVector): number {
  const keys = new Set([...Object.keys(v1), ...Object.keys(v2)]);
  let dot = 0;
  let mag1 = 0;
  let mag2 = 0;

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

/**
 * Calculates Shannon entropy of a text based on character frequency.
 */
export function calculateEntropy(text: string): number {
  const freqs = getCharVector(text);
  const total = Object.values(freqs).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;

  return -Object.values(freqs).reduce((acc, f) => {
    const p = f / total;
    return acc + p * Math.log2(p);
  }, 0);
}

/**
 * Computes the topology (Betti numbers) of a set of verses based on similarity thresholds.
 */
export function computeTopology(verses: string[], threshold = 0.6): TopologyResult {
  const V = verses.length;
  const edges: [number, number][] = [];

  for (let i = 0; i < V; i++) {
    const vecI = getCharVector(verses[i]);
    for (let j = i + 1; j < V; j++) {
      const sim = cosineSimilarity(vecI, getCharVector(verses[j]));
      if (sim > threshold) {
        edges.push([i, j]);
      }
    }
  }

  // Disjoint Set Union (DSU) to find connected components (H0)
  const parent = Array.from({ length: V }, (_, i) => i);
  function find(i: number): number {
    if (parent[i] === i) return i;
    return parent[i] = find(parent[parent[i]]); // Path halving
  }

  function union(i: number, j: number): void {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) parent[rootI] = rootJ;
  }

  edges.forEach(([i, j]) => union(i, j));

  const h0 = new Set(Array.from({ length: V }, (_, i) => find(i))).size;
  // Euler characteristic formula: V - E + H1 = H0 => H1 = H0 - V + E
  const h1 = Math.max(0, edges.length - V + h0);

  return { h0, h1, edges: edges.length };
}

/**
 * Normalizes attention weights across verses based on global frequency resonance.
 */
export function calculateAttention(verses: string[]): number[] {
  const totalText = verses.join("");
  const globalFreqs = getCharVector(totalText);

  const attentionWeights = verses.map(v => {
    const vFreqs = getCharVector(v);
    let weight = 0;
    for (const char in vFreqs) {
      weight += vFreqs[char] * (globalFreqs[char] || 0);
    }
    return weight;
  });

  const sumWeights = attentionWeights.reduce((a, b) => a + b, 0);
  return sumWeights === 0 ? attentionWeights.map(() => 0) : attentionWeights.map(w => w / sumWeights);
}
