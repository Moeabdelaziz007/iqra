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
    const cleanInput = input.trim();
    const charCount = cleanInput.length;
    const wordCount = cleanInput.split(/\s+/).length;

    if (charCount > 0) {
      if (charCount % 7 === 0) {
        patterns.push('Symmetry_7_Chars');
        score += 0.3;
      }
      if (charCount % 19 === 0) {
        patterns.push('Symmetry_19_Chars');
        score += 0.4;
      }
    }

    if (wordCount > 0) {
      if (wordCount % 7 === 0) {
        patterns.push('Symmetry_7_Words');
        score += 0.2;
      }
    }

    // 2. Sacred Terms presence (basic check)
    const sacredTerms = ['الله', 'قرآن', 'حق', 'نور'];
    sacredTerms.forEach(term => {
      if (cleanInput.includes(term)) {
        patterns.push(`Term_${term}`);
        score += 0.1;
      }
    });

    return {
      score: Math.min(score, 1.0),
      patterns,
      isResonant: score > 0.5
    };
  }
}
