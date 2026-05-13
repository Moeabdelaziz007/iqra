/**
 * 🧪 agents/report-schema.ts — Unit Tests
 * النية: التحقق من صحة تقارير الوكلاء (validateReport, assertValidReport)
 *
 * يغطي هذا الملف:
 * - validateReport() — التحقق الشامل من تقرير العامل
 *   - الحقول الأساسية
 *   - الحالة النهائية (PASS/FAIL)
 *   - قائمة الأوامر (commands_run)
 *   - source_attestations
 *   - no_mock_verified للـ PASS
 *   - قواعد الـ FAIL (issues_discovered مطلوب)
 *   - التحقق من الـ timestamp
 * - assertValidReport() — يرمي استثناء إذا كان التقرير غير صالح
 *
 * المصادر: [read] agents/report-schema.ts
 */

import { describe, it, expect } from 'vitest';

import {
  validateReport,
  assertValidReport,
} from '../../agents/report-schema.ts';

import type { WorkerReport } from '../../agents/contracts.ts';

// ── Shared fixture ────────────────────────────────────────────────────────────

function buildPassReport(overrides: Partial<WorkerReport> = {}): WorkerReport {
  return {
    mission_id: 'mission-report-test',
    worker_id: 'VALIDATOR',
    implemented: [],
    undone: [],
    commands_run: [],
    issues_discovered: [],
    skills_used: [],
    procedures_followed: true,
    status: 'PASS',
    exit_code: 0,
    source_attestations: [
      { claim: 'Implementation verified', tag: '[read]', source: 'lib/iqra/main.ts' },
    ],
    no_mock_verified: true,
    timestamp: Date.now(),
    ...overrides,
  };
}

