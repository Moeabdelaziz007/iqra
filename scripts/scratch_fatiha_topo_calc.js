
const fatiha = [
  "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ",
  "ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَـٰلَمِینَ",
  "ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ",
  "مَـٰلِكِ یَوۡمِ ٱلدِّینِ",
  "إِیَّاكَ نَعۡبُدُ وَإِیَّاكَ نَسۡتَعِینُ",
  "ٱهۡدِنَا ٱلصِّرَٰطَ ٱلۡمُسۡتَقِیمَ",
  "صِرَٰطَ ٱلَّذِینَ أَنۡعَمۡتَ عَلَیۡهِمۡ غَیۡرِ ٱلۡمَغۡضُوبِ عَلَیۡهِمۡ وَلَا ٱلضَّاۤلِّینَ"
];

function getCharVector(text) {
  const vec = {};
  const cleanText = text.replace(/[\s\p{P}]/gu, "");
  for (const char of cleanText) {
    vec[char] = (vec[char] || 0) + 1;
  }
  return vec;
}

function cosineSimilarity(v1, v2) {
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

function calculateEntropy(text) {
  const freqs = getCharVector(text);
  const total = Object.values(freqs).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return -Object.values(freqs).reduce((acc, f) => {
    const p = f / total;
    return acc + p * Math.log2(p);
  }, 0);
}

function computeTopology(verses) {
  const V = verses.length;
  const edges = [];
  
  for (let i = 0; i < V; i++) {
    for (let j = i + 1; j < V; j++) {
      const sim = cosineSimilarity(getCharVector(verses[i]), getCharVector(verses[j]));
      if (sim > 0.6) {
        edges.push([i, j]);
      }
    }
  }

  const parent = Array.from({ length: V }, (_, i) => i);
  function find(i) {
    if (parent[i] === i) return i;
    return parent[i] = find(parent[i]);
  }
  function union(i, j) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) parent[rootI] = rootJ;
  }
  
  edges.forEach(([i, j]) => union(i, j));
  const h0 = new Set(Array.from({ length: V }, (_, i) => find(i))).size;
  const h1 = Math.max(0, edges.length - V + h0);

  return { h0, h1, edges: edges.length };
}

console.log("--- START PROOF DATA ---");

const matrix = fatiha.map((v1) => fatiha.map((v2) => cosineSimilarity(getCharVector(v1), getCharVector(v2))));
console.log("MATRIX:", JSON.stringify(matrix));

const entropies = fatiha.map(v => calculateEntropy(v));
console.log("ENTROPIES:", JSON.stringify(entropies));

const topo = computeTopology(fatiha);
console.log("TOPOLOGY:", JSON.stringify(topo));

const totalText = fatiha.join("");
const globalFreqs = getCharVector(totalText);
const attentionWeights = fatiha.map(v => {
  const vFreqs = getCharVector(v);
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
