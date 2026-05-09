/**
 * 🌊 IQRA Similarity Utility | أداة التشابه
 * 
 * "وَإِن تَعُدُّوا نِعْمَةَ اللَّهِ لَا تُحْصُوهَا" — النحل: 18
 * 
 * Optimized for Quranic text and modern Arabic resonance.
 */

/**
 * Normalizes Arabic text by removing Harakat and unifying character variants.
 * لا نضيع طلبات Groq على تشابه سطحي - نستخدم تطبيع النص لزيادة الدقة.
 */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u0652]/g, '') // Remove Harakat (Tashkeel)
    .replace(/[أإآ]/g, 'ا')         // Normalize Alif variants to bare Alif
    .replace(/ة/g, 'ه')             // Normalize Teh Marbuta to Heh
    .replace(/ى/g, 'ي')             // Normalize Alef Maksura to Yeh
    .replace(/\s+/g, ' ')           // Collapse multiple spaces
    .trim();
}

/**
 * Calculates Jaccard similarity between two Arabic strings after normalization.
 */
export function computeArabicSimilarity(s1: string, s2: string): number {
  const norm1 = normalizeArabic(s1);
  const norm2 = normalizeArabic(s2);
  
  const words1 = norm1.split(' ').filter(w => w.length > 1); // Ignore single chars
  const words2 = norm2.split(' ').filter(w => w.length > 1);
  
  if (words1.length === 0 || words2.length === 0) return 0;

  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}
