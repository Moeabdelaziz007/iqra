/**
 * Numerical Validator — الميزان العددي
 * 
 * "وَأَحْصَىٰ كُلَّ شَيْءٍ عَدَدًا" — القرآن 72:28
 */

export interface ResonanceResult {
  score: number;
  patterns: string[];
  isResonant: boolean;
}

export class NumericalValidator {
  /**
   * Validates Quranic numerical patterns and calculates resonance score.
   */
  static validate(input: string): ResonanceResult {
    const patterns: string[] = [];
    let score = 0;

    // 1. Length-based patterns
    const cleanInput = input.replace(/\s+/g, ' ').trim();
    const charCount = cleanInput.replace(/\s/g, '').length;
    const wordCount = cleanInput.split(' ').length;

    if (charCount > 0) {
      if (charCount % 7 === 0) {
        patterns.push(`Symmetry_7_Chars (Count: ${charCount})`);
        score += 0.3;
      }
      if (charCount % 14 === 0) {
        patterns.push(`Symmetry_14_Chars (Count: ${charCount})`);
        score += 0.2;
      }
      if (charCount % 19 === 0) {
        patterns.push(`Symmetry_19_Chars (Count: ${charCount})`);
        score += 0.4;
      }
    }

    if (wordCount > 0) {
      if (wordCount % 7 === 0) {
        patterns.push(`Symmetry_7_Words (Count: ${wordCount})`);
        score += 0.2;
      }
      if (wordCount % 19 === 0) {
        patterns.push(`Symmetry_19_Words (Count: ${wordCount})`);
        score += 0.3;
      }
    }

    // 2. Sacred Terms presence (basic check)
    const sacredTerms = ['الله', 'قرآن', 'حق', 'نور', 'أرض', 'سماوات'];
    sacredTerms.forEach(term => {
      if (cleanInput.includes(term)) {
        patterns.push(`Sacred_Term_Intersection_${term}`);
        score += 0.15;
      }
    });

    return {
      score: Math.min(score, 1.0),
      patterns,
      isResonant: score > 0.5
    };
  }
}
