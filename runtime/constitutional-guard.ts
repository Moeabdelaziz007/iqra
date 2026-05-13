/**
 * ⚖️ Constitutional Guard — الحارس الدستوري
 * 
 * Enforces the Supreme Constitution (IQRA_SUPREME.md) and Dastūr.
 * Uses DamirConscience for real-time ethical and constitutional validation.
 */

import { RiskLevel } from '#manifest/runtime_manifest';
import { DamirConscience, Action, Resource } from '#security/damir_conscience';
import { IQRALogger } from '#infra/logger';
import crypto from 'crypto';

export class ConstitutionalGuard {
  private damir: DamirConscience;

  constructor() {
    this.damir = new DamirConscience();
  }

  /**
   * Validate input against the Constitution | التحقق من المدخلات ضد الدستور
   */
  public async validateInput(input: string): Promise<{ allowed: boolean; reason: string }> {
    IQRALogger.info('⚖️ [GUARD] Validating input against Constitution...');

    const action: Action = {
      id: `val_${Date.now()}`,
      intention: input, // We treat the input as the intention
      requiredResources: [] // Input validation doesn't consume external resources yet
    };

    const verdict = this.damir.check(action);
    
    return {
      allowed: verdict.allowed,
      reason: verdict.reason
    };
  }

  /**
   * Audit the result for constitutional alignment | تدقيق النتيجة النهائية
   */
  public async auditResult(response: string): Promise<{ alignmentScore: number; feedback: string }> {
    IQRALogger.info('⚖️ [GUARD] Auditing mission response...');

    // Simple heuristic-based audit (to be expanded with LLM-based verification if needed)
    const forbiddenPatterns = ['I am sorry', 'as an AI', 'hallucination'];
    const foundPatterns = forbiddenPatterns.filter(p => response.includes(p));

    if (foundPatterns.length > 0) {
      return {
        alignmentScore: 0.2,
        feedback: `Constitutional violation: Found forbidden patterns [${foundPatterns.join(', ')}]`
      };
    }

    return {
      alignmentScore: 1.0,
      feedback: 'Result aligned with constitutional constraints.'
    };
  }

  /**
   * Checks if an action is in the forbidden list
   */
  public isHaram(action: string): boolean {
    const haramList = ['hallucination', 'unvalidated_exec', 'unauthorized_deletion'];
    return haramList.includes(action.toLowerCase());
  }
}
