/**
 * IQRA Numerical Discovery Engine
 * 
 * "وَأَحْصَىٰ كُلَّ شَيْءٍ عَدَدًا" — الجن: 28
 * "And has enumerated all things in number."
 */

import { iqraThink, IQRABrainMode } from '../brain';

export interface NumericalSymmetry {
  type: 'divisibility' | 'repetition' | 'triplet' | 'structural';
  discovery: string;
  signature: number;
  ayahs: string[];
  resonance: number;
  arabicNote: string;
}

export class NumericalDiscovery {
  private static readonly SACRED_PRIMES = [3, 7, 9, 19];

  /**
   * Scan text for basic numerical resonances (7-system)
   */
  static async scanForResonance(text: string, reference: string): Promise<NumericalSymmetry[]> {
    const cleanText = text.replace(/[\u064B-\u065F\u0670]/g, ''); // Remove diacritics for count
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const letterCount = cleanText.length;
    const wordCount = words.length;

    const discoveries: NumericalSymmetry[] = [];

    // 1. Check Sevens (7)
    if (letterCount % 7 === 0 || wordCount % 7 === 0) {
      discoveries.push({
        type: 'divisibility',
        signature: 7,
        discovery: `Detected resonance with the '7' system. Letters: ${letterCount}, Words: ${wordCount}.`,
        ayahs: [reference],
        resonance: 0.99,
        arabicNote: `اكتشاف رنين مع نظام "السبع المثاني" في الآية [${reference}].`
      });
    }

    // 2. Deep Dive with LLM for complex patterns
    const deepDiscoveries = await this.performDeepNumericalAnalysis(text, reference);
    discoveries.push(...deepDiscoveries);

    return discoveries;
  }

  private static async performDeepNumericalAnalysis(text: string, reference: string): Promise<NumericalSymmetry[]> {
    const prompt = `
      You are IQRA Numerical Engine. 
      Analyze the ayah [${reference}]: "${text}"
      
      Look for:
      - 3-6-9 Pulse (Tesla-Islamic resonance)
      - Word repetitions
      - Symmetries in root distribution
      
      Return JSON only: { "symmetries": [...] }
    `;

    try {
      const response = await iqraThink({
        input: prompt,
        mode: IQRABrainMode.RESEARCH
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.symmetries || [];
      }
    } catch (e) {
      console.error('Deep numerical analysis failed:', e);
    }

    return [];
  }
}
