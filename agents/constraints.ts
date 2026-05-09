/**
 * 🌙 IQRA Worker Constraints — قيود الوكلاء
 * النية: تعريف وفرض القيود الهيكلية على كل وكيل
 * المرجع: "وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ" — المائدة: 2
 *
 * القاعدة: كل وكيل له دور محدد وقيود صارمة.
 * القاعدة: لا يمكن تجاوز القيود تحت أي ظرف.
 * القاعدة: كل محاولة تجاوز تُسجَّل في TrustChain.
 */

import type { WorkerRole } from './contracts';
import { WORKER_CONSTRAINTS, GLOBAL_CONSTRAINTS } from './contracts';

// ── Constraint Definition ─────────────────────────────────────────────────────

export interface WorkerConstraint {
  role: WorkerRole;
  allowed_actions: string[];
  forbidden_actions: string[];
  required_skills: string[];
  min_resonance?: number;
  max_retries?: number;
  timeout_ms?: number;
}

// ── Constraint Registry ───────────────────────────────────────────────────────

/**
 * تعريف القيود لكل وكيل.
 * 
 * كل وكيل له:
 * - allowed_actions: الإجراءات المسموحة
 * - forbidden_actions: الإجراءات المحظورة
 * - required_skills: المهارات المطلوبة
 * - min_resonance: الحد الأدنى للرنين (اختياري)
 * - max_retries: الحد الأقصى للمحاولات (اختياري)
 * - timeout_ms: المهلة الزمنية (اختياري)
 */
