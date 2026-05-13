/**
 * 🧪 agents/constraints.ts — Unit Tests
 * النية: التحقق من قيود الوكلاء وتسجيل القيود (CONSTRAINTS_REGISTRY)
 *
 * يغطي هذا الملف:
 * - CONSTRAINTS_REGISTRY — التحقق من وجود جميع الأدوار الـ 9
 * - enforceConstraint() — فرض الإجراءات المسموحة والمحظورة
 * - checkRequiredSkills() — التحقق من المهارات المطلوبة
 * - checkMinResonance() — التحقق من الحد الأدنى للرنين
 * - getConstraints() / getAllConstraints() — استرجاع القيود
 * - validateAllConstraints() — التحقق المتكامل
 *
 * المصادر: [read] agents/constraints.ts
 */

import { describe, it, expect } from 'vitest';

import {
  CONSTRAINTS_REGISTRY,
  enforceConstraint,
  checkRequiredSkills,
  checkMinResonance,
  getConstraints,
  getAllConstraints,
  validateAllConstraints,
} from '../../agents/constraints.ts';

import type { WorkerRole } from '../../agents/contracts.ts';

// ── All 9 roles defined in this PR ───────────────────────────────────────────
const ALL_ROLES: WorkerRole[] = [
  'PLANNER',
  'RESEARCHER',
  'PATTERN_HUNTER',
  'BUILDER',
  'VALIDATOR',
  'SAFETY_AGENT',
  'REPORTER',
  'ECONOMIST',
  'RESONANCE_AGENT',
];

// ══════════════════════════════════════════════════════════════
// CONSTRAINTS_REGISTRY — completeness check
// ══════════════════════════════════════════════════════════════
describe('CONSTRAINTS_REGISTRY', () => {
  it('should define constraints for all 9 roles', () => {
    expect(Object.keys(CONSTRAINTS_REGISTRY)).toHaveLength(9);
  });

  ALL_ROLES.forEach(role => {
    it(`should have a constraint entry for "${role}"`, () => {
      expect(CONSTRAINTS_REGISTRY[role]).toBeDefined();
      expect(CONSTRAINTS_REGISTRY[role].role).toBe(role);
    });

    it(`"${role}" should have non-empty allowed_actions`, () => {
      expect(CONSTRAINTS_REGISTRY[role].allowed_actions.length).toBeGreaterThan(0);
    });

    it(`"${role}" should have non-empty forbidden_actions`, () => {
      expect(CONSTRAINTS_REGISTRY[role].forbidden_actions.length).toBeGreaterThan(0);
    });

    it(`"${role}" should have required_skills`, () => {
      expect(Array.isArray(CONSTRAINTS_REGISTRY[role].required_skills)).toBe(true);
    });

    it(`"${role}" max_retries should be 3`, () => {
      expect(CONSTRAINTS_REGISTRY[role].max_retries).toBe(3);
    });
  });

  it('BUILDER.min_resonance should be 0.4 (GLOBAL_CONSTRAINTS.MIN_RESONANCE_FOR_BUILDER)', () => {
    expect(CONSTRAINTS_REGISTRY['BUILDER'].min_resonance).toBe(0.4);
  });

  it('RESONANCE_AGENT.min_resonance should be the highest (0.6)', () => {
    expect(CONSTRAINTS_REGISTRY['RESONANCE_AGENT'].min_resonance).toBe(0.6);
  });
});

// ══════════════════════════════════════════════════════════════
// enforceConstraint
// ══════════════════════════════════════════════════════════════
describe('enforceConstraint', () => {
  // ── PLANNER ────────────────────────────────────────────────
  it('PLANNER: write_code is forbidden', () => {
    const result = enforceConstraint('PLANNER', 'write_code');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('PLANNER');
  });

  it('PLANNER: implement is forbidden', () => {
    expect(enforceConstraint('PLANNER', 'implement').allowed).toBe(false);
  });

  it('PLANNER: modify_code is forbidden', () => {
    expect(enforceConstraint('PLANNER', 'modify_code').allowed).toBe(false);
  });

  it('PLANNER: execute_commands is forbidden', () => {
    expect(enforceConstraint('PLANNER', 'execute_commands').allowed).toBe(false);
  });

  it('PLANNER: approve_reward is forbidden', () => {
    expect(enforceConstraint('PLANNER', 'approve_reward').allowed).toBe(false);
  });

  it('PLANNER: design_mission is allowed', () => {
    expect(enforceConstraint('PLANNER', 'design_mission').allowed).toBe(true);
  });

  it('PLANNER: create_plan is allowed', () => {
    expect(enforceConstraint('PLANNER', 'create_plan').allowed).toBe(true);
  });

  // ── RESEARCHER ─────────────────────────────────────────────
  it('RESEARCHER: write_code is forbidden', () => {
    expect(enforceConstraint('RESEARCHER', 'write_code').allowed).toBe(false);
  });

  it('RESEARCHER: decide_final_reward is forbidden', () => {
    expect(enforceConstraint('RESEARCHER', 'decide_final_reward').allowed).toBe(false);
  });

  it('RESEARCHER: search_patterns is allowed', () => {
    expect(enforceConstraint('RESEARCHER', 'search_patterns').allowed).toBe(true);
  });

  it('RESEARCHER: analyze_resonance is allowed', () => {
    expect(enforceConstraint('RESEARCHER', 'analyze_resonance').allowed).toBe(true);
  });

  // ── BUILDER ────────────────────────────────────────────────
  it('BUILDER: self_approve is forbidden', () => {
    expect(enforceConstraint('BUILDER', 'self_approve').allowed).toBe(false);
  });

  it('BUILDER: bypass_validation is forbidden', () => {
    expect(enforceConstraint('BUILDER', 'bypass_validation').allowed).toBe(false);
  });

  it('BUILDER: modify_constraints is forbidden', () => {
    expect(enforceConstraint('BUILDER', 'modify_constraints').allowed).toBe(false);
  });

  it('BUILDER: write_code is allowed', () => {
    expect(enforceConstraint('BUILDER', 'write_code').allowed).toBe(true);
  });

  it('BUILDER: run_tests is allowed', () => {
    expect(enforceConstraint('BUILDER', 'run_tests').allowed).toBe(true);
  });

  // ── VALIDATOR ──────────────────────────────────────────────
  it('VALIDATOR: write_code is forbidden', () => {
    expect(enforceConstraint('VALIDATOR', 'write_code').allowed).toBe(false);
  });

  it('VALIDATOR: modify_implementation is forbidden', () => {
    expect(enforceConstraint('VALIDATOR', 'modify_implementation').allowed).toBe(false);
  });

  it('VALIDATOR: validate_code is allowed', () => {
    expect(enforceConstraint('VALIDATOR', 'validate_code').allowed).toBe(true);
  });

  it('VALIDATOR: approve_for_next_stage is allowed', () => {
    expect(enforceConstraint('VALIDATOR', 'approve_for_next_stage').allowed).toBe(true);
  });

  // ── REPORTER ───────────────────────────────────────────────
  it('REPORTER: write_code is forbidden', () => {
    expect(enforceConstraint('REPORTER', 'write_code').allowed).toBe(false);
  });

  it('REPORTER: modify_constraints is forbidden', () => {
    expect(enforceConstraint('REPORTER', 'modify_constraints').allowed).toBe(false);
  });

  it('REPORTER: write_reports is allowed', () => {
    expect(enforceConstraint('REPORTER', 'write_reports').allowed).toBe(true);
  });

  it('REPORTER: generate_summaries is allowed', () => {
    expect(enforceConstraint('REPORTER', 'generate_summaries').allowed).toBe(true);
  });

  // ── SAFETY_AGENT ───────────────────────────────────────────
  it('SAFETY_AGENT: bypass_constraints is forbidden', () => {
    expect(enforceConstraint('SAFETY_AGENT', 'bypass_constraints').allowed).toBe(false);
  });

  it('SAFETY_AGENT: check_security is allowed', () => {
    expect(enforceConstraint('SAFETY_AGENT', 'check_security').allowed).toBe(true);
  });

  // ── ECONOMIST ──────────────────────────────────────────────
  it('ECONOMIST: write_code is forbidden', () => {
    expect(enforceConstraint('ECONOMIST', 'write_code').allowed).toBe(false);
  });

  it('ECONOMIST: approve_reward_unilaterally is forbidden', () => {
    expect(enforceConstraint('ECONOMIST', 'approve_reward_unilaterally').allowed).toBe(false);
  });

  it('ECONOMIST: calculate_rewards is allowed', () => {
    expect(enforceConstraint('ECONOMIST', 'calculate_rewards').allowed).toBe(true);
  });

  // ── RESONANCE_AGENT ────────────────────────────────────────
  it('RESONANCE_AGENT: write_code is forbidden', () => {
    expect(enforceConstraint('RESONANCE_AGENT', 'write_code').allowed).toBe(false);
  });

  it('RESONANCE_AGENT: check_harmony is allowed', () => {
    expect(enforceConstraint('RESONANCE_AGENT', 'check_harmony').allowed).toBe(true);
  });

  // ── Unknown role ───────────────────────────────────────────
  it('unknown role should return allowed=false', () => {
    const result = enforceConstraint('UNKNOWN_ROLE' as WorkerRole, 'write_code');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Unknown role');
  });

  // ── Action not in allowed_actions (but not explicitly forbidden) ──
  it('should return allowed=false when action not in allowed_actions list', () => {
    // PLANNER.allowed_actions does not include 'arbitrary_action'
    const result = enforceConstraint('PLANNER', 'arbitrary_action_not_listed');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not in allowed_actions');
  });
});

