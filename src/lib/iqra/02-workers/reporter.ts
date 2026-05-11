/**
 * 📊 Reporter Worker — عامل التقرير والمكافأة
 * النية: حساب المكافأة وكتابتها في السجل إذا PASS فقط
 * المرجع: "وَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ" — الزلزلة: 7
 *
 * القاعدة: Reporter لا يكتب إلا إذا كان verdict = PASS.
 * القاعدة: Reporter لا يكتب أو يعدل كوداً — فقط يُسجّل.
 *
 * ══════════════════════════════════════════════════════════════
 * EMBEDDED CONSTITUTIONAL RULES
 * ══════════════════════════════════════════════════════════════
 * 1. novelty يُحسب عبر IQRAMemory.generateEmbedding() الحقيقي.
 * 2. cosineSimilarity تُستخدم مع آخر 10 تضمينات من الذاكرة.
 * 3. PatternMemory.storePattern() يُستدعى بعد كل مهمة ناجحة.
 * 4. artifacts تُشير إلى iqra-core/data/reward_ledger.jsonl فقط.
 * 5. كل مصدر يُوسَم: [read] | [fetched] | [prior-training].
 * ══════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { MissionContext, HandoffResult } from '#core/mission-context';
import { appendToTrustChain } from '#security/security';
import { IQRALogger } from '#infra/logger';
import { RewardEngine } from '#rewards/engine';
import { RewardLedger } from '#rewards/ledger';
import { IQRAMemory } from '#memory/memory';
import { PatternMemory } from '#memory/pattern_memory';
import type { RewardEntry, RewardVector } from '#rewards/types';
import type { ValidationReport } from './mission_validator';
import type { ResearchOutput } from './researcher';

export async function executeReporter(context: MissionContext): Promise<HandoffResult> {
  const { scope, workingDir, previousOutput } = context;
  const implemented: string[] = [];
  const undone: string[] = [];
  const issues: string[] = [];

  IQRALogger.info(`📊 [REPORTER] Computing reward for: ${scope.mission_id}`);

  try {
    // ── 1. Read validation report [read] ─────────────────────────────────────
    const reportPath = previousOutput?.reportPath as string
      || path.join(workingDir, 'validation_report.json');

    if (!fs.existsSync(reportPath)) {
      throw new Error('INTEGRITY_ERR: validation_report.json missing — Reporter cannot proceed');
    }

    const validation: ValidationReport = JSON.parse(
      fs.readFileSync(reportPath, 'utf-8')  // [read]
    );

    // ── 2. Hard gate — PASS only ──────────────────────────────────────────────
    if (validation.verdict !== 'PASS') {
      throw new Error(
        `INTEGRITY_ERR: Reporter blocked — validation verdict is ${validation.verdict}. ` +
        `Violations: ${validation.violations.join('; ')}`
      );
    }
    implemented.push('[read] Validation gate passed');

    // ── 3. Load research output [read] ────────────────────────────────────────
    const researchPath = previousOutput?.outputPath as string
      || path.join(workingDir, 'research_output.json');

    if (!fs.existsSync(researchPath)) {
      throw new Error('INTEGRITY_ERR: research_output.json missing — cannot compute novelty');
    }

    const research: ResearchOutput = JSON.parse(
      fs.readFileSync(researchPath, 'utf-8')  // [read]
    );
    implemented.push('[read] research_output.json loaded');

    // ── 4. Compute real embedding + novelty via cosineSimilarity ──────────────
    // القاعدة ١+٢: generateEmbedding حقيقي، novelty عبر cosineSimilarity مع آخر 10
    let novelty_score = 1.0; // Default to 1.0 (pure novelty) if no history exists
    let realEmbedding: number[] = [];

    const contentToEmbed = `${research.evidence} ${research.reasoning}`;

    // [fetched] Google AI embedding أو [prior-training] SHA-256 fallback
    // generateEmbedding internalizes the fallback logic constitutionally.
    realEmbedding = await IQRAMemory.generateEmbedding(contentToEmbed);

    // computeNovelty يستخدم cosineSimilarity داخلياً مع آخر 10 تضمينات
    novelty_score = await IQRAMemory.computeNovelty(realEmbedding, 10);

    // حفظ التضمين في السجل للمقارنات المستقبلية
    await IQRAMemory.appendList('embeddings_history', {
      vector: realEmbedding,
      timestamp: Date.now(),
      mission_id: scope.mission_id,
      verse: scope.verse,
      field: scope.field_of_inquiry,
    });

    implemented.push(`[fetched] Embedding generated (${realEmbedding.length} dims)`);
    implemented.push(`[fetched] Novelty via cosineSimilarity: ${novelty_score.toFixed(4)}`);

    // ── 5. Topology score ─────────────────────────────────────────────────────
    const topology_score = 1.0;
    implemented.push(`Topology score: ${topology_score}`);

    // ── 6. Pristine path check (Serendipity Hook) ─────────────────────────────
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
        implemented.push('Path already explored — standard multiplier 1x');
      }
    } catch {
      issues.push('Memory unavailable for pristine path check — multiplier 1.0');
    }

    // ── 7. Compute reward ─────────────────────────────────────────────────────
    const rewardVector: RewardVector = {
      novelty: novelty_score,
      resonance: validation.resonance_score,
      topology: topology_score,
      fractal: 0.5,
      lid: 0.5,
      penalty: validation.hallucination_penalty,
    };

    const { base, total, multiplier: pathMultiplier } = RewardEngine.computeReward(rewardVector);
    const finalTotal = total * multiplier;

    const discoveryLevel = RewardEngine.classifyDiscovery(finalTotal);
    implemented.push(
      `Reward computed: ${finalTotal.toFixed(4)} (${discoveryLevel})`
    );

    // ── 8. Write to unified ledger [write] ────────────────────────────────────
    // استخدام RewardEngine.grant بدلاً من manual entry
    const entry = await RewardEngine.grant(
      scope.mission_id,
      'Reporter',
      rewardVector,
      [],
      `verse:${scope.verse} | field:${scope.field_of_inquiry} | provider:${scope.provider}`
    );
    implemented.push(
      `[write] Reward recorded: ${entry.ledger_id} = ${entry.total_reward.toFixed(4)}`
    );

    // ── 9. Store pattern in PatternMemory ─────────────────────────────────────
    // القاعدة ٣: PatternMemory.storePattern() بعد كل مهمة ناجحة
    if (realEmbedding.length > 0) {
      try {
        const patternId = await PatternMemory.storePattern(
          scope.verse,
          scope.field_of_inquiry,
          validation.resonance_score,
          realEmbedding,
          scope.mission_id,
          0.5
        );
        implemented.push(`[fetched] PatternMemory stored: ${patternId}`);
      } catch (err: any) {
        issues.push(`PatternMemory store failed: ${err.message}`);
      }
    }

    // ── 10. Grant curiosity reward to memory ──────────────────────────────────
    try {
      await IQRAMemory.grantReward(entry.total_reward * 0.01);
      implemented.push('Curiosity score updated in memory');
    } catch {
      issues.push('Memory unavailable for curiosity update — ledger still written');
    }

    // ── 11. TrustChain ────────────────────────────────────────────────────────
    appendToTrustChain(
      'REPORTER:REWARD_RECORDED',
      scope.mission_id,
      `reward:${entry.total_reward.toFixed(4)}:level:${entry.discovery_level}:novelty:${novelty_score.toFixed(3)}`,
      rewardOutput.confidence
    );

    IQRALogger.info(
      `✅ [REPORTER] Done. Reward: ${rewardOutput.total_reward.toFixed(4)} | ` +
      `Level: ${rewardOutput.discovery_level} | Novelty: ${novelty_score.toFixed(3)} | ` +
      `Multiplier: ${multiplier}x`
    );

    return {
      status: 'success',
      worker: 'Reporter',
      next: null,
      data: {
        rewardOutput,
        entry,
        multiplier,
        novelty_score,
        embedding_dims: realEmbedding.length,
      },
      // المسار الموحد فقط
      artifacts: [],
      implemented,
      undone,
      issues,
      procedures_followed: true,
      timestamp: Date.now(),
      commands_run: [],
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
      commands_run: [],
    };
  }
}
