// بسم الله الرحمن الرحيم

/**
 * 🧪 RewardEngine + Pristine Path Tests
 *
 * "وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ" — النجم: 39
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RewardEngine } from '#rewards/engine';
import { RewardLedger } from '#rewards/ledger';
import {
  PRISTINE_MULTIPLIER, REPEATED_MULTIPLIER, STALE_MULTIPLIER, STALE_THRESHOLD,
} from '#rewards/types';
import type { WorkerReport } from '#workers/protocol';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReport(workerId: string, status: 'PASS' | 'FAIL' = 'PASS'): WorkerReport {
  return {
    mission_id: 'test_mission',
    worker_id: workerId,
    intent: 'Test worker execution',
    context_snapshot: {
      resonance_score: 1.0,
      novelty_score: 0.0,
    },
    artifacts: [],
    implemented: status === 'PASS' ? ['task done'] : [],
    undone: [],
    commands_run: [],
    issues_discovered: [],
    skills_used: [],
    procedures_followed: status === 'PASS',
    status,
    exit_code: status === 'PASS' ? 0 : 1,
    source_attestations: [],
    no_mock_verified: true,
    timestamp: Date.now(),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RewardEngine — محرك المكافآت', () => {

  beforeEach(() => {
    RewardLedger.resetPathRegistry();
  });

  // ── Test 1: PathKey Builder ─────────────────────────────────────────────────

  describe('buildPathKey() — بناء مفتاح المسار', () => {
    it('يبني PathKey صحيح من تقارير الوكلاء', () => {
      const reports = [
        makeReport('ResonanceWorker', 'PASS'),
        makeReport('ResearchWorker', 'PASS'),
        makeReport('ValidationWorker', 'PASS'),
        makeReport('ExecutionWorker', 'PASS'),
      ];

      const key = RewardEngine.buildPathKey(reports);
      expect(key).toBe(
        'ResonanceWorker:PASS:0→ResearchWorker:PASS:0→ValidationWorker:PASS:0→ExecutionWorker:PASS:0'
      );
    });

    it('يُنتج مفاتيح مختلفة لمسارات مختلفة', () => {
      const path1 = RewardEngine.buildPathKey([
        makeReport('ResonanceWorker', 'PASS'),
        makeReport('ExecutionWorker', 'PASS'),
      ]);
      const path2 = RewardEngine.buildPathKey([
        makeReport('ResonanceWorker', 'PASS'),
        makeReport('ExecutionWorker', 'FAIL'),
      ]);

      expect(path1).not.toBe(path2);
    });

    it('يُنتج مفتاحاً فارغاً لقائمة فارغة', () => {
      const key = RewardEngine.buildPathKey([]);
      expect(key).toBe('');
    });
  });

  // ── Test 2: Pristine Path ───────────────────────────────────────────────────

  describe('isPristinePath() — المسار البكر', () => {
    it('مسار جديد = بكر × 2.0', () => {
      const result = RewardEngine.isPristinePath('new:path:key');

      expect(result.is_pristine).toBe(true);
      expect(result.multiplier).toBe(PRISTINE_MULTIPLIER);
      expect(result.previous_uses).toBe(0);
    });

    it('مسار مكرر مرة = عادي × 1.0', () => {
      const key = 'repeated:path';
      RewardLedger.recordPathKey(key); // تسجيل مرة

      const result = RewardEngine.isPristinePath(key);

      expect(result.is_pristine).toBe(false);
      expect(result.multiplier).toBe(REPEATED_MULTIPLIER);
      expect(result.previous_uses).toBe(1);
    });

    it(`مسار مكرر ${STALE_THRESHOLD}+ مرات = قديم × 0.7`, () => {
      const key = 'stale:path';
      for (let i = 0; i < STALE_THRESHOLD; i++) {
        RewardLedger.recordPathKey(key);
      }

      const result = RewardEngine.isPristinePath(key);

      expect(result.is_pristine).toBe(false);
      expect(result.multiplier).toBe(STALE_MULTIPLIER);
      expect(result.previous_uses).toBe(STALE_THRESHOLD);
    });
  });

  // ── Test 3: computeReward ───────────────────────────────────────────────────

  describe('computeReward() — حساب المكافأة', () => {
    it('مسار بكر يُضاعف المكافأة × 2.0', () => {
      const vector = { novelty: 0.35, resonance: 0.3, topology: 0.3, penalty: 0 };
      const pathKey = 'pristine:mission:path';

      const { base, total, multiplier, pristine } = RewardEngine.computeReward(vector, pathKey);

      expect(pristine).toBe(true);
      expect(multiplier).toBe(2.0);
      expect(total).toBeCloseTo(base * 2.0, 5);
      expect(total).toBeGreaterThan(base);
    });

    it('مسار مكرر يحصل على × 1.0', () => {
      const key = 'repeated:key';
      RewardLedger.recordPathKey(key);

      const vector = { novelty: 0.35, resonance: 0.3, topology: 0.3, penalty: 0 };
      const { multiplier, pristine } = RewardEngine.computeReward(vector, key);

      expect(pristine).toBe(false);
      expect(multiplier).toBe(1.0);
    });

    it('العقوبة تُقلل المكافأة', () => {
      const withPenalty = RewardEngine.computeReward({
        novelty: 0.35, resonance: 0.3, topology: 0.3, penalty: 0.5,
      });
      const withoutPenalty = RewardEngine.computeReward({
        novelty: 0.35, resonance: 0.3, topology: 0.3, penalty: 0,
      });

      expect(withPenalty.base).toBeLessThan(withoutPenalty.base);
    });

    it('المكافأة لا تكون سالبة', () => {
      const { base } = RewardEngine.computeReward({
        novelty: 0, resonance: 0, topology: 0, penalty: 999,
      });
      expect(base).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Test 4: classifyDiscovery ───────────────────────────────────────────────

  describe('classifyDiscovery() — تصنيف الاكتشاف', () => {
    it('يُصنّف المكافآت بشكل صحيح', () => {
      expect(RewardEngine.classifyDiscovery(3.5)).toBe('revelation');
      expect(RewardEngine.classifyDiscovery(2.5)).toBe('resonance');
      expect(RewardEngine.classifyDiscovery(1.7)).toBe('tree');
      expect(RewardEngine.classifyDiscovery(1.0)).toBe('branch');
      expect(RewardEngine.classifyDiscovery(0.5)).toBe('seed');
    });
  });

  // ── Test 5: grant ───────────────────────────────────────────────────────────

  describe('grant() — منح المكافأة', () => {
    it('يمنح مكافأة مع مضاعف المسار البكر', async () => {
      const reports = [
        makeReport('ResonanceWorker', 'PASS'),
        makeReport('ExecutionWorker', 'PASS'),
      ];

      const entry = await RewardEngine.grant(
        'test_mission_grant',
        'ExecutionWorker',
        { novelty: 0.35, resonance: 0.3, topology: 0.3, penalty: 0 },
        reports,
        'test grant'
      );

      expect(entry.pristine_multiplier_applied).toBe(true);
      expect(entry.multiplier_value).toBe(2.0);
      expect(entry.total_reward).toBeGreaterThan(entry.base_reward);
      expect(entry.ledger_id).toBeDefined();
    });

    it('المسار نفسه مرتين: الأولى بكر، الثانية عادي', async () => {
      const reports = [makeReport('ResearchWorker', 'PASS')];

      const entry1 = await RewardEngine.grant(
        'mission_a', 'ResearchWorker',
        { novelty: 0.3, resonance: 0.3, topology: 0.2, penalty: 0 },
        reports
      );

      const entry2 = await RewardEngine.grant(
        'mission_b', 'ResearchWorker',
        { novelty: 0.3, resonance: 0.3, topology: 0.2, penalty: 0 },
        reports
      );

      expect(entry1.pristine_multiplier_applied).toBe(true);
      expect(entry2.pristine_multiplier_applied).toBe(false);
      expect(entry1.total_reward).toBeGreaterThan(entry2.total_reward);
    });
  });

  // ── Test 6: grantFromReports ────────────────────────────────────────────────

  describe('grantFromReports() — منح من التقارير', () => {
    it('يمنح مكافأة من تقارير الوكلاء', async () => {
      const reports = [
        makeReport('ResonanceWorker', 'PASS'),
        makeReport('ResearchWorker', 'PASS'),
        makeReport('ValidationWorker', 'PASS'),
        makeReport('ExecutionWorker', 'PASS'),
      ];

      const entry = await RewardEngine.grantFromReports(
        'full_mission_test',
        reports,
        0.85
      );

      expect(entry.total_reward).toBeGreaterThan(0);
      expect(entry.path_key).toBeDefined();
      expect(entry.path_key).toContain('ResonanceWorker');
      expect(entry.path_key).toContain('ExecutionWorker');
    });
  });

  // ── Test 7: RewardLedger ────────────────────────────────────────────────────

  describe('RewardLedger — سجل المكافآت', () => {
    it('يُسجّل PathKey ويُحدّث العداد', () => {
      const key = 'test:path:key';

      expect(RewardLedger.getPathUseCount(key)).toBe(0);

      RewardLedger.recordPathKey(key);
      expect(RewardLedger.getPathUseCount(key)).toBe(1);

      RewardLedger.recordPathKey(key);
      expect(RewardLedger.getPathUseCount(key)).toBe(2);
    });

    it('يُرجع كل المسارات المسجّلة', () => {
      RewardLedger.recordPathKey('path:a');
      RewardLedger.recordPathKey('path:b');
      RewardLedger.recordPathKey('path:a'); // مرة ثانية

      const all = RewardLedger.getAllPathKeys();
      expect(all.size).toBe(2);
      expect(all.get('path:a')).toBe(2);
      expect(all.get('path:b')).toBe(1);
    });

    it('uniquePathCount يُرجع عدد المسارات الفريدة', () => {
      RewardLedger.recordPathKey('unique:1');
      RewardLedger.recordPathKey('unique:2');
      RewardLedger.recordPathKey('unique:1');

      expect(RewardLedger.uniquePathCount).toBe(2);
    });
  });

  // ── Test 8: الأداء ──────────────────────────────────────────────────────────

  describe('الأداء', () => {
    it('يفحص 1000 مسار في أقل من 100ms', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        RewardEngine.isPristinePath(`path:${i}`);
      }

      expect(Date.now() - start).toBeLessThan(100);
    });

    it('computePristineMultiplier سريع جداً', () => {
      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        RewardEngine.computePristineMultiplier(`key:${i % 100}`);
      }
      expect(Date.now() - start).toBeLessThan(200);
    });
  });
});
