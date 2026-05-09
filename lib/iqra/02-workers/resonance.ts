/**
 * 🌀 Resonance Worker — عامل الرنين الطوبولوجي
 * النية: التحقق من الرنين بين البحث والأنماط القرآنية الحقيقية
 * المرجع: "الرَّحْمَنُ عَلَّمَ الْقُرْآنَ" — الرحمن: 1-2
 *
 * ══════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTE
 * ══════════════════════════════════════════════════════════════
 * ResonanceWorker هو class يرث من SovereignWorker.
 * executeResonanceWorker هي wrapper function تستخدمه داخلياً —
 * هذا يُبقي mission-runner.ts يعمل بنمط function-based
 * بينما الـ class يبقى متاحاً للـ orchestrator المباشر.
 * Serial beats parallel — الـ wrapper تضمن التسلسل.
 * ══════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { SovereignWorker, WorkerResult, MissionState } from './protocol.ts';
import type { MissionHandoff } from '../../../agents/contracts.ts';
import { appendToTrustChain } from '../security.ts';
import { IQRALogger } from '../12-infrastructure/logger.js';
import { goEngine } from '../quran/go_engine_client.ts';
import type { MissionContext, HandoffResult } from '../01-core/mission-context.js';

export interface ResonanceData {
  topological_score: number;
  pattern_matched: string;
  resonance_entropy: number;
  soul_alignment: number;
}

export class ResonanceWorker extends SovereignWorker {
  id = 'ResonanceWorker';
  intention = 'قياس الرنين الطوبولوجي بين الآيات القرآنية والعلم الحديث';

  async execute(input: string, state: MissionState): Promise<WorkerResult> {
    this.report.worker_id = this.id;
    this.report.timestamp = Date.now();

    try {
      // 1. Analysis of Input for Resonance | تحليل المدخلات للرنين
      const goResonance = await goEngine.calculateResonance(input);
      const caughtPatterns = await goEngine.calculateCatch(input);

      const hasTopology = caughtPatterns.some((p: string) => p.includes('TOPOLOGY'));
      const hasMathCode = caughtPatterns.some((p: string) => p.includes('NUMERICAL'));
      
      let bonus = 0;
      if (hasTopology) bonus += 0.20;
      if (hasMathCode) bonus += 0.25;

      const lid = goResonance?.lid ?? 0.8;
      const topological_score = goResonance?.coherence ?? Math.min(1.0, (input.length / 500) * 0.5 + bonus);
      const resonance_entropy = 1.0 - topological_score;
      const soul_alignment = (topological_score > 0.7 && lid < 0.7) ? 0.99 : 0.75;

      const data: ResonanceData = {
        topological_score,
        pattern_matched: caughtPatterns.join('|') || 'GENERIC_RESONANCE',
        resonance_entropy,
        soul_alignment,
      };

      const updatedContext = {
        ...state.context,
        resonance: data
      };

      const updatedState: MissionState = {
        ...state,
        context: updatedContext,
        reports: [...state.reports, this.report]
      };

      this.markImplemented(`Resonance analysis completed with score: ${topological_score.toFixed(4)}`);
      this.markImplemented(`Structural patterns detected: ${caughtPatterns.length}`);

      if (topological_score > 0.85) {
        this.markImplemented("Evolving: High resonance detected, triggering evolution cycle");
        await goEngine.triggerEvolutionCycle();
      }

      const handoff: MissionHandoff = {
        mission_id: state.metadata.mission_id,
        from_worker: this.id,
        to_worker: 'ResearchWorker',
        timestamp: Date.now(),
        artifacts: [],
        pending_tasks: ['Deep research into resonance patterns'],
        known_issues: this.report.issues_discovered,
        validation_rules: ['High-fidelity verification'],
        context_data: updatedContext
      };

      return {
        success: true,
        data,
        report: this.report,
        updated_state: updatedState,
        next_handoff: handoff
      };

    } catch (error: any) {
      this.logIssue(`ResonanceWorker Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        report: this.report
      };
    }
  }
}

// ── executeResonanceWorker — function wrapper for mission-runner.ts ───────────
/**
 * Wrapper يُحوّل ResonanceWorker class إلى دالة متوافقة مع mission-runner.ts.
 * يستقبل MissionContext ويُرجع HandoffResult — نفس نمط باقي العمال.
 *
 * البيانات المُمرَّرة:
 *   - input: evidence + reasoning من Researcher
 *   - output: topological_score, pattern_matched, resonance_entropy, soul_alignment
 *
 * القاعدة: إذا فشل GoEngineBridge → fallback حسابي محلي (لا يُوقف الحلقة).
 */
