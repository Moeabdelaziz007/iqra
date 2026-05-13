/**
 * 🧪 agents/contracts.ts — Unit Tests
 * النية: التحقق من العقود المشتركة بين الوكلاء، والدوال المساعدة، والقيود
 *
 * يغطي هذا الملف:
 * - makeHandoff() — بناء MissionHandoff صالح مع القيم الافتراضية
 * - validateWorkerAction() — فرض القيود الهيكلية على كل وكيل
 * - validateSourceAttestations() — التحقق من وسوم المصادر في التقارير
 * - validateNoMock() — فرض عدم وجود mock في الإنتاج
 * - WORKER_CONSTRAINTS / GLOBAL_CONSTRAINTS — ثوابت الدستور
 *
 * المصادر: [read] agents/contracts.ts
 */

import { describe, it, expect } from 'vitest';

import {
  makeHandoff,
  makeWorkerReport,
  validateWorkerAction,
  validateSourceAttestations,
  validateNoMock,
  WORKER_CONSTRAINTS,
  GLOBAL_CONSTRAINTS,
} from '../../agents/contracts.ts';

import type {
  WorkerRole,
  ContextSnapshot,
  WorkerReport,
  SourceAttestation,
} from '../../agents/contracts.ts';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const defaultSnapshot: ContextSnapshot = {
  resonance_score: 0.7,
  novelty_score: 0.3,
};

