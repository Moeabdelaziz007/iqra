/**
 * 🌙 IQRA Reward Types — أنواع المكافآت
 * 
 * Defines the core data structures for the Topological Curiosity Reward Engine.
 */

export enum DiscoveryLevel {
  SEED = 'seed',
  SPROUT = 'sprout',
  BRANCH = 'branch',
  TREE = 'tree',
  RESONANCE = 'resonance'
}

export interface RewardInput {
  mission_id: string;
  worker_id: string;
  novelty_score: number;      // 0.0 - 1.0
  resonance_score: number;    // 0.0 - 1.0
  topology_score: number;     // 0.0 - 1.0
  hallucination_penalty: number; // 0.0 - 1.0
  timestamp: number;
}

export interface RewardVector {
  novelty: number;
  resonance: number;
  topology: number;
  penalty: number;
}

export interface RewardOutput {
  total_reward: number;
  discovery_level: DiscoveryLevel;
  confidence: number;
  reward_vector: RewardVector;
}

export interface RewardEntry extends RewardOutput {
  mission_id: string;
  worker_id: string;
  timestamp: number;
  notes?: string;
  validation_status: 'pending' | 'verified' | 'rejected';
}
