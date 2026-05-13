/**
 * 🧪 agents/handoff-schema.ts — Unit Tests
 * النية: التحقق من صحة التسليم بين الوكلاء (validateHandoff, createHandoff, assertValidHandoff)
 *
 * التغييرات في هذا الـ PR:
 * - حُذف حقل issues_discovered من createHandoff() (كان يتكرر مع known_issues)
 *
 * المصادر: [read] agents/handoff-schema.ts
 */

import { describe, it, expect } from 'vitest';

import {
  validateHandoff,
  createHandoff,
  assertValidHandoff,
} from '../../agents/handoff-schema.ts';

import type { MissionHandoff, ContextSnapshot } from '../../agents/contracts.ts';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const validSnapshot: ContextSnapshot = {
  resonance_score: 0.7,
  novelty_score: 0.3,
};

function buildHandoff(overrides: Partial<MissionHandoff> = {}): MissionHandoff {
  return {
    mission_id: 'mission-001',
    from_worker: 'PLANNER',
    to_worker: 'RESEARCHER',
    timestamp: Date.now(),
    intent: 'Analyse topological resonance in Surah Ya-Sin',
    context_snapshot: validSnapshot,
    artifacts: [],
    pending_tasks: [],
    known_issues: [],
    validation_gates: [],
    validation_rules: [],
    context_data: {},
    reasoning_log: 'First principle: patterns emerge from topology',
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════
// validateHandoff
// ══════════════════════════════════════════════════════════════
describe('validateHandoff', () => {
  it('should return valid for a fully correct handoff', () => {
    const result = validateHandoff(buildHandoff());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // ── Required fields ────────────────────────────────────────
  it('should error when mission_id is missing', () => {
    const result = validateHandoff(buildHandoff({ mission_id: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('mission_id'))).toBe(true);
  });

  it('should error when from_worker is missing', () => {
    const result = validateHandoff(buildHandoff({ from_worker: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('from_worker'))).toBe(true);
  });

  it('should error when to_worker is missing', () => {
    const result = validateHandoff(buildHandoff({ to_worker: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('to_worker'))).toBe(true);
  });

  it('should error when timestamp is 0/falsy', () => {
    const result = validateHandoff(buildHandoff({ timestamp: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('timestamp'))).toBe(true);
  });

  // ── Intent (Niyyah) ────────────────────────────────────────
  it('should error when intent is empty', () => {
    const result = validateHandoff(buildHandoff({ intent: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('intent'))).toBe(true);
  });

  it('should warn when intent is very short (< 10 chars)', () => {
    const result = validateHandoff(buildHandoff({ intent: 'Short' }));
    expect(result.warnings.some(w => w.includes('short'))).toBe(true);
  });

  it('should not warn when intent is 10+ characters', () => {
    const result = validateHandoff(buildHandoff({ intent: 'Long enough intent here' }));
    const intentWarnings = result.warnings.filter(w => w.toLowerCase().includes('short'));
    expect(intentWarnings).toHaveLength(0);
  });

  // ── Context Snapshot ───────────────────────────────────────
  it('should error when context_snapshot is null/undefined', () => {
    const result = validateHandoff(buildHandoff({ context_snapshot: undefined as any }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('context_snapshot'))).toBe(true);
  });

  it('should error when resonance_score is not a number', () => {
    const result = validateHandoff(buildHandoff({
      context_snapshot: { resonance_score: 'high' as any, novelty_score: 0.5 },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('resonance_score'))).toBe(true);
  });

  it('should error when resonance_score < 0', () => {
    const result = validateHandoff(buildHandoff({
      context_snapshot: { resonance_score: -0.1, novelty_score: 0.5 },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('resonance_score'))).toBe(true);
  });

  it('should error when resonance_score > 1', () => {
    const result = validateHandoff(buildHandoff({
      context_snapshot: { resonance_score: 1.5, novelty_score: 0.5 },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('resonance_score'))).toBe(true);
  });

  it('should error when novelty_score is not a number', () => {
    const result = validateHandoff(buildHandoff({
      context_snapshot: { resonance_score: 0.5, novelty_score: 'low' as any },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('novelty_score'))).toBe(true);
  });

  it('should accept boundary values resonance_score=0 and =1', () => {
    expect(validateHandoff(buildHandoff({
      context_snapshot: { resonance_score: 0, novelty_score: 0 },
    })).valid).toBe(true);

    expect(validateHandoff(buildHandoff({
      context_snapshot: { resonance_score: 1, novelty_score: 1 },
    })).valid).toBe(true);
  });

  // ── Validation Gates ───────────────────────────────────────
  it('should error when validation_gates is not an array', () => {
    const result = validateHandoff(buildHandoff({ validation_gates: 'not-array' as any }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('validation_gates'))).toBe(true);
  });

  it('should warn when validation_gates is empty', () => {
    const result = validateHandoff(buildHandoff({ validation_gates: [] }));
    expect(result.warnings.some(w => w.includes('validation_gates'))).toBe(true);
  });

  // ── Artifacts ──────────────────────────────────────────────
  it('should error when artifacts is not an array', () => {
    const result = validateHandoff(buildHandoff({ artifacts: 'not-array' as any }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('artifacts'))).toBe(true);
  });

  // ── BUILDER resonance gate ─────────────────────────────────
  it('should error when handing to BUILDER with resonance_score < 0.4', () => {
    const result = validateHandoff(buildHandoff({
      from_worker: 'RESEARCHER',
      to_worker: 'BUILDER',
      context_snapshot: { resonance_score: 0.3, novelty_score: 0.5 },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('DASTŪR VIOLATION') && e.includes('BUILDER'))).toBe(true);
  });

  it('should allow BUILDER when resonance_score = 0.4 (boundary)', () => {
    const result = validateHandoff(buildHandoff({
      from_worker: 'RESEARCHER',
      to_worker: 'BUILDER',
      context_snapshot: { resonance_score: 0.4, novelty_score: 0.5 },
    }));
    // 0.4 is not < 0.4, should be allowed
    expect(result.errors.filter(e => e.includes('BUILDER')).length === 0 ||
           result.errors.every(e => !e.includes('DASTŪR'))).toBe(true);
  });

  it('should allow BUILDER when resonance_score > 0.4', () => {
    const result = validateHandoff(buildHandoff({
      from_worker: 'RESEARCHER',
      to_worker: 'BUILDER',
      context_snapshot: { resonance_score: 0.6, novelty_score: 0.5 },
    }));
    expect(result.errors.filter(e => e.includes('DASTŪR VIOLATION'))).toHaveLength(0);
  });

  // ── Self-handoff prohibition ───────────────────────────────
  it('should error when from_worker === to_worker', () => {
    const result = validateHandoff(buildHandoff({
      from_worker: 'BUILDER',
      to_worker: 'BUILDER',
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('cannot be the same'))).toBe(true);
  });

  // ── PLANNER reasoning_log requirement ─────────────────────
  it('should error when PLANNER does not provide reasoning_log', () => {
    const result = validateHandoff(buildHandoff({
      from_worker: 'PLANNER',
      to_worker: 'RESEARCHER',
      reasoning_log: '',
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('PLANNER') && e.includes('reasoning_log'))).toBe(true);
  });

  it('should be valid when PLANNER provides reasoning_log', () => {
    const result = validateHandoff(buildHandoff({
      from_worker: 'PLANNER',
      to_worker: 'RESEARCHER',
      reasoning_log: 'First principle: start from the Quran pattern',
    }));
    expect(result.valid).toBe(true);
  });

  it('should not require reasoning_log for non-PLANNER workers', () => {
    const result = validateHandoff(buildHandoff({
      from_worker: 'BUILDER',
      to_worker: 'VALIDATOR',
      reasoning_log: undefined,
    }));
    expect(result.errors.filter(e => e.includes('reasoning_log'))).toHaveLength(0);
  });

  // ── Sequential handoff warnings ────────────────────────────
  it('should warn on non-sequential handoff (e.g. PLANNER → BUILDER, skipping RESEARCHER)', () => {
    const result = validateHandoff(buildHandoff({
      from_worker: 'PLANNER',
      to_worker: 'BUILDER',
      reasoning_log: 'Skipping researcher intentionally',
    }));
    expect(result.warnings.some(w => w.includes('Non-sequential'))).toBe(true);
  });

  it('should NOT warn for sequential handoff PLANNER → RESEARCHER', () => {
    const result = validateHandoff(buildHandoff({
      from_worker: 'PLANNER',
      to_worker: 'RESEARCHER',
    }));
    const seqWarnings = result.warnings.filter(w => w.includes('Non-sequential'));
    expect(seqWarnings).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// createHandoff — factory function
// ══════════════════════════════════════════════════════════════
describe('createHandoff', () => {
  it('should create a valid handoff with required params only', () => {
    const handoff = createHandoff({
      mission_id: 'mission-x',
      from_worker: 'PLANNER',
      to_worker: 'RESEARCHER',
      intent: 'Hunt topological patterns',
      context_snapshot: validSnapshot,
    });

    expect(handoff.mission_id).toBe('mission-x');
    expect(handoff.from_worker).toBe('PLANNER');
    expect(handoff.to_worker).toBe('RESEARCHER');
    expect(handoff.intent).toBe('Hunt topological patterns');
    expect(handoff.timestamp).toBeGreaterThan(0);
  });

  it('should default optional arrays to empty', () => {
    const handoff = createHandoff({
      mission_id: 'm',
      from_worker: 'RESEARCHER',
      to_worker: 'BUILDER',
      intent: 'Build the module',
      context_snapshot: validSnapshot,
    });

    expect(handoff.artifacts).toEqual([]);
    expect(handoff.pending_tasks).toEqual([]);
    expect(handoff.known_issues).toEqual([]);
    expect(handoff.validation_gates).toEqual([]);
    expect(handoff.validation_rules).toEqual([]);
    expect(handoff.context_data).toEqual({});
  });

  it('should NOT produce issues_discovered field (removed in this PR)', () => {
    const handoff = createHandoff({
      mission_id: 'm',
      from_worker: 'PLANNER',
      to_worker: 'RESEARCHER',
      intent: 'Some intent here...',
      context_snapshot: validSnapshot,
      known_issues: ['Issue A'],
    });

    // issues_discovered was removed from createHandoff in this PR
    expect((handoff as any).issues_discovered).toBeUndefined();
  });

  it('should accept and persist optional artifacts list', () => {
    const handoff = createHandoff({
      mission_id: 'm',
      from_worker: 'BUILDER',
      to_worker: 'VALIDATOR',
      intent: 'Validate the artifacts',
      context_snapshot: validSnapshot,
      artifacts: ['lib/iqra/main.ts', 'tests/unit/main.test.ts'],
    });

    expect(handoff.artifacts).toEqual(['lib/iqra/main.ts', 'tests/unit/main.test.ts']);
  });

  it('should accept known_issues and persist them', () => {
    const handoff = createHandoff({
      mission_id: 'm',
      from_worker: 'BUILDER',
      to_worker: 'VALIDATOR',
      intent: 'Validate with known issues noted',
      context_snapshot: validSnapshot,
      known_issues: ['Type mismatch in line 45'],
    });

    expect(handoff.known_issues).toEqual(['Type mismatch in line 45']);
  });

  it('should set timestamp close to now', () => {
    const before = Date.now();
    const handoff = createHandoff({
      mission_id: 'm',
      from_worker: 'PLANNER',
      to_worker: 'RESEARCHER',
      intent: 'timing test intent here',
      context_snapshot: validSnapshot,
    });
    const after = Date.now();
    expect(handoff.timestamp).toBeGreaterThanOrEqual(before);
    expect(handoff.timestamp).toBeLessThanOrEqual(after);
  });

  it('should produce a handoff that passes validateHandoff (for PLANNER with reasoning)', () => {
    const handoff = createHandoff({
      mission_id: 'm',
      from_worker: 'BUILDER',
      to_worker: 'VALIDATOR',
      intent: 'Validate implementation output',
      context_snapshot: { resonance_score: 0.5, novelty_score: 0.3 },
    });

    const result = validateHandoff(handoff);
    // Known warning: validation_gates is empty — acceptable
    expect(result.errors).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// assertValidHandoff
// ══════════════════════════════════════════════════════════════
describe('assertValidHandoff', () => {
  it('should not throw for a valid handoff', () => {
    const handoff = buildHandoff();
    expect(() => assertValidHandoff(handoff)).not.toThrow();
  });

  it('should throw for handoff with missing mission_id', () => {
    const handoff = buildHandoff({ mission_id: '' });
    expect(() => assertValidHandoff(handoff)).toThrow('HANDOFF_ERR');
  });

  it('should throw for handoff with missing intent', () => {
    const handoff = buildHandoff({ intent: '' });
    expect(() => assertValidHandoff(handoff)).toThrow('HANDOFF_ERR');
  });

  it('should include mission_id in the thrown error message', () => {
    const handoff = buildHandoff({ mission_id: 'critical-mission', intent: '' });
    expect(() => assertValidHandoff(handoff)).toThrow('critical-mission');
  });

  it('should include from→to route in the thrown error message', () => {
    const handoff = buildHandoff({ from_worker: 'PLANNER', to_worker: 'RESEARCHER', intent: '' });
    expect(() => assertValidHandoff(handoff)).toThrow('PLANNER→RESEARCHER');
  });

  it('should throw for BUILDER with low resonance', () => {
    const handoff = buildHandoff({
      from_worker: 'RESEARCHER',
      to_worker: 'BUILDER',
      context_snapshot: { resonance_score: 0.1, novelty_score: 0.5 },
    });
    expect(() => assertValidHandoff(handoff)).toThrow('HANDOFF_ERR');
  });
});