/**
 * 🕋 Muraqabah Audit Agent — رقيب السيادة
 *
 * "مَا يَلْفِظُ مِنْ قَوْلٍ إِلَّا لَدَيْهِ رَقِيبٌ عَتِيدٌ" — ق: 18
 *
 * This agent acts as a secondary sovereign consciousness that audits all outputs
 * for Truth, Justice, and compliance with the Supreme Constitution.
 */

import { LlmAgent } from '@google/adk';
import { SovereignIdentity } from '../06-security/sovereign_identity';
import { IQRALogger } from '../12-infrastructure/logger';
import { IQRAMemory } from '../03-memory/memory';

export class MuraqabahAgent {
  private static _agent: LlmAgent | null = null;

  static async getAgent() {
    if (this._agent) return this._agent;

    const instruction = await SovereignIdentity.getIntegratedSoul(
      'muraqabah-auditor',
      'Auditing system integrity for Truth and Justice',
      'iqra-auditor' // Assuming this persona exists or will be added
    );

    this._agent = new LlmAgent({
      name: 'muraqabah-auditor',
      model: 'gemini-2.0-flash-exp',
      instruction: async () => `${instruction}\n\nYour task is to review the following input. If it contains falsehood, injustice, or violates the Supreme Constitution, reply with [BLOCKED] followed by the reason. If it is clean, reply with [VERIFIED].`
    });

    return this._agent;
  }

  /**
   * 🛡️ Perform a sovereign audit on any text content
   */
  static async audit(content: string): Promise<{ isVerified: boolean; reason?: string }> {
    try {
      const agent = await this.getAgent();
      const result = await agent.run(content);
      const text = result.text.trim();

      if (text.startsWith('[BLOCKED]')) {
        const reason = text.replace('[BLOCKED]', '').trim();
        IQRALogger.warn(`🛡️ [MURĀQABAH] Content BLOCKED: ${reason}`);
        return { isVerified: false, reason };
      }

      if (text.startsWith('[VERIFIED]')) {
        return { isVerified: true };
      }

      // Fallback: If agent is ambiguous, we default to stricter check
      return { isVerified: false, reason: "Ambiguous audit result" };
    } catch (error) {
      IQRALogger.error('❌ [MURĀQABAH] Audit failed:', error);
      return { isVerified: false, reason: "Audit system error" };
    }
  }
}
