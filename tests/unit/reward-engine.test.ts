import { describe, it, expect } from 'vitest';
import { RewardEngine } from '../../rewards/engine';
import { DiscoveryLevel } from '../../rewards/types';

describe('RewardEngine', () => {
  it('should compute valid rewards for standard inputs', () => {
    const input = {
      mission_id: 'test-mission',
      worker_id: 'test-worker',
      novelty_score: 0.8,
      resonance_score: 0.8,
      topology_score: 0.8,
      hallucination_penalty: 0.0,
      timestamp: Date.now()
    };
    
    const output = RewardEngine.computeTotalReward(input);
    expect(output.total_reward).toBeCloseTo(0.8);
    expect(output.discovery_level).toBe(DiscoveryLevel.BRANCH);
  });

  it('should apply severe penalties for hallucinations', () => {
    const input = {
      mission_id: 'test-mission',
      worker_id: 'test-worker',
      novelty_score: 1.0,
      resonance_score: 1.0,
      topology_score: 1.0,
      hallucination_penalty: 0.5, // 0.5 * 2.0 = 1.0 penalty
      timestamp: Date.now()
    };
    
    const output = RewardEngine.computeTotalReward(input);
    expect(output.total_reward).toBe(0.0);
    expect(output.discovery_level).toBe(DiscoveryLevel.SEED);
  });

  it('should transition through discovery levels correctly', () => {
    const compute = (score: number) => RewardEngine.computeTotalReward({
      mission_id: 'm', worker_id: 'w',
      novelty_score: score, resonance_score: score, topology_score: score,
      hallucination_penalty: 0, timestamp: 0
    });

    expect(compute(0.1).discovery_level).toBe(DiscoveryLevel.SEED);
    expect(compute(0.5).discovery_level).toBe(DiscoveryLevel.SPROUT);
    expect(compute(0.7).discovery_level).toBe(DiscoveryLevel.BRANCH);
    expect(compute(0.85).discovery_level).toBe(DiscoveryLevel.TREE);
    expect(compute(0.96).discovery_level).toBe(DiscoveryLevel.RESONANCE);
  });

  it('should reject invalid inputs', () => {
    expect(() => RewardEngine.computeTotalReward({} as any)).toThrow();
  });

  it('should handle zero scores without crashing', () => {
    const output = RewardEngine.computeTotalReward({
      mission_id: 'm', worker_id: 'w',
      novelty_score: 0, resonance_score: 0, topology_score: 0,
      hallucination_penalty: 0, timestamp: 0
    });
    expect(output.total_reward).toBe(0);
  });
});
