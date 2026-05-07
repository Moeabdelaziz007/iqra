import { RewardInput, RewardOutput, DiscoveryLevel, RewardVector } from './types';
import { REWARD_WEIGHTS, REWARD_THRESHOLDS, CLAMPS, PENALTIES } from './constants';

/**
 * 🌙 IQRA Reward Engine — محرك المكافآت
 * 
 * Pure deterministic functions for computing topological curiosity rewards.
 */

export class RewardEngine {
  
  static computeNoveltyReward(score: number): number {
    return this.clamp(score) * REWARD_WEIGHTS.NOVELTY;
  }

  static computeResonanceReward(score: number): number {
    return this.clamp(score) * REWARD_WEIGHTS.RESONANCE;
  }

  static computeTopologyReward(score: number): number {
    return this.clamp(score) * REWARD_WEIGHTS.TOPOLOGY;
  }

  static computePenalty(penalty: number): number {
    return this.clamp(penalty) * PENALTIES.HALLUCINATION_MULTIPLIER;
  }

  static computeTotalReward(input: RewardInput): RewardOutput {
    // 1. Validation
    this.validateInput(input);

    // 2. Component rewards
    const novelty = this.computeNoveltyReward(input.novelty_score);
    const resonance = this.computeResonanceReward(input.resonance_score);
    const topology = this.computeTopologyReward(input.topology_score);
    const penalty = this.computePenalty(input.hallucination_penalty);

    // 3. Total calculation
    let total = (novelty + resonance + topology) - penalty;
    total = Math.max(CLAMPS.MIN_REWARD, total);

    // 4. Discovery level
    const level = this.determineDiscoveryLevel(total);

    return {
      total_reward: total,
      discovery_level: level,
      confidence: 1.0 - (input.hallucination_penalty * 0.5), // Heuristic confidence
      reward_vector: {
        novelty,
        resonance,
        topology,
        penalty
      }
    };
  }

  static determineDiscoveryLevel(score: number): DiscoveryLevel {
    if (score >= REWARD_THRESHOLDS.RESONANCE) return DiscoveryLevel.RESONANCE;
    if (score >= REWARD_THRESHOLDS.TREE) return DiscoveryLevel.TREE;
    if (score >= REWARD_THRESHOLDS.BRANCH) return DiscoveryLevel.BRANCH;
    if (score >= REWARD_THRESHOLDS.SPROUT) return DiscoveryLevel.SPROUT;
    return DiscoveryLevel.SEED;
  }

  private static clamp(val: number): number {
    if (isNaN(val)) return CLAMPS.MIN_SCORE;
    return Math.min(Math.max(val, CLAMPS.MIN_SCORE), CLAMPS.MAX_SCORE);
  }

  private static validateInput(input: RewardInput): void {
    if (!input.mission_id || !input.worker_id) {
      throw new Error('Invalid input: mission_id and worker_id are required.');
    }
    const scores = [input.novelty_score, input.resonance_score, input.topology_score, input.hallucination_penalty];
    if (scores.some(s => isNaN(s) || s === undefined)) {
      throw new Error('Invalid input: scores must be numeric and defined.');
    }
  }
}
