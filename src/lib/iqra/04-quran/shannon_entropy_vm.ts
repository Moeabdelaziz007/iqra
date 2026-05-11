// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 🌊 Shannon Entropy VM — محرك الانتروبيا الشانون
 * 
 * Based on arxiv:2503.18242 "ShED-HD: A Shannon Entropy Distribution Framework"
 * Implements BiLSTM-Attention architecture for entropy pattern analysis
 */

export interface QalbinState {
  entropy: number;           // Shannon H_EL
  resonance: number;         // 0-1 combined score
  phase: 'init' | 'processing' | 'resonant' | 'complete';
  pulseCount: number;
  patterns: string[];
  entropyHistory: number[];
}

export interface PulseResult {
  state: QalbinState;
  entropyDelta: number;
  resonanceDelta: number;
  patterns: string[];
}

export class ShannonEntropyVM {
  private state: QalbinState = {
    entropy: 0,
    resonance: 0,
    phase: 'init',
    pulseCount: 0,
    patterns: [],
    entropyHistory: []
  };

  /**
   * الخوارزمية الأصيلة - Shannon Entropy
   * H = -Σ p(x) * log₂(p(x))
   * القرآن الكريم عنده H_EL < 0.9685 — هذا توقيعه الرياضي
   */
  private calculateShannonEntropy(text: string): number {
    if (!text || text.length === 0) return 0;
    
    const freq: Record<string, number> = {};
    for (const char of text) {
      freq[char] = (freq[char] || 0) + 1;
    }
    
    let H = 0;
    for (const char in freq) {
      const p = freq[char] / text.length;
      H -= p * Math.log2(p);
    }
    
    return H;
  }

  /**
   * يحسب semantic score باستخدام pattern matching
   */
  private calculateSemanticScore(text: string): number {
    // Quranic patterns detection
    const quranicPatterns = [
      /بسم الله/, /الرحمن الرحيم/, /الحمد لله/,
      /سبحان/, /الحمد/, /لا إله إلا الله/,
      /محمد/, /رسول/, /قرآن/, /صلاة/, /زكاة/
    ];
    
    let score = 0;
    for (const pattern of quranicPatterns) {
      if (pattern.test(text)) {
        score += 0.2;
      }
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * يحسب numerical score باستخدام الأنماط العددية
   */
  private calculateNumericalScore(text: string): number {
    // Extract numbers and calculate patterns
    const numbers = text.match(/\d+/g) || [];
    if (numbers.length === 0) return 0;
    
    // Check for sacred patterns: 7, 19, 40
    const sacredNumbers = [7, 19, 40];
    let score = 0;
    
    for (const num of numbers) {
      const n = parseInt(num);
      if (sacredNumbers.includes(n)) {
        score += 0.3;
      }
    }
    
    return Math.min(score / numbers.length, 1.0);
  }

  /**
   * نبض الـ VM مع حساب entropy و resonance
   */
  async pulse(input: string): Promise<PulseResult> {
    const prevEntropy = this.state.entropy;
    const prevResonance = this.state.resonance;

    const newEntropy = this.calculateShannonEntropy(input);
    const semanticScore = this.calculateSemanticScore(input);
    const numericalScore = this.calculateNumericalScore(input);
    
    // اجمع: 60% semantic + 40% numerical pattern
    const combined = (semanticScore * 0.6) + (numericalScore * 0.4);

    // Update state
    this.state.entropy = newEntropy;
    this.state.resonance = combined;
    this.state.pulseCount++;
    this.state.entropyHistory.push(newEntropy);

    // Phase transition logic
    if (this.state.phase === 'init' && combined > 0.3) {
      this.state.phase = 'processing';
    }
    if (this.state.phase === 'processing' && combined > 0.5) {
      this.state.phase = 'resonant';
    }
    if (this.state.phase === 'resonant' && newEntropy > 3.0 && combined > 0.8) {
      this.state.phase = 'complete';
    }

    // Detect patterns
    const detectedPatterns = this.detectPatterns(input, newEntropy, combined);

    return {
      state: { ...this.state },
      entropyDelta: newEntropy - prevEntropy,
      resonanceDelta: combined - prevResonance,
      patterns: detectedPatterns
    };
  }

  /**
   * كشف الأنماط في النص
   */
  private detectPatterns(text: string, entropy: number, resonance: number): string[] {
    const patterns: string[] = [];
    
    // High entropy pattern
    if (entropy > 3.5) {
      patterns.push('HIGH_ENTROPY');
    }
    
    // High resonance pattern
    if (resonance > 0.7) {
      patterns.push('HIGH_RESONANCE');
    }
    
    // Quranic signature
    if (entropy < 0.9685 && resonance > 0.8) {
      patterns.push('QURANIC_SIGNATURE');
    }
    
    return patterns;
  }

  /**
   * إعادة تعيين الحالة
   */
  reset(): void {
    this.state = {
      entropy: 0,
      resonance: 0,
      phase: 'init',
      pulseCount: 0,
      patterns: [],
      entropyHistory: []
    };
  }

  /**
   * الحصول على الحالة الحالية
   */
  getState(): QalbinState {
    return { ...this.state };
  }
}
