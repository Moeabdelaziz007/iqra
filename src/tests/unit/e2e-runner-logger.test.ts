// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * Tests for e2e_runner.ts (runRealWorkflow) — verifies that IQRALogger is
 * used instead of console.* for the call-sites changed in this PR:
 *
 *   Dirty working tree → IQRALogger.error('❌ [ITQAN BLOCK] Uncommitted changes…', { status })
 *   Clean tree         → IQRALogger.info('🌀 [TOPOLOGY] Starting workflow', { state, curvature })
 *   Inside task        → IQRALogger.info('🛠️ [ITQAN] Verifying project integrity')
 *                     → IQRALogger.info('🌀 [TOPOLOGY] Transition', { transition })
 *                     → IQRALogger.info('✅ [SUCCESS] Real E2E workflow completed')
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── module mocks ──────────────────────────────────────────────────────────────

vi.mock('#infra/logger', () => ({
  IQRALogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// child_process.execSync is used to check `git status --porcelain`
vi.mock('child_process', () => ({
  execSync: vi.fn(() => Buffer.from('')), // clean tree by default
}));

vi.mock('#topology/topology', () => ({
  IQRATopology: vi.fn().mockImplementation(() => ({
    syncStateWithReality: vi.fn().mockResolvedValue(undefined),
    getCurrentState: vi.fn().mockReturnValue('RECEPTION'),
    calculateCurvature: vi.fn().mockReturnValue(0.42),
    transition: vi.fn((success: boolean) => `TRANSITION_${success ? 'OK' : 'FAIL'}`),
  })),
}));

vi.mock('#utils/git-ops', () => ({
  sovereignSync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./loop', () => ({
  IQRAExecutionLoop: {
    runTask: vi.fn().mockImplementation(async (taskFn: () => Promise<void>, _meta: any) => {
      await taskFn();
    }),
  },
}));

vi.mock('#utils/commands', () => ({
  IQRACommands: {
    getStatus: vi.fn(() => 'OK'),
  },
}));

vi.mock('fs', () => {
  const mockFs: Record<string, any> = {
    readdirSync: vi.fn(() => ['FITRAH.md', 'package.json']),
    appendFileSync: vi.fn(),
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() => ''),
    writeFileSync: vi.fn(),
    rmSync: vi.fn(),
  };
  return { default: mockFs, ...mockFs };
});

// ──────────────────────────────────────────────────────────────────────────────

import { IQRALogger } from '#infra/logger';
import { runRealWorkflow } from '#core/e2e_runner';
import { execSync } from 'child_process';
import fs from 'fs';

const MockedIQRALogger = vi.mocked(IQRALogger);
const mockedExecSync = vi.mocked(execSync);
const mockedFs = vi.mocked(fs);

describe('runRealWorkflow — IQRALogger integration (PR: route console.* through IQRALogger)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clean working tree by default
    mockedExecSync.mockReturnValue(Buffer.from('') as any);
    // FITRAH.md exists by default
    mockedFs.readdirSync.mockReturnValue(['FITRAH.md', 'package.json'] as any);
    mockedFs.appendFileSync.mockImplementation(() => {});
  });

  // ── dirty working tree → IQRALogger.error ────────────────────────────────

  it('calls IQRALogger.error with ITQAN BLOCK message when git status is dirty', async () => {
    mockedExecSync.mockReturnValue(Buffer.from('M modified-file.ts') as any);

    await runRealWorkflow('test task');

    const blockCall = MockedIQRALogger.error.mock.calls.find(([msg]) =>
      msg.includes('ITQAN BLOCK')
    );
    expect(blockCall).toBeDefined();
  });

  it('includes { status } in the IQRALogger.error meta when tree is dirty', async () => {
    const dirtyStatus = 'M modified-file.ts';
    mockedExecSync.mockReturnValue(Buffer.from(dirtyStatus) as any);

    await runRealWorkflow('test task');

    const blockCall = MockedIQRALogger.error.mock.calls.find(([msg]) =>
      msg.includes('ITQAN BLOCK')
    );
    expect(blockCall![1]).toMatchObject({ status: dirtyStatus });
  });

  it('returns undefined immediately when working tree is dirty', async () => {
    mockedExecSync.mockReturnValue(Buffer.from('?? untracked.ts') as any);

    const result = await runRealWorkflow('test task');

    expect(result).toBeUndefined();
  });

  it('does NOT call console.error directly for the ITQAN BLOCK message', async () => {
    mockedExecSync.mockReturnValue(Buffer.from('M dirty.ts') as any);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await runRealWorkflow('test task');

    const rawBlockCall = consoleSpy.mock.calls.find(
      ([msg]) =>
        typeof msg === 'string' &&
        msg.includes('❌ [ITQAN BLOCK]') &&
        msg.includes('E2E aborted')
    );
    expect(rawBlockCall).toBeUndefined();
    consoleSpy.mockRestore();
  });

  // ── clean tree → IQRALogger.info for topology start ──────────────────────

  it('calls IQRALogger.info("🌀 [TOPOLOGY] Starting workflow") when working tree is clean', async () => {
    await runRealWorkflow('test task');

    const topoCall = MockedIQRALogger.info.mock.calls.find(([msg]) =>
      msg.includes('[TOPOLOGY] Starting workflow')
    );
    expect(topoCall).toBeDefined();
  });

  it('includes state and curvature in the topology start info meta', async () => {
    await runRealWorkflow('test task');

    const topoCall = MockedIQRALogger.info.mock.calls.find(([msg]) =>
      msg.includes('[TOPOLOGY] Starting workflow')
    );
    expect(topoCall![1]).toMatchObject({
      state: 'RECEPTION',
      curvature: 0.42,
    });
  });

  // ── inside task: project integrity log ───────────────────────────────────

  it('calls IQRALogger.info("🛠️ [ITQAN] Verifying project integrity") inside the task', async () => {
    await runRealWorkflow('test task');

    const itqanCall = MockedIQRALogger.info.mock.calls.find(([msg]) =>
      msg.includes('[ITQAN] Verifying project integrity')
    );
    expect(itqanCall).toBeDefined();
  });

  // ── inside task: topology transition and success logs ────────────────────

  it('calls IQRALogger.info("🌀 [TOPOLOGY] Transition") with transition result', async () => {
    await runRealWorkflow('test task');

    const transitionCall = MockedIQRALogger.info.mock.calls.find(([msg]) =>
      msg.includes('[TOPOLOGY] Transition')
    );
    expect(transitionCall).toBeDefined();
    expect(transitionCall![1]).toMatchObject({ transition: 'TRANSITION_OK' });
  });

  it('calls IQRALogger.info("✅ [SUCCESS] Real E2E workflow completed")', async () => {
    await runRealWorkflow('test task');

    const successCall = MockedIQRALogger.info.mock.calls.find(([msg]) =>
      msg.includes('[SUCCESS] Real E2E workflow completed')
    );
    expect(successCall).toBeDefined();
  });

  // ── FITRAH.md missing → task throws ──────────────────────────────────────

  it('throws when FITRAH.md is missing from the working directory', async () => {
    mockedFs.readdirSync.mockReturnValue(['package.json'] as any);

    await expect(runRealWorkflow('test task')).rejects.toThrow('Critical File Missing: FITRAH.md');
  });

  // ── does NOT call console.log for start/success breadcrumbs ──────────────

  it('does NOT emit raw console.log for the topology start breadcrumb', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await runRealWorkflow('test task');

    // Old format: console.log(`🌀 [TOPOLOGY] Starting from state: ...`)
    const oldStyleCall = consoleSpy.mock.calls.find(([msg]) =>
      typeof msg === 'string' && msg.includes('Starting from state:')
    );
    expect(oldStyleCall).toBeUndefined();
    consoleSpy.mockRestore();
  });

  it('does NOT emit raw console.log for the success breadcrumb', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await runRealWorkflow('test task');

    const oldSuccessCall = consoleSpy.mock.calls.find(
      ([msg]) => typeof msg === 'string' && msg === '✅ [SUCCESS] Real E2E Workflow Completed.'
    );
    expect(oldSuccessCall).toBeUndefined();
    consoleSpy.mockRestore();
  });

  // ── both dirty AND FITRAH.md missing: early return wins ──────────────────

  it('returns without entering topology when tree is dirty even if FITRAH.md is missing', async () => {
    mockedExecSync.mockReturnValue(Buffer.from('M modified.ts') as any);
    mockedFs.readdirSync.mockReturnValue([] as any);

    const result = await runRealWorkflow('test task');

    expect(result).toBeUndefined();
    const topoCall = MockedIQRALogger.info.mock.calls.find(([msg]) =>
      msg.includes('[TOPOLOGY] Starting workflow')
    );
    expect(topoCall).toBeUndefined();
  });
});