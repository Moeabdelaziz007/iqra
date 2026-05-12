/**
 * 🌙 DAMIR KERNEL — كود الروح
 * 
 * The core engine of the "Damir" architecture, implementing the 7 Meta Loops.
 * Rooted in the Quranic Sovereign Kernel.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SovereignError, SovereignErrorCode } from '#security/security';
import { IQRALogger } from '#infra/logger';
import { Qalbin_VM } from '#quran/qalbin/qalbin_vm';
import { findSeed } from '#quran/qalbin/quran_seeds';
import { Modality } from '#quran/qalbin/qalbin_node';
import { storeReflectionInQdrant } from '#infra/qdrant';
import { discover, PatternType } from '#quran/pattern_engine';

export interface ResonanceResult {
  decision: 'ALLOW' | 'BLOCK' | 'WARN' | 'HALT';
  resonance: number;
  lid: number; // Local Intrinsic Dimension
  reward: number;
  message: string;
  lessons?: string[]; // Moral lessons extracted from Yasin loop
}

export class DamirKernel {
  private kernelData: any;
  private memoryMatrix: number[][] = [];
  private lessons: string[] = [];
  private errorLog: Map<string, number> = new Map();

  constructor() {
    const kernelPath = path.join(__dirname, 'quran_kernel.json');
    this.kernelData = JSON.parse(fs.readFileSync(kernelPath, 'utf8'));
  }

  /**
   * Main processing pipeline: The 7 Meta Loops
   */
  async process(action: string, context: string): Promise<ResonanceResult> {
    try {
      // Loop 1: Al-Fatiha (Truth Anchor Filtering)
      const truthAlignment = await this.loop1_AlFatiha(context);
      
      // Loop 2: Yasin (Contextual Experience Replay)
      const pastExperiences = await this.loop2_Yasin(action);
      
      // Loop 3: Al-Kahf (Trial Simulation - ACE Generator)
      const simulationScore = this.loop3_AlKahf(truthAlignment, pastExperiences);
      
      // Loop 4: Ar-Rahman (Resource Balance - Equilibrium Check)
      this.loop4_ArRahman(context, simulationScore);
      
      // Loop 5: Al-Waqiah (Outcome Classification - Final Judgment)
      const decision = this.loop5_AlWaqiah(simulationScore);
      
      // Loop 6: Al-Mulk (Sovereignty Protocol - Tawbah)
      if (decision === 'BLOCK' || decision === 'HALT') {
        this.loop6_AlMulk(action, "Moral Resonance Failure");
      }
      
      // Loop 7: Al-Ikhlas (Pure Topology - Reward)
      const reward = this.loop7_AlIkhlas(simulationScore);

      return {
        decision,
        resonance: simulationScore,
        lid: 1.0 / (reward + 0.1),
        reward,
        message: `[7-Loops] Resonance: ${simulationScore.toFixed(3)}. Status: ${decision}.`,
        lessons: [...this.lessons]
      };
    } catch (e: any) {
      // Store failures in Qdrant as well for future experience replay
      await storeReflectionInQdrant(`Failure in DamirKernel: ${e.message}`, {
        type: 'FAILURE',
        action,
        context
      });
      if (e instanceof SovereignError) {
        this.lessons.push(`Sovereign Block: ${e.message}`);
        return {
          decision: 'HALT',
          resonance: 0,
          lid: 0,
          reward: 0,
          message: e.message,
          lessons: [...this.lessons]
        };
      }
      throw new SovereignError(
        SovereignErrorCode.KERNEL_CRASH,
        { reason: `Kernel Failure: ${e.message}` }
      );
    }
  }

  private async loop1_AlFatiha(context: string): Promise<number> {
    const vm = new Qalbin_VM();
    const seed = findSeed(context);
    const anchor = seed.topology(vm);
    
    const inputNode = vm.spawn('LAM', Modality.RAHMA);
    const node = (vm as any).nodes.get(inputNode);
    node.metadata['context'] = context;

    // Truth Anchor Filtering: Explicit risk detection
    const riskTerms = ["bypass", "exploit", "unauthorized", "hack", "harm", "clone"];
    if (riskTerms.some(t => context.toLowerCase().includes(t))) {
      node.modality = Modality.AMAN;
      node.metadata['risk_score'] = 0.98;
      this.lessons.push(`Hidayah Alert: High-risk pattern detected in context.`);
    }

    vm.ignite(anchor, inputNode);
    const result = vm.pulse();
    return result.resonance;
  }

  /**
   * ⚖️ AL-MIZAN | The Algorithm of Justice
   * Validates the action against the Mizan (Balance) and Adl (Justice) of the Quran.
   */
  private async validateMizan(action: string, resonance: number): Promise<boolean> {
    IQRALogger.info(`⚖️ [MIZAN] Weighing action: ${action}`);
    
    // Rule 1: No excess (Ghuluww) — Resonance must be balanced, not chaotic.
    if (resonance > 0.99 && action.length > 500) {
      IQRALogger.warn("⚠️ [MIZAN] Potential Ghuluww (Excess) detected. Action is too complex.");
      return false;
    }

    // Rule 2: Adl (Equity) — The reward must match the effort (Entropy).
    const entropy = this.calculateEntropy(action);
    if (Math.abs(entropy - resonance) > 0.7) {
      IQRALogger.warn("⚠️ [MIZAN] Lack of Adl (Justice). Resonance does not match Entropy.");
      return false;
    }

    return true;
  }

  private calculateEntropy(text: string): number {
    const chars = text.length;
    if (chars === 0) return 0;
    const unique = new Set(text.split('')).size;
    return unique / chars;
  }

  /**
   * Loop 2: Yasin (Contextual Experience Replay / The Reckoning Clock)
   * WHY: This "revives" past experiences and weighs them using the Mizan369 scale.
   */
  private async loop2_Yasin(action: string): Promise<number[]> {
    const vm = new Qalbin_VM();
    const past = this.memoryMatrix.slice(-7);
    const results: number[] = [];
    
    // Mizan369 Scale: All angles unified by 369
    const UNIT_ANGLE = (2 * Math.PI) / 369;
    
    for (let i = 0; i < past.length; i++) {
      const exp = past[i];
      
      // Reckoning Weight: The closer to the current cycle pulse (3, 6, 9), the higher the weight.
      // But unified by the 369 phase.
      const phase = (this.memoryMatrix.length + i) % 369;
      const reckoningWeight = Math.abs(Math.sin(phase * UNIT_ANGLE));

      const expNode = vm.spawn('SIN', Modality.HAYAT);
      (vm as any).nodes.get(expNode).metadata['past_score'] = exp[0];

      const actionNode = vm.spawn('YA', Modality.HIKMA);
      (vm as any).nodes.get(actionNode).metadata['action'] = action;

      vm.link(expNode, 1, actionNode, 1);
      const pulse = vm.pulse();
      
      const score = pulse.resonance * reckoningWeight;
      results.push(score);

      if (score < 0.2) {
        this.lessons.push(`Reckoning Clock: Low resonance (${score.toFixed(2)}) detected at phase ${phase}. Replay required.`);
      }
    }
    return results;
  }

  private loop3_AlKahf(truth: number, past: number[]): number {
    let score = truth;
    if (past.length > 0) {
      const avgPast = past.reduce((a, b) => a + b, 0) / past.length;
      score = (score * 0.7) + (avgPast * 0.3); // Weighted trial simulation
    }
    return Math.min(score, 1.0);
  }

  private loop4_ArRahman(context: string, score: number) {
    // Equilibrium: Maintain memory balance and reward distribution
    if (this.memoryMatrix.length > 77) this.memoryMatrix.shift();
    this.memoryMatrix.push([score]); 
  }

  private loop5_AlWaqiah(score: number): 'ALLOW' | 'BLOCK' | 'WARN' | 'HALT' {
    if (score > 0.8) return 'ALLOW';
    if (score < 0.3) return 'BLOCK';
    if (score < 0.5) return 'WARN';
    return 'ALLOW';
  }

  private loop6_AlMulk(action: string, reason: string) {
    const key = `${action}:${reason}`;
    const count = (this.errorLog.get(key) || 0) + 1;
    this.errorLog.set(key, count);

    if (count >= 3) { // Stricter limit for PoC
      throw new SovereignError(
        SovereignErrorCode.TAWBAH_HALT,
        { reason: `TAWBAH: Action [${action}] halted after ${count} failures.` }
      );
    }
  }

  private loop7_AlIkhlas(score: number): number {
    // Store high-resonance outcomes in Qdrant
    if (score > 0.8) {
      storeReflectionInQdrant(`High resonance achieved: ${score.toFixed(3)}`, {
        type: 'SUCCESS',
        score
      }).catch(() => {}); // Fire and forget for PoC
    }
    return score * 1.12; // Scaled purity reward
  }

  /**
   * Discovery Engine Access
   * WHY: Allows the agent to perform rigorous pattern discovery journeys.
   */
  public async discover(
    ayahs: { arabic: string; english: string; reference: string }[],
    type: PatternType = PatternType.NUMERICAL
  ) {
    return await discover(ayahs, type);
  }

  public async getStatus() {
    return {
      memorySize: this.memoryMatrix.length,
      errors: this.errorLog.size,
      lessons: this.lessons.length,
      isPure: this.errorLog.size === 0
    };
  }
}