// ══════════════════════════════════════════════════════════════
// checkRequiredSkills
// ══════════════════════════════════════════════════════════════
describe('checkRequiredSkills', () => {
  it('should pass when all required skills are present', () => {
    // BUILDER requires: typescript_expert, math_validation, testing
    const result = checkRequiredSkills('BUILDER', ['typescript_expert', 'math_validation', 'testing']);
    expect(result.has_skills).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('should fail and list missing skills when some are absent', () => {
    const result = checkRequiredSkills('BUILDER', ['typescript_expert']);
    expect(result.has_skills).toBe(false);
    expect(result.missing).toContain('math_validation');
    expect(result.missing).toContain('testing');
  });

  it('should fail when no skills provided', () => {
    const result = checkRequiredSkills('BUILDER', []);
    expect(result.has_skills).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it('should pass PLANNER with all required skills', () => {
    const result = checkRequiredSkills('PLANNER', ['mission_design', 'logic_validation', 'reasoning']);
    expect(result.has_skills).toBe(true);
  });

  it('should fail for unknown role', () => {
    const result = checkRequiredSkills('UNKNOWN_ROLE' as WorkerRole, ['some_skill']);
    expect(result.has_skills).toBe(false);
    expect(result.missing.some(m => m.includes('Unknown role'))).toBe(true);
  });

  it('should pass when extra skills are provided beyond required', () => {
    // REPORTER requires: narrative_generation, bilingual_report, documentation
    const result = checkRequiredSkills('REPORTER', [
      'narrative_generation', 'bilingual_report', 'documentation', 'extra_skill_not_required',
    ]);
    expect(result.has_skills).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// checkMinResonance
// ══════════════════════════════════════════════════════════════
describe('checkMinResonance', () => {
  it('BUILDER: resonance 0.5 > 0.4 — should be valid', () => {
    const result = checkMinResonance('BUILDER', 0.5);
    expect(result.valid).toBe(true);
  });

  it('BUILDER: resonance exactly 0.4 — should be valid (boundary)', () => {
    const result = checkMinResonance('BUILDER', 0.4);
    expect(result.valid).toBe(true);
  });

  it('BUILDER: resonance 0.39 < 0.4 — should be invalid', () => {
    const result = checkMinResonance('BUILDER', 0.39);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('BUILDER');
    expect(result.reason).toContain('0.4');
  });

  it('RESONANCE_AGENT: resonance 0.6 — should be valid (boundary)', () => {
    const result = checkMinResonance('RESONANCE_AGENT', 0.6);
    expect(result.valid).toBe(true);
  });

  it('RESONANCE_AGENT: resonance 0.59 < 0.6 — should be invalid', () => {
    const result = checkMinResonance('RESONANCE_AGENT', 0.59);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('RESONANCE_AGENT');
    expect(result.reason).toContain('0.6');
  });

  it('PLANNER: resonance 0.2 — should be invalid (< 0.3)', () => {
    const result = checkMinResonance('PLANNER', 0.2);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('PLANNER');
  });

  it('PLANNER: resonance 0.3 — should be valid (boundary)', () => {
    const result = checkMinResonance('PLANNER', 0.3);
    expect(result.valid).toBe(true);
  });

  it('should fail for unknown role', () => {
    const result = checkMinResonance('UNKNOWN_ROLE' as WorkerRole, 0.9);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Unknown role');
  });

  it('should handle resonance=0 for roles that require >0', () => {
    const result = checkMinResonance('BUILDER', 0);
    expect(result.valid).toBe(false);
  });

  it('should handle resonance=1 (max) for any role', () => {
    for (const role of ALL_ROLES) {
      const result = checkMinResonance(role, 1.0);
      expect(result.valid).toBe(true);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// getConstraints / getAllConstraints
// ══════════════════════════════════════════════════════════════
describe('getConstraints', () => {
  it('should return constraint for a known role', () => {
    const constraint = getConstraints('BUILDER');
    expect(constraint).toBeDefined();
    expect(constraint?.role).toBe('BUILDER');
  });

  it('should return undefined for unknown role', () => {
    const constraint = getConstraints('UNKNOWN_ROLE' as WorkerRole);
    expect(constraint).toBeUndefined();
  });

  ALL_ROLES.forEach(role => {
    it(`should return non-undefined for "${role}"`, () => {
      expect(getConstraints(role)).toBeDefined();
    });
  });
});

describe('getAllConstraints', () => {
  it('should return all 9 roles', () => {
    const all = getAllConstraints();
    expect(Object.keys(all)).toHaveLength(9);
  });

  it('should be the same object as CONSTRAINTS_REGISTRY', () => {
    expect(getAllConstraints()).toBe(CONSTRAINTS_REGISTRY);
  });
});

// ══════════════════════════════════════════════════════════════
// validateAllConstraints
// ══════════════════════════════════════════════════════════════
describe('validateAllConstraints', () => {
  it('should pass for BUILDER with all constraints met', () => {
    const result = validateAllConstraints(
      'BUILDER',
      'write_code',
      ['typescript_expert', 'math_validation', 'testing'],
      0.5
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when action is forbidden', () => {
    const result = validateAllConstraints(
      'BUILDER',
      'self_approve',
      ['typescript_expert', 'math_validation', 'testing'],
      0.5
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('self_approve'))).toBe(true);
  });

  it('should fail when required skill is missing', () => {
    const result = validateAllConstraints(
      'BUILDER',
      'write_code',
      ['typescript_expert'], // missing math_validation and testing
      0.5
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Missing skills'))).toBe(true);
  });

  it('should fail when resonance is too low', () => {
    const result = validateAllConstraints(
      'BUILDER',
      'write_code',
      ['typescript_expert', 'math_validation', 'testing'],
      0.1 // below 0.4
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('resonance'))).toBe(true);
  });

  it('should accumulate multiple errors', () => {
    const result = validateAllConstraints(
      'BUILDER',
      'self_approve',  // forbidden
      [],              // missing all skills
      0.0              // too low resonance
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('should pass PLANNER with plan action and 0.3+ resonance', () => {
    const result = validateAllConstraints(
      'PLANNER',
      'create_plan',
      ['mission_design', 'logic_validation', 'reasoning'],
      0.5
    );
    expect(result.valid).toBe(true);
  });

  it('should fail PLANNER if resonance is 0.2 (< 0.3)', () => {
    const result = validateAllConstraints(
      'PLANNER',
      'create_plan',
      ['mission_design', 'logic_validation', 'reasoning'],
      0.2
    );
    expect(result.valid).toBe(false);
  });
});