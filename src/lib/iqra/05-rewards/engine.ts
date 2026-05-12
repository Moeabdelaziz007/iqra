// بسم الله الرحمن الرحيم

/**
 * ⚙️ RewardEngine — محرك المكافآت
 *
 * "وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ" — النجم: 39
 */

import * as fs from 'fs';
import * as path from 'path';
import { IQRALogger } from '#infra/logger';
import { IQRAMemory } from '#memory/memory';
import { RewardLedger } from './ledger';
import type {
  PathKey, PathSegment, RewardVector, RewardEntry,
  DiscoveryLevel, PristinePathResult,
} from './types';
import {
  PRISTINE_MULTIPLIER, REPEATED_MULTIPLIER,
  STALE_MULTIPLIER, STALE_THRESHOLD,
} from './types';
import type { WorkerReport } from '#workers/protocol';

export class RewardEngine {

  static buildPathKey(reports: WorkerReport[]): PathKey {
    return reports
      .map(r => `${r.worker_id}:${r.status}:${r.exit_code}`)
      .join('→');
  }

  static isPristinePath(pathKey: PathKey): PristinePathResult {
    const uses = RewardLedger.getPathUseCount(pathKey);
    let multiplier: number;
    let isPristine: boolean;

    if (uses === 0) {
      multiplier = PRISTINE_MULTIPLIER;
      isPristine = true;
    } else if (uses >= STALE_THRESHOLD) {
      multiplier = STALE_MULTIPLIER;
      isPristine = false;
    } else {
      multiplier = REPEATED_MULTIPLIER;
      isPristine = false;
    }

    return { is_pristine: isPristine, multiplier, path_key: pathKey, previous_uses: uses };
  }

  static computeReward(
    vector: RewardVector,
    pathKey?: PathKey
  ): { base: number; total: number; multiplier: number; pristine: boolean } {
    const base = Math.max(0,
      (vector.novelty ?? 0) +
      (vector.resonance ?? 0) +
      (vector.topology ?? 0) +
      (vector.fractal ?? 0) +
      (vector.lid ?? 0) -
      Math.abs(vector.penalty ?? 0)
    );

    let multiplier = REPEATED_MULTIPLIER;
    let pristine = false;

    if (pathKey) {
      const result = this.isPristinePath(pathKey);
      multiplier = result.multiplier;
      pristine = result.is_pristine;
    }

    const total = base * multiplier;
    return { base, total, multiplier, pristine };
  }

  static classifyDiscovery(totalReward: number): DiscoveryLevel {
    if (totalReward >= 3.0) return 'revelation';
    if (totalReward >= 2.0) return 'resonance';
    if (totalReward >= 1.5) return 'tree';
    if (totalReward >= 0.8) return 'branch';
    return 'seed';
  }

  /**
   * 🏆 Grant reward based on a collection of worker reports
   */
  static async grantFromReports(
    missionId: string,
    reports: WorkerReport[],
    resonance: number = 0.5
  ): Promise<RewardEntry> {
    const vector: RewardVector = {
      resonance,
      novelty: reports.some(r => r.no_mock_verified) ? 0.5 : 0.1,
      topology: reports.length > 2 ? 0.3 : 0.1,
      fractal: 0.2,
      lid: 0.1,
      penalty: 0
    };

    // Use the first worker as the primary for the record, or 'orchestrator'
    const primaryWorker = reports.length > 0 ? reports[0].worker_id : 'orchestrator';
    
    return await this.grant(missionId, primaryWorker, vector, reports, "Granted via MissionControl pulse");
  }

