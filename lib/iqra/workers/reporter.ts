/**
 * 📊 Reporter Worker — عامل التقرير والمكافأة
 * النية: حساب المكافأة وكتابتها في السجل إذا PASS فقط
 * المرجع: "وَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ" — الزلزلة: 7
 *
 * القاعدة: Reporter لا يكتب إلا إذا كان verdict = PASS.
 * القاعدة: Reporter لا يكتب أو يعدل كوداً — فقط يُسجّل.
 */

import fs from 'fs';
import path from 'path';
import { MissionContext, HandoffResult } from '../mission-context.ts';
import { appendToTrustChain } from '../security.ts';
import { IQRALogger } from '../logger.ts';
import { RewardEngine } from '../../../rewards/engine.ts';
import { RewardLedger } from '../../../ledger/reward-ledger.ts';
import { IQRAMemory } from '../memory.ts';
import type { RewardInput, RewardEntry } from '../../../rewards/types.ts';
import type { ValidationReport } from './mission_validator.ts';
import type { ResearchOutput } from './researcher.ts';

export async function executeReporter(context: MissionContext): Promise<HandoffResult> {
  const { scope, workingDir, previousOutput } = context;
  const implemented: string[] = [];
  const undone: string[] = [];
  const issues: string[] = [];

  IQRALogger.info(`📊 [REPORTER] Computing reward for: ${scope.mission_id}`);

  try {
    // ── 1. Read validation report ─────────────────────────────────────────────
    const reportPath = previousOutput?.reportPath as string
      || path.join(workingDir, 'validation_report.json');

    if (!fs.existsSync(reportPath)) {
      throw new Error('INTEGRITY_ERR: validation_report.json missing — Reporter cannot proceed');
    }

    const validation: ValidationReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

    // ── 2. Hard gate — PASS only ──────────────────────────────────────────────
    if (validation.verdict !== 'PASS') {
      throw new Error(
        `INTEGRITY_ERR: Reporter blocked — validation verdict is ${validation.verdict}. ` +
        `Violations: ${validation.violations.join('; ')}`
      );
    }
    implemented.push('Validation gate passed');

    // ── 3. Compute novelty from real evidence ────────────────────────────────
    let novelty_score = 0.5;
    try {
      // Load research output to get content for embedding
      const researchPath = previousOutput?.outputPath as string
        || path.join(workingDir, 'research_output.json');
      
      const research: ResearchOutput = JSON.parse(fs.readFileSync(researchPath, 'utf-8'));
      
      // Combine evidence and reasoning for a rich semantic representation
      const contentToEmbed = `${research.evidence} ${research.reasoning}`;
      
      const realEmbedding = await IQRAMemory.generateEmbedding(contentToEmbed);
      novelty_score = await IQRAMemory.computeNovelty(realEmbedding, 10);
      
      // Save this embedding to history for future novelty checks
      await IQRAMemory.appendList('embeddings_history', { 
        vector: realEmbedding, 
        timestamp: Date.now(),
        mission_id: scope.mission_id
      });
      
      implemented.push(`Novelty computed honestly: ${novelty_score.toFixed(3)}`);
    } catch (err: any) {
      issues.push(`Memory/Embedding error: ${err.message} — using default 0.5`);
    }

    // ── 4. Topology score — ratio of completed steps ──────────────────────────
    // Simple heuristic: if we reached Reporter, all 4 steps completed = 1.0
    const topology_score = 1.0;
    implemented.push(`Topology score: ${topology_score}`);

    // ── 5. Pristine path check (Serendipity Hook) ─────────────────────────────
    const pathKey = `pristine:${scope.mission_id}:${scope.verse}`;
    let multiplier = 1.0;
    try {
      const pathExists = await IQRAMemory.get(pathKey);
      if (!pathExists) {
        multiplier = 2.0;
        await IQRAMemory.set(pathKey, Date.now());
        implemented.push('🌌 Pristine Path discovered — 2x multiplier applied');
        IQRALogger.info(`🌌 [REPORTER] Pristine Path: ${pathKey}`);
      } else {
        implemented.push('Path already explored — standard multiplier');
      }
    } catch {
      issues.push('Memory unavailable for pristine path check — multiplier 1.0');
    }

    // ── 6. Compute reward ─────────────────────────────────────────────────────
    const rewardInput: RewardInput = {
      mission_id: scope.mission_id,
      worker_id: 'Reporter',
      novelty_score,
      resonance_score: validation.resonance_score,
      topology_score,
      hallucination_penalty: validation.hallucination_penalty,
      timestamp: Date.now(),
    };

    const rewardOutput = RewardEngine.computeTotalReward(rewardInput);
    rewardOutput.total_reward *= multiplier;

    implemented.push(`Reward computed: ${rewardOutput.total_reward.toFixed(4)} (${rewardOutput.discovery_level})`);

    // ── 7. Write to ledger ────────────────────────────────────────────────────
    const entry: RewardEntry = {
      ...rewardOutput,
      mission_id: scope.mission_id,
      worker_id: 'Reporter',
      timestamp: Date.now(),
      validation_status: 'verified',
      notes: `verse:${scope.verse} | field:${scope.field_of_inquiry} | provider:${scope.provider}`,
    };

    await RewardLedger.append(entry);
    implemented.push(`Reward written to ledger: ${rewardOutput.total_reward.toFixed(4)}`);

    // ── 8. Grant to memory ────────────────────────────────────────────────────
    try {
      await IQRAMemory.grantReward(rewardOutput.total_reward * 0.01);
      implemented.push('Curiosity score updated in memory');
    } catch {
      issues.push('Memory unavailable for curiosity update — ledger still written');
    }

    // ── 9. TrustChain ─────────────────────────────────────────────────────────
    appendToTrustChain(
      'REPORTER:REWARD_RECORDED',
      scope.mission_id,
      `reward:${rewardOutput.total_reward.toFixed(4)}:level:${rewardOutput.discovery_level}`,
      rewardOutput.confidence
    );

    IQRALogger.info(
      `✅ [REPORTER] Mission complete. Reward: ${rewardOutput.total_reward.toFixed(4)} | ` +
      `Level: ${rewardOutput.discovery_level} | Multiplier: ${multiplier}x`
    );

    return {
      status: 'success',
      worker: 'Reporter',
      next: null,
      data: { rewardOutput, entry, multiplier },
      artifacts: ['ledger/rewards.jsonl'],
      implemented,
      undone,
      issues,
      procedures_followed: true,
      timestamp: Date.now(),
    };

  } catch (err: any) {
    issues.push(err.message);
    IQRALogger.error('❌ [REPORTER] Failed:', err.message);
    return {
      status: 'failure',
      worker: 'Reporter',
      next: null,
      data: {},
      artifacts: [],
      implemented,
      undone: ['ledger entry'],
      issues,
      procedures_followed: err.message.includes('INTEGRITY_ERR'),
      timestamp: Date.now(),
    };
  }
}
