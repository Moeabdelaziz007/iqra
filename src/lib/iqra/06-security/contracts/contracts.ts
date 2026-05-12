/**
 * 🌙 IQRA Agent Contracts — عقود الوكلاء
 * النية: تعريف العقود المشتركة بين جميع الوكلاء الخمسة
 * المرجع: "وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ" — المائدة: 2
 *
 * ══════════════════════════════════════════════════════════════
 * EMBEDDED CONSTITUTIONAL RULES (الدستور المضمّن)
 * ══════════════════════════════════════════════════════════════
 * 1. كل حقل يجب أن يكون له قيمة حقيقية — لا undefined ولا null.
 * 2. لا mock ولا simulated provider في بيئة الإنتاج.
 * 3. كل مصدر معلومة يُوسَم: [read] | [fetched] | [prior-training].
 * 4. لا تقل "تم" بدون diff أو اختبار أو مسار ملف.
 * 5. لا تستدعِ دوالاً أو ملفات إلا بعد التأكد من وجودها.
 * ══════════════════════════════════════════════════════════════
 */

import type { 
  WorkerRole, 
  SourceTag, 
  SourceAttestation, 
  ContextSnapshot, 
  CommandLog, 
  WorkerReport, 
  MissionHandoff,
  IQRAExchange
} from '#agents/contracts';

export type { 
  WorkerRole, 
  SourceTag, 
  SourceAttestation, 
  ContextSnapshot, 
  CommandLog, 
  WorkerReport, 
  MissionHandoff,
  IQRAExchange
};

// Interfaces are now imported from #agents/contracts

/**
 * Structural Rules — القيود الهيكلية:
 * 1. Validator cannot modify implementation logic.
 * 2. Reporter cannot write or modify source code.
 * 3. Builder cannot self-approve or bypass validation.
 * 4. Researcher cannot decide final reward alone.
 * 5. Planner cannot write implementation code.
 */
export const WORKER_CONSTRAINTS = {
  VALIDATOR_CAN_MODIFY: false,
  REPORTER_CAN_WRITE_CODE: false,
  BUILDER_CAN_SELF_APPROVE: false,
  RESEARCHER_CAN_DECIDE_REWARD: false,
  PLANNER_CAN_IMPLEMENT: false,
  PLANNER_MUST_REASON: true, // ✅ يجب إعمال العقل قبل التخطيط
} as const;

// ── Global Constraints — القيود العالمية ──────────────────────────────────────
export const GLOBAL_CONSTRAINTS = {
  NO_MOCK_IN_PRODUCTION: true,
  EVERY_CLAIM_NEEDS_SOURCE: true,
  NO_HALLUCINATION: true,
  NO_DEAD_CODE: true,
  NO_DUPLICATES: true,
  ONE_ROLE_PER_AGENT: true,
  NO_CONSTRAINT_BYPASS: true,
  STRICT_SEQUENCE: ['PLANNER', 'RESEARCHER', 'BUILDER', 'VALIDATOR', 'REPORTER'] as WorkerRole[],
  MIN_RESONANCE_FOR_BUILDER: 0.4,  // من AGENTS.md: Builder لا يبدأ بدون resonance > 0.4
  MAX_RETRIES: 3,                   // الوترية — دائماً عدد فردي
} as const;

// ── Helper: build a minimal valid WorkerReport ────────────────────────────────
export function makeWorkerReport(
  mission_id: string,
  worker_id: string,
  provider: string
): WorkerReport {
  return {
    mission_id,
    worker_id,
    timestamp: Date.now(),
    intent: '',
    context_snapshot: { resonance_score: 1.0, novelty_score: 0.0 },
    artifacts: [],
    implemented: [],
    undone: [],
    commands_run: [],
    issues_discovered: [],
    skills_used: [],
    procedures_followed: true,
    status: 'PASS',
    exit_code: 0,
    source_attestations: [],
    no_mock_verified: provider !== 'simulated',
  };
}

