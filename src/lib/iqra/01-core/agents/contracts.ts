/**
 * 🌙 IQRA Agent Contracts — عقود الوكلاء
 * النية: تعريف العقود المشتركة بين جميع الوكلاء الخمسة
 * المرجع: "وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ" — المائدة: 2
 */

// ── Worker Roles ──────────────────────────────────────────────────────────────
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
export type SourceTag =
  | '[read]'           // قُرئ من ملف في المستودع هذه الجلسة
  | '[fetched]'        // جُلب من مصدر حي (API / web) هذه الجلسة
  | '[prior-training]' // من تدريب سابق

export interface SourceAttestation {
  claim: string;       // الادعاء أو الحقيقة المُعلنة
  tag: SourceTag;      // وسم المصدر
  source?: string;     // URL أو مسار الملف أو اسم النموذج
}

// ── Context Snapshot ──────────────────────────────────────────────────────────
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

/**
 * 🛰️ IQRA Unified Protocol Payload — حمولة البروتوكول الموحد
 */
export interface IQRAExchange {
  mission_id: string;
  timestamp: number;
  intent: string;
  context_snapshot: ContextSnapshot;
  artifacts: string[];
  issues_discovered: string[]; // Merged known_issues and issues_discovered
  known_issues?: string[];    // Alias for transition compatibility
}

// ── Worker Report ─────────────────────────────────────────────────────────────
export interface WorkerReport extends IQRAExchange {
  worker_id: string;
  implemented: string[];
  undone: string[];
  commands_run: CommandLog[];
  skills_used: string[];
  procedures_followed: boolean;
  status: 'PASS' | 'FAIL';
  exit_code: number;
  source_attestations: SourceAttestation[];
  no_mock_verified: boolean;
  serendipity?: { found: boolean; note: string };
  model_metadata?: {
    provider: string;
    model: string;
    temperature?: number;
    latency_ms?: number;
  };
}

// ── Mission Handoff ───────────────────────────────────────────────────────────
export interface MissionHandoff extends IQRAExchange {
  from_worker: WorkerRole | string;
  to_worker: WorkerRole | string;
  pending_tasks: string[];
  validation_gates: string[];
  validation_rules: string[];
  context_data: Record<string, any>;
  reasoning_log?: string;
}

export function makeWorkerReport(
  mission_id: string,
  worker_id: string,
  provider: string,
  intent: string = '',
  context_snapshot: ContextSnapshot = { resonance_score: 1.0, novelty_score: 0.0 },
  artifacts: string[] = []
): WorkerReport {
  return {
    mission_id,
    timestamp: Date.now(),
    intent,
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
    artifacts,
    context_snapshot
  };
}

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
    timestamp: Date.now(),
    from_worker,
    to_worker,
    intent,
    context_snapshot,
    artifacts: [],
    pending_tasks: [],
    issues_discovered: [],
    validation_gates: [],
    validation_rules: [],
    context_data: {},
    ...overrides,
  };
}
