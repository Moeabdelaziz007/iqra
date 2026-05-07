/**
 * 🌙 IQRA Agent Contracts — عقود الوكلاء
 *
 * Defines strict interfaces for worker handoffs and reporting.
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

// ── Source Attestation ────────────────────────────────────────────────────────
// كل مصدر معلومة في WorkerReport يجب أن يحمل وسم مصدر.
export type SourceTag =
  | '[read]'           // قُرئ من ملف في المستودع هذه الجلسة
  | '[fetched]'        // جُلب من مصدر حي (API / web) هذه الجلسة
  | '[prior-training]' // من تدريب سابق — قد يكون قديماً، يحتاج تحقق

export interface SourceAttestation {
  claim: string;       // الادعاء أو الحقيقة المُعلنة
  tag: SourceTag;      // وسم المصدر
  source?: string;     // URL أو مسار الملف أو اسم النموذج
}

// ── Command Log ───────────────────────────────────────────────────────────────
export interface CommandLog {
  command: string;
  exit_code: number;
  output?: string;
}

// ── Worker Report ─────────────────────────────────────────────────────────────
export interface WorkerReport {
  mission_id: string;
  worker_id: string;
  implemented: string[];
  undone: string[];
  commands_run: CommandLog[];
  issues_discovered: string[];
  skills_used: string[];
  procedures_followed: boolean;
  status: 'PASS' | 'FAIL';
  exit_code: number;

  // ── Source Attestation (القاعدة ٣) ──────────────────────────────────────
  // كل ادعاء في التقرير يجب أن يحمل وسم مصدره.
  source_attestations: SourceAttestation[];

  // ── No-Mock Verification (القاعدة ٢) ────────────────────────────────────
  // true = تم التحقق من أن provider ليس simulated في بيئة الإنتاج.
  no_mock_verified: boolean;

  serendipity?: { found: boolean; note: string };
  model_metadata?: {
    provider: string;
    model: string;
    temperature?: number;
    latency_ms?: number;
  };
  timestamp: number;
}

// ── Mission Handoff ───────────────────────────────────────────────────────────
export interface MissionHandoff {
  mission_id: string;
  from_worker: string;
  to_worker: string;
  timestamp: number;
  artifacts: string[];
  pending_tasks: string[];
  known_issues: string[];
  validation_rules: string[];
  context_data: Record<string, any>;
}

/**
 * Structural Rules:
 * 1. Validator cannot modify implementation logic.
 * 2. Reporter cannot write or modify source code.
 * 3. Builder cannot self-approve or bypass validation.
 */
export const WORKER_CONSTRAINTS = {
  VALIDATOR_CAN_MODIFY: false,
  REPORTER_CAN_WRITE_CODE: false,
  BUILDER_CAN_SELF_APPROVE: false,
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
    timestamp: Date.now(),
  };
}
