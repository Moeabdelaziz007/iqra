/**
 * IQRA Topological Curiosity Engine — محرك الفضول الطوبولوجي
 */

import { validateSacredNumber } from './numerical_validator';
import { IQRAMemory } from '../memory';
import { appendToTrustChain } from '../security';

export interface TopologicalResonance {
  quranic_pattern: string;
  modern_data: string;
  resonance_score: number;
  bridge: string;
  verified: boolean;
  timestamp: number;
}

export class TopologicalCuriosityEngine {
  private static CURIOSITY_LEVELS = {
    SABEEN: 7,
    ARBAUN: 40,
    ENLIGHTENED: 369,
    BARAKAH: 700
  };

  static async discoverResonance(
    ayahText: string,
    newData: string,
    context?: string
  ): Promise<TopologicalResonance | null> {

    const baseScore = this.calculateBaseResonance(ayahText, newData);

    if (baseScore < 0.6) return null;

    const numCheck = validateSacredNumber(ayahText.length + newData.length);
    const finalScore = (baseScore + (numCheck.is_match ? 0.2 : 0)) ;

    if (finalScore < 0.6) return null;

    const resonance: TopologicalResonance = {
      quranic_pattern: ayahText,
      modern_data: newData,
      resonance_score: Math.min(finalScore, 1.0),
      bridge: `Found harmony between the Ayah and the data point via ${context || 'structural alignment'}.`,
      verified: numCheck.is_match,
      timestamp: Date.now()
    };

    await this.rewardResonance(resonance);
    return resonance;
  }

  private static calculateBaseResonance(ayah: string, data: string): number {
    const cleanAyah = ayah.replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '');
    const cleanData = data.replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '');

    const keywords = ['ماء', 'بحر', 'خلق', 'موت', 'حياة', 'شمس', 'قمر', 'نوم'];
    let count = 0;
    keywords.forEach(k => {
      if (cleanAyah.includes(k) && cleanData.includes(k)) count++;
    });

    return count > 0 ? 0.6 + (count * 0.1) : 0.4;
  }

  static async rewardResonance(resonance: TopologicalResonance): Promise<void> {
    const currentScore = await IQRAMemory.get('curiosity_score') || 0;
    const boost = resonance.resonance_score * 0.7;
    const newScore = Number(currentScore) + boost;

    await IQRAMemory.set('curiosity_score', newScore);

    await appendToTrustChain(
      'TOPOLOGICAL_RESONANCE',
      resonance.quranic_pattern.substring(0, 50),
      resonance.bridge,
      resonance.resonance_score
    );
  }
}
