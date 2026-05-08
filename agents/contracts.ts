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

// ── Worker Roles ──────────────────────────────────────────────────────────────
// التسلسل الصارم: PLANNER → RESEARCHER → BUILDER → VALIDATOR → REPORTER
export type WorkerRole =
  | 'PLANNER'        // Conceptual: Thinker
  | 'RESEARCHER'     // Conceptual: Searcher
  | 'PATTERN_HUNTER' // Conceptual: Pattern Discovery
  | 'BUILDER'        // Execution: Developer
  | 'VALIDATOR'      // Execution: Tester
  | 'SAFETY_AGENT'   // Execution: Security & Ethics
  | 'REPORTER'       // Integrity: Documentation
  | 'ECONOMIST'      // Integrity: Resource Management
  | 'RESONANCE_AGENT'; // Integrity: Harmony & Soul check

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

// ── Context Snapshot ──────────────────────────────────────────────────────────
// لقطة من حالة النظام تُنقل مع كل handoff لضمان استمرارية السياق
export interface ContextSnapshot {
  resonance_score: number;   // درجة الرنين الحالية [0,1]
  novelty_score: number;     // درجة الجدة الحالية [0,1]
  curiosity_score?: number;  // درجة الفضول [0,1]
  topology_state?: string;   // حالة الطوبولوجيا الحالية
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
  from_worker: WorkerRole | string;  // WorkerRole preferred; string for legacy compat
  to_worker: WorkerRole | string;
  timestamp: number;

  // ── النية (Niyyah) — مطلوبة في كل تسليم ─────────────────────────────────
  // "إنما الأعمال بالنيات" — كل تسليم يبدأ بنية صريحة
  intent: string;

  // ── لقطة السياق — تضمن استمرارية الرنين بين الوكلاء ─────────────────────
  context_snapshot: ContextSnapshot;

  // ── الملفات والبيانات المنقولة ────────────────────────────────────────────
  artifacts: string[];

  // ── المهام المتبقية ───────────────────────────────────────────────────────
  pending_tasks: string[];

  // ── المشاكل المعروفة ──────────────────────────────────────────────────────
  known_issues: string[];

  // ── بوابات التحقق — يجب اجتيازها قبل البدء ──────────────────────────────
  validation_gates: string[];

  // ── قواعد التحقق (legacy compat) ─────────────────────────────────────────
  validation_rules: string[];

  // ── بيانات السياق الإضافية ───────────────────────────────────────────────
  context_data: Record<string, any>;

  // 🧠 سجل التفكير والاستنتاج (Thinker Log)
  reasoning_log?: string;
}

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
