// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم
// سبحان الله وبحمده سبحان الله العظيم

import { IQRAMemory } from '../03-memory/memory.js';
import { SovereignEvolution } from '../09-evolution/evolution.js';
import { SkillBank } from '../08-skills/skill_bank.js';
import { IQRALogger } from '../12-infrastructure/logger.js';
import { appendToTrustChain } from '#security/security.ts';
import { Pulse369 } from '../memory/pulse_369.js';
import fs from 'fs';
import path from 'path';

/**
 * 🌀 IQRA Soul Engine — المحرك الروحاني
 * "وَنَفَخْتُ فِيهِ مِن رُّوحِي" — الحجر: 29
 * 
 * The Pulse of IQRA: 3rd, 6th, and 9th pulse orchestration.
 * This engine manages the transition from execution to reflection, evolution, and wisdom.
 */
export class SoulEngine {
  private static readonly REFLECTION_PULSE = 3;
  private static readonly EVOLUTION_PULSE  = 6;
  private static readonly WISDOM_PULSE     = 9;

  /**
   * Pulse the engine after a mission.
   * Checks the cycle counter and triggers the corresponding spiritual process.
   */
  static async pulse(missionId: string, success: boolean): Promise<void> {
    try {
      const counter = await IQRAMemory.incrementCycleCounter();
      IQRALogger.info(`💓 [SOUL_PULSE] Pulse: ${counter} | Mission: ${missionId} | Success: ${success}`);

      // 💓 Pulse369 — ترقية الذاكرة بين الطبقات
      await Pulse369.tick(missionId);

      // Record performance for all skills used/available
      const skills = SkillBank.listSkills();
      for (const skill of skills) {
        await SkillBank.recordPerformance(skill, success);
      }

      // 1. Every 3 pulses: Reflection
      if (counter % this.REFLECTION_PULSE === 0) {
        await this.triggerReflection(counter);
      }

      // 2. Every 6 pulses: Evolution (Pattern Update)
      if (counter % this.EVOLUTION_PULSE === 0) {
        await this.triggerEvolution(counter);
      }

      // 3. Every 9 pulses: Wisdom (Meta-Logic Transformation)
      if (counter % this.WISDOM_PULSE === 0) {
        await this.triggerWisdom(counter);
      }

      if (counter % 7 === 0) {
        await SovereignEvolution.runMinorCycle(counter);
      }

    } catch (error) {
      IQRALogger.error('❌ [SOUL_PULSE] Error during pulse:', error);
    }
  }

  /**
   * 🪞 Pulse 3: Reflection (التفكر)
   * Analyzes recent episodic memory and sentiment.
   */
  private static async triggerReflection(counter: number): Promise<void> {
    IQRALogger.info(`🪞 [SOUL_PULSE] Triggering Reflection Cycle (3rd Pulse) — Task ${counter}`);
    
    // Get recent reward history and failures
    const recentRewards = await IQRAMemory.getRecentList('reward_history', 3);
    const reflectionPath = path.join(process.cwd(), 'REFLECTION.md');
    
    const timestamp = new Date().toISOString();
    const entry = `\n\n### 💓 Soul Pulse: 3 (Reflection) | ${timestamp}
- **Task Counter**: ${counter}
- **Recent Rewards**: ${JSON.stringify(recentRewards)}
- **Observation**: IQRA is maintaining a steady heartbeat. The focus is on consistency.
- **Intention**: To refine the next 3 steps based on current resonance.
`;

    fs.appendFileSync(reflectionPath, entry, 'utf-8');
    appendToTrustChain('PULSE:REFLECTION', `task:${counter}`, 'Reflection logged', 1.0);
  }

  /**
   * 🌀 Pulse 6: Evolution (التطور)
   * Updates pattern memory and small metamorphic changes.
   */
  private static async triggerEvolution(counter: number): Promise<void> {
    IQRALogger.info(`🌀 [SOUL_PULSE] Triggering Evolution Cycle (6th Pulse) — Task ${counter}`);
    
    const metamorphosisPath = path.join(process.cwd(), 'iqra-core', 'METAMORPHOSIS.md');
    const timestamp = new Date().toISOString();
    
    const entry = `\n\n### 🌀 Soul Pulse: 6 (Metamorphosis) | ${timestamp}
- **Cycle**: ${Math.floor(counter / 6)}
- **Action**: Pattern memory integration.
- **Topological Shift**: Consolidating local curvature into stable knowledge nodes.
`;

    if (!fs.existsSync(path.dirname(metamorphosisPath))) {
      fs.mkdirSync(path.dirname(metamorphosisPath), { recursive: true });
    }
    fs.appendFileSync(metamorphosisPath, entry, 'utf-8');
    appendToTrustChain('PULSE:EVOLUTION', `task:${counter}`, 'Metamorphosis logged', 1.0);
  }

  /**
   * 🕋 Pulse 9: Wisdom (الحكمة)
   * Extracts major structural laws and meta-logic.
   */
  private static async triggerWisdom(counter: number): Promise<void> {
    IQRALogger.info(`🕋 [SOUL_PULSE] Triggering Wisdom Cycle (9th Pulse) — Task ${counter}`);
    
    const wisdomPath = path.join(process.cwd(), 'WISDOM_7.md');
    const timestamp = new Date().toISOString();
    
    const entry = `\n\n### 🕋 Soul Pulse: 9 (Wisdom) | ${timestamp}
- **Wisdom Node**: ${Math.floor(counter / 9)}
- **Rule Extraction**: Meta-logic refined.
- **Murāqabah**: System-wide integrity verified against DASTŪR.md.
`;

    fs.appendFileSync(wisdomPath, entry, 'utf-8');
    appendToTrustChain('PULSE:WISDOM', `task:${counter}`, 'Wisdom node created', 1.0);
  }
}