export async function executeResonanceWorker(
  context: MissionContext
): Promise<HandoffResult> {
  const { scope, workingDir, previousOutput } = context;
  const implemented: string[] = [];
  const undone: string[] = [];
  const issues: string[] = [];

  IQRALogger.info(`🌀 [RESONANCE] Analyzing resonance for: ${scope.mission_id}`);

  try {
    // ── بناء input من مخرجات Researcher ──────────────────────────────────────
    // نستخدم evidence + reasoning كمدخل للتحليل الطوبولوجي
    const researchPath = previousOutput?.outputPath as string
      || path.join(workingDir, 'research_output.json');

    let input = `${scope.verse} ${scope.field_of_inquiry}`;

    if (fs.existsSync(researchPath)) {
      try {
        const research = JSON.parse(fs.readFileSync(researchPath, 'utf-8'));
        input = `${research.evidence ?? ''} ${research.reasoning ?? ''} ${scope.verse}`.trim();
        implemented.push('[read] research_output.json loaded for resonance input');
      } catch {
        issues.push('Could not parse research_output.json — using verse+field as input');
      }
    } else {
      issues.push('research_output.json not found — using verse+field as input');
    }

    // ── تشغيل ResonanceWorker class ──────────────────────────────────────────
    const worker = new ResonanceWorker();

    // بناء MissionState مبسّط للـ class
    const state: MissionState = {
      initial_input: input,
      reports: [],
      context: { ...(previousOutput ?? {}) },
      metadata: {
        start_time: context.startTime,
        mission_id: scope.mission_id,
      },
    };

    const result = await worker.execute(input, state);

    if (!result.success) {
      // GoEngineBridge فشل — نستخدم fallback بدلاً من إيقاف الحلقة
      const fallbackData: ResonanceData = {
        topological_score: 0.5,
        pattern_matched: 'FALLBACK_RESONANCE',
        resonance_entropy: 0.5,
        soul_alignment: 0.75,
      };
      issues.push(`ResonanceWorker failed: ${result.error} — using fallback data`);
      implemented.push('Fallback resonance data applied (Go engine unavailable)');

      return {
        status: 'success',   // لا نُوقف الحلقة — الرنين اختياري
        worker: 'Resonance',
        next: 'Builder',
        data: {
          ...fallbackData,
          outputPath: previousOutput?.outputPath,  // نُمرّر مسار البحث للأمام
        },
        artifacts: [],
        implemented,
        undone: ['Go engine resonance analysis'],
        issues,
        procedures_followed: false,
        timestamp: Date.now(),
      };
    }

    const data = result.data as ResonanceData;
    implemented.push(`[fetched] Topological score: ${data.topological_score.toFixed(4)}`);
    implemented.push(`[fetched] Pattern matched: ${data.pattern_matched}`);
    implemented.push(`[fetched] Soul alignment: ${data.soul_alignment.toFixed(4)}`);

    appendToTrustChain(
      'RESONANCE:COMPLETE',
      scope.mission_id,
      `topo:${data.topological_score.toFixed(3)}:pattern:${data.pattern_matched}`,
      data.topological_score
    );

    IQRALogger.info(
      `🌀 [RESONANCE] Done. Score: ${data.topological_score.toFixed(3)} | ` +
      `Pattern: ${data.pattern_matched}`
    );

    return {
      status: 'success',
      worker: 'Resonance',
      next: 'Builder',
      data: {
        ...data,
        outputPath: previousOutput?.outputPath,  // نُمرّر مسار البحث للأمام
      },
      artifacts: [],
      implemented,
      undone,
      issues,
      procedures_followed: true,
      timestamp: Date.now(),
    };

  } catch (err: any) {
    issues.push(err.message);
    IQRALogger.error('❌ [RESONANCE] Failed:', err.message);

    // Resonance فشل كلياً — نُرجع fallback ولا نُوقف الحلقة
    return {
      status: 'success',   // non-fatal — Builder يمكنه العمل بدون resonance
      worker: 'Resonance',
      next: 'Builder',
      data: {
        topological_score: 0.5,
        pattern_matched: 'ERROR_FALLBACK',
        resonance_entropy: 0.5,
        soul_alignment: 0.75,
        outputPath: previousOutput?.outputPath,
      },
      artifacts: [],
      implemented,
      undone: ['resonance analysis'],
      issues,
      procedures_followed: false,
      timestamp: Date.now(),
    };
  }
}
