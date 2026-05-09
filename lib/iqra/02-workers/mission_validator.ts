/**
 * ✅ Mission Validator Worker — عامل التحقق
 * النية: التحقق من سلامة عقدة المعرفة — لا هلوسة، لا كذب، الآية موجودة
 * المرجع: "وَلَا تَقْفُ مَا لَيْسَ لَكَ بِهِ عِلْمٌ" — الإسراء: 36
 *
 * القاعدة: Validator لا يُعدّل الكود — فقط يقرأ ويُقيّم.
 * القاعدة: إذا FAIL → الحلقة تتوقف فوراً.
 */

import fs from 'fs';
import path from 'path';
import { MissionContext, HandoffResult } from '../01-core/mission-context.js';
import { appendToTrustChain } from '../security.ts';
import { IQRALogger } from '../12-infrastructure/logger.js';
import type { ResearchOutput } from './researcher.ts';

export interface ValidationReport {
  verdict: 'PASS' | 'FAIL';
  violations: string[];
  warnings: string[];
  resonance_score: number;
  hallucination_penalty: number;
  checked_at: string;
}

// ── Hallucination patterns to reject ─────────────────────────────────────────
const HALLUCINATION_PATTERNS = [
  /lorem ipsum/i,
  /test data/i,
  /\[simulated\]/i,
  /placeholder/i,
  /fake/i,
  /mock/i,
  /example\.com/i,
  /foo bar/i,
  /undefined/i,
  /null/i,
];

// ── Weak evidence patterns ────────────────────────────────────────────────────
const WEAK_EVIDENCE = [
  /لا يوجد/i,
  /no evidence/i,
  /not found/i,
  /unknown/i,
  /n\/a/i,
];

export async function executeMissionValidator(context: MissionContext): Promise<HandoffResult> {
  const { scope, workingDir, previousOutput } = context;
  const implemented: string[] = [];
  const undone: string[] = [];
  const issues: string[] = [];

  IQRALogger.info(`✅ [VALIDATOR] Validating mission: ${scope.mission_id}`);

  try {
    // ── 1. Read research output ───────────────────────────────────────────────
    const researchPath = previousOutput?.outputPath as string
      || path.join(workingDir, 'research_output.json');

    if (!fs.existsSync(researchPath)) {
      throw new Error('INTEGRITY_ERR: research_output.json missing — cannot validate');
    }

    const research: ResearchOutput = JSON.parse(fs.readFileSync(researchPath, 'utf-8'));
    implemented.push('research_output.json loaded');

    // ── 2. Read knowledge node ────────────────────────────────────────────────
    const nodePath = previousOutput?.nodePath as string;
    let nodeContent = '';
    if (nodePath && fs.existsSync(nodePath)) {
      nodeContent = fs.readFileSync(nodePath, 'utf-8');
      implemented.push('knowledge node loaded');
    } else {
      issues.push('knowledge node file not found — checking research only');
    }

    const violations: string[] = [];
    const warnings: string[] = [];

    // ── 3. Hallucination check ────────────────────────────────────────────────
    const textToCheck = `${research.evidence} ${research.reasoning} ${nodeContent}`;
    const isSimulated = research.provider === 'simulated';

    if (!isSimulated) {
      // Real providers: strict hallucination check
      for (const pattern of HALLUCINATION_PATTERNS) {
        if (pattern.test(textToCheck)) {
          violations.push(`Hallucination pattern detected: ${pattern.source}`);
        }
      }
    } else {
      // Simulated mode: only reject truly empty content
      if (research.evidence.trim().length < 10) {
        violations.push('Simulated evidence is empty');
      }
    }
    implemented.push('Hallucination patterns checked');

    // ── 4. Weak evidence check ────────────────────────────────────────────────
    for (const pattern of WEAK_EVIDENCE) {
      if (pattern.test(research.evidence)) {
        violations.push(`Weak evidence: "${research.evidence.slice(0, 60)}"`);
      }
    }
    implemented.push('Evidence strength checked');

    // ── 5. Evidence length check ──────────────────────────────────────────────
    if (research.evidence.trim().length < 30) {
      violations.push(`Evidence too short (${research.evidence.length} chars) — minimum 30`);
    }

    // ── 6. Resonance score sanity ─────────────────────────────────────────────
    if (research.resonance_score < 0 || research.resonance_score > 1) {
      violations.push(`resonance_score out of range: ${research.resonance_score}`);
    }
    if (research.resonance_score === 1.0 && research.provider !== 'simulated') {
      warnings.push('resonance_score is exactly 1.0 — suspiciously perfect, review manually');
    }

    // ── 7. Trivial resonance check ────────────────────────────────────────────
    if (research.is_trivial) {
      violations.push('Researcher flagged this resonance as trivial — rejected');
    }
    implemented.push('Resonance score validated');

    // ── 8. Verse reference check ──────────────────────────────────────────────
    if (!research.verse || !research.verse.match(/^\d+:\d+$/)) {
      violations.push(`Invalid verse reference format: "${research.verse}" — expected "surah:ayah"`);
    }
    implemented.push('Verse reference format checked');

    // ── 9. Node content check ─────────────────────────────────────────────────
    if (nodeContent) {
      if (!nodeContent.includes('resonance_candidate')) {
        violations.push('knowledge node missing resonance_candidate field');
      }
      if (nodeContent.trim().length < 100) {
        violations.push('knowledge node content too short');
      }
    }

    // ── Compute hallucination penalty ─────────────────────────────────────────
    const hallucination_penalty = violations.length > 0
      ? Math.min(1.0, violations.length * 0.25)
      : 0.0;

    // ── Verdict ───────────────────────────────────────────────────────────────
    const verdict: 'PASS' | 'FAIL' = violations.length === 0 ? 'PASS' : 'FAIL';

    const report: ValidationReport = {
      verdict,
      violations,
      warnings,
      resonance_score: research.resonance_score,
      hallucination_penalty,
      checked_at: new Date().toISOString(),
    };

    // Write validation report
    const reportPath = path.join(workingDir, 'validation_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    implemented.push(`validation_report.json written — verdict: ${verdict}`);

    if (warnings.length > 0) {
      warnings.forEach(w => IQRALogger.warn(`⚠️ [VALIDATOR] ${w}`));
    }

    if (verdict === 'FAIL') {
      violations.forEach(v => IQRALogger.error(`❌ [VALIDATOR] VIOLATION: ${v}`));
    } else {
      IQRALogger.info(`✅ [VALIDATOR] PASS — resonance: ${research.resonance_score.toFixed(3)}`);
    }

    appendToTrustChain(
      `VALIDATOR:${verdict}`,
      scope.mission_id,
      `violations:${violations.length}:penalty:${hallucination_penalty.toFixed(2)}`,
      verdict === 'PASS' ? 1.0 : 0.0
    );

    return {
      status: verdict === 'PASS' ? 'success' : 'failure',
      worker: 'Validator',
      next: verdict === 'PASS' ? 'Reporter' : null,
      data: { report, reportPath, resonance_score: research.resonance_score, hallucination_penalty },
      artifacts: [reportPath],
      implemented,
      undone: verdict === 'FAIL' ? ['reward recording — blocked by validation failure'] : [],
      issues: [...issues, ...violations],
      procedures_followed: true,   // Validator always follows procedures
      timestamp: Date.now(),
    };

  } catch (err: any) {
    issues.push(err.message);
    IQRALogger.error('❌ [VALIDATOR] Error:', err.message);
    return {
      status: 'failure',
      worker: 'Validator',
      next: null,
      data: { report: { verdict: 'FAIL', violations: [err.message] } },
      artifacts: [],
      implemented,
      undone: ['validation_report.json'],
      issues,
      procedures_followed: false,
      timestamp: Date.now(),
    };
  }
}
