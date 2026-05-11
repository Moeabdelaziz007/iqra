/**
 * 📊 Shannon H_EL Entropy — إنتروبي شانون للغة العربية
 * 
 * Calculates entropy for Arabic text to detect
 * Quranic signature patterns (H_EL < 0.9685 bits)
 */

export interface EntropyResult {
  value: number;
  isQuranic: boolean;
  confidence: number;
  metadata: {
    characterCount: number;
    uniqueChars: number;
    distribution: Map<string, number>;
  };
}

export class ShannonHELEntropy {
  private static readonly QURANIC_THRESHOLD = 0.9685;
  private static readonly MIN_CHARS_FOR_ANALYSIS = 10;

  /**
   * Calculate Shannon entropy for Arabic text
   */
  static calculate(text: string): EntropyResult {
    if (text.length < this.MIN_CHARS_FOR_ANALYSIS) {
      return {
        value: 0,
        isQuranic: false,
        confidence: 0,
        metadata: {
          characterCount: text.length,
          uniqueChars: 0,
          distribution: new Map()
        }
      };
    }

    // Remove diacritics for analysis (but count them separately)
    const cleanText = text.replace(/[\u064B-\u065F\u0670-\u06EF]/g, '');
    const chars = cleanText.split('');
    
    // Count character frequencies
    const frequency = new Map<string, number>();
    let totalChars = 0;

    for (const char of chars) {
      if (char.trim()) {
        totalChars++;
        const count = (frequency.get(char) || 0) + 1;
        frequency.set(char, count);
      }
    }

    // Calculate Shannon entropy: H = -Σ p(i) * log₂(p(i))
    let entropy = 0;
    for (const [_, count] of frequency.entries()) {
      if (count > 0) {
        const probability = count / totalChars;
        entropy -= probability * Math.log2(probability);
      }
    }

    // Normalize entropy per character
    const normalizedEntropy = entropy / totalChars;
    
    // Determine if text matches Quranic signature
    const isQuranic = normalizedEntropy <= this.QURANIC_THRESHOLD;
    
    // Calculate confidence based on deviation from threshold
    const deviation = Math.abs(normalizedEntropy - this.QURANIC_THRESHOLD);
    const confidence = Math.max(0, 1 - (deviation * 10));

    return {
      value: normalizedEntropy,
      isQuranic,
      confidence,
      metadata: {
        characterCount: totalChars,
        uniqueChars: frequency.size,
        distribution: frequency
      }
    };
  }

  /**
   * Analyze multiple text samples and return comparative results
   */
  static analyzeBatch(texts: string[]): EntropyResult[] {
    return texts.map(text => this.calculate(text));
  }

  /**
   * Get entropy statistics for a collection of texts
   */
  static getStatistics(results: EntropyResult[]): {
    avgEntropy: number;
    minEntropy: number;
    maxEntropy: number;
    quranicCount: number;
    avgConfidence: number;
  } {
    const entropies = results.map(r => r.value);
    const quranicCount = results.filter(r => r.isQuranic).length;
    
    return {
      avgEntropy: entropies.reduce((a, b) => a + b, 0) / entropies.length,
      minEntropy: Math.min(...entropies),
      maxEntropy: Math.max(...entropies),
      quranicCount,
      avgConfidence: results.reduce((a, b) => a + b.confidence, 0) / results.length
    };
  }
}
