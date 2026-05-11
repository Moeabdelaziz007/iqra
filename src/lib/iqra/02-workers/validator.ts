import { SovereignWorker, WorkerResult, MissionState } from './protocol';
import type { MissionHandoff } from '#core/mission-context';
import * as fs from 'fs';
import * as path from 'path';
import { goEngine } from '#quran/go_engine_client';
import { IQRALogger } from '#infra/logger';
import { appendToTrustChain } from '#security/security';

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

export interface ValidationReport {
  verdict: 'PASS' | 'FAIL';
  violations: string[];
  warnings: string[];
  resonance_score?: number;
  hallucination_penalty: number;
  checked_at: string;
}

export class ValidationWorker extends SovereignWorker {
  id = 'ValidationWorker';
  intention = 'التحقق من صحة الكود وتوافقه مع DASTŪR.md والمبادئ الأخلاقية والحقيقة';

  async execute(input: any, state: MissionState): Promise<WorkerResult> {
    this.report.worker_id = this.id;
    this.report.timestamp = Date.now();

    const textToValidate = typeof input === 'string' ? input : JSON.stringify(input);
    const violations: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Dastur Check
      const dasturPath = path.join(process.cwd(), 'iqra-core', 'DASTUR.md');
      if (fs.existsSync(dasturPath)) {
        const dastur = fs.readFileSync(dasturPath, 'utf-8');
        const haramMatch = dastur.match(/HARAM_LIST = \[([\s\S]*?)\]/);
        let forbidden: string[] = ['كذب', 'غش', 'أذى', 'سرقة', 'harm', 'cheat', 'lie'];
        
        if (haramMatch && haramMatch[1]) {
          const customHaram = haramMatch[1]
            .split(',')
            .map(item => item.trim().replace(/"/g, ''))
            .filter(item => item.length > 0);
          forbidden = [...new Set([...forbidden, ...customHaram])];
        }

        const violator = forbidden.find(word => textToValidate.toLowerCase().includes(word));
        if (violator) {
          violations.push(`Dastur Compliance Failure: Violation of "${violator}" prohibited.`);
        }
      }

      // 2. Hallucination & Evidence Checks (from mission_validator)
      for (const pattern of HALLUCINATION_PATTERNS) {
        if (pattern.test(textToValidate)) {
          violations.push(`Hallucination pattern detected: ${pattern.source}`);
        }
      }

      for (const pattern of WEAK_EVIDENCE) {
        if (pattern.test(textToValidate)) {
          violations.push(`Weak evidence detected in input`);
        }
      }

      // 3. Verse Reference Check (if applicable)
      const verseMatch = textToValidate.match(/\b\d+:\d+\b/);
      if (textToValidate.includes('verse') && !verseMatch) {
        warnings.push('Input mentions verse but no "surah:ayah" format found');
      }

      // 4. Final Verdict
      const hallucination_penalty = violations.length > 0 ? Math.min(1.0, violations.length * 0.25) : 0.0;
      const verdict = violations.length === 0 ? 'PASS' : 'FAIL';

      this.report.status = verdict;
      this.report.procedures_followed = true;
      this.report.exit_code = verdict === 'PASS' ? 0 : 1;

      if (verdict === 'FAIL') {
        this.logIssue(violations.join(' | '));
        return {
          success: false,
          error: violations[0],
          report: this.report
        };
      }

      this.markImplemented('All validation checks passed');
      
      // Log to Trust Chain
      appendToTrustChain(
        `VALIDATOR:${verdict}`,
        state.metadata?.mission_id || 'manual',
        `violations:${violations.length}:penalty:${hallucination_penalty.toFixed(2)}`,
        verdict === 'PASS' ? 1.0 : 0.0
      );

      return {
        success: true,
        data: {
          verdict,
          hallucination_penalty,
          violations,
          warnings
        },
        report: this.report
      };

    } catch (err: any) {
      this.report.status = 'FAIL';
      return {
        success: false,
        error: `Validation Error: ${err.message}`,
        report: this.report
      };
    }
  }
}

/**
 * Functional wrapper for mission flow compatibility
 */
export async function executeMissionValidator(context: any): Promise<any> {
  const worker = new ValidationWorker();
  const input = context.previousOutput?.data || context.previousOutput || '';
  const result = await worker.execute(input, { mission_id: context.scope?.mission_id } as any);
  
  return {
    status: result.success ? 'success' : 'failure',
    worker: 'ValidationWorker',
    next: result.success ? 'Planner' : null,
    data: result.data,
    report: result.report,
    implemented: result.report.implemented,
    issues: result.report.issues_discovered,
    procedures_followed: result.report.procedures_followed,
    timestamp: Date.now()
  };
}
