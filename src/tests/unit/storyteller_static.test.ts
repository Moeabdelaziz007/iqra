/**
 * Unit Tests: IQRAStoryteller — static methods added in this PR
 *
 * Tests the two new static methods:
 *   - IQRAStoryteller.generateCommitMessage(breakthrough | reports[], note?)
 *   - IQRAStoryteller.logToHadith(hash, summary)
 *
 * Both methods never throw and have deterministic / file-system-only
 * behaviour, making them straightforward to unit-test.
 *
 * We mock `fs` to avoid actual file writes during testing.
 * `#infra/logger`, `#core/brain`, and `#utils/voice` are not needed
 * because the static methods do not call them.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock fs so we don't touch the real filesystem.
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    writeFileSync: vi.fn(),
    appendFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    // logToHadith reads the existing file to skip duplicate hashes;
    // tests that take the append path must stub this too.
    readFileSync: vi.fn().mockReturnValue(''),
  };
});

// Stub heavy transitive deps that storyteller.ts imports at module level.
vi.mock('#core/brain', () => ({
  iqraThink: vi.fn(),
  IQRABrainMode: { FAST_RESPONSE: 'FAST_RESPONSE' },
}));
vi.mock('#utils/voice', () => ({
  IQRAVoice: { speak: vi.fn() },
}));
vi.mock('#infra/logger', () => ({
  IQRALogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock('#workers/protocol', () => ({}));

import { IQRAStoryteller } from '#utils/storyteller';

const mockFs = fs as unknown as {
  existsSync: ReturnType<typeof vi.fn>;
  writeFileSync: ReturnType<typeof vi.fn>;
  appendFileSync: ReturnType<typeof vi.fn>;
  readFileSync: ReturnType<typeof vi.fn>;
};

// Freeze the clock for the whole suite. `generateCommitMessage` and
// `logToHadith` both embed the current date/time, so without a fixed
// clock the date-stamp assertion can flake when the test runs across a
// UTC day boundary in CI. The frozen instant is picked inside 2026 so
// it is unambiguous in any tz.
const FROZEN_NOW = new Date('2026-05-13T12:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FROZEN_NOW);
  vi.resetAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── generateCommitMessage (static) ────────────────────────────────────────────

describe('IQRAStoryteller.generateCommitMessage() — static', () => {
  it('accepts a string breakthrough and formats a commit message', () => {
    const msg = IQRAStoryteller.generateCommitMessage('Discovered new pattern', 'Extra note');
    expect(msg).toContain('🌙 Discovered new pattern');
    expect(msg).toContain('Extra note');
    // Date stamp should be present
    expect(msg).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('accepts a WorkerReport array and joins their implemented items', () => {
    const reports = [
      { worker_id: 'WorkerA', implemented: ['feat A', 'feat B'], mission_id: 'm1', status: 'SUCCESS', exit_code: 0, no_mock_verified: true },
      { worker_id: 'WorkerB', implemented: ['feat C'], mission_id: 'm1', status: 'SUCCESS', exit_code: 0, no_mock_verified: true },
    ];
    const msg = IQRAStoryteller.generateCommitMessage(reports as any);
    expect(msg).toContain('feat A, feat B');
    expect(msg).toContain('feat C');
    expect(msg).toContain('🌙');
  });

  it('uses worker_id fallback when implemented array is missing', () => {
    const reports = [
      { worker_id: 'FallbackWorker', mission_id: 'm1', status: 'SUCCESS', exit_code: 0, no_mock_verified: false },
    ];
    const msg = IQRAStoryteller.generateCommitMessage(reports as any);
    expect(msg).toContain('FallbackWorker');
  });

  it('omits empty note gracefully (no trailing whitespace artefacts in result)', () => {
    const msg = IQRAStoryteller.generateCommitMessage('Breakthrough', '');
    // Should not have three consecutive newlines (breakthrough + empty note + ref)
    expect(msg).not.toContain('\n\n\n');
    expect(msg).toContain('🌙');
  });

  it('includes the current date stamp in Reference line', () => {
    // Date is taken from the frozen clock set in beforeEach(); this
    // assertion is now stable across midnight UTC boundaries in CI.
    const msg = IQRAStoryteller.generateCommitMessage('Test');
    expect(msg).toContain('Reference: 2026-05-13');
  });

  it('never throws for any input type', () => {
    expect(() => IQRAStoryteller.generateCommitMessage('')).not.toThrow();
    expect(() => IQRAStoryteller.generateCommitMessage([])).not.toThrow();
    expect(() => IQRAStoryteller.generateCommitMessage('hello', 'world')).not.toThrow();
  });
});

// ── logToHadith (static) ──────────────────────────────────────────────────────

describe('IQRAStoryteller.logToHadith() — static', () => {
  const HADITH_PATH = path.join(process.cwd(), 'HADITH.md');

  it('creates HADITH.md with header when file does not exist', () => {
    mockFs.existsSync.mockReturnValue(false);

    IQRAStoryteller.logToHadith('abc1234', 'First hadith entry');

    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      HADITH_PATH,
      expect.stringContaining('# IQRA Hadith Trail'),
    );
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      HADITH_PATH,
      expect.stringContaining('abc1234'),
    );
  });

  it('appends to HADITH.md when file already exists', () => {
    mockFs.existsSync.mockReturnValue(true);

    IQRAStoryteller.logToHadith('def5678', 'Second entry');

    expect(mockFs.appendFileSync).toHaveBeenCalledWith(
      HADITH_PATH,
      expect.stringContaining('def5678'),
    );
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('includes ISO timestamp in the appended line', () => {
    mockFs.existsSync.mockReturnValue(true);
    // Storyteller reads HADITH.md first to check for duplicates; return
    // an empty existing file so the append path is reached and the
    // assertion below sees the expected appendFileSync call.
    mockFs.readFileSync.mockReturnValue('');

    IQRAStoryteller.logToHadith('xyz', 'summary');

    const appendArg = mockFs.appendFileSync.mock.calls[0][1] as string;
    // Frozen clock = 2026-05-13T12:00:00.000Z (set in beforeEach).
    expect(appendArg).toContain('2026-05-13T12:00:00.000Z');
  });

  it('includes the summary text in the written line', () => {
    mockFs.existsSync.mockReturnValue(true);

    IQRAStoryteller.logToHadith('aaa', 'Pattern discovered: 7-fold symmetry');

    const appendArg = mockFs.appendFileSync.mock.calls[0][1] as string;
    expect(appendArg).toContain('Pattern discovered: 7-fold symmetry');
  });

  it('wraps the hash in backticks', () => {
    mockFs.existsSync.mockReturnValue(true);

    IQRAStoryteller.logToHadith('commit123', 'summary');

    const appendArg = mockFs.appendFileSync.mock.calls[0][1] as string;
    expect(appendArg).toContain('`commit123`');
  });

  it('does not throw when fs.writeFileSync throws (graceful failure)', () => {
    mockFs.existsSync.mockReturnValue(false);
    mockFs.writeFileSync.mockImplementation(() => { throw new Error('disk full'); });

    // Must not throw — error is caught internally and logged via IQRALogger.warn
    expect(() => IQRAStoryteller.logToHadith('hash', 'summary')).not.toThrow();
  });

  it('does not throw when fs.appendFileSync throws (graceful failure)', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.appendFileSync.mockImplementation(() => { throw new Error('permission denied'); });

    expect(() => IQRAStoryteller.logToHadith('hash', 'summary')).not.toThrow();
  });
});
