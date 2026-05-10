/**
 * Qalbin VM — القلب الافتراضي
 * 
 * Virtual Machine for Quranic Pattern Processing
 * Implements Shannon H_EL entropy and pulse-based execution
 * 
 * "أَفَلَا يَتَدَبَّرُونَ الْقُرْآنَ ۚ أَمْ عَلَىٰ قُلُوبٍ أَقْفَالُهَا"
 */

import { NumericalValidator, ResonanceResult } from './numerical_validator';
import { VectorEngine } from './vector_engine';
import { IQRAMemory } from '../memory';

export interface QalbinState {
  entropy: number;
  resonance: number;
  phase: 'init' | 'processing' | 'resonant' | 'complete';
  pulseCount: number;
  patterns: string[];
}

export interface PulseResult {
  state: QalbinState;
  output: string;
  entropyDelta: number;
  resonanceDelta: number;
  patterns: string[];
}

export class QalbinVM {
  private state: QalbinState;
  private vectorEngine: VectorEngine;
  private memory: IQRAMemory;
  private entropyHistory: number[] = [];

  constructor(vectorEngine: VectorEngine, memory: IQRAMemory) {
    this.vectorEngine = vectorEngine;
    this.memory = memory;
    this.state = {
      entropy: 0,
      resonance: 0,
      phase: 'init',
      pulseCount: 0,
      patterns: []
    };
  }

  /**
   * Calculate Shannon H_EL entropy for Arabic text
   * H_EL = -Σ(p_i * log2(p_i)) where p_i is probability of character i
   */
  private calculateShannonEntropy(text: string): number {
    if (!text || text.length === 0) return 0;

    // Count character frequencies
    const charFreq: { [key: string]: number } = {};
    for (const char of text) {
      charFreq[char] = (charFreq[char] || 0) + 1;
    }

    // Calculate probabilities and entropy
    let entropy = 0;
    const textLength = text.length;
    
    for (const char in charFreq) {
      const probability = charFreq[char] / textLength;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Execute a pulse cycle through the Qalbin VM
   * Each pulse processes input and updates internal state
   */
  async pulse(input: string): Promise<PulseResult> {
    const previousEntropy = this.state.entropy;
    const previousResonance = this.state.resonance;

    // Update phase based on current state
    this.updatePhase();

    // Calculate new entropy
    const newEntropy = this.calculateShannonEntropy(input);
    
    // Get numerical resonance
    const numericalResonance: ResonanceResult = NumericalValidator.validate(input);
    
    // Get semantic resonance through vector engine
    const semanticMatches = await this.vectorEngine.searchSimilar(input, 5);
    const semanticScore = semanticMatches.length > 0 ? semanticMatches[0].score : 0;

    // Calculate combined resonance
    const combinedResonance = (semanticScore * 0.6) + (numericalResonance.score * 0.4);

    // Detect patterns
    const detectedPatterns = this.detectPatterns(input, numericalResonance);

    // Update state
    this.state.entropy = newEntropy;
    this.state.resonance = combinedResonance;
    this.state.pulseCount++;
    this.state.patterns = [...this.state.patterns, ...detectedPatterns];

    // Store entropy history for trend analysis
    this.entropyHistory.push(newEntropy);
    if (this.entropyHistory.length > 100) {
      this.entropyHistory.shift(); // Keep last 100 values
    }

    // Generate output based on current state
    const output = this.generateOutput(input, numericalResonance, semanticMatches);

    // Store significant states in memory
    if (combinedResonance > 0.7 || newEntropy > 3.5) {
      await IQRAMemory.set(`qalbin_pulse_${this.state.pulseCount}`, {
        content: `Qalbin Pulse ${this.state.pulseCount}: ${input}`,
        concept: 'Qalbin_State',
        entropy: newEntropy,
        resonance: combinedResonance,
        state: JSON.stringify(this.state)
      });
    }

    const result: PulseResult = {
      state: { ...this.state },
      output,
      entropyDelta: newEntropy - previousEntropy,
      resonanceDelta: combinedResonance - previousResonance,
      patterns: detectedPatterns
    };

    return result;
  }

  /**
   * Update VM phase based on current entropy and resonance levels
   */
  private updatePhase(): void {
    const { entropy, resonance } = this.state;

    if (this.state.phase === 'init' && entropy > 0) {
      this.state.phase = 'processing';
    } else if (this.state.phase === 'processing' && resonance > 0.5) {
      this.state.phase = 'resonant';
    } else if (this.state.phase === 'resonant' && entropy > 3.0 && resonance > 0.8) {
      this.state.phase = 'complete';
    }
  }

  /**
   * Detect patterns in input text
   */
  private detectPatterns(input: string, numericalResonance: ResonanceResult): string[] {
    const patterns: string[] = [];

    // Add numerical patterns
    patterns.push(...numericalResonance.patterns);

    // Detect Arabic-specific patterns
    if (/[؀-ۿ]/.test(input)) {
      patterns.push('Arabic_Text');
    }

    // Detect Quranic verse patterns (approximate)
    if (input.includes('سورة') || input.includes('آية') || /\d+:\d+/.test(input)) {
      patterns.push('Quranic_Reference');
    }

    // Detect high entropy patterns
    if (this.state.entropy > 3.5) {
      patterns.push('High_Entropy');
    }

    // Detect resonance patterns
    if (this.state.resonance > 0.8) {
      patterns.push('High_Resonance');
    }

    return patterns;
  }

  /**
   * Generate output based on processed input and current state
   */
  private generateOutput(
    input: string, 
    numericalResonance: ResonanceResult, 
    semanticMatches: any[]
  ): string {
    const patterns = numericalResonance.patterns.join(', ');
    const topMatch = semanticMatches.length > 0 ? semanticMatches[0].text : '';
    
    let output = `Processed: "${input}"\n`;
    output += `Entropy: ${this.state.entropy.toFixed(3)}\n`;
    output += `Resonance: ${this.state.resonance.toFixed(3)}\n`;
    output += `Phase: ${this.state.phase}\n`;
    output += `Pulse: ${this.state.pulseCount}\n`;
    
    if (patterns) {
      output += `Patterns: ${patterns}\n`;
    }
    
    if (topMatch) {
      output += `Semantic Match: "${topMatch.substring(0, 100)}..."\n`;
    }

    return output;
  }

  /**
   * Get current VM state
   */
  getState(): QalbinState {
    return { ...this.state };
  }

  /**
   * Get entropy trend analysis
   */
  getEntropyTrend(): { increasing: boolean; average: number; trend: number } {
    if (this.entropyHistory.length < 2) {
      return { increasing: false, average: this.state.entropy, trend: 0 };
    }

    const recent = this.entropyHistory.slice(-10);
    const older = this.entropyHistory.slice(-20, -10);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
    
    return {
      increasing: recentAvg > olderAvg,
      average: recentAvg,
      trend: recentAvg - olderAvg
    };
  }

  /**
   * Reset VM to initial state
   */
  reset(): void {
    this.state = {
      entropy: 0,
      resonance: 0,
      phase: 'init',
      pulseCount: 0,
      patterns: []
    };
    this.entropyHistory = [];
  }
}
