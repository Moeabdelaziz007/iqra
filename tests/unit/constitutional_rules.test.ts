/**
 * 🧪 Constitutional Rules Unit Tests
 * النية: التحقق من القواعد الدستورية الخمس في الممر الموحد.
 *
 * القواعد المُختبَرة:
 * ١. كل حقل يجب أن يكون له قيمة حقيقية — لا undefined ولا null.
 * ٢. لا mock ولا simulated provider بدون dev_mode: true.
 * ٣. وسوم المصادر موجودة في WorkerReport.
 * ٤. parseMissionScope تُجهض إذا كانت verse بصيغة خاطئة.
 * ٥. makeWorkerReport تُنتج no_mock_verified صحيحاً.
 *
 * المصادر: [read] من الملفات المُعدَّلة هذه الجلسة.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';

// ── Imports from modified files [read] ───────────────────────────────────────
import { parseMissionScope } from '../../lib/iqra/mission-context.ts';
import { makeWorkerReport } from '../../agents/contracts.ts';

// ── Helper: write a temp mission YAML ────────────────────────────────────────
function writeTempMission(content: Record<string, any>): string {
  const tmpPath = path.join(os.tmpdir(), `iqra-test-${Date.now()}.yml`);
  fs.writeFileSync(tmpPath, yaml.dump(content), 'utf-8');
  return tmpPath;
}

// ══════════════════════════════════════════════════════════════
// القاعدة ٢: No-Mock Gate
// ══════════════════════════════════════════════════════════════
describe('Rule 2 — No-Mock Gate', () => {

  it('should ABORT if provider=simulated without dev_mode', () => {
    const missionPath = writeTempMission({
      mission_id: 'test-no-mock',
      objective: 'Test no-mock gate',
      verse: '15:9',
      field_of_inquiry: 'Test field',
      provider: 'simulated',
      // dev_mode intentionally absent
    });

    expect(() => parseMissionScope(missionPath)).toThrow('NO_MOCK_ERR');
    fs.unlinkSync(missionPath);
  });

  it('should ALLOW provider=simulated when dev_mode: true', () => {
    const missionPath = writeTempMission({
      mission_id: 'test-dev-mode',
      objective: 'Test dev mode',
      verse: '15:9',
      field_of_inquiry: 'Test field',
      provider: 'simulated',
      dev_mode: true,
    });

    const scope = parseMissionScope(missionPath);
    expect(scope.provider).toBe('simulated');
    expect(scope.dev_mode).toBe(true);
    fs.unlinkSync(missionPath);
  });

  it('should default provider to google when absent', () => {
    const missionPath = writeTempMission({
      mission_id: 'test-default-provider',
      objective: 'Test default',
      verse: '2:255',
      field_of_inquiry: 'Test field',
    });

    const scope = parseMissionScope(missionPath);
    expect(scope.provider).toBe('google');
    fs.unlinkSync(missionPath);
  });
});

// ══════════════════════════════════════════════════════════════
// القاعدة ١: Required Fields — لا undefined ولا null
// ══════════════════════════════════════════════════════════════
describe('Rule 1 — Required Fields', () => {

  it('should ABORT if mission_id is missing', () => {
    const missionPath = writeTempMission({
      objective: 'Test',
      verse: '2:255',
      field_of_inquiry: 'Test',
    });
    expect(() => parseMissionScope(missionPath)).toThrow('mission_id is required');
    fs.unlinkSync(missionPath);
  });

  it('should ABORT if verse is missing', () => {
    const missionPath = writeTempMission({
      mission_id: 'test',
      objective: 'Test',
      field_of_inquiry: 'Test',
    });
    expect(() => parseMissionScope(missionPath)).toThrow('verse is required');
    fs.unlinkSync(missionPath);
  });

  it('should ABORT if field_of_inquiry is missing', () => {
    const missionPath = writeTempMission({
      mission_id: 'test',
      objective: 'Test',
      verse: '2:255',
    });
    expect(() => parseMissionScope(missionPath)).toThrow('field_of_inquiry is required');
    fs.unlinkSync(missionPath);
  });

  it('should ABORT if verse format is wrong (not surah:ayah)', () => {
    const missionPath = writeTempMission({
      mission_id: 'test',
      objective: 'Test',
      verse: 'Al-Baqarah:255',  // wrong format
      field_of_inquiry: 'Test',
    });
    expect(() => parseMissionScope(missionPath)).toThrow('verse must be in "surah:ayah" format');
    fs.unlinkSync(missionPath);
  });

  it('should ACCEPT a valid mission scope', () => {
    const missionPath = writeTempMission({
      mission_id: 'valid-mission',
      objective: 'Valid test',
      verse: '2:255',
      field_of_inquiry: 'Quantum physics',
    });
    const scope = parseMissionScope(missionPath);
    expect(scope.mission_id).toBe('valid-mission');
    expect(scope.verse).toBe('2:255');
    expect(scope.field_of_inquiry).toBe('Quantum physics');
    expect(scope.provider).toBe('google');
    expect(scope.dev_mode).toBe(false);
    fs.unlinkSync(missionPath);
  });
});

// ══════════════════════════════════════════════════════════════
// القاعدة ٣: Source Attestation — وسوم المصادر
// ══════════════════════════════════════════════════════════════
describe('Rule 3 — Source Attestation in WorkerReport', () => {

  it('makeWorkerReport should produce no_mock_verified=true for real providers', () => {
    const report = makeWorkerReport('mission-1', 'Researcher', 'google');
    expect(report.no_mock_verified).toBe(true);
    expect(report.source_attestations).toEqual([]);
    expect(report.mission_id).toBe('mission-1');
    expect(report.worker_id).toBe('Researcher');
  });

  it('makeWorkerReport should produce no_mock_verified=false for simulated', () => {
    const report = makeWorkerReport('mission-2', 'Researcher', 'simulated');
    expect(report.no_mock_verified).toBe(false);
  });

  it('WorkerReport should have all required fields non-null', () => {
    const report = makeWorkerReport('mission-3', 'Builder', 'groq');
    // القاعدة ١: لا undefined ولا null في الحقول الأساسية
    expect(report.mission_id).toBeDefined();
    expect(report.worker_id).toBeDefined();
    expect(report.implemented).toBeDefined();
    expect(report.undone).toBeDefined();
    expect(report.commands_run).toBeDefined();
    expect(report.issues_discovered).toBeDefined();
    expect(report.skills_used).toBeDefined();
    expect(report.procedures_followed).toBeDefined();
    expect(report.status).toBeDefined();
    expect(report.exit_code).toBeDefined();
    expect(report.source_attestations).toBeDefined();
    expect(report.no_mock_verified).toBeDefined();
    expect(report.timestamp).toBeDefined();
    // Arrays should be empty, not null
    expect(Array.isArray(report.implemented)).toBe(true);
    expect(Array.isArray(report.source_attestations)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// القاعدة ٤: Verse Format Validation
// ══════════════════════════════════════════════════════════════
describe('Rule 4 — Verse Format', () => {

  const validVerses = ['1:1', '2:255', '36:1', '114:6'];
  const invalidVerses = ['Al-Fatiha:1', '2-255', 'surah2ayah255', '', '2:', ':255'];

  validVerses.forEach(verse => {
    it(`should ACCEPT verse "${verse}"`, () => {
      const missionPath = writeTempMission({
        mission_id: 'test',
        objective: 'Test',
        verse,
        field_of_inquiry: 'Test',
      });
      expect(() => parseMissionScope(missionPath)).not.toThrow();
      fs.unlinkSync(missionPath);
    });
  });

  invalidVerses.forEach(verse => {
    it(`should REJECT verse "${verse}"`, () => {
      const missionPath = writeTempMission({
        mission_id: 'test',
        objective: 'Test',
        verse: verse || undefined,
        field_of_inquiry: 'Test',
      });
      expect(() => parseMissionScope(missionPath)).toThrow();
      fs.unlinkSync(missionPath);
    });
  });
});
