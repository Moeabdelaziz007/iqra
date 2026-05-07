/**
 * 🌙 IQRA Reward Constants — ثوابت المكافآت
 */

export const REWARD_WEIGHTS = {
  NOVELTY: 0.35,
  RESONANCE: 0.35,
  TOPOLOGY: 0.30,
};

export const REWARD_THRESHOLDS = {
  SEED: 0.2,
  SPROUT: 0.4,
  BRANCH: 0.6,
  TREE: 0.8,
  RESONANCE: 0.95,
};

export const CLAMPS = {
  MIN_SCORE: 0.0,
  MAX_SCORE: 1.0,
  MIN_REWARD: 0.0,
  MAX_REWARD: 100.0, // Scaled for the ledger
};

export const PENALTIES = {
  HALLUCINATION_MULTIPLIER: 2.0, // Severe penalty for hallucinations
};