  static async grant(
    missionId: string,
    workerId: string,
    vector: RewardVector,
    reports: WorkerReport[] = [],
    notes: string = ''
  ): Promise<RewardEntry> {
    const pathKey = reports.length > 0 ? this.buildPathKey(reports) : undefined;
    const { base, total, multiplier, pristine } = this.computeReward(vector, pathKey);
    const level = this.classifyDiscovery(total);

    const entry: Omit<RewardEntry, 'ledger_id' | 'recorded_at'> = {
      mission_id: missionId,
      worker_id: workerId,
      timestamp: Date.now(),
      base_reward: base,
      total_reward: total,
      reward_vector: vector,
      discovery_level: level,
      confidence: 1.0,
      validation_status: 'verified',
      notes,
      path_key: pathKey,
      pristine_multiplier_applied: pristine,
      multiplier_value: multiplier,
    };

    const ledgerId = RewardLedger.record(entry);

    try {
      await IQRAMemory.grantReward('direct_reward', { total, level });
    } catch (e) {
      IQRALogger.warn(`⚠️ IQRAMemory update failed: ${e}`);
    }

    IQRALogger.info(
      `🏆 [REWARD_ENGINE] ${missionId} | ` +
      `base=${base.toFixed(3)} × ${multiplier} = ${total.toFixed(3)} | ` +
      `level=${level}` +
      (pristine ? ` | 🌟 PRISTINE PATH` : '')
    );

    return { ...entry, ledger_id: ledgerId, recorded_at: new Date().toISOString() };
  }

  static computeResonanceReward(resonance: number): number {
    return (resonance - 1.0) * 29.0;
  }

  static async claimRewardToPi(paymentId: string, amount: number, memo: string) {
    // @ts-ignore - Signature updated to (amount, metadata)
    await IQRAMemory.grantReward(amount, { type: 'pi_claim', paymentId, memo });
    return paymentId;
  }

  /**
   * Novelty Reward: يقيس مدى بعد التجربة الجديدة عن "الغلاف المحدب" للتجارب السابقة.
   */
  static async computeNoveltyReward(vector: number[]): Promise<number> {
    const baseline = await IQRAMemory.getFithrahCentroid();
    if (!baseline) return 1.0; 

    const distance = IQRAMemory.euclideanDistance(vector, baseline);
    const noveltyReward = Math.min(distance * 5.0, 15.0); 
    return noveltyReward;
  }

  /**
   * يُسجّل اكتشافاً طوبولوجياً في reward_ledger.jsonl ويُحدّث path_registry.json
   */
  static logTopologicalDiscovery(
    resonance: number,
    pair: [string, string],
    h1: number = 0,
    interactionType: 'Annihilation' | 'Commutation' | 'Other' = 'Other',
    teslaSumMod369: number = 0
  ): void {
    const LEDGER_PATH = path.join(process.cwd(), 'iqra-core', 'data', 'reward_ledger.jsonl');
    const REGISTRY_PATH = path.join(process.cwd(), '.iqra', 'path_registry.json');

    const rewardValue = RewardEngine.computeResonanceReward(resonance);
    const entry = {
      type: 'TOPOLOGICAL_DISCOVERY',
      timestamp: Date.now(),
      recorded_at: new Date().toISOString(),
      pair,
      resonance,
      h1,
      interaction_type: interactionType,
      tesla_sum_mod369: teslaSumMod369,
      reward_value: rewardValue,
      discovery_level: RewardEngine.classifyDiscovery(rewardValue),
    };

    try {
      const dir = path.dirname(LEDGER_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(LEDGER_PATH, JSON.stringify(entry) + '\n', 'utf-8');

      const pathKey = `topo:${pair[0]}|${pair[1]}`;
      let registry: Record<string, any> = {};
      if (fs.existsSync(REGISTRY_PATH)) {
        registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
      }
      
      if (!registry[pathKey]) {
        registry[pathKey] = { first_seen: Date.now(), resonance, h1, interaction_type: interactionType, count: 1 };
      } else {
        registry[pathKey].count++;
        if (resonance > registry[pathKey].resonance) registry[pathKey].resonance = resonance;
      }

      const regDir = path.dirname(REGISTRY_PATH);
      if (!fs.existsSync(regDir)) fs.mkdirSync(regDir, { recursive: true });
      fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8');

      IQRALogger.info(`🌀 [TOPO_DISCOVERY] ${pair[0]} ↔ ${pair[1]} | resonance=${resonance.toFixed(4)} | reward=${rewardValue.toFixed(4)}`);
    } catch (e) {
      IQRALogger.warn(`⚠️ [REWARD_ENGINE] Discovery logging failed: ${e}`);
    }
  }
}