function buildFailReport(overrides: Partial<WorkerReport> = {}): WorkerReport {
  return {
    mission_id: 'mission-fail-test',
    worker_id: 'VALIDATOR',
    implemented: [],
    undone: [],
    commands_run: [],
    issues_discovered: ['TypeScript error in module X'],
    skills_used: [],
    procedures_followed: true,
    status: 'FAIL',
    exit_code: 1,
    source_attestations: [],
    no_mock_verified: false,
    timestamp: Date.now(),
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════
// validateReport — required fields
// ══════════════════════════════════════════════════════════════
describe('validateReport — required fields', () => {
  it('should return valid for a fully correct PASS report', () => {
    const result = validateReport(buildPassReport());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should error when mission_id is missing', () => {
    const result = validateReport(buildPassReport({ mission_id: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('mission_id'))).toBe(true);
  });

  it('should error when mission_id is whitespace only', () => {
    const result = validateReport(buildPassReport({ mission_id: '   ' }));
    expect(result.valid).toBe(false);
  });

  it('should error when worker_id is missing', () => {
    const result = validateReport(buildPassReport({ worker_id: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('worker_id'))).toBe(true);
  });

  it('should error when timestamp is 0/falsy', () => {
    const result = validateReport(buildPassReport({ timestamp: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('timestamp'))).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// validateReport — status validation
// ══════════════════════════════════════════════════════════════
describe('validateReport — status', () => {
  it('should accept status=PASS', () => {
    const result = validateReport(buildPassReport({ status: 'PASS' }));
    expect(result.errors.filter(e => e.includes('Invalid status'))).toHaveLength(0);
  });

  it('should accept status=FAIL', () => {
    const result = validateReport(buildFailReport({ status: 'FAIL' }));
    expect(result.errors.filter(e => e.includes('Invalid status'))).toHaveLength(0);
  });

  it('should error for invalid status "PENDING"', () => {
    const result = validateReport(buildPassReport({ status: 'PENDING' as any }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid status'))).toBe(true);
  });

  it('should error for empty status string', () => {
    const result = validateReport(buildPassReport({ status: '' as any }));
    expect(result.valid).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// validateReport — commands_run
// ══════════════════════════════════════════════════════════════
describe('validateReport — commands_run', () => {
  it('should accept empty commands_run', () => {
    const result = validateReport(buildPassReport({ commands_run: [] }));
    expect(result.errors.filter(e => e.includes('commands_run'))).toHaveLength(0);
  });

  it('should error when commands_run is not an array', () => {
    const result = validateReport(buildPassReport({ commands_run: 'not-array' as any }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('commands_run'))).toBe(true);
  });

  it('should error when a command entry has empty command string', () => {
    const result = validateReport(buildPassReport({
      commands_run: [{ command: '', exit_code: 0 }],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('command'))).toBe(true);
  });

  it('should error when a command entry has non-number exit_code', () => {
    const result = validateReport(buildPassReport({
      commands_run: [{ command: 'npm test', exit_code: 'zero' as any }],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('exit_code'))).toBe(true);
  });

  it('should accept commands with valid exit_code=0', () => {
    const result = validateReport(buildPassReport({
      commands_run: [{ command: 'npm run build', exit_code: 0, output: 'Build success' }],
    }));
    expect(result.errors.filter(e => e.includes('exit_code'))).toHaveLength(0);
  });

  it('should accept commands with non-zero exit_code (e.g. 1)', () => {
    const result = validateReport(buildPassReport({
      commands_run: [{ command: 'npm test', exit_code: 1 }],
    }));
    expect(result.errors.filter(e => e.includes('exit_code'))).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// validateReport — implemented / undone arrays
// ══════════════════════════════════════════════════════════════
describe('validateReport — implemented and undone', () => {
  it('should error when implemented is not an array', () => {
    const result = validateReport(buildPassReport({ implemented: 'not-array' as any }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('implemented'))).toBe(true);
  });

  it('should error when undone is not an array', () => {
    const result = validateReport(buildPassReport({ undone: 'not-array' as any }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('undone'))).toBe(true);
  });

  it('should accept empty implemented and undone', () => {
    const result = validateReport(buildPassReport({ implemented: [], undone: [] }));
    expect(result.errors.filter(e => e.includes('implemented') || e.includes('undone'))).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// validateReport — source_attestations (Rule 3)
// ══════════════════════════════════════════════════════════════
describe('validateReport — source_attestations', () => {
  it('should error for PASS report with no source_attestations', () => {
    const result = validateReport(buildPassReport({ source_attestations: [] }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('source_attestation'))).toBe(true);
  });

  it('should warn for FAIL report with no source_attestations', () => {
    const result = validateReport(buildFailReport({ source_attestations: [] }));
    expect(result.warnings.some(w => w.includes('source_attestations'))).toBe(true);
    // Should not be a hard error for FAIL
    expect(result.errors.filter(e => e.includes('PASS report must have'))).toHaveLength(0);
  });

  it('should error when source_attestations is not an array', () => {
    const result = validateReport(buildPassReport({ source_attestations: 'not-array' as any }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('source_attestations'))).toBe(true);
  });

  it('should error when an attestation has empty claim', () => {
    const result = validateReport(buildPassReport({
      source_attestations: [{ claim: '', tag: '[read]', source: 'lib/file.ts' }],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('claim'))).toBe(true);
  });

  it('should error when an attestation has invalid tag', () => {
    const result = validateReport(buildPassReport({
      source_attestations: [{ claim: 'Valid claim', tag: '[wrong-tag]' as any }],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('tag'))).toBe(true);
  });

  it('should accept all three valid source tags', () => {
    const tags: WorkerReport['source_attestations'][0]['tag'][] = ['[read]', '[fetched]', '[prior-training]'];
    for (const tag of tags) {
      const result = validateReport(buildPassReport({
        source_attestations: [{ claim: 'A valid claim', tag }],
      }));
      expect(result.errors.filter(e => e.includes('Invalid source tag'))).toHaveLength(0);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// validateReport — no_mock_verified (Rule 2)
// ══════════════════════════════════════════════════════════════
describe('validateReport — no_mock_verified', () => {
  it('should error when PASS report has no_mock_verified=false', () => {
    const result = validateReport(buildPassReport({ no_mock_verified: false }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('no_mock_verified'))).toBe(true);
  });

  it('should pass when PASS report has no_mock_verified=true', () => {
    const result = validateReport(buildPassReport({ no_mock_verified: true }));
    expect(result.errors.filter(e => e.includes('no_mock_verified'))).toHaveLength(0);
  });

  it('should not require no_mock_verified=true for FAIL reports', () => {
    const result = validateReport(buildFailReport({ no_mock_verified: false }));
    expect(result.errors.filter(e => e.includes('no_mock_verified'))).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// validateReport — FAIL report rules
// ══════════════════════════════════════════════════════════════
describe('validateReport — FAIL report rules', () => {
  it('should error when FAIL report has no issues_discovered', () => {
    const result = validateReport(buildFailReport({ issues_discovered: [] }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('issue_discovered'))).toBe(true);
  });

  it('should error when issues_discovered is not an array on FAIL', () => {
    const result = validateReport(buildFailReport({ issues_discovered: 'not-array' as any }));
    expect(result.valid).toBe(false);
  });

  it('should pass FAIL report with at least one issue', () => {
    const result = validateReport(buildFailReport({
      issues_discovered: ['Module not found error'],
    }));
    expect(result.errors.filter(e => e.includes('issue_discovered'))).toHaveLength(0);
  });

  it('should warn when FAIL report has exit_code=0', () => {
    const result = validateReport(buildFailReport({ exit_code: 0 }));
    expect(result.warnings.some(w => w.includes('exit_code 0'))).toBe(true);
  });

  it('should not warn when FAIL report has exit_code=1', () => {
    const result = validateReport(buildFailReport({ exit_code: 1 }));
    expect(result.warnings.filter(w => w.includes('exit_code 0'))).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// validateReport — skills_used
// ══════════════════════════════════════════════════════════════
describe('validateReport — skills_used', () => {
  it('should error when skills_used is not an array', () => {
    const result = validateReport(buildPassReport({ skills_used: 'not-array' as any }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('skills_used'))).toBe(true);
  });

  it('should warn for PASS report with no skills_used', () => {
    const result = validateReport(buildPassReport({ skills_used: [] }));
    expect(result.warnings.some(w => w.includes('skills_used'))).toBe(true);
  });

  it('should not warn when skills_used has entries', () => {
    const result = validateReport(buildPassReport({
      skills_used: ['topological_analysis'],
    }));
    expect(result.warnings.filter(w => w.includes('skills_used is empty'))).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// validateReport — timestamp staleness warning
// ══════════════════════════════════════════════════════════════
describe('validateReport — timestamp staleness', () => {
  it('should warn for a stale timestamp (older than 24h)', () => {
    const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
    const result = validateReport(buildPassReport({ timestamp: twoDaysAgo }));
    expect(result.warnings.some(w => w.includes('stale') || w.includes('old'))).toBe(true);
  });

  it('should not warn for a fresh timestamp', () => {
    const result = validateReport(buildPassReport({ timestamp: Date.now() }));
    expect(result.warnings.filter(w => w.includes('stale'))).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// assertValidReport
// ══════════════════════════════════════════════════════════════
describe('assertValidReport', () => {
  it('should not throw for a valid PASS report', () => {
    const report = buildPassReport();
    expect(() => assertValidReport(report)).not.toThrow();
  });

  it('should not throw for a valid FAIL report', () => {
    const report = buildFailReport({ issues_discovered: ['Some error'] });
    expect(() => assertValidReport(report)).not.toThrow();
  });

  it('should throw for a report with missing mission_id', () => {
    const report = buildPassReport({ mission_id: '' });
    expect(() => assertValidReport(report)).toThrow('REPORT_ERR');
  });

  it('should throw for a PASS report without source_attestations', () => {
    const report = buildPassReport({ source_attestations: [] });
    expect(() => assertValidReport(report)).toThrow('REPORT_ERR');
  });

  it('should throw for a FAIL report without issues_discovered', () => {
    const report = buildFailReport({ issues_discovered: [] });
    expect(() => assertValidReport(report)).toThrow('REPORT_ERR');
  });

  it('should include mission_id and worker_id in error message', () => {
    const report = buildPassReport({
      mission_id: 'important-mission',
      worker_id: 'BUILDER',
      source_attestations: [],
    });
    expect(() => assertValidReport(report)).toThrow('important-mission/BUILDER');
  });

  it('should include all errors joined by " | " in the thrown message', () => {
    const report = buildPassReport({
      mission_id: '',   // error 1
      worker_id: '',    // error 2
      source_attestations: [],  // error 3 (PASS needs attestations)
    });
    let message = '';
    try {
      assertValidReport(report);
    } catch (e: any) {
      message = e.message;
    }
    // Multiple errors should be joined with " | "
    expect(message).toContain('|');
  });

  // Regression: PASS with no_mock_verified=false should throw
  it('should throw for PASS report with no_mock_verified=false (regression)', () => {
    const report = buildPassReport({ no_mock_verified: false });
    expect(() => assertValidReport(report)).toThrow('REPORT_ERR');
  });
});