function buildReport(overrides: Partial<WorkerReport> = {}): WorkerReport {
  return {
    mission_id: 'mission-test',
    worker_id: 'BUILDER',
    implemented: [],
    undone: [],
    commands_run: [],
    issues_discovered: [],
    skills_used: [],
    procedures_followed: true,
    status: 'PASS',
    exit_code: 0,
    source_attestations: [],
    no_mock_verified: true,
    timestamp: Date.now(),
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════
// makeHandoff
// ══════════════════════════════════════════════════════════════
describe('makeHandoff', () => {
  it('should build a valid MissionHandoff with required fields', () => {
    const handoff = makeHandoff(
      'mission-001',
      'PLANNER',
      'RESEARCHER',
      'Analyse topological patterns',
      defaultSnapshot
    );

    expect(handoff.mission_id).toBe('mission-001');
    expect(handoff.from_worker).toBe('PLANNER');
    expect(handoff.to_worker).toBe('RESEARCHER');
    expect(handoff.intent).toBe('Analyse topological patterns');
    expect(handoff.context_snapshot).toEqual(defaultSnapshot);
    expect(handoff.timestamp).toBeGreaterThan(0);
  });

  it('should default artifacts, pending_tasks, known_issues, validation_gates, context_data to empty', () => {
    const handoff = makeHandoff(
      'mission-002',
      'RESEARCHER',
      'BUILDER',
      'Build the component',
      defaultSnapshot
    );

    expect(handoff.artifacts).toEqual([]);
    expect(handoff.pending_tasks).toEqual([]);
    expect(handoff.known_issues).toEqual([]);
    expect(handoff.validation_gates).toEqual([]);
    expect(handoff.validation_rules).toEqual([]);
    expect(handoff.context_data).toEqual({});
  });

  it('should NOT include issues_discovered field (removed in this PR)', () => {
    const handoff = makeHandoff(
      'mission-003',
      'BUILDER',
      'VALIDATOR',
      'Validate the build',
      defaultSnapshot
    );

    // issues_discovered was removed from MissionHandoff in this PR
    expect((handoff as any).issues_discovered).toBeUndefined();
  });

  it('should merge overrides into the result', () => {
    const handoff = makeHandoff(
      'mission-004',
      'PLANNER',
      'RESEARCHER',
      'Intent here',
      defaultSnapshot,
      { artifacts: ['file-a.ts', 'file-b.ts'], reasoning_log: 'Thought about X then Y' }
    );

    expect(handoff.artifacts).toEqual(['file-a.ts', 'file-b.ts']);
    expect(handoff.reasoning_log).toBe('Thought about X then Y');
  });

  it('should accept all WorkerRole combinations as from/to workers', () => {
    const roles: WorkerRole[] = [
      'PLANNER', 'RESEARCHER', 'PATTERN_HUNTER', 'BUILDER',
      'VALIDATOR', 'SAFETY_AGENT', 'REPORTER', 'ECONOMIST', 'RESONANCE_AGENT',
    ];

    for (let i = 0; i < roles.length - 1; i++) {
      const handoff = makeHandoff(
        `mission-${i}`,
        roles[i],
        roles[i + 1],
        'Transfer intent',
        defaultSnapshot
      );
      expect(handoff.from_worker).toBe(roles[i]);
      expect(handoff.to_worker).toBe(roles[i + 1]);
    }
  });

  it('should set timestamp close to now', () => {
    const before = Date.now();
    const handoff = makeHandoff('m', 'PLANNER', 'RESEARCHER', 'intent', defaultSnapshot);
    const after = Date.now();
    expect(handoff.timestamp).toBeGreaterThanOrEqual(before);
    expect(handoff.timestamp).toBeLessThanOrEqual(after);
  });
});

// ══════════════════════════════════════════════════════════════
// WORKER_CONSTRAINTS and GLOBAL_CONSTRAINTS
// ══════════════════════════════════════════════════════════════
describe('WORKER_CONSTRAINTS', () => {
  it('VALIDATOR_CAN_MODIFY should be false', () => {
    expect(WORKER_CONSTRAINTS.VALIDATOR_CAN_MODIFY).toBe(false);
  });

  it('REPORTER_CAN_WRITE_CODE should be false', () => {
    expect(WORKER_CONSTRAINTS.REPORTER_CAN_WRITE_CODE).toBe(false);
  });

  it('BUILDER_CAN_SELF_APPROVE should be false', () => {
    expect(WORKER_CONSTRAINTS.BUILDER_CAN_SELF_APPROVE).toBe(false);
  });

  it('RESEARCHER_CAN_DECIDE_REWARD should be false', () => {
    expect(WORKER_CONSTRAINTS.RESEARCHER_CAN_DECIDE_REWARD).toBe(false);
  });

  it('PLANNER_CAN_IMPLEMENT should be false', () => {
    expect(WORKER_CONSTRAINTS.PLANNER_CAN_IMPLEMENT).toBe(false);
  });

  it('PLANNER_MUST_REASON should be true', () => {
    expect(WORKER_CONSTRAINTS.PLANNER_MUST_REASON).toBe(true);
  });
});

describe('GLOBAL_CONSTRAINTS', () => {
  it('NO_MOCK_IN_PRODUCTION should be true', () => {
    expect(GLOBAL_CONSTRAINTS.NO_MOCK_IN_PRODUCTION).toBe(true);
  });

  it('EVERY_CLAIM_NEEDS_SOURCE should be true', () => {
    expect(GLOBAL_CONSTRAINTS.EVERY_CLAIM_NEEDS_SOURCE).toBe(true);
  });

  it('STRICT_SEQUENCE should follow PLANNER→RESEARCHER→BUILDER→VALIDATOR→REPORTER', () => {
    expect(GLOBAL_CONSTRAINTS.STRICT_SEQUENCE).toEqual([
      'PLANNER', 'RESEARCHER', 'BUILDER', 'VALIDATOR', 'REPORTER',
    ]);
  });

  it('MIN_RESONANCE_FOR_BUILDER should be 0.4', () => {
    expect(GLOBAL_CONSTRAINTS.MIN_RESONANCE_FOR_BUILDER).toBe(0.4);
  });

  it('MAX_RETRIES should be 3 (odd/witr number)', () => {
    expect(GLOBAL_CONSTRAINTS.MAX_RETRIES).toBe(3);
  });
});

// ══════════════════════════════════════════════════════════════
// validateWorkerAction
// ══════════════════════════════════════════════════════════════
describe('validateWorkerAction', () => {
  // ── VALIDATOR ──────────────────────────────────────────────
  it('VALIDATOR cannot modify_implementation', () => {
    const result = validateWorkerAction('VALIDATOR', 'modify_implementation');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('VALIDATOR');
  });

  it('VALIDATOR cannot modify_code', () => {
    const result = validateWorkerAction('VALIDATOR', 'modify_code');
    expect(result.valid).toBe(false);
  });

  it('VALIDATOR can perform other actions (not in forbidden list)', () => {
    const result = validateWorkerAction('VALIDATOR', 'run_tests');
    expect(result.valid).toBe(true);
  });

  // ── REPORTER ───────────────────────────────────────────────
  it('REPORTER cannot write_code', () => {
    const result = validateWorkerAction('REPORTER', 'write_code');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('REPORTER');
  });

  it('REPORTER cannot modify_code', () => {
    const result = validateWorkerAction('REPORTER', 'modify_code');
    expect(result.valid).toBe(false);
  });

  it('REPORTER cannot implement', () => {
    const result = validateWorkerAction('REPORTER', 'implement');
    expect(result.valid).toBe(false);
  });

  it('REPORTER can write_reports', () => {
    const result = validateWorkerAction('REPORTER', 'write_reports');
    expect(result.valid).toBe(true);
  });

  // ── BUILDER ────────────────────────────────────────────────
  it('BUILDER cannot self_approve', () => {
    const result = validateWorkerAction('BUILDER', 'self_approve');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('BUILDER');
  });

  it('BUILDER cannot bypass_validation', () => {
    const result = validateWorkerAction('BUILDER', 'bypass_validation');
    expect(result.valid).toBe(false);
  });

  it('BUILDER can write_code', () => {
    const result = validateWorkerAction('BUILDER', 'write_code');
    expect(result.valid).toBe(true);
  });

  // ── RESEARCHER ─────────────────────────────────────────────
  it('RESEARCHER cannot decide_final_reward', () => {
    const result = validateWorkerAction('RESEARCHER', 'decide_final_reward');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('RESEARCHER');
  });

  it('RESEARCHER cannot approve_reward', () => {
    const result = validateWorkerAction('RESEARCHER', 'approve_reward');
    expect(result.valid).toBe(false);
  });

  it('RESEARCHER can search_patterns', () => {
    const result = validateWorkerAction('RESEARCHER', 'search_patterns');
    expect(result.valid).toBe(true);
  });

  // ── PLANNER ────────────────────────────────────────────────
  it('PLANNER cannot write_code', () => {
    const result = validateWorkerAction('PLANNER', 'write_code');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('PLANNER');
  });

  it('PLANNER cannot implement', () => {
    const result = validateWorkerAction('PLANNER', 'implement');
    expect(result.valid).toBe(false);
  });

  it('PLANNER cannot modify_code', () => {
    const result = validateWorkerAction('PLANNER', 'modify_code');
    expect(result.valid).toBe(false);
  });

  it('PLANNER can create_plan', () => {
    const result = validateWorkerAction('PLANNER', 'create_plan');
    expect(result.valid).toBe(true);
  });

  // ── Unknown role ───────────────────────────────────────────
  it('unknown role should return valid=true (no explicit forbidden list)', () => {
    const result = validateWorkerAction('UNKNOWN_ROLE', 'do_something');
    expect(result.valid).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// validateSourceAttestations
// ══════════════════════════════════════════════════════════════
describe('validateSourceAttestations', () => {
  it('should return valid when all arrays are empty', () => {
    const report = buildReport();
    const result = validateSourceAttestations(report);
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('should flag an implemented item with no matching attestation', () => {
    const report = buildReport({
      implemented: ['Added quran_loader.ts'],
      source_attestations: [],
    });
    const result = validateSourceAttestations(report);
    expect(result.valid).toBe(false);
    expect(result.missing.some(m => m.includes('implemented[0]'))).toBe(true);
  });

  it('should pass when implemented item has a matching claim', () => {
    const att: SourceAttestation = {
      claim: 'Added quran_loader.ts',
      tag: '[read]',
      source: 'lib/iqra/04-quran/quran_loader.ts',
    };
    const report = buildReport({
      implemented: ['Added quran_loader.ts'],
      source_attestations: [att],
    });
    const result = validateSourceAttestations(report);
    expect(result.valid).toBe(true);
  });

  it('should flag an issues_discovered item without attestation', () => {
    const report = buildReport({
      issues_discovered: ['Memory leak in pulse_369'],
      source_attestations: [],
    });
    const result = validateSourceAttestations(report);
    expect(result.valid).toBe(false);
    expect(result.missing.some(m => m.includes('issues_discovered[0]'))).toBe(true);
  });

  it('should flag a skill_used item without attestation', () => {
    const report = buildReport({
      skills_used: ['topological_analysis'],
      source_attestations: [],
    });
    const result = validateSourceAttestations(report);
    expect(result.valid).toBe(false);
    expect(result.missing.some(m => m.includes('skills_used[0]'))).toBe(true);
  });

  it('should flag an attestation with invalid tag', () => {
    const report = buildReport({
      source_attestations: [
        { claim: 'Some claim', tag: '[invalid-tag]' as any },
      ],
    });
    const result = validateSourceAttestations(report);
    expect(result.valid).toBe(false);
    expect(result.missing.some(m => m.includes('invalid tag'))).toBe(true);
  });

  it('should flag an attestation with empty claim', () => {
    const report = buildReport({
      source_attestations: [
        { claim: '   ', tag: '[read]' },
      ],
    });
    const result = validateSourceAttestations(report);
    expect(result.valid).toBe(false);
    expect(result.missing.some(m => m.includes('empty claim'))).toBe(true);
  });

  it('should pass for all three valid tag types', () => {
    const validTags: SourceAttestation['tag'][] = ['[read]', '[fetched]', '[prior-training]'];
    for (const tag of validTags) {
      const report = buildReport({
        source_attestations: [{ claim: 'A valid claim', tag }],
      });
      const result = validateSourceAttestations(report);
      // Tag itself is valid; no extra flag on the attestation itself
      const tagErrors = result.missing.filter(m => m.includes('invalid tag'));
      expect(tagErrors).toHaveLength(0);
    }
  });

  it('whitespace-only implemented items should be skipped (not flagged)', () => {
    const report = buildReport({
      implemented: ['   '],
      source_attestations: [],
    });
    const result = validateSourceAttestations(report);
    // Whitespace-only items are trimmed, no attestation required
    expect(result.valid).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// validateNoMock (from contracts.ts — different from no-mock.ts)
// ══════════════════════════════════════════════════════════════
describe('validateNoMock (contracts.ts)', () => {
  it('should return valid in production when no_mock_verified=true and no simulated provider', () => {
    const report = buildReport({ no_mock_verified: true });
    const result = validateNoMock(report, 'production');
    expect(result.valid).toBe(true);
  });

  it('should return invalid in production when no_mock_verified=false', () => {
    const report = buildReport({ no_mock_verified: false });
    const result = validateNoMock(report, 'production');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('no_mock_verified=false');
  });

  it('should return invalid in production when model_metadata.provider=simulated', () => {
    const report = buildReport({
      no_mock_verified: true,
      model_metadata: { provider: 'simulated', model: 'gpt-4' },
    });
    const result = validateNoMock(report, 'production');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('simulated');
  });

  it('should return invalid in production when model name contains mock pattern', () => {
    const report = buildReport({
      no_mock_verified: true,
      model_metadata: { provider: 'openai', model: 'mock-model-v1' },
    });
    const result = validateNoMock(report, 'production');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('mock-model-v1');
  });

  it('should return valid in development for simulated provider', () => {
    const report = buildReport({
      no_mock_verified: false,
      model_metadata: { provider: 'simulated', model: 'test' },
    });
    const result = validateNoMock(report, 'development');
    expect(result.valid).toBe(true);
  });

  it('should default env to production when not specified', () => {
    const report = buildReport({ no_mock_verified: false });
    const result = validateNoMock(report);
    expect(result.valid).toBe(false);
  });

  it('should allow real providers in production (google, groq, openai)', () => {
    for (const provider of ['google', 'groq', 'openai']) {
      const report = buildReport({
        no_mock_verified: true,
        model_metadata: { provider, model: 'gemini-1.5' },
      });
      const result = validateNoMock(report, 'production');
      expect(result.valid).toBe(true);
    }
  });

  it('should block fake/stub/dummy/test model names in production', () => {
    const patterns = ['fake-model', 'stub-model', 'dummy-model', 'test-model'];
    for (const model of patterns) {
      const report = buildReport({
        no_mock_verified: true,
        model_metadata: { provider: 'openai', model },
      });
      const result = validateNoMock(report, 'production');
      expect(result.valid).toBe(false);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// makeWorkerReport — additional edge cases beyond constitutional_rules.test.ts
// ══════════════════════════════════════════════════════════════
describe('makeWorkerReport — extended', () => {
  it('procedures_followed should default to true', () => {
    const report = makeWorkerReport('m', 'w', 'google');
    expect(report.procedures_followed).toBe(true);
  });

  it('status should default to PASS', () => {
    const report = makeWorkerReport('m', 'w', 'google');
    expect(report.status).toBe('PASS');
  });

  it('exit_code should default to 0', () => {
    const report = makeWorkerReport('m', 'w', 'google');
    expect(report.exit_code).toBe(0);
  });

  it('should NOT include intent, context_snapshot, artifacts at top level (removed in this PR)', () => {
    const report = makeWorkerReport('m', 'w', 'google');
    // These fields were removed from makeWorkerReport in this PR
    expect((report as any).intent).toBeUndefined();
    expect((report as any).context_snapshot).toBeUndefined();
    expect((report as any).artifacts).toBeUndefined();
  });

  it('should correctly differentiate all provider strings for no_mock_verified', () => {
    const mockProviders = ['simulated'];
    const realProviders = ['google', 'groq', 'openai', 'anthropic', 'ollama'];

    for (const p of mockProviders) {
      expect(makeWorkerReport('m', 'w', p).no_mock_verified).toBe(false);
    }
    for (const p of realProviders) {
      expect(makeWorkerReport('m', 'w', p).no_mock_verified).toBe(true);
    }
  });
});