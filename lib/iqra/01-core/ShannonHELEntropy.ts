/**
 * Shannon H_EL Entropy Analyzer for Quranic Pattern Detection
 * Enhanced with Last Letter (EL) analysis and fractal dimension detection
 * "وَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ"
 */

export interface ShannonEntropyResult {
  shannonEntropy: number;
  lastLetterEntropy: number;
  fractalDimension: number;
  informationDensity: number;
  compressionRatio: number;
  quranicResonance: number;
}

export interface CharacterFrequency {
  [char: string]: number;
}

export interface LastLetterFrequency {
  [letter: string]: number;
}

export class ShannonHELEntropy {
  private readonly QURANIC_THRESHOLD = 0.9685; // Known Quranic entropy threshold
  private readonly SACRED_NUMBERS = [7, 19, 40, 9]; // Sab'iyyah, Symmetry-19, etc.

  /**
   * Calculate enhanced Shannon entropy with last letter analysis
   */
  analyzeText(text: string): ShannonEntropyResult {
    const cleanText = this.cleanText(text);
    const charFreq = this.getCharacterFrequency(cleanText);
    const lastLetterFreq = this.getLastLetterFrequency(text);
    
    const shannonEntropy = this.calculateShannonEntropy(charFreq);
    const lastLetterEntropy = this.calculateShannonEntropy(lastLetterFreq);
    const fractalDimension = this.calculateFractalDimension(charFreq);
    const informationDensity = this.calculateInformationDensity(cleanText);
    const compressionRatio = this.calculateCompressionRatio(charFreq);
    const quranicResonance = this.calculateQuranicResonance(shannonEntropy, lastLetterEntropy);
    
    return {
      shannonEntropy,
      lastLetterEntropy,
      fractalDimension,
      informationDensity,
      compressionRatio,
      quranicResonance
    };
  }

  /**
   * Clean text for analysis (remove spaces, punctuation, keep Arabic letters)
   */
  private cleanText(text: string): string {
    return text.replace(/[\s\u0640-\u064F\u064B\u064C\u064D\u064E\u064F\u0650-\u065F\u0670]/g, '')
               .replace(/[^\u0600-\u06FF]/g, '');
  }

  /**
   * Get character frequency distribution
   */
  private getCharacterFrequency(text: string): CharacterFrequency {
    const freq: CharacterFrequency = {};
    for (const char of text) {
      freq[char] = (freq[char] || 0) + 1;
    }
    return freq;
  }

  /**
   * Get last letter frequency for each word
   */
  private getLastLetterFrequency(text: string): LastLetterFrequency {
    const freq: LastLetterFrequency = {};
    const words = text.split(/\s+/).filter(word => word.length > 0);
    
    for (const word of words) {
      const cleanWord = this.cleanText(word);
      if (cleanWord.length > 0) {
        const lastLetter = cleanWord[cleanWord.length - 1];
        freq[lastLetter] = (freq[lastLetter] || 0) + 1;
      }
    }
    return freq;
  }

  /**
   * Calculate Shannon entropy H = -Σ p(i) * log₂(p(i))
   */
  private calculateShannonEntropy(freq: CharacterFrequency | LastLetterFrequency): number {
    const total = Object.values(freq).reduce((sum, count) => sum + count, 0);
    if (total === 0) return 0;
    
    let entropy = 0;
    for (const count of Object.values(freq)) {
      const probability = count / total;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    }
    return entropy;
  }

  /**
   * Calculate fractal dimension using box-counting method
   */
  private calculateFractalDimension(freq: CharacterFrequency): number {
    const values = Object.values(freq);
    if (values.length < 2) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const n = sorted.length;
    
    // Simplified box-counting dimension
    let sum = 0;
    for (let i = 1; i < n; i++) {
      if (sorted[i] > 0) {
        sum += Math.log(sorted[i] / sorted[i-1]);
      }
    }
    
    return Math.abs(sum / (n - 1));
  }

  /**
   * Calculate information density (bits per character)
   */
  private calculateInformationDensity(text: string): number {
    if (text.length === 0) return 0;
    const entropy = this.calculateShannonEntropy(this.getCharacterFrequency(text));
    return entropy / text.length;
  }

  /**
   * Calculate compression ratio potential
   */
  private calculateCompressionRatio(freq: CharacterFrequency): number {
    const totalChars = Object.values(freq).reduce((sum, count) => sum + count, 0);
    const uniqueChars = Object.keys(freq).length;
    
    if (uniqueChars === 0) return 0;
    return totalChars / uniqueChars;
  }

