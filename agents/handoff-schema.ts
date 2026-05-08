/**
 * 🌙 IQRA Handoff Schema — مخطط التسليم بين الوكلاء
 * النية: ضمان أن كل وكيل يستلم المهمة كاملة غير منقوصة
 * المرجع: "وَأَوْفُوا بِالْعَهْدِ ۖ إِنَّ الْعَهْدَ كَانَ مَسْئُولًا" — الإسراء: 34
 *
 * القاعدة: لا يبدأ الوكيل التالي حتى يوقّع الوكيل السابق.
 * القاعدة: أي حقل فارغ أو ناقص يُبطل التسليم.
 * القاعدة: لا mock في أي artifact.
 */

import type { MissionHandoff, WorkerRole, ContextSnapshot } from './contracts';
import { GLOBAL_CONSTRAINTS } from './contracts';

// ── Validation Result ─────────────────────────────────────────────────────────

export interface HandoffValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ── validateHandoff ───────────────────────────────────────────────────────────

/**
 * يتحقق من صحة التسليم بين الوكلاء.
 * يُرجع { valid, errors, warnings } بدلاً من boolean بسيط
 * لإعطاء معلومات تشخيصية كاملة.
 */
export function validateHandoff(handoff: MissionHandoff): HandoffValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── ١. الحقول الأساسية ────────────────────────────────────────────────────
  if (!handoff.mission_id?.trim())  errors.push('mission_id is required');
  if (!handoff.from_worker?.trim()) errors.push('from_worker is required');
  if (!handoff.to_worker?.trim())   errors.push('to_worker is required');
  if (!handoff.timestamp)           errors.push('timestamp is required');

  // ── ٢. النية (Niyyah) — "إنما الأعمال بالنيات" ───────────────────────────
  if (!handoff.intent?.trim()) {
    errors.push('intent (النية) is required — كل تسليم يبدأ بنية صريحة');
  } else if (handoff.intent.trim().length < 10) {
    warnings.push('intent is very short — consider adding more context');
  }

  // ── ٣. لقطة السياق (Context Snapshot) ───────────────────────────────────
  const snap = handoff.context_snapshot;
  if (!snap) {
    errors.push('context_snapshot is required — يضمن استمرارية الرنين');
  } else {
    if (typeof snap.resonance_score !== 'number') {
      errors.push('context_snapshot.resonance_score must be a number');
    } else if (snap.resonance_score < 0 || snap.resonance_score > 1) {
      errors.push(`context_snapshot.resonance_score out of range [0,1]: ${snap.resonance_score}`);
    }
    if (typeof snap.novelty_score !== 'number') {
      errors.push('context_snapshot.novelty_score must be a number');
    } else if (snap.novelty_score < 0 || snap.novelty_score > 1) {
      errors.push(`context_snapshot.novelty_score out of range [0,1]: ${snap.novelty_score}`);
    }
  }

  // ── ٤. بوابات التحقق (Validation Gates) ──────────────────────────────────
  if (!Array.isArray(handoff.validation_gates)) {
    errors.push('validation_gates must be an array');
  } else if (handoff.validation_gates.length === 0) {
    warnings.push('validation_gates is empty — consider adding at least one gate');
  }

  // ── ٥. الملفات (Artifacts) ────────────────────────────────────────────────
  if (!Array.isArray(handoff.artifacts)) {
    errors.push('artifacts must be an array');
  }

  // ── ٦. قواعد دستورية خاصة ────────────────────────────────────────────────
  // من AGENTS.md: Builder لا يبدأ قبل أن يكون resonance > 0.4
  if (
    handoff.to_worker === 'BUILDER' &&
    snap &&
    typeof snap.resonance_score === 'number' &&
    snap.resonance_score < GLOBAL_CONSTRAINTS.MIN_RESONANCE_FOR_BUILDER
  ) {
    errors.push(
      `DASTŪR VIOLATION: BUILDER cannot start with resonance_score < ` +
      `${GLOBAL_CONSTRAINTS.MIN_RESONANCE_FOR_BUILDER} ` +
      `(got ${snap.resonance_score.toFixed(3)})`
    );
  }

  // ── ٧. لا يمكن التسليم لنفس الوكيل ──────────────────────────────────────
  if (handoff.from_worker && handoff.to_worker &&
      handoff.from_worker === handoff.to_worker) {
    errors.push(`from_worker and to_worker cannot be the same: "${handoff.from_worker}"`);
  }

  // ── ٨. التسلسل الصارم ────────────────────────────────────────────────────
  const seq = GLOBAL_CONSTRAINTS.STRICT_SEQUENCE;
  const fromIdx = seq.indexOf(handoff.from_worker as WorkerRole);
  const toIdx   = seq.indexOf(handoff.to_worker as WorkerRole);
  if (fromIdx !== -1 && toIdx !== -1 && toIdx !== fromIdx + 1) {
    warnings.push(
      `Non-sequential handoff: ${handoff.from_worker} → ${handoff.to_worker}. ` +
      `Expected: ${seq[fromIdx]} → ${seq[fromIdx + 1] ?? 'END'}`
    );
  }

  // ── ٩. سجل التفكير (Reasoning Log) ──────────────────────────────────────
  // من الدستور المحدث: PLANNER يجب أن يقدم سجل تفكير.
  if (handoff.from_worker === 'PLANNER' && !handoff.reasoning_log?.trim()) {
    errors.push('DASTŪR VIOLATION: PLANNER must provide reasoning_log (سجل التفكير)');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ── createHandoff — Factory ───────────────────────────────────────────────────

/**
 * يُنشئ هيكل تسليم متوافق مع الدستور.
 * يُطبّق القيم الافتراضية الآمنة.
 */
export function createHandoff(params: {
  mission_id: string;
  from_worker: WorkerRole;
  to_worker: WorkerRole;
  intent: string;
  context_snapshot: ContextSnapshot;
  artifacts?: string[];
  pending_tasks?: string[];
  known_issues?: string[];
  validation_gates?: string[];
  context_data?: Record<string, any>;
}): MissionHandoff {
  return {
    mission_id:       params.mission_id,
    from_worker:      params.from_worker,
    to_worker:        params.to_worker,
    timestamp:        Date.now(),
    intent:           params.intent,
    context_snapshot: params.context_snapshot,
    artifacts:        params.artifacts        ?? [],
    pending_tasks:    params.pending_tasks    ?? [],
    known_issues:     params.known_issues     ?? [],
    validation_gates: params.validation_gates ?? [],
    validation_rules: [],
    context_data:     params.context_data     ?? {},
  };
}

// ── assertValidHandoff — throws on invalid ────────────────────────────────────

/**
 * يُطلق خطأ فورياً إذا كان التسليم غير صالح.
 * استخدمه في بداية كل worker قبل معالجة الـ handoff.
 */
export function assertValidHandoff(handoff: MissionHandoff): void {
  const result = validateHandoff(handoff);
  if (!result.valid) {
    throw new Error(
      `HANDOFF_ERR [${handoff.mission_id}] ` +
      `${handoff.from_worker}→${handoff.to_worker}: ` +
      result.errors.join(' | ')
    );
  }
}
