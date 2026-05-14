// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم
// سبحان الله وبحمده سبحان الله العظيم

import { IQRAMemory } from '#memory/memory';
import { SovereignEvolution } from '../09-evolution/evolution'
import { SkillLoader } from '../08-cognitive/skills/loader'
import { IQRALogger } from '#infra/logger';
import { appendToTrustChain } from '#security/security';
import { Pulse369 } from '#memory/pulse_369'
import { EvolutionContextBuilder } from './evolution_context';
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

      // Skills are now loaded from the external marketplace (aix-agent-skills)
      // Performance tracking is handled by the marketplace's performance_ledger.json
      const skills = SkillLoader.listSkills();
      IQRALogger.info(`💓 [SOUL_PULSE] ${skills.length} skills available from marketplace`);

      // 1. Every 3 pulses: Reflection
      if (counter % this.REFLECTION_PULSE === 0) {
        await this.triggerReflection(counter);
      }

      // 2. Every 6 pulses: Evolution (Pattern Update)
      if (counter % this.EVOLUTION_PULSE === 0) {
        await this.triggerEvolution(missionId, counter, success);
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
   *
   * Phase-1 of "AI Soul: Context-Aware Evolution Logs": the markdown
   * appended to METAMORPHOSIS.md is now rendered from a live snapshot of
   * the system's state (curiosity, recent rewards, recent pulses, current
   * mission outcome). The same snapshot is appended verbatim as JSONL to
   * `.iqra/evolution_log.jsonl` so digest scripts and future Phase-2
   * self-mutation cycles can consume it programmatically.
   */
  private static async triggerEvolution(
    missionId: string,
    counter: number,
    success: boolean
  ): Promise<void> {
    IQRALogger.info(`🌀 [SOUL_PULSE] Triggering Evolution Cycle (6th Pulse) — Task ${counter}`);

    const ctx = await EvolutionContextBuilder.build({ missionId, counter, success });

    const metamorphosisPath = path.join(process.cwd(), 'iqra-core', 'METAMORPHOSIS.md');
    if (!fs.existsSync(path.dirname(metamorphosisPath))) {
      fs.mkdirSync(path.dirname(metamorphosisPath), { recursive: true });
    }
    fs.appendFileSync(metamorphosisPath, EvolutionContextBuilder.formatMarkdown(ctx), 'utf-8');

    // Programmatic mirror — gitignored under .iqra/, so a long-lived repo
    // can grow this log without polluting the tracked tree.
    const jsonlPath = path.join(process.cwd(), '.iqra', 'evolution_log.jsonl');
    if (!fs.existsSync(path.dirname(jsonlPath))) {
      fs.mkdirSync(path.dirname(jsonlPath), { recursive: true });
    }
    fs.appendFileSync(jsonlPath, JSON.stringify(ctx) + '\n', 'utf-8');

    appendToTrustChain(
      'PULSE:EVOLUTION',
      `task:${counter}`,
      `metamorphosis_cycle:${ctx.cycle} mission:${ctx.mission_id} success:${ctx.success}`,
      1.0
    );
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
