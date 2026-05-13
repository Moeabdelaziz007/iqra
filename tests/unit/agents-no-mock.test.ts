/**
 * 🧪 agents/no-mock.ts — Unit Tests
 * النية: التحقق من اكتشاف Mock ومنعه في بيئة الإنتاج
 *
 * يغطي هذا الملف:
 * - detectMockProvider() — اكتشاف Mock في اسم المزود
 * - detectMockModel() — اكتشاف Mock في اسم النموذج
 * - detectMockInReport() — اكتشاف Mock في التقرير الكامل
 * - throwOnMock() — رمي استثناء عند وجود Mock في الإنتاج
 * - validateNoMock() — التحقق الشامل من عدم وجود Mock
 * - sanitizeReport() — تنظيف التقرير من إشارات Mock
 * - checkProviderAuthenticity() — التحقق من مصداقية المزود
 * - checkModelAuthenticity() — التحقق من مصداقية النموذج
 *
 * المصادر: [read] agents/no-mock.ts
 */

import { describe, it, expect } from 'vitest';

import {
  detectMockProvider,
  detectMockModel,
  detectMockInReport,
  throwOnMock,
  validateNoMock,
  sanitizeReport,
  checkProviderAuthenticity,
  checkModelAuthenticity,
} from '../../agents/no-mock.ts';

import type { WorkerReport } from '../../agents/contracts.ts';

// ── Shared fixture ────────────────────────────────────────────────────────────