export const CONSTRAINTS_REGISTRY: Record<WorkerRole, WorkerConstraint> = {
  PLANNER: {
    role: 'PLANNER',
    allowed_actions: [
      'design_mission',
      'define_goals',
      'create_plan',
      'reason_about_problem',
      'document_intent',
      'validate_logic',
    ],
    forbidden_actions: [
      'write_code',
      'implement',
      'modify_code',
      'execute_commands',
      'approve_reward',
      'decide_final_reward',
    ],
    required_skills: ['mission_design', 'logic_validation', 'reasoning'],
    min_resonance: 0.3,
    max_retries: 3,
    timeout_ms: 300000, // 5 minutes
  },

  RESEARCHER: {
    role: 'RESEARCHER',
    allowed_actions: [
      'search_patterns',
      'analyze_resonance',
      'discover_patterns',
      'compute_novelty',
      'vector_search',
      'topological_analysis',
      'document_findings',
    ],
    forbidden_actions: [
      'write_code',
      'implement',
      'modify_code',
      'approve_reward',
      'decide_final_reward',
      'execute_commands',
    ],
    required_skills: ['topological_curiosity', 'vector_search', 'pattern_analysis'],
    min_resonance: 0.4,
    max_retries: 3,
    timeout_ms: 600000, // 10 minutes
  },

  PATTERN_HUNTER: {
    role: 'PATTERN_HUNTER',
    allowed_actions: [
      'discover_patterns',
      'analyze_topology',
      'compute_homology',
      'calculate_shannon',
      'detect_resonance',
      'document_patterns',
    ],
    forbidden_actions: [
      'write_code',
      'implement',
      'modify_code',
      'approve_reward',
      'execute_commands',
    ],
    required_skills: ['pattern_discovery', 'topological_analysis', 'mathematics'],
    min_resonance: 0.5,
    max_retries: 3,
    timeout_ms: 600000, // 10 minutes
  },

  BUILDER: {
    role: 'BUILDER',
    allowed_actions: [
      'write_code',
      'implement',
      'modify_code',
      'execute_commands',
      'run_tests',
      'document_code',
      'create_artifacts',
    ],
    forbidden_actions: [
      'modify_implementation_logic_beyond_scope',
      'self_approve',
      'bypass_validation',
      'approve_reward',
      'decide_final_reward',
      'modify_constraints',
    ],
    required_skills: ['typescript_expert', 'math_validation', 'testing'],
    min_resonance: GLOBAL_CONSTRAINTS.MIN_RESONANCE_FOR_BUILDER, // 0.4
    max_retries: 3,
    timeout_ms: 900000, // 15 minutes
  },

  VALIDATOR: {
    role: 'VALIDATOR',
    allowed_actions: [
      'validate_code',
      'run_tests',
      'check_constraints',
      'verify_sources',
      'document_validation',
      'report_issues',
      'approve_for_next_stage',
    ],
    forbidden_actions: [
      'write_code',
      'modify_implementation',
      'modify_code',
      'execute_commands_outside_testing',
      'approve_reward',
      'decide_final_reward',
    ],
    required_skills: ['doctrinal_guard', 'numerical_verification', 'testing'],
    min_resonance: 0.5,
    max_retries: 3,
    timeout_ms: 600000, // 10 minutes
  },

  SAFETY_AGENT: {
    role: 'SAFETY_AGENT',
    allowed_actions: [
      'check_security',
      'verify_ethics',
      'validate_constraints',
      'check_no_mock',
      'verify_sources',
      'document_safety_checks',
      'report_violations',
    ],
    forbidden_actions: [
      'write_code',
      'modify_code',
      'execute_commands',
      'approve_reward',
      'decide_final_reward',
      'bypass_constraints',
    ],
    required_skills: ['security_analysis', 'ethics_validation', 'constraint_checking'],
    min_resonance: 0.5,
    max_retries: 3,
    timeout_ms: 300000, // 5 minutes
  },

  REPORTER: {
    role: 'REPORTER',
    allowed_actions: [
      'document_findings',
      'write_reports',
      'create_narratives',
      'generate_summaries',
      'translate_content',
      'format_output',
      'archive_results',
    ],
    forbidden_actions: [
      'write_code',
      'modify_code',
      'implement',
      'execute_commands',
      'approve_reward',
      'decide_final_reward',
      'modify_constraints',
    ],
    required_skills: ['narrative_generation', 'bilingual_report', 'documentation'],
    min_resonance: 0.4,
    max_retries: 3,
    timeout_ms: 300000, // 5 minutes
  },

  ECONOMIST: {
    role: 'ECONOMIST',
    allowed_actions: [
      'calculate_rewards',
      'track_resources',
      'manage_budget',
      'document_economics',
      'report_metrics',
      'optimize_allocation',
    ],
    forbidden_actions: [
      'write_code',
      'modify_code',
      'implement',
      'execute_commands',
      'approve_reward_unilaterally',
      'modify_constraints',
    ],
    required_skills: ['resource_management', 'reward_calculation', 'metrics'],
    min_resonance: 0.4,
    max_retries: 3,
    timeout_ms: 300000, // 5 minutes
  },

  RESONANCE_AGENT: {
    role: 'RESONANCE_AGENT',
    allowed_actions: [
      'check_harmony',
      'verify_soul_alignment',
      'validate_intent',
      'check_coherence',
      'document_resonance',
      'report_harmony_status',
    ],
    forbidden_actions: [
      'write_code',
      'modify_code',
      'implement',
      'execute_commands',
      'approve_reward',
      'decide_final_reward',
      'modify_constraints',
    ],
    required_skills: ['harmony_checking', 'intent_validation', 'coherence_analysis'],
    min_resonance: 0.6,
    max_retries: 3,
    timeout_ms: 300000, // 5 minutes
  },
};

// ── Constraint Enforcement ────────────────────────────────────────────────────

/**
 * يتحقق من أن الإجراء مسموح للوكيل.
 * 
 * @param role - دور الوكيل
 * @param action - الإجراء المطلوب
 * @returns { allowed: boolean; reason?: string }
 * 
 * @example
 * const result = enforceConstraint('BUILDER', 'write_code');
 * if (!result.allowed) {
 *   throw new Error(result.reason);
 * }
 */
export function enforceConstraint(
  role: WorkerRole,
  action: string
): { allowed: boolean; reason?: string } {
  const constraint = CONSTRAINTS_REGISTRY[role];

  if (!constraint) {
    return {
      allowed: false,
      reason: `Unknown role: "${role}"`,
    };
  }

  // ── Check if action is forbidden ───────────────────────────────────────────
  if (constraint.forbidden_actions.includes(action)) {
    return {
      allowed: false,
      reason: `Action "${action}" is forbidden for ${role}`,
    };
  }

  // ── Check if action is allowed (if allowed_actions is not empty) ──────────
  if (constraint.allowed_actions.length > 0 && !constraint.allowed_actions.includes(action)) {
    return {
      allowed: false,
      reason: `Action "${action}" is not in allowed_actions for ${role}`,
    };
  }

  return { allowed: true };
}

/**
 * يتحقق من أن الوكيل يملك المهارات المطلوبة.
 * 
 * @param role - دور الوكيل
 * @param skills - المهارات المتاحة للوكيل
 * @returns { has_skills: boolean; missing: string[] }
 * 
 * @example
 * const result = checkRequiredSkills('BUILDER', ['typescript_expert', 'testing']);
 * if (!result.has_skills) {
 *   console.error(`Missing skills: ${result.missing.join(', ')}`);
 * }
 */
export function checkRequiredSkills(
  role: WorkerRole,
  skills: string[]
): { has_skills: boolean; missing: string[] } {
  const constraint = CONSTRAINTS_REGISTRY[role];

  if (!constraint) {
    return {
      has_skills: false,
      missing: [`Unknown role: "${role}"`],
    };
  }

  const missing = constraint.required_skills.filter((skill) => !skills.includes(skill));

  return {
    has_skills: missing.length === 0,
    missing,
  };
}

/**
 * يتحقق من أن الوكيل يملك الحد الأدنى من الرنين.
 * 
 * @param role - دور الوكيل
 * @param resonance - درجة الرنين الحالية
 * @returns { valid: boolean; reason?: string }
 * 
 * @example
 * const result = checkMinResonance('BUILDER', 0.35);
 * if (!result.valid) {
 *   console.error(result.reason);
 *   // Output: BUILDER requires min_resonance=0.4, got 0.35
 * }
 */
export function checkMinResonance(
  role: WorkerRole,
  resonance: number
): { valid: boolean; reason?: string } {
  const constraint = CONSTRAINTS_REGISTRY[role];

  if (!constraint) {
    return {
      valid: false,
      reason: `Unknown role: "${role}"`,
    };
  }

  if (constraint.min_resonance !== undefined && resonance < constraint.min_resonance) {
    return {
      valid: false,
      reason: `${role} requires min_resonance=${constraint.min_resonance}, got ${resonance.toFixed(3)}`,
    };
  }

  return { valid: true };
}

/**
 * يحصل على القيود الكاملة لوكيل معين.
 * 
 * @param role - دور الوكيل
 * @returns القيود الكاملة أو undefined إذا كان الدور غير معروف
 * 
 * @example
 * const constraints = getConstraints('BUILDER');
 * console.log(constraints.allowed_actions);
 * // Output: ['write_code', 'implement', 'modify_code', ...]
 */
export function getConstraints(role: WorkerRole): WorkerConstraint | undefined {
  return CONSTRAINTS_REGISTRY[role];
}

/**
 * يحصل على جميع القيود المسجلة.
 * 
 * @returns جميع القيود
 * 
 * @example
 * const allConstraints = getAllConstraints();
 * for (const [role, constraint] of Object.entries(allConstraints)) {
 *   console.log(`${role}: ${constraint.allowed_actions.length} allowed actions`);
 * }
 */
export function getAllConstraints(): Record<WorkerRole, WorkerConstraint> {
  return CONSTRAINTS_REGISTRY;
}

/**
 * يتحقق من أن الوكيل يتبع جميع القيود.
 * 
 * @param role - دور الوكيل
 * @param action - الإجراء المطلوب
 * @param skills - المهارات المتاحة
 * @param resonance - درجة الرنين الحالية
 * @returns { valid: boolean; errors: string[] }
 * 
 * @example
 * const result = validateAllConstraints('BUILDER', 'write_code', ['typescript_expert'], 0.5);
 * if (!result.valid) {
 *   console.error(`Constraint violations: ${result.errors.join(', ')}`);
 * }
 */
export function validateAllConstraints(
  role: WorkerRole,
  action: string,
  skills: string[],
  resonance: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // ── Check action constraint ────────────────────────────────────────────────
  const actionResult = enforceConstraint(role, action);
  if (!actionResult.allowed) {
    errors.push(actionResult.reason || 'Action not allowed');
  }

  // ── Check skills constraint ────────────────────────────────────────────────
  const skillsResult = checkRequiredSkills(role, skills);
  if (!skillsResult.has_skills) {
    errors.push(`Missing skills: ${skillsResult.missing.join(', ')}`);
  }

  // ── Check resonance constraint ─────────────────────────────────────────────
  const resonanceResult = checkMinResonance(role, resonance);
  if (!resonanceResult.valid) {
    errors.push(resonanceResult.reason || 'Resonance too low');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
