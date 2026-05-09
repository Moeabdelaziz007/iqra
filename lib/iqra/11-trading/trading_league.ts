import { SelfPlayLoop } from './self_play_loop';
import { IQRALogger } from '#infra/logger';

/**
 * 🏆 Trading League — بنية الدوري
 * Inspired by DeepMind AlphaStar.
 * 
 * Manages multiple agent personalities to explore different market strategies.
 */
export enum AgentPersonality {
  MAIN = 'MAIN',           // Balanced, Risk-Averse
  EXPLOITER = 'EXPLOITER', // Aggressive, High-Risk
  DEFENSIVE = 'DEFENSIVE'  // Ultra-Conservative
}

export class TradingLeague {
  private loops: Map<AgentPersonality, SelfPlayLoop>;

  constructor() {
    this.loops = new Map();
    this.loops.set(AgentPersonality.MAIN, new SelfPlayLoop());
    this.loops.set(AgentPersonality.EXPLOITER, new SelfPlayLoop());
    this.loops.set(AgentPersonality.DEFENSIVE, new SelfPlayLoop());
  }

  /**
   * 🚀 Run League Cycle
   * Every personality runs its own MCTS simulation.
   */
  async runCycle(symbol: string) {
    IQRALogger.info(`🏆 [LEAGUE] Starting League Cycle for ${symbol}`);
    
    for (const [personality, loop] of this.loops.entries()) {
      IQRALogger.info(`🎭 [AGENT] Personality: ${personality}`);
      // In a real implementation, the MCTS parameters would change based on personality.
      await loop.runStep(symbol);
    }
    
    IQRALogger.info(`✅ [LEAGUE] Cycle Complete.`);
  }
}
