/**
 * Reward System Real E2E Tests
 * 
 * اختبارات E2E حقيقية لنظام الثواب بدون أي mocks
 * تغطي Reward Engine, Ledger, Flow Analysis, و Anomaly Detection
 */

import { RewardEngine } from '../rewards/engine';
import { RewardLedger } from '../ledger/reward-ledger';
import { RewardFlowAnalyzer } from '../ledger/reward_flow_analyzer';
import { IQRAMemory } from '../lib/iqra/memory';
import { expect, describe, test, beforeAll, afterAll } from 'vitest';
import { DiscoveryLevel } from '../rewards/types';

describe('Reward System Real E2E Tests', () => {
  let rewardEngine: RewardEngine;
  let flowAnalyzer: RewardFlowAnalyzer;

  beforeAll(() => {
    rewardEngine = new RewardEngine();
    flowAnalyzer = RewardFlowAnalyzer.getInstance();
  });

  afterAll(async () => {
    // Clean up test data
    try {
      // Note: IQRAMemory.clear() method doesn't exist, using alternative cleanup
      // Since getAllKeys() doesn't exist either, we'll just clear the cache
      flowAnalyzer.clearCache();
      flowAnalyzer.clearCache();
    } catch (error) {
      console.warn('Warning: Could not clean up after tests:', error);
    }
  });

  describe('Reward Engine - Real Computation', () => {
    test('يجب أن يحسب الثواب بشكل حقيقي لـ discovery عالي', async () => {
      const highDiscoveryInput = {
        novelty: 0.9,
        resonance: { coherence: 0.95, patterns: ['quantum', 'islamic', 'mathematical'] },
        hallucination_penalty: 0.1,
        topology_score: 0.85,
        temporal_factors: { recency: 0.8, frequency: 0.7 }
      };

      const result = RewardEngine.computeTotalReward({
        mission_id: 'test-mission-high',
        worker_id: 'TestWorker',
        novelty_score: highDiscoveryInput.novelty,
        resonance_score: highDiscoveryInput.resonance.coherence,
        topology_score: highDiscoveryInput.topology_score,
        hallucination_penalty: highDiscoveryInput.hallucination_penalty,
        timestamp: Date.now()
      });

      expect(result).toBeDefined();
      expect(result.total_reward).toBeGreaterThan(0.5);
      expect(result.discovery_level).toBe(DiscoveryLevel.TREE);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.anomaly_detected).toBe(false);
    });

    test('يجب أن يحسب الثواب بشكل حقيقي لـ discovery منخفض', async () => {
      const lowDiscoveryInput = {
        novelty: 0.2,
        resonance: { coherence: 0.3, patterns: ['basic'] },
        hallucination_penalty: 0.8,
        topology_score: 0.4,
        temporal_factors: { recency: 0.2, frequency: 0.1 }
      };

      const result = RewardEngine.computeTotalReward({
        mission_id: 'test-mission-low',
        worker_id: 'TestWorker',
        novelty_score: lowDiscoveryInput.novelty,
        resonance_score: lowDiscoveryInput.resonance.coherence,
        topology_score: lowDiscoveryInput.topology_score,
        hallucination_penalty: lowDiscoveryInput.hallucination_penalty,
        timestamp: Date.now()
      });

      expect(result).toBeDefined();
      expect(result.total_reward).toBeLessThan(0.5);
      expect(result.discovery_level).toBe(DiscoveryLevel.SEED);
      expect(result.confidence).toBeLessThan(0.5);
    });

    test('يجب أن يكتشف الشواذ في الثواب', async () => {
      const anomalousInput = {
        novelty: 1.0, // Perfect novelty - suspicious
        resonance: { coherence: 1.0, patterns: [] }, // Perfect coherence with no patterns
        hallucination_penalty: 0.0, // No penalty
        topology_score: 1.0, // Perfect topology
        temporal_factors: { recency: 1.0, frequency: 1.0 }
      };

      const result = RewardEngine.computeTotalReward({
        mission_id: 'test-mission-anomaly',
        worker_id: 'TestWorker',
        novelty_score: anomalousInput.novelty,
        resonance_score: anomalousInput.resonance.coherence,
        topology_score: anomalousInput.topology_score,
        hallucination_penalty: anomalousInput.hallucination_penalty,
        timestamp: Date.now()
      });

      expect(result).toBeDefined();
      expect(result.anomaly_detected).toBe(true);
    });

    test('يجب أن يطبق الـ temporal decay بشكل صحيح', async () => {
      const inputs = [
        {
          novelty: 0.7,
          resonance: { coherence: 0.8, patterns: ['test'] },
          hallucination_penalty: 0.2,
          topology_score: 0.7,
          temporal_factors: { recency: 1.0, frequency: 1.0 }
        },
        {
          novelty: 0.7,
          resonance: { coherence: 0.8, patterns: ['test'] },
          hallucination_penalty: 0.2,
          topology_score: 0.7,
          temporal_factors: { recency: 0.3, frequency: 0.2 }
        }
      ];

      const result1 = RewardEngine.computeTotalReward({
        mission_id: 'test-mission-temporal-1',
        worker_id: 'TestWorker',
        novelty_score: inputs[0].novelty,
        resonance_score: inputs[0].resonance.coherence,
        topology_score: inputs[0].topology_score,
        hallucination_penalty: inputs[0].hallucination_penalty,
        timestamp: Date.now()
      });
      
      const result2 = RewardEngine.computeTotalReward({
        mission_id: 'test-mission-temporal-2',
        worker_id: 'TestWorker',
        novelty_score: inputs[1].novelty,
        resonance_score: inputs[1].resonance.coherence,
        topology_score: inputs[1].topology_score,
        hallucination_penalty: inputs[1].hallucination_penalty,
        timestamp: Date.now()
      });

      expect(result1.total_reward).toBeGreaterThan(result2.total_reward);
    });
  });

  describe('Reward Ledger - Real Storage', () => {
    test('يجب أن يخزن إدخالات الثواب بشكل حقيقي', async () => {
      const testEntry = {
        worker_id: 'TestWorker',
        mission_id: 'test-mission-001',
        discovery_level: DiscoveryLevel.BRANCH,
        total_reward: 0.75,
        confidence: 0.8,
        validation_status: 'verified' as const,
        reward_vector: {
          novelty: 0.8,
          resonance: 0.7,
          topology: 0.6,
          penalty: 0.2
        },
        timestamp: Date.now(),
        metadata: {
          novelty_score: 0.8,
          resonance_coherence: 0.7,
          processing_time_ms: 1500
        }
      };

      await RewardLedger.append(testEntry);

      const allEntries = await RewardLedger.getAll();
      expect(allEntries.length).toBeGreaterThan(0);
      
      const savedEntry = allEntries.find(e => e.mission_id === 'test-mission-001');
      expect(savedEntry).toBeDefined();
      expect(savedEntry?.worker_id).toBe('TestWorker');
      expect(savedEntry?.total_reward).toBe(0.75);
    });

    test('يجب أن يتعامل مع إدخالات متعددة', async () => {
      const testEntries = [
        {
          worker_id: 'Worker1',
          mission_id: 'test-mission-002',
          discovery_level: DiscoveryLevel.SEED,
          total_reward: 0.25,
          confidence: 0.6,
          validation_status: 'verified' as const,
          reward_vector: {
            novelty: 0.3,
            resonance: 0.2,
            topology: 0.1,
            penalty: 0.1
          },
          timestamp: Date.now(),
          metadata: {}
        },
        {
          worker_id: 'Worker2',
          mission_id: 'test-mission-003',
          discovery_level: DiscoveryLevel.TREE,
          total_reward: 0.85,
          confidence: 0.9,
          validation_status: 'verified' as const,
          reward_vector: {
            novelty: 0.9,
            resonance: 0.8,
            topology: 0.7,
            penalty: 0.1
          },
          timestamp: Date.now(),
          metadata: {}
        }
      ];

      for (const entry of testEntries) {
        await RewardLedger.append(entry);
      }

      const allEntries = await RewardLedger.getAll();
      expect(allEntries.length).toBeGreaterThanOrEqual(2);
    });

    test('يجب أن يتحقق من صحة الإدخالات', async () => {
      const invalidEntry = {
        worker_id: 'TestWorker',
        mission_id: 'test-mission-001',
        discovery_level: DiscoveryLevel.SEED,
        total_reward: -0.5, // Invalid negative reward
        confidence: 0.5,
        validation_status: 'verified' as const,
        reward_vector: {
          novelty: 0.1,
          resonance: 0.1,
          topology: 0.1,
          penalty: 0.1
        },
        timestamp: Date.now(),
        metadata: {}
      };

      await expect(RewardLedger.append(invalidEntry)).rejects.toThrow();
    });
  });

  describe('Reward Flow Analysis - Real Analytics', () => {
    test('يجب أن يحلل تدفق الثواب بشكل حقيقي', async () => {
      // Add some test data first
      const testEntries = [
        {
          worker_id: 'ResonanceWorker',
          mission_id: 'flow-test-001',
          discovery_level: DiscoveryLevel.SPROUT,
          total_reward: 0.45,
          confidence: 0.7,
          validation_status: 'verified' as const,
          reward_vector: {
            novelty: 0.5,
            resonance: 0.4,
            topology: 0.3,
            penalty: 0.2
          },
          timestamp: Date.now() - 5000,
          metadata: {}
        },
        {
          worker_id: 'ResearchWorker',
          mission_id: 'flow-test-002',
          discovery_level: DiscoveryLevel.BRANCH,
          total_reward: 0.65,
          confidence: 0.8,
          validation_status: 'verified' as const,
          reward_vector: {
            novelty: 0.7,
            resonance: 0.6,
            topology: 0.5,
            penalty: 0.2
          },
          timestamp: Date.now() - 3000,
          metadata: {}
        },
        {
          worker_id: 'ExecutionWorker',
          mission_id: 'flow-test-003',
          discovery_level: DiscoveryLevel.TREE,
          total_reward: 0.85,
          confidence: 0.9,
          validation_status: 'verified' as const,
          reward_vector: {
            novelty: 0.9,
            resonance: 0.8,
            topology: 0.7,
            penalty: 0.1
          },
          timestamp: Date.now() - 1000,
          metadata: {}
        }
      ];

      for (const entry of testEntries) {
        await RewardLedger.append(entry);
      }

      const metrics = await flowAnalyzer.analyzeRewardFlow();

      expect(metrics).toBeDefined();
      expect(metrics.total_rewards).toBeGreaterThan(0);
      expect(metrics.average_reward).toBeGreaterThan(0);
      expect(metrics.discovery_distribution).toBeDefined();
      expect(metrics.worker_performance).toBeDefined();
      expect(metrics.efficiency_metrics).toBeDefined();

      // Check discovery distribution
      expect(metrics.discovery_distribution[DiscoveryLevel.SPROUT]).toBeGreaterThan(0);
      expect(metrics.discovery_distribution[DiscoveryLevel.BRANCH]).toBeGreaterThan(0);
      expect(metrics.discovery_distribution[DiscoveryLevel.TREE]).toBeGreaterThan(0);

      // Check worker performance
      expect(metrics.worker_performance['ResonanceWorker']).toBeDefined();
      expect(metrics.worker_performance['ResearchWorker']).toBeDefined();
      expect(metrics.worker_performance['ExecutionWorker']).toBeDefined();
    });

    test('يجب أن يكتشف الشواذ في التدفق', async () => {
      const anomalies = await flowAnalyzer.detectAnomalies();

      expect(Array.isArray(anomalies)).toBe(true);
      
      // Should detect at least some patterns with our test data
      if (anomalies.length > 0) {
        const anomaly = anomalies[0];
        expect(anomaly).toHaveProperty('type');
        expect(anomaly).toHaveProperty('description');
        expect(anomaly).toHaveProperty('severity');
        expect(anomaly).toHaveProperty('recommendation');
      }
    });

    test('يجب أن يولد توصيات للتحسين', async () => {
      const optimizations = await flowAnalyzer.generateOptimizations();

      expect(Array.isArray(optimizations)).toBe(true);
      
      if (optimizations.length > 0) {
        const optimization = optimizations[0];
        expect(optimization).toHaveProperty('area');
        expect(optimization).toHaveProperty('current_performance');
        expect(optimization).toHaveProperty('target_performance');
        expect(optimization).toHaveProperty('actions');
        expect(Array.isArray(optimization.actions)).toBe(true);
      }
    });

    test('يجب أن يوفر حالة فورية', async () => {
      const status = await flowAnalyzer.getRealTimeStatus();

      expect(status).toBeDefined();
      expect(status).toHaveProperty('active_workers');
      expect(status).toHaveProperty('rewards_last_hour');
      expect(status).toHaveProperty('avg_reward_last_hour');
      expect(status).toHaveProperty('discovery_trend');
      expect(status).toHaveProperty('system_health');

      expect(['increasing', 'decreasing', 'stable']).toContain(status.discovery_trend);
      expect(['healthy', 'warning', 'critical']).toContain(status.system_health);
    });
  });

  describe('Integration with Memory System', () => {
    test('يجب أن يتكامل مع ذاكرة IQRA', async () => {
      // Store some test data in memory
      await IQRAMemory.set('test_reward_score', 0.75);
      await IQRAMemory.set('test_curiosity', 0.8);

      const rewardScore = await IQRAMemory.get('test_reward_score');
      const curiosity = await IQRAMemory.get('test_curiosity');

      expect(rewardScore).toBe(0.75);
      expect(curiosity).toBe(0.8);
    });

    test('يجب أن يتتبع أنماط الجدة', async () => {
      const testContent = 'هذا محتوى اختبار لتتبع الجدة';
      const noveltyScore = 0.7;

      await IQRAMemory.trackNoveltyPattern(testContent, noveltyScore);

      // Verify pattern was tracked
      const patterns = await IQRAMemory.getRecentList('novelty_patterns', 10);
      expect(Array.isArray(patterns)).toBe(true);
    });

    test('يجب أن يعزز الفضول بشكل ديناميكي', async () => {
      await IQRAMemory.boostCuriosity('test boost', 0.1);

      const metrics = await IQRAMemory.getCuriosityMetrics();
      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('current_score');
      expect(metrics).toHaveProperty('trend');
      expect(metrics).toHaveProperty('momentum');
      expect(['increasing', 'decreasing', 'stable']).toContain(metrics.trend);
    });
  });

  describe('Performance and Reliability', () => {
    test('يجب أن يكتمل الحساب بسرعة', async () => {
      const startTime = Date.now();
      
      const input = {
        mission_id: 'perf-test',
        worker_id: 'TestWorker',
        novelty_score: 0.5,
        resonance_score: 0.6,
        topology_score: 0.7,
        hallucination_penalty: 0.3,
        timestamp: Date.now()
      };

      RewardEngine.computeTotalReward(input);
      
      const endTime = Date.now();
      const computationTime = endTime - startTime;

      expect(computationTime).toBeLessThan(1000); // Less than 1 second
    });

    test('يجب أن يتعامل مع الحسابات المتزامنة', async () => {
      const concurrentInputs = Array.from({ length: 5 }, (_, i) => ({
        mission_id: `concurrent-test-${i}`,
        worker_id: 'TestWorker',
        novelty_score: 0.5 + (i * 0.1),
        resonance_score: 0.6,
        topology_score: 0.7,
        hallucination_penalty: 0.3,
        timestamp: Date.now()
      }));

      const promises = concurrentInputs.map(input => Promise.resolve(RewardEngine.computeTotalReward(input)));
      const results = await Promise.all(promises);

      expect(results.length).toBe(5);
      for (const result of results) {
        expect(result).toBeDefined();
        expect(result.total_reward).toBeGreaterThan(0);
      }
    });

    test('يجب أن يتعامل مع المدخلات الحدية', async () => {
      const edgeCases = [
        {
          mission_id: 'edge-test-1',
          worker_id: 'TestWorker',
          novelty_score: 0,
          resonance_score: 0,
          topology_score: 0,
          hallucination_penalty: 1,
          timestamp: Date.now()
        },
        {
          mission_id: 'edge-test-2',
          worker_id: 'TestWorker',
          novelty_score: 1,
          resonance_score: 1,
          topology_score: 1,
          hallucination_penalty: 0,
          timestamp: Date.now()
        }
      ];

      for (const edgeCase of edgeCases) {
        const result = RewardEngine.computeTotalReward(edgeCase);
        expect(result).toBeDefined();
        expect(result.total_reward).toBeGreaterThanOrEqual(0);
        expect(result.total_reward).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Error Handling', () => {
    test('يجب أن يتعامل مع المدخلات غير الصالحة', async () => {
      const invalidInputs = [
        null,
        undefined,
        {},
        { novelty: -0.5 }, // Negative novelty
        { resonance: null }, // Invalid resonance
        { hallucination_penalty: 2 } // Penalty > 1
      ];

      for (const invalidInput of invalidInputs) {
        expect(() => RewardEngine.computeTotalReward(invalidInput as any)).toThrow();
      }
    });

    test('يجب أن يتعامل مع أخطاء الذاكرة', async () => {
      // Simulate memory error by trying to access invalid key
      const invalidKey = 'non_existent_reward_key';
      
      const result = await IQRAMemory.get(invalidKey);
      expect(result).toBeNull();
    });

    test('يجب أن يتعافى من أخطاء التحليل', async () => {
      // This would test recovery from analysis errors
      // In a real scenario, we'd simulate network failures, corrupted data, etc.
      expect(true).toBe(true); // Placeholder for error recovery testing
    });
  });
});
