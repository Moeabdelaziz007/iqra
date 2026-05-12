/**
 * 🚀 IQRA Mission Runner — المنسق الرئيسي
 * النية: تنفيذ حلقة مهمة كاملة من YAML إلى مكافأة في السجل
 * المرجع: "فَإِذَا عَزَمْتَ فَتَوَكَّلْ عَلَى اللَّهِ" — آل عمران: 159
 *
 * التسلسل: Planner → Researcher → Resonance → Builder → Validator → Reporter
 * القاعدة: Serial beats parallel — كل عامل ينتظر السابق.
 * القاعدة: أي فشل يوقف الحلقة فوراً مع تقرير واضح.
 *
 * ══════════════════════════════════════════════════════════════
 * EMBEDDED CONSTITUTIONAL RULES (الدستور المضمّن)
 * ══════════════════════════════════════════════════════════════
 * 1. كل حقل يجب أن يكون له قيمة حقيقية — لا undefined ولا null.
 * 2. لا mock ولا simulated provider إلا إذا كان dev_mode: true صريحاً.
 *    الفحص يحدث في parseMissionScope — أي محاولة تجاوزه = INTEGRITY_ERR.
 * 3. كل مصدر معلومة يُوسَم: [read] | [fetched] | [prior-training].
 * 4. لا تقل "تم" بدون diff أو اختبار أو مسار ملف.
 * 5. لا تستدعِ دوالاً أو ملفات إلا بعد التأكد من وجودها.
 * ══════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';
import {
  parseMissionScope,
  updateMissionStatus,
  type MissionContext,
  type MissionScope,
} from './mission-context'
import { executePlanner }          from '#workers/planner'
import { executeResearcher }       from '#workers/researcher'
import { executeBuilder }          from '#workers/builder'
import { executeMissionValidator } from '#workers/validator'
import { executeResonanceWorker }  from '#workers/resonance'
import { executeReporter }         from '#workers/reporter'
import { appendToTrustChain }      from '#security/security';
import { IQRALogger }              from '#infra/logger';
import { SoulEngine }              from '#core/soul_engine'
import { SkillBank }               from '#skills/skill_bank'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MissionResult {
  mission_id: string;
  status: 'completed' | 'failed';
  workingDir: string;
  total_reward?: number;
  discovery_level?: string;
  steps_completed: string[];
  steps_failed: string[];
  all_artifacts: string[];
  duration_ms: number;
  error?: string;
}

// ── No-Mock Pre-flight Check ──────────────────────────────────────────────────
// فحص مستقل قبل بدء أي مهمة.
// parseMissionScope تُجهض بالفعل — هذا طبقة ثانية للتأكيد.
function assertNoMockInProduction(scope: MissionScope): void {
  if (scope.provider === 'simulated' && scope.dev_mode !== true) {
    throw new Error(
      `NO_MOCK_ERR: Mission "${scope.mission_id}" uses provider "simulated" ` +
      `without dev_mode: true. Aborting to protect production integrity.`
    );
  }
}

// ── Main Runner ───────────────────────────────────────────────────────────────

export async function runMission(
  missionPath: string,
  workingDir?: string
): Promise<MissionResult> {

  const startTime = Date.now();

  // ── 0. Parse scope [read] ─────────────────────────────────────────────────
  // parseMissionScope يقرأ الملف من القرص [read] ويُجهض إذا وجد simulated بدون dev_mode.
  const scope = parseMissionScope(missionPath);

  // ── 0b. No-Mock double-check ──────────────────────────────────────────────
  assertNoMockInProduction(scope);

  IQRALogger.info(`🚀 [MISSION_RUNNER] Starting: ${scope.mission_id}`);
  IQRALogger.info(`   Verse: ${scope.verse} | Field: ${scope.field_of_inquiry}`);
  IQRALogger.info(`   Provider: ${scope.provider} | DevMode: ${scope.dev_mode ?? false}`);
  IQRALogger.info(`   Source: [read] ${missionPath}`);

  // ── 1. Working directory ──────────────────────────────────────────────────
  const tmpDir = workingDir || fs.mkdtempSync(path.join(os.tmpdir(), `iqra-${scope.mission_id}-`));
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const context: MissionContext = {
    missionId: scope.mission_id,
    scope,
    workingDir: tmpDir,
    previousOutput: null,
    startTime,
  };

  const stepsCompleted: string[] = [];
  const stepsFailed: string[] = [];
  const allArtifacts: string[] = [];

  // Mark mission as running
  try { updateMissionStatus(missionPath, scope, 'running'); } catch { /* non-fatal */ }

  appendToTrustChain('MISSION:START', scope.mission_id, `dir:${tmpDir}`, 1.0);

  try {
    // ── Step 1: Planner ───────────────────────────────────────────────────
    IQRALogger.info('📋 [MISSION_RUNNER] Step 1/6: Planner');
    const plannerResult = await executePlanner(context);
    _assertSuccess(plannerResult, 'Planner');
    stepsCompleted.push('Planner');
    allArtifacts.push(...plannerResult.artifacts);
    context.previousOutput = plannerResult.data;

    // ── Step 2: Researcher ────────────────────────────────────────────────
    IQRALogger.info('🔬 [MISSION_RUNNER] Step 2/6: Researcher');
    const researchResult = await executeResearcher(context);
    _assertSuccess(researchResult, 'Researcher');
    stepsCompleted.push('Researcher');
    allArtifacts.push(...researchResult.artifacts);
    context.previousOutput = researchResult.data;

    // ── Step 3: Resonance ─────────────────────────────────────────────────
    IQRALogger.info('🌀 [MISSION_RUNNER] Step 3/6: Resonance');
    const resonanceResult = await executeResonanceWorker(context);
    _assertSuccess(resonanceResult, 'Resonance');
    stepsCompleted.push('Resonance');
    allArtifacts.push(...resonanceResult.artifacts);
    // Preserve research path + add resonance data
    context.previousOutput = {
      ...context.previousOutput,
      ...resonanceResult.data,
    };

    // ── Step 4: Builder ───────────────────────────────────────────────────
    IQRALogger.info('🏗️ [MISSION_RUNNER] Step 4/6: Builder');
    const buildResult = await executeBuilder(context);
    _assertSuccess(buildResult, 'Builder');
    stepsCompleted.push('Builder');
    allArtifacts.push(...buildResult.artifacts);
    context.previousOutput = {
      ...context.previousOutput,
      ...buildResult.data,
    };

    // ── Step 5: Validator ─────────────────────────────────────────────────
    IQRALogger.info('✅ [MISSION_RUNNER] Step 5/6: Validator');
    const validationResult = await executeMissionValidator(context);
    _assertSuccess(validationResult, 'Validator');
    stepsCompleted.push('Validator');
    allArtifacts.push(...validationResult.artifacts);
    context.previousOutput = {
      ...context.previousOutput,
      ...validationResult.data,
    };

    // ── Step 6: Reporter ──────────────────────────────────────────────────
    IQRALogger.info('📊 [MISSION_RUNNER] Step 6/6: Reporter');
    const reportResult = await executeReporter(context);
    _assertSuccess(reportResult, 'Reporter');
    stepsCompleted.push('Reporter');
    allArtifacts.push(...reportResult.artifacts);

    // ── Done ──────────────────────────────────────────────────────────────
    const duration = Date.now() - startTime;
    const reward = reportResult.data?.rewardOutput?.total_reward ?? 0;
    const level  = reportResult.data?.rewardOutput?.discovery_level ?? 'unknown';

    try { updateMissionStatus(missionPath, scope, 'completed'); } catch { /* non-fatal */ }

    appendToTrustChain(
      'MISSION:COMPLETE',
      scope.mission_id,
      `reward:${reward.toFixed(4)}:steps:${stepsCompleted.length}`,
      1.0
    );

    IQRALogger.info(
      `🏁 [MISSION_RUNNER] COMPLETE in ${duration}ms | ` +
      `Reward: ${reward.toFixed(4)} | Level: ${level}`
    );

    const result: MissionResult = {
      mission_id: scope.mission_id,
      status: 'completed',
      workingDir: tmpDir,
      total_reward: reward,
      discovery_level: level,
      steps_completed: stepsCompleted,
      steps_failed: stepsFailed,
      all_artifacts: allArtifacts,
      duration_ms: duration,
    };

    // Pulse the Soul Engine on success
    await SoulEngine.pulse(scope.mission_id, true);

    return result;

  } catch (err: any) {
    const duration = Date.now() - startTime;
    const failedStep = err.message.match(/\[(\w+)\]/)?.[1] || 'unknown';
    stepsFailed.push(failedStep);

    try { updateMissionStatus(missionPath, scope, 'failed'); } catch { /* non-fatal */ }

    appendToTrustChain('MISSION:FAILED', scope.mission_id, err.message.slice(0, 100), 0.0);

    IQRALogger.error(`❌ [MISSION_RUNNER] FAILED at ${failedStep}: ${err.message}`);

    const result: MissionResult = {
      mission_id: scope.mission_id,
      status: 'failed',
      workingDir: tmpDir,
      steps_completed: stepsCompleted,
      steps_failed: stepsFailed,
      all_artifacts: allArtifacts,
      duration_ms: duration,
      error: err.message,
    };

    // Pulse the Soul Engine even on failure
    await SoulEngine.pulse(scope.mission_id, false);
    
    return result;
  } finally {
    // Pulse the Soul Engine on success (if catch didn't run, status will be handled by success block)
    // Actually, it's cleaner to pulse inside the blocks to know success status.
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────

function _assertSuccess(
  result: { status: string; worker: string; issues: string[] },
  step: string
): void {
  if (result.status !== 'success') {
    const reason = result.issues.join('; ') || 'unknown failure';
    throw new Error(`[${step}] INTEGRITY_ERR: ${reason}`);
  }
}