// ── Helper: build a minimal valid MissionHandoff ──────────────────────────────
export function makeHandoff(
  mission_id: string,
  from_worker: WorkerRole,
  to_worker: WorkerRole,
  intent: string,
  context_snapshot: ContextSnapshot,
  overrides: Partial<MissionHandoff> = {}
): MissionHandoff {
  return {
    mission_id,
    from_worker,
    to_worker,
    timestamp: Date.now(),
    intent,
    context_snapshot,
    artifacts: [],
    pending_tasks: [],
    known_issues: [],
    validation_gates: [],
    validation_rules: [],
    context_data: {},
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS — دوال التحقق الثلاث (المهمة 4)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * validateWorkerAction — فرض القيود الهيكلية
 * 
 * يتحقق من أن الوكيل لا يتجاوز قيوده المحددة في WORKER_CONSTRAINTS.
 * 
 * القاعدة الدستورية:
 * - Validator لا يمكنه تعديل implementation logic
 * - Reporter لا يمكنه كتابة أو تعديل source code
 * - Builder لا يمكنه self-approve أو bypass validation
 * - Researcher لا يمكنه decide final reward وحده
 * - Planner لا يمكنه كتابة implementation code
 * 
 * @param worker - دور الوكيل
 * @param action - الإجراء المطلوب (مثل: 'modify_code', 'approve', 'write_code')
 * @returns { valid: boolean; reason?: string }
 * 
 * @example
 * const result = validateWorkerAction('VALIDATOR', 'modify_implementation');
 * if (!result.valid) {
 *   console.error(`❌ ${result.reason}`);
 *   // Output: ❌ VALIDATOR cannot modify implementation logic (CONSTRAINT_VIOLATION)
 * }
 */
export function validateWorkerAction(
  worker: WorkerRole | string,
  action: string
): { valid: boolean; reason?: string } {
  // ── Validator constraints ──────────────────────────────────────────────────
  if (worker === 'VALIDATOR') {
    if (action === 'modify_implementation' || action === 'modify_code') {
      return {
        valid: false,
        reason: 'VALIDATOR cannot modify implementation logic (CONSTRAINT_VIOLATION)',
      };
    }
  }

  // ── Reporter constraints ───────────────────────────────────────────────────
  if (worker === 'REPORTER') {
    if (action === 'write_code' || action === 'modify_code' || action === 'implement') {
      return {
        valid: false,
        reason: 'REPORTER cannot write or modify source code (CONSTRAINT_VIOLATION)',
      };
    }
  }

  // ── Builder constraints ────────────────────────────────────────────────────
  if (worker === 'BUILDER') {
    if (action === 'self_approve' || action === 'bypass_validation') {
      return {
        valid: false,
        reason: 'BUILDER cannot self-approve or bypass validation (CONSTRAINT_VIOLATION)',
      };
    }
  }

  // ── Researcher constraints ─────────────────────────────────────────────────
  if (worker === 'RESEARCHER') {
    if (action === 'decide_final_reward' || action === 'approve_reward') {
      return {
        valid: false,
        reason: 'RESEARCHER cannot decide final reward alone (CONSTRAINT_VIOLATION)',
      };
    }
  }

  // ── Planner constraints ────────────────────────────────────────────────────
  if (worker === 'PLANNER') {
    if (action === 'write_code' || action === 'implement' || action === 'modify_code') {
      return {
        valid: false,
        reason: 'PLANNER cannot write implementation code (CONSTRAINT_VIOLATION)',
      };
    }
  }

  // ── All other actions are valid ────────────────────────────────────────────
  return { valid: true };
}

/**
 * validateSourceAttestations — شهادة المصدر
 * 
 * يتحقق من أن كل ادعاء في التقرير له مصدر موثق.
 * 
 * القاعدة الدستورية #3:
 * "كل مصدر معلومة يُوسَم: [read] | [fetched] | [prior-training]"
 * 
 * @param report - تقرير العامل
 * @returns { valid: boolean; missing: string[] }
 * 
 * @example
 * const result = validateSourceAttestations(report);
 * if (!result.valid) {
 *   console.error(`❌ Missing sources for: ${result.missing.join(', ')}`);
 *   // Output: ❌ Missing sources for: implemented[0], issues_discovered[1]
 * }
 */
export function validateSourceAttestations(
  report: WorkerReport
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  // ── Check implemented items ────────────────────────────────────────────────
  if (Array.isArray(report.implemented)) {
    for (let i = 0; i < report.implemented.length; i++) {
      const item = report.implemented[i];
      const hasSource = report.source_attestations?.some(
        (att) => att.claim?.includes(item) || att.source?.includes(item)
      );
      if (!hasSource && item.trim()) {
        missing.push(`implemented[${i}]: "${item}"`);
      }
    }
  }

  // ── Check issues discovered ────────────────────────────────────────────────
  if (Array.isArray(report.issues_discovered)) {
    for (let i = 0; i < report.issues_discovered.length; i++) {
      const issue = report.issues_discovered[i];
      const hasSource = report.source_attestations?.some(
        (att) => att.claim?.includes(issue) || att.source?.includes(issue)
      );
      if (!hasSource && issue.trim()) {
        missing.push(`issues_discovered[${i}]: "${issue}"`);
      }
    }
  }

  // ── Check skills used ──────────────────────────────────────────────────────
  if (Array.isArray(report.skills_used)) {
    for (let i = 0; i < report.skills_used.length; i++) {
      const skill = report.skills_used[i];
      const hasSource = report.source_attestations?.some(
        (att) => att.claim?.includes(skill) || att.source?.includes(skill)
      );
      if (!hasSource && skill.trim()) {
        missing.push(`skills_used[${i}]: "${skill}"`);
      }
    }
  }

  // ── Validate source attestations themselves ────────────────────────────────
  if (Array.isArray(report.source_attestations)) {
    for (let i = 0; i < report.source_attestations.length; i++) {
      const att = report.source_attestations[i];
      if (!att.tag || !['[read]', '[fetched]', '[prior-training]'].includes(att.tag)) {
        missing.push(`source_attestations[${i}]: invalid tag "${att.tag}"`);
      }
      if (!att.claim?.trim()) {
        missing.push(`source_attestations[${i}]: empty claim`);
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * validateNoMock — فرض عدم وجود Mock
 * 
 * يتحقق من أن لا mock ولا simulated provider في بيئة الإنتاج.
 * 
 * القاعدة الدستورية #2:
 * "لا mock ولا simulated provider في بيئة الإنتاج"
 * 
 * @param report - تقرير العامل
 * @param env - بيئة التشغيل ('production' | 'development')
 * @returns { valid: boolean; reason?: string }
 * 
 * @example
 * const result = validateNoMock(report, 'production');
 * if (!result.valid) {
 *   console.error(`❌ ${result.reason}`);
 *   // Output: ❌ Mock detected in production: provider=simulated (MOCK_VIOLATION)
 * }
 */
export function validateNoMock(
  report: WorkerReport,
  env: 'production' | 'development' = 'production'
): { valid: boolean; reason?: string } {
  // ── In production, no_mock_verified must be true ────────────────────────────
  if (env === 'production') {
    if (!report.no_mock_verified) {
      return {
        valid: false,
        reason: 'Mock detected in production: no_mock_verified=false (MOCK_VIOLATION)',
      };
    }

    // ── Check model metadata for simulated providers ────────────────────────
    if (report.model_metadata?.provider === 'simulated') {
      return {
        valid: false,
        reason: `Mock detected in production: provider=simulated (MOCK_VIOLATION)`,
      };
    }

    // ── Check for common mock indicators in model name ──────────────────────
    const mockPatterns = ['mock', 'fake', 'stub', 'test', 'dummy', 'simulated'];
    const modelName = report.model_metadata?.model?.toLowerCase() || '';
    for (const pattern of mockPatterns) {
      if (modelName.includes(pattern)) {
        return {
          valid: false,
          reason: `Mock detected in production: model="${report.model_metadata?.model}" (MOCK_VIOLATION)`,
        };
      }
    }
  }

  // ── In development, we allow mocks but still track them ────────────────────
  if (env === 'development') {
    if (report.model_metadata?.provider === 'simulated') {
      // Valid in dev, but we might want to log a warning
      return { valid: true };
    }
  }

  return { valid: true };
}