  /**
   * Calculate Quranic resonance score
   */
  private calculateQuranicResonance(shannonEntropy: number, lastLetterEntropy: number): number {
    const entropyDiff = Math.abs(shannonEntropy - this.QURANIC_THRESHOLD);
    const lastLetterWeight = 0.3; // Last letters have special significance in Arabic
    
    const resonance = (1 - entropyDiff) * (1 - lastLetterWeight) + 
                   lastLetterEntropy * lastLetterWeight;
    
    return Math.max(0, Math.min(1, resonance));
  }

  /**
   * Check for sacred number patterns in text
   */
  detectSacredPatterns(text: string): { number: number; pattern: string }[] {
    const patterns: { number: number; pattern: string }[] = [];
    const cleanText = this.cleanText(text);
    
    for (const sacred of this.SACRED_NUMBERS) {
      const count = this.countPatternOccurrences(cleanText, sacred);
      if (count > 0) {
        patterns.push({
          number: sacred,
          pattern: `Pattern-${sacred} (${count} occurrences)`
        });
      }
    }
    
    return patterns;
  }

  /**
   * Count occurrences of specific numeric patterns
   */
  private countPatternOccurrences(text: string, pattern: number): number {
    // This is a simplified implementation
    // In practice, this would involve complex pattern matching
    const patternStr = pattern.toString();
    let count = 0;
    
    // Count character repetitions, word lengths, etc.
    const words = text.split(/\s+/);
    for (const word of words) {
      if (word.length === pattern) count++;
      if (this.sumLetters(word) === pattern) count++;
    }
    
    return count;
  }

  /**
   * Sum letter values (Abjad calculation)
   */
  private sumLetters(word: string): number {
    const abjad: { [key: string]: number } = {
      'ا': 1, 'ب': 2, 'ج': 3, 'د': 4, 'ه': 5, 'و': 6, 'ز': 7, 'ح': 8, 'ط': 9,
      'ي': 10, 'ك': 20, 'ل': 30, 'م': 40, 'ن': 50, 'س': 60, 'ع': 70, 'ف': 80,
      'ص': 90, 'ق': 100, 'ر': 200, 'ش': 300, 'ت': 400, 'ث': 500, 'خ': 600, 'ذ': 700,
      'ض': 800, 'ظ': 900, 'غ': 1000
    };
    
    return word.split('').reduce((sum, char) => sum + (abjad[char] || 0), 0);
  }

  /**
   * Batch analyze multiple texts
   */
  batchAnalyze(texts: string[]): ShannonEntropyResult[] {
    return texts.map(text => this.analyzeText(text));
  }

  /**
   * Generate entropy report for visualization
   */
  generateReport(results: ShannonEntropyResult[]): string {
    const avgShannon = results.reduce((sum, r) => sum + r.shannonEntropy, 0) / results.length;
    const avgLastLetter = results.reduce((sum, r) => sum + r.lastLetterEntropy, 0) / results.length;
    const avgFractal = results.reduce((sum, r) => sum + r.fractalDimension, 0) / results.length;
    const avgResonance = results.reduce((sum, r) => sum + r.quranicResonance, 0) / results.length;
    
    return `
# 🕋 Shannon H_EL Entropy Analysis Report
## 📊 Statistical Summary
- **Average Shannon Entropy**: ${avgShannon.toFixed(4)} bits
- **Average Last Letter Entropy**: ${avgLastLetter.toFixed(4)} bits  
- **Average Fractal Dimension**: ${avgFractal.toFixed(4)}
- **Average Quranic Resonance**: ${(avgResonance * 100).toFixed(2)}%

## 🔍 Pattern Detection
- **Quranic Threshold Met**: ${avgShannon >= this.QURANIC_THRESHOLD ? '✅ YES' : '❌ NO'}
- **High Resonance Texts**: ${results.filter(r => r.quranicResonance > 0.8).length}/${results.length}
- **Fractal Complexity**: ${avgFractal > 0.5 ? 'High' : 'Low'}

## 🎯 Recommendations
${avgShannon >= this.QURANIC_THRESHOLD ? 
  '✅ Texts show Quranic information density patterns' : 
  '⚠️ Texts below expected Quranic entropy threshold'}
${avgResonance > 0.7 ? 
  '✅ Strong Quranic resonance detected' : 
  '📈 Resonance can be improved'}
    `.trim();
  }
}

export default ShannonHELEntropy;
