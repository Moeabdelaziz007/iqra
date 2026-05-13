/**
 * 🧪 agents/attestation.ts — Unit Tests
 * النية: التحقق من شهادات المصادر (Source Attestations)
 *
 * يغطي هذا الملف:
 * - createAttestation() — إنشاء شهادة مصدر
 * - validateAttestation() — التحقق من شهادة مصدر واحدة
 * - validateAttestations() — التحقق من مجموعة شهادات
 * - verifyAttestation() — التحقق الصارم مع متطلبات URL/مسار
 * - validateReportAttestations() — التحقق من تقرير كامل
 * - createAttestationFromSource() — إنشاء شهادة من نوع مصدر
 * - createAttestationsFromSource() — إنشاء مجموعة شهادات
 *
 * المصادر: [read] agents/attestation.ts
 */

import { describe, it, expect } from 'vitest';

import {
  createAttestation,
  validateAttestation,
  validateAttestations,
  verifyAttestation,
  validateReportAttestations,
  createAttestationFromSource,
  createAttestationsFromSource,
} from '../../agents/attestation.ts';

import type { WorkerReport, SourceAttestation } from '../../agents/contracts.ts';

// ── Shared fixture ────────────────────────────────────────────────────────────

function buildReport(overrides: Partial<WorkerReport> = {}): WorkerReport {
  return {
    mission_id: 'mission-attestation-test',
    worker_id: 'VALIDATOR',
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
// createAttestation
// ══════════════════════════════════════════════════════════════
describe('createAttestation', () => {
  it('should create a valid attestation with all fields', () => {
    const att = createAttestation(
      'The Quran has 114 surahs',
      '[read]',
      'lib/quran/metadata.ts'
    );
    expect(att.claim).toBe('The Quran has 114 surahs');
    expect(att.tag).toBe('[read]');
    expect(att.source).toBe('lib/quran/metadata.ts');
  });

  it('should trim whitespace from claim', () => {
    const att = createAttestation('  Topological resonance detected  ', '[fetched]', 'https://example.com');
    expect(att.claim).toBe('Topological resonance detected');
  });

  it('should trim whitespace from source', () => {
    const att = createAttestation('Some claim', '[read]', '  lib/file.ts  ');
    expect(att.source).toBe('lib/file.ts');
  });

  it('should accept all three valid tag types', () => {
    const tags: SourceAttestation['tag'][] = ['[read]', '[fetched]', '[prior-training]'];
    for (const tag of tags) {
      const att = createAttestation('A claim', tag);
      expect(att.tag).toBe(tag);
    }
  });

  it('should work without source (optional)', () => {
    const att = createAttestation('Knowledge from training', '[prior-training]');
    expect(att.claim).toBe('Knowledge from training');
    expect(att.tag).toBe('[prior-training]');
    expect(att.source).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════
// validateAttestation
// ══════════════════════════════════════════════════════════════
describe('validateAttestation', () => {
  it('should return valid for a complete correct attestation', () => {
    const att: SourceAttestation = {
      claim: 'Pattern found in Surah Ya-Sin',
      tag: '[read]',
      source: 'lib/iqra/04-quran/patterns.ts',
    };
    const result = validateAttestation(att);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should error when claim is empty', () => {
    const att: SourceAttestation = { claim: '', tag: '[read]' };
    const result = validateAttestation(att);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('claim'))).toBe(true);
  });

  it('should error when claim is only whitespace', () => {
    const att: SourceAttestation = { claim: '   ', tag: '[read]' };
    const result = validateAttestation(att);
    expect(result.valid).toBe(false);
  });

  it('should error when claim is too short (< 3 chars)', () => {
    const att: SourceAttestation = { claim: 'AB', tag: '[read]' };
    const result = validateAttestation(att);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('short'))).toBe(true);
  });

  it('should error when tag is invalid', () => {
    const att = { claim: 'Some valid claim', tag: '[invalid]' as any };
    const result = validateAttestation(att);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('tag'))).toBe(true);
  });

  it('should error when tag is missing', () => {
    const att = { claim: 'Some valid claim', tag: undefined as any };
    const result = validateAttestation(att);
    expect(result.valid).toBe(false);
  });

  it('should accept all three valid tag types', () => {
    const tags: SourceAttestation['tag'][] = ['[read]', '[fetched]', '[prior-training]'];
    for (const tag of tags) {
      const att: SourceAttestation = { claim: 'Valid claim here', tag };
      expect(validateAttestation(att).valid).toBe(true);
    }
  });

  it('should accept attestation without source (source is optional)', () => {
    const att: SourceAttestation = { claim: 'Valid claim here', tag: '[prior-training]' };
    const result = validateAttestation(att);
    expect(result.valid).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// validateAttestations (array)
// ══════════════════════════════════════════════════════════════
describe('validateAttestations', () => {
  it('should return valid for empty array (with warning)', () => {
    const result = validateAttestations([]);
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes('No attestations'))).toBe(true);
  });

  it('should return invalid when input is not an array', () => {
    const result = validateAttestations('not-array' as any);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('array'))).toBe(true);
  });

  it('should return valid for an array of valid attestations', () => {
    const atts: SourceAttestation[] = [
      { claim: 'Pattern in surah', tag: '[read]', source: 'lib/quran.ts' },
      { claim: 'API returned data', tag: '[fetched]', source: 'https://api.example.com' },
    ];
    const result = validateAttestations(atts);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should report errors for invalid attestations in the array', () => {
    const atts: SourceAttestation[] = [
      { claim: '', tag: '[read]' }, // invalid — empty claim
      { claim: 'Valid claim', tag: '[fetched]', source: 'https://example.com' },
    ];
    const result = validateAttestations(atts);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('attestations[0]'))).toBe(true);
  });

  it('should warn about missing source for each attestation', () => {
    const atts: SourceAttestation[] = [
      { claim: 'Claim without source', tag: '[read]' },
    ];
    const result = validateAttestations(atts);
    expect(result.warnings.some(w => w.includes('source is missing'))).toBe(true);
  });

  it('should warn about duplicate claims', () => {
    const atts: SourceAttestation[] = [
      { claim: 'Duplicate claim', tag: '[read]', source: 'file1.ts' },
      { claim: 'Duplicate claim', tag: '[fetched]', source: 'https://file2.com' },
    ];
    const result = validateAttestations(atts);
    expect(result.warnings.some(w => w.includes('Duplicate claims'))).toBe(true);
  });

  it('should not warn about non-duplicate claims', () => {
    const atts: SourceAttestation[] = [
      { claim: 'Claim one', tag: '[read]', source: 'file1.ts' },
      { claim: 'Claim two', tag: '[fetched]', source: 'https://example.com' },
    ];
    const result = validateAttestations(atts);
    expect(result.warnings.filter(w => w.includes('Duplicate'))).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// verifyAttestation
// ══════════════════════════════════════════════════════════════
describe('verifyAttestation', () => {
  it('should verify a correct [read] attestation with file path', () => {
    const att: SourceAttestation = {
      claim: 'Read from quran_loader.ts',
      tag: '[read]',
      source: 'lib/iqra/04-quran/quran_loader.ts',
    };
    const result = verifyAttestation(att);
    expect(result.verified).toBe(true);
  });

  it('should verify a correct [fetched] attestation with URL', () => {
    const att: SourceAttestation = {
      claim: 'Fetched from API',
      tag: '[fetched]',
      source: 'https://api.example.com/data',
    };
    const result = verifyAttestation(att);
    expect(result.verified).toBe(true);
  });

  it('should verify a correct [prior-training] attestation without source', () => {
    const att: SourceAttestation = {
      claim: 'Based on training knowledge',
      tag: '[prior-training]',
    };
    const result = verifyAttestation(att);
    expect(result.verified).toBe(true);
  });

  it('should fail verification for [read] without source', () => {
    const att: SourceAttestation = {
      claim: 'Read from some file',
      tag: '[read]',
    };
    const result = verifyAttestation(att);
    expect(result.verified).toBe(false);
    expect(result.reason).toContain('[read]');
    expect(result.reason).toContain('source');
  });

  it('should fail verification for [fetched] without URL', () => {
    const att: SourceAttestation = {
      claim: 'Fetched from somewhere',
      tag: '[fetched]',
    };
    const result = verifyAttestation(att);
    expect(result.verified).toBe(false);
    expect(result.reason).toContain('[fetched]');
  });

  it('should fail verification for [fetched] with a file path (not URL)', () => {
    const att: SourceAttestation = {
      claim: 'Fetched data',
      tag: '[fetched]',
      source: 'lib/some/file.ts', // not a URL
    };
    const result = verifyAttestation(att);
    expect(result.verified).toBe(false);
    expect(result.reason).toContain('[fetched]');
  });

  it('should fail verification for [read] with a non-path source', () => {
    const att: SourceAttestation = {
      claim: 'Read from something',
      tag: '[read]',
      source: 'just-a-word', // no slash or dot
    };
    const result = verifyAttestation(att);
    expect(result.verified).toBe(false);
    expect(result.reason).toContain('[read]');
  });

  it('should fail verification for invalid tag', () => {
    const att = {
      claim: 'Some claim',
      tag: '[wrong]' as any,
      source: 'lib/file.ts',
    };
    const result = verifyAttestation(att);
    expect(result.verified).toBe(false);
  });

  it('should fail for empty claim', () => {
    const att: SourceAttestation = { claim: '', tag: '[read]', source: 'lib/file.ts' };
    const result = verifyAttestation(att);
    expect(result.verified).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// validateReportAttestations
// ══════════════════════════════════════════════════════════════
describe('validateReportAttestations', () => {
  it('should error for PASS report with no attestations', () => {
    const report = buildReport({ status: 'PASS', source_attestations: [] });
    const result = validateReportAttestations(report);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('at least one source_attestation'))).toBe(true);
  });

  it('should pass for PASS report with at least one attestation', () => {
    const report = buildReport({
      status: 'PASS',
      source_attestations: [
        { claim: 'Implemented pattern hunter', tag: '[read]', source: 'lib/pattern_hunter.ts' },
      ],
    });
    const result = validateReportAttestations(report);
    expect(result.valid).toBe(true);
  });

  it('should pass for FAIL report with no attestations (no hard error)', () => {
    const report = buildReport({ status: 'FAIL', source_attestations: [] });
    const result = validateReportAttestations(report);
    // FAIL with no attestations is allowed (only warning)
    expect(result.errors.filter(e => e.includes('at least one'))).toHaveLength(0);
  });

  it('should error when source_attestations is not an array', () => {
    const report = buildReport({ source_attestations: 'not-an-array' as any });
    const result = validateReportAttestations(report);
    expect(result.valid).toBe(false);
  });

  it('should count attestations correctly', () => {
    const report = buildReport({
      status: 'PASS',
      source_attestations: [
        { claim: 'Claim 1', tag: '[read]', source: 'file1.ts' },
        { claim: 'Claim 2', tag: '[fetched]', source: 'https://example.com' },
      ],
    });
    const result = validateReportAttestations(report);
    expect(result.attestations_count).toBe(2);
  });

  it('should warn when implemented items have no attestation', () => {
    const report = buildReport({
      status: 'PASS',
      implemented: ['Some feature added'],
      source_attestations: [
        { claim: 'Unrelated claim', tag: '[read]', source: 'file.ts' },
      ],
    });
    const result = validateReportAttestations(report);
    expect(result.warnings.some(w => w.includes('implemented[0]'))).toBe(true);
  });

  it('should warn when issues_discovered have no attestation', () => {
    const report = buildReport({
      status: 'PASS',
      issues_discovered: ['Memory leak found'],
      source_attestations: [
        { claim: 'Unrelated claim', tag: '[read]', source: 'file.ts' },
      ],
    });
    const result = validateReportAttestations(report);
    expect(result.warnings.some(w => w.includes('issues_discovered[0]'))).toBe(true);
  });

  it('should warn when skills_used have no attestation', () => {
    const report = buildReport({
      status: 'PASS',
      skills_used: ['topological_analysis'],
      source_attestations: [
        { claim: 'Unrelated claim', tag: '[read]', source: 'file.ts' },
      ],
    });
    const result = validateReportAttestations(report);
    expect(result.warnings.some(w => w.includes('skills_used[0]'))).toBe(true);
  });

  it('should not warn when implemented item matches an attestation claim', () => {
    const report = buildReport({
      status: 'PASS',
      implemented: ['quran_loader feature'],
      source_attestations: [
        { claim: 'Implemented quran_loader feature', tag: '[read]', source: 'lib/quran.ts' },
      ],
    });
    const result = validateReportAttestations(report);
    expect(result.warnings.filter(w => w.includes('implemented[0]'))).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// createAttestationFromSource
// ══════════════════════════════════════════════════════════════
describe('createAttestationFromSource', () => {
  it('should create [read] attestation for "file" source type', () => {
    const att = createAttestationFromSource('Pattern found', 'file', 'lib/patterns.ts');
    expect(att.tag).toBe('[read]');
    expect(att.claim).toBe('Pattern found');
    expect(att.source).toBe('lib/patterns.ts');
  });

  it('should create [fetched] attestation for "url" source type', () => {
    const att = createAttestationFromSource('API response', 'url', 'https://api.example.com');
    expect(att.tag).toBe('[fetched]');
  });

  it('should create [prior-training] attestation for "model" source type', () => {
    const att = createAttestationFromSource('Training knowledge', 'model', 'gpt-4');
    expect(att.tag).toBe('[prior-training]');
  });
});

// ══════════════════════════════════════════════════════════════
// createAttestationsFromSource (bulk)
// ══════════════════════════════════════════════════════════════
describe('createAttestationsFromSource', () => {
  it('should create one attestation per claim', () => {
    const claims = ['Claim 1', 'Claim 2', 'Claim 3'];
    const attestations = createAttestationsFromSource(claims, 'file', 'lib/source.ts');
    expect(attestations).toHaveLength(3);
  });

  it('should assign the same tag and source to all', () => {
    const claims = ['A', 'B'];
    const attestations = createAttestationsFromSource(claims, 'url', 'https://api.example.com');
    for (const att of attestations) {
      expect(att.tag).toBe('[fetched]');
      expect(att.source).toBe('https://api.example.com');
    }
  });

  it('should preserve claim order', () => {
    const claims = ['First', 'Second', 'Third'];
    const attestations = createAttestationsFromSource(claims, 'model', 'gpt-4');
    expect(attestations[0].claim).toBe('First');
    expect(attestations[1].claim).toBe('Second');
    expect(attestations[2].claim).toBe('Third');
  });

  it('should return empty array for empty claims', () => {
    const attestations = createAttestationsFromSource([], 'file', 'lib/file.ts');
    expect(attestations).toHaveLength(0);
  });
});