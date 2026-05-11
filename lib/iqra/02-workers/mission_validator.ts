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
import { MissionContext, HandoffResult } from '../01-core/mission-context'
import { appendToTrustChain } from '#security/security';
import { IQRALogger } from '#infra/logger';
import type { ResearchOutput } from './researcher';

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

/**
 * Evaluates how well research claims are supported by the provided evidence and metadata.
 *
 * @param research - Research output containing `evidence`, `reasoning`, `resonance_score`, and optional `source_attestations`
 * @returns A consistency score between 0 and 1, where higher values indicate stronger alignment between claims and supporting evidence
 */
function _checkConsistency(research: ResearchOutput): number {
  let score = 1.0;
  
  // Check 1: Evidence length vs reasoning length
  const evidenceWords = research.evidence.trim().split(/\s+/).length;
  const reasoningWords = research.reasoning.trim().split(/\s+/).length;
  if (evidenceWords < 10 && reasoningWords > 50) {
    score -= 0.3; // Too much reasoning for too little evidence
  }
  
  // Check 2: Resonance score alignment with evidence quality
  if (research.resonance_score > 0.8 && evidenceWords < 20) {
    score -= 0.4; // High resonance with minimal evidence is suspicious
  }
  
  // Check 3: Source attestation presence
  if (!research.source_attestations || research.source_attestations.length === 0) {
    score -= 0.2; // No source attestation is risky
  }
  
  // Check 4: Generic filler phrases
  const fillerPhrases = ['as an AI', 'as a language model', 'I cannot', 'I don\'t have access'];
  const lowerText = research.evidence.toLowerCase();
  for (const phrase of fillerPhrases) {
    if (lowerText.includes(phrase)) {
      score -= 0.3; // Filler phrases indicate lack of real research
      break;
    }
  }
  
  return Math.max(0, score);
}

/**
 * Validate prior research and produce a structured validation report used to decide mission handoff.
 *
 * Runs hallucination, consistency, evidence-strength, resonance, verse-format, and optional knowledge-node checks against the prior research output, writes a `validation_report.json` into the working directory, appends a trust-chain entry, and returns a `HandoffResult` that routes the mission to the next worker on pass or reports failure on validation errors.
 *
 * @param context - MissionContext containing `scope`, `workingDir`, and optionally `previousOutput` paths used to locate research and node files
 * @returns A HandoffResult containing the produced `ValidationReport` (under `data.report`), the report file path, the `resonance_score`, the computed `hallucination_penalty`, and status fields indicating success (PASS → next: "Planner") or failure. On internal errors the function returns a failure HandoffResult whose report includes the error message in `violations`.
 */
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

      // [TC] reason: add consistency check to detect hallucinations bypassing regex | id: TC-hallucination-consistency
      // Consistency check: verify claims are supported by evidence structure
      const consistencyScore = _checkConsistency(research);
      if (consistencyScore < 0.7) {
        violations.push(`INCONSISTENT_CLAIMS: Research claims not adequately supported by evidence (score: ${consistencyScore.toFixed(2)})`);
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
      worker: 'MissionValidator',
      next: verdict === 'PASS' ? 'Planner' : null,
      data: {
        report: report,
        reportPath: reportPath,
        resonance_score: research.resonance_score,
        hallucination_penalty: hallucination_penalty,
      },
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
    IQRALogger.error('❌ [VALIDATOR] Error:', err.message);
    return {
      status: 'failure',
      worker: 'Validator',
      next: null,
      data: { report: { verdict: 'FAIL', violations: [err.message] } },
      artifacts: [],
      implemented: [],
      undone: ['validation'],
      issues: [err.message],
      procedures_followed: false,
      timestamp: Date.now(),
      commands_run: [],
    };
  }
}
