import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { IQRALogger } from './logger';

export class GoEngineBridge {
  private static ENGINE_PATH = path.join(process.cwd(), 'lib/iqra/quran/go-engine/main.go');

  static async calculateResonance(input: string) {
    try {
      // Check if Go engine exists
      if (!fs.existsSync(this.ENGINE_PATH)) {
        IQRALogger.warn('⚠️ [GO-BRIDGE] Engine not found, using fallback');
        return this.fallbackResonance(input);
      }
      
      // Execute Go tool directly
      const cmd = `go run "${this.ENGINE_PATH}" -mode resonance -input "${input.replace(/"/g, '\\"')}"`;
      const output = execSync(cmd, { encoding: 'utf-8' });
      const result = JSON.parse(output);
      return result.data;
    } catch (e) {
      IQRALogger.error('❌ [GO-BRIDGE] Execution failed:', e);
      return this.fallbackResonance(input);
    }
  }

  private static fallbackResonance(input: string) {
    // Simple fallback resonance calculation
    const words = input.toLowerCase().split(/\s+/);
    const quranicTerms = ['allah', 'quran', 'verse', 'prophet', 'islam', 'muslim', 'prayer', 'mosque'];
    const resonanceScore = words.filter(word => quranicTerms.some(term => word.includes(term))).length / words.length;
    
    return {
      coherence: Math.min(0.9, resonanceScore + 0.3),
      novelty: Math.random() * 0.4 + 0.3,
      resonance: resonanceScore > 0.1 ? 'high' : resonanceScore > 0.05 ? 'medium' : 'low'
    };
  }

  static async triggerEvolutionCycle() {
    try {
      const cmd = `go run "${this.ENGINE_PATH}" -mode evolve -input "trigger"`;
      execSync(cmd);
    } catch (e) {}
  }
}
