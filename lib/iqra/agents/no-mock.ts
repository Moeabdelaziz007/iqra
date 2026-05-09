/**
 * IQRA Mithaq Guard — ميثاق النقاء
 * 
 * Part of the Agent Contracts Foundation.
 * Enforces the "No-Mock" principle to ensure system purity.
 */

import { IQRALogger } from "#infra/logger.js";

const PROHIBITED_PATTERNS = [
  /mock/i,
  /placeholder/i,
  /stub/i,
  /todo/i,
  /test data/i,
  /lorem ipsum/i,
  /sample text/i,
  /\[INSERT .*\]/i,
  /\{INSERT .*\}/i,
  /^TBD$/i
];

export class MithaqGuard {
  /**
   * Scan content for MITHAQ violations (mock data)
   */
  static scan(content: any, sourceAgent: string): { pure: boolean; violations: string[] } {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    const violations: string[] = [];

    for (const pattern of PROHIBITED_PATTERNS) {
      if (pattern.test(text)) {
        violations.push(pattern.toString());
      }
    }

    if (violations.length > 0) {
      IQRALogger.error(`🔴 [MITHAQ_VIOLATION] Mock data detected from ${sourceAgent}: ${violations.join(', ')}`);
      return { pure: false, violations };
    }

    return { pure: true, violations: [] };
  }

  /**
   * Enforce purity. Throws error if MITHAQ is violated.
   */
  static enforce(content: any, sourceAgent: string) {
    const { pure, violations } = this.scan(content, sourceAgent);
    if (!pure) {
      throw new Error(`MITHAQ_VIOLATION: ${sourceAgent} produced impure output containing prohibited patterns: ${violations.join(', ')}`);
    }
  }
}