function buildReport(overrides: Partial<WorkerReport> = {}): WorkerReport {
  return {
    mission_id: 'mission-mock-test',
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
// detectMockProvider
// ══════════════════════════════════════════════════════════════
describe('detectMockProvider', () => {
  it('should detect "simulated" as mock', () => {
    const result = detectMockProvider('simulated');
    expect(result.is_mock).toBe(true);
    expect(result.mock_type).toBe('provider');
    expect(result.severity).toBe('critical');
  });

  it('should detect "mock" as mock', () => {
    const result = detectMockProvider('mock');
    expect(result.is_mock).toBe(true);
  });

  it('should detect "fake-provider" as mock', () => {
    const result = detectMockProvider('fake-provider');
    expect(result.is_mock).toBe(true);
  });

  it('should detect "stub" as mock', () => {
    const result = detectMockProvider('stub');
    expect(result.is_mock).toBe(true);
  });

  it('should detect "dummy" as mock', () => {
    const result = detectMockProvider('dummy');
    expect(result.is_mock).toBe(true);
  });

  it('should detect "sandbox" as mock', () => {
    const result = detectMockProvider('sandbox');
    expect(result.is_mock).toBe(true);
  });

  it('should detect "local" as mock', () => {
    const result = detectMockProvider('local');
    expect(result.is_mock).toBe(true);
  });

  it('should detect "offline" as mock', () => {
    const result = detectMockProvider('offline');
    expect(result.is_mock).toBe(true);
  });

  it('should detect "test-provider" as mock', () => {
    const result = detectMockProvider('test-provider');
    expect(result.is_mock).toBe(true);
  });

  it('should NOT flag "google" as mock', () => {
    const result = detectMockProvider('google');
    expect(result.is_mock).toBe(false);
  });

  it('should NOT flag "groq" as mock', () => {
    const result = detectMockProvider('groq');
    expect(result.is_mock).toBe(false);
  });

  it('should NOT flag "openai" as mock', () => {
    const result = detectMockProvider('openai');
    expect(result.is_mock).toBe(false);
  });

  it('should NOT flag "anthropic" as mock', () => {
    const result = detectMockProvider('anthropic');
    expect(result.is_mock).toBe(false);
  });

  it('should NOT flag "ollama" as mock', () => {
    const result = detectMockProvider('ollama');
    expect(result.is_mock).toBe(false);
  });

  it('should return is_mock=false for empty provider string', () => {
    const result = detectMockProvider('');
    expect(result.is_mock).toBe(false);
  });

  it('should be case-insensitive (SIMULATED)', () => {
    const result = detectMockProvider('SIMULATED');
    expect(result.is_mock).toBe(true);
  });

  it('should be case-insensitive (Mock)', () => {
    const result = detectMockProvider('Mock');
    expect(result.is_mock).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// detectMockModel
// ══════════════════════════════════════════════════════════════
describe('detectMockModel', () => {
  it('should detect "mock-model" as mock', () => {
    const result = detectMockModel('mock-model');
    expect(result.is_mock).toBe(true);
    expect(result.mock_type).toBe('model');
  });

  it('should detect "test-model-v1" as mock (matches keyword "test")', () => {
    const result = detectMockModel('test-model-v1');
    expect(result.is_mock).toBe(true);
  });

  it('should detect "fake-model" as mock', () => {
    const result = detectMockModel('fake-model');
    expect(result.is_mock).toBe(true);
  });

  it('should detect "stub-model" as mock', () => {
    const result = detectMockModel('stub-model');
    expect(result.is_mock).toBe(true);
  });

  it('should detect "dummy-model" as mock', () => {
    const result = detectMockModel('dummy-model');
    expect(result.is_mock).toBe(true);
  });

  it('should NOT flag "gpt-4" as mock', () => {
    const result = detectMockModel('gpt-4');
    expect(result.is_mock).toBe(false);
  });

  it('should NOT flag "gemini-1.5-flash" as mock', () => {
    const result = detectMockModel('gemini-1.5-flash');
    expect(result.is_mock).toBe(false);
  });

  it('should NOT flag "claude-3-sonnet" as mock', () => {
    const result = detectMockModel('claude-3-sonnet');
    expect(result.is_mock).toBe(false);
  });

  it('should NOT flag "llama-3.1" as mock', () => {
    const result = detectMockModel('llama-3.1');
    expect(result.is_mock).toBe(false);
  });

  it('should return is_mock=false for empty model string', () => {
    const result = detectMockModel('');
    expect(result.is_mock).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// detectMockInReport
// ══════════════════════════════════════════════════════════════
describe('detectMockInReport', () => {
  it('should detect mock when no_mock_verified=false', () => {
    const report = buildReport({ no_mock_verified: false });
    const result = detectMockInReport(report);
    expect(result.is_mock).toBe(true);
    expect(result.reason).toContain('no_mock_verified');
  });

  it('should detect mock when model_metadata.provider is simulated', () => {
    const report = buildReport({
      no_mock_verified: true,
      model_metadata: { provider: 'simulated', model: 'gpt-4' },
    });
    const result = detectMockInReport(report);
    expect(result.is_mock).toBe(true);
  });

  it('should detect mock when model_metadata.model is a mock model', () => {
    const report = buildReport({
      no_mock_verified: true,
      model_metadata: { provider: 'openai', model: 'mock-model' },
    });
    const result = detectMockInReport(report);
    expect(result.is_mock).toBe(true);
  });

  it('should return is_mock=false for a clean report', () => {
    const report = buildReport({
      no_mock_verified: true,
      model_metadata: { provider: 'google', model: 'gemini-1.5-flash' },
    });
    const result = detectMockInReport(report);
    expect(result.is_mock).toBe(false);
  });

  it('should return is_mock=false when model_metadata is absent', () => {
    const report = buildReport({ no_mock_verified: true });
    delete (report as any).model_metadata;
    const result = detectMockInReport(report);
    expect(result.is_mock).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// throwOnMock
// ══════════════════════════════════════════════════════════════
describe('throwOnMock', () => {
  it('should throw in production when no_mock_verified=false', () => {
    const report = buildReport({ no_mock_verified: false });
    expect(() => throwOnMock(report, 'production')).toThrow('MOCK_VIOLATION');
  });

  it('should throw in production when model is mock', () => {
    const report = buildReport({
      no_mock_verified: true,
      model_metadata: { provider: 'simulated', model: 'test' },
    });
    expect(() => throwOnMock(report, 'production')).toThrow('MOCK_VIOLATION');
  });

  it('should include mission_id and worker_id in thrown message', () => {
    const report = buildReport({
      mission_id: 'critical-mission',
      worker_id: 'BUILDER',
      no_mock_verified: false,
    });
    expect(() => throwOnMock(report, 'production')).toThrow('critical-mission/BUILDER');
  });

  it('should NOT throw in development even with mock', () => {
    const report = buildReport({ no_mock_verified: false });
    expect(() => throwOnMock(report, 'development')).not.toThrow();
  });

  it('should NOT throw in production for clean real report', () => {
    const report = buildReport({
      no_mock_verified: true,
      model_metadata: { provider: 'google', model: 'gemini-1.5-flash' },
    });
    expect(() => throwOnMock(report, 'production')).not.toThrow();
  });

  it('should default to production env', () => {
    const report = buildReport({ no_mock_verified: false });
    expect(() => throwOnMock(report)).toThrow('MOCK_VIOLATION');
  });
});

// ══════════════════════════════════════════════════════════════
// validateNoMock (from no-mock.ts — comprehensive version)
// ══════════════════════════════════════════════════════════════
describe('validateNoMock (no-mock.ts)', () => {
  it('should return valid for clean production report', () => {
    const report = buildReport({ no_mock_verified: true });
    const result = validateNoMock(report, 'production');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.mocks_detected).toBe(0);
  });

  it('should return invalid when no_mock_verified=false in production', () => {
    const report = buildReport({ no_mock_verified: false });
    const result = validateNoMock(report, 'production');
    expect(result.valid).toBe(false);
    expect(result.mocks_detected).toBeGreaterThan(0);
  });

  it('should detect mock keywords in implemented items in production', () => {
    const report = buildReport({
      no_mock_verified: true,
      implemented: ['Used mock data for testing'],
    });
    const result = validateNoMock(report, 'production');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('mock'))).toBe(true);
  });

  it('should issue warnings (not errors) for mock keywords in issues_discovered', () => {
    const report = buildReport({
      no_mock_verified: true,
      issues_discovered: ['Found mock data in legacy code'],
    });
    const result = validateNoMock(report, 'production');
    // mock in issues_discovered is a warning, not an error
    expect(result.warnings.some(w => w.includes('mock'))).toBe(true);
  });

  it('should return valid in development with mock', () => {
    const report = buildReport({
      no_mock_verified: false,
      model_metadata: { provider: 'simulated', model: 'test' },
    });
    const result = validateNoMock(report, 'development');
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.mocks_detected).toBeGreaterThan(0);
  });

  it('should default to production when env not specified', () => {
    const report = buildReport({ no_mock_verified: false });
    const result = validateNoMock(report);
    expect(result.valid).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// sanitizeReport
// ══════════════════════════════════════════════════════════════
describe('sanitizeReport', () => {
  it('should force no_mock_verified=true after sanitize', () => {
    const report = buildReport({ no_mock_verified: false });
    const cleaned = sanitizeReport(report);
    expect(cleaned.no_mock_verified).toBe(true);
  });

  it('should strip mock keywords from implemented items', () => {
    const report = buildReport({
      implemented: ['mock setup complete'],
    });
    const cleaned = sanitizeReport(report);
    expect(cleaned.implemented[0]).not.toContain('mock');
  });

  it('should strip fake keywords from issues_discovered', () => {
    const report = buildReport({
      issues_discovered: ['fake data detected'],
    });
    const cleaned = sanitizeReport(report);
    expect(cleaned.issues_discovered[0]).not.toContain('fake');
  });

  it('should not mutate the original report', () => {
    const report = buildReport({
      implemented: ['mock process running'],
      no_mock_verified: false,
    });
    sanitizeReport(report);
    // Original should be unchanged
    expect(report.implemented[0]).toContain('mock');
    expect(report.no_mock_verified).toBe(false);
  });

  it('should preserve non-mock content in arrays', () => {
    const report = buildReport({
      implemented: ['Added quran_loader.ts', 'Fixed resonance engine'],
    });
    const cleaned = sanitizeReport(report);
    expect(cleaned.implemented).toHaveLength(2);
    expect(cleaned.implemented[0]).toContain('quran_loader');
    expect(cleaned.implemented[1]).toContain('resonance engine');
  });
});

// ══════════════════════════════════════════════════════════════
// checkProviderAuthenticity
// ══════════════════════════════════════════════════════════════
describe('checkProviderAuthenticity', () => {
  const knownReal = ['openai', 'google', 'anthropic', 'meta', 'groq', 'huggingface', 'ollama', 'cohere', 'together', 'replicate'];

  knownReal.forEach(provider => {
    it(`should return authentic=true for "${provider}"`, () => {
      const result = checkProviderAuthenticity(provider);
      expect(result.authentic).toBe(true);
    });
  });

  it('should return authentic=false for "simulated"', () => {
    const result = checkProviderAuthenticity('simulated');
    expect(result.authentic).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('should return authentic=false for "mock"', () => {
    const result = checkProviderAuthenticity('mock');
    expect(result.authentic).toBe(false);
  });

  it('should return authentic=false for unknown provider "my-custom-llm"', () => {
    const result = checkProviderAuthenticity('my-custom-llm');
    expect(result.authentic).toBe(false);
    expect(result.reason).toContain('Unknown provider');
  });

  it('should be case-insensitive for known providers', () => {
    const result = checkProviderAuthenticity('GOOGLE');
    expect(result.authentic).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// checkModelAuthenticity
// ══════════════════════════════════════════════════════════════
describe('checkModelAuthenticity', () => {
  const knownReal = ['gpt-4', 'gpt-3.5-turbo', 'gemini-1.5', 'claude-3', 'llama-3', 'mistral-7b', 'mixtral-8x7b'];

  knownReal.forEach(model => {
    it(`should return authentic=true for "${model}"`, () => {
      const result = checkModelAuthenticity(model);
      expect(result.authentic).toBe(true);
    });
  });

  it('should return authentic=false for "mock-model"', () => {
    const result = checkModelAuthenticity('mock-model');
    expect(result.authentic).toBe(false);
  });

  it('should return authentic=false for "test-model"', () => {
    const result = checkModelAuthenticity('test-model');
    expect(result.authentic).toBe(false);
  });

  it('should return authentic=false for "fake-model-v1"', () => {
    const result = checkModelAuthenticity('fake-model-v1');
    expect(result.authentic).toBe(false);
  });

  it('should return authentic=false for completely unknown model', () => {
    const result = checkModelAuthenticity('some-unknown-proprietary-model');
    expect(result.authentic).toBe(false);
    expect(result.reason).toContain('Unknown model');
  });
});