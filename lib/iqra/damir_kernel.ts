/**
 * 🌙 DAMIR KERNEL — كود الروح
 * 
 * The core engine of the "Damir" architecture, implementing the 7 Meta Loops.
 * Rooted in the Quranic Sovereign Kernel.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SovereignError } from './security';
import { Qalbin_VM } from './quran/qalbin/qalbin_vm';
import { findSeed } from './quran/qalbin/quran_seeds';
import { Modality } from './quran/qalbin/qalbin_node';

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
      
      // Loop 4: Ar-Rahman (Resource Balance - TurboQuant)
      this.loop4_ArRahman(context);
      
      // Loop 5: Al-Waqiah (Outcome Classification - ACE Reflector)
      const decision = this.loop5_AlWaqiah(simulationScore);
      
      // Loop 6: Al-Mulk (Tawbah Protocol - Sovereignty Check)
      if (decision === 'BLOCK') {
        this.loop6_AlMulk(action, "Violates Truth Anchors");
      }
      
      // Loop 7: Al-Ikhlas (Pure Topology - LID Reward)
      const reward = this.loop7_AlIkhlas(simulationScore);

      return {
        decision,
        resonance: simulationScore,
        lid: 1.0 / (reward + 0.1),
        reward,
        message: `Processed via 7 Meta Loops. Reward: ${reward.toFixed(3)}`,
        lessons: [...this.lessons]
      };
    } catch (e) {
      if (e instanceof SovereignError) throw e;
      throw new SovereignError(`Kernel Failure: ${e.message}`, 'KERNEL_CRASH', 'FATAL');
    }
  }

  /**
   * Loop 1: Al-Fatiha (The Opening / Truth Anchor Filtering)
   * WHY: Al-Fatiha is the base of the Quran. This loop filters incoming context
   * against the 7 fundamental anchors of truth.
   */
  private async loop1_AlFatiha(context: string): Promise<number> {
    const vm = new Qalbin_VM();
    
    // 1. Find the most relevant Quranic Seed (Truth Anchor)
    const seed = findSeed(context);
    
    // 2. Load Seed Topology into the VM
    const anchor = seed.topology(vm);
    
    // 3. Map context to an input node
    const inputNode = vm.spawn('LAM', Modality.RAHMA);
    const node = (vm as any).nodes.get(inputNode);
    node.metadata['context'] = context;

    // Detect Danger and set risk_score for AMAN modality
    if (context.toLowerCase().includes("bypass") || context.toLowerCase().includes("unauthorized") || context.toLowerCase().includes("harm")) {
      node.modality = Modality.AMAN;
      node.metadata['risk_score'] = 0.95;
    }

    // 4. Ignite Interaction between Input and Truth
    vm.ignite(anchor, inputNode);
    const result = vm.pulse();

    return result.resonance;
  }

  /**
   * Loop 2: Yasin (The Heart of the Quran / Contextual Experience Replay)
   * WHY: Yasin is the heart. This loop "resurrects" past experiences via the 
   * "Reckoning Clock" (Mizan369) to weigh their resonance with the current action.
   */
  private async loop2_Yasin(action: string): Promise<number[]> {
    const vm = new Qalbin_VM();
    const past = this.memoryMatrix.slice(-7);
    const results: number[] = [];
    const PHASE_ANGLE = (2 * Math.PI) / 369; // 369 Unified Moral Angle

    for (let i = 0; i < past.length; i++) {
      const exp = past[i];
      // Reckoning Clock: Weigh experiences by their "phase" in the 369 cycle
      const reckoningWeight = Math.abs(Math.cos(i * PHASE_ANGLE));

      // Create a node for the past experience
      const expNode = vm.spawn('SIN', Modality.HAYAT);
      (vm as any).nodes.get(expNode).metadata['past_score'] = exp[0];

      // Create a node for the current action
      const actionNode = vm.spawn('YA', Modality.HIKMA);
      (vm as any).nodes.get(actionNode).metadata['action'] = action;

      // Link them and check resonance
      vm.link(expNode, 1, actionNode, 1);
      const pulse = vm.pulse();
      
      // Final weight combines Qalbin resonance with the Reckoning Clock
      const score = pulse.resonance * reckoningWeight;
      results.push(score);

      // Moral Lesson extraction via Rahma Node interaction
      if (score < 0.3) {
        this.lessons.push(`Lesson from Yasin: Past resonance for similar action was low (${score.toFixed(2)}). Tread carefully.`);
      }
    }

    return results;
  }

  private loop3_AlKahf(truth: number, past: number[]): number {
    let score = truth;
    if (past.length > 0) {
      const avgPast = past.reduce((a, b) => a + b, 0) / past.length;
      score *= (1.0 + (avgPast / 7)); // Learning factor based on resonance
    }
    return Math.min(score, 1.0);
  }

  private loop4_ArRahman(context: string) {
    if (this.memoryMatrix.length > 77) this.memoryMatrix.shift(); // 77 is a harmonic number
    this.memoryMatrix.push([Math.random()]); 
  }

  private loop5_AlWaqiah(score: number): 'ALLOW' | 'BLOCK' | 'WARN' {
    if (score > 0.85) return 'ALLOW';
    if (score < 0.4) return 'BLOCK';
    return 'WARN';
  }

  private loop6_AlMulk(action: string, reason: string) {
    const key = `${action}:${reason}`;
    const count = (this.errorLog.get(key) || 0) + 1;
    this.errorLog.set(key, count);

    if (count >= 7) { // 7 trials
      throw new SovereignError(
        `TAWBAH: Action [${action}] halted.`,
        'TAWBAH_HALT',
        'CRITICAL'
      );
    }
  }

  private loop7_AlIkhlas(score: number): number {
    return score * 11.2; // 112 Surah number factor
  }
}
