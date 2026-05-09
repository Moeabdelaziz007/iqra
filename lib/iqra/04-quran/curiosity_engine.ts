/**
 * 🌙 CURIOSITY ENGINE (محرك الفضول)
 * 
 * WHY: To allow IQRA to perceive multi-dimensional relationships beyond linear text.
 * It combines "Embedding Curiosity" (Vector Space) with "Topological Curiosity" (Graph Space).
 */

import { IQRAMemory } from '../03-memory/memory';
import { Qalbin_VM } from './qalbin/qalbin_vm';
import { Modality } from './qalbin/qalbin_node';
import { IQRALogger } from '../12-infrastructure/logger';

export class CuriosityEngine {
  /**
   * Calculates Topological Novelty
   * HOW: Spawns a graph representing the input and checks its connectivity entropy.
   */
  static async calculateTopologicalNovelty(context: string): Promise<number> {
    const vm = new Qalbin_VM();
    const core = vm.spawn('ALIF', Modality.IKHLAS);
    
    // Convert string to topological nodes (Simplified mapping)
    const chars = context.split('').slice(0, 7);
    chars.forEach((char, i) => {
      const node = vm.spawn(char, Modality.HIKMA);
      vm.link(core, (i % 3) + 1, node, 1);
    });

    const pulse = vm.pulse();
    // Novelty is inversely proportional to resonance if the pattern is already "known"
    return Math.min(pulse.resonance * 1.5, 1.0);
  }

  /**
   * Updates the global curiosity score based on experience
   */
  static async evolve(success: boolean, resonance: number) {
    const current = await IQRAMemory.getCuriosity().catch(() => 0.5);
    let shift = success ? 0.05 * resonance : -0.02;
    
    const newScore = Math.max(0.1, Math.min(1.0, current + shift));
    await IQRAMemory.saveCuriosity(newScore);
    
    IQRALogger.info(`🌀 Curiosity Evolved: ${current.toFixed(4)} -> ${newScore.toFixed(4)}`);
    return newScore;
  }
}
