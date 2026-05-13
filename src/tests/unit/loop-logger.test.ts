// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * Tests for loop.ts (IQRAExecutionLoop): verifies that IQRALogger is used
 * instead of console.* for the call-sites changed in this PR:
 *
 *   runTask():
 *     - IQRALogger.info('🌙 Cycle N', { honestyIndex, intention }) on every run
 *     - IQRALogger.info('✅ Task succeeded', { id }) on success
 *     - IQRALogger.error('❌ Task failed', { id, error }) on failure
 *     - IQRALogger.error('Evolution cycle failed', ...) when evolution rejects
 *
 *   tasbihReset() (triggered every 3 failures):
 *     - IQRALogger.info('📿 [TASBIH] Re-aligning intention…')
 *
 *   extractWisdom() (triggered every 7 cycles):
 *     - IQRALogger.info('📜 [WISDOM] Extracting patterns…')
 *
 *   topologicalFlood() (triggered every 40 cycles):
 *     - IQRALogger.info('🌊 [TOPOLOGICAL_FLOOD] …')
 *
 *   loadState() (corrupt state file):
 *     - IQRALogger.error('Error loading state, resetting', { err })
 *
 *   performTopologicalReset():
 *     - IQRALogger.info / IQRALogger.error on various sub-steps
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── module mocks ─────────────────────────────────────────────────────────────

vi.mock('#infra/logger', () => ({
  IQRALogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('#evolution/self_evolve', () => ({
  IQRAEvolution: {
    runEvolutionCycle: vi.fn().mockResolvedValue(undefined),
  },
}));

// fs is mocked so tests don't touch the real filesystem.
vi.mock('fs', () => {
  const mockFs: Record<string, any> = {
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => '{}'),
    writeFileSync: vi.fn(),
    appendFileSync: vi.fn(),
    rmSync: vi.fn(),
  };
  return { default: mockFs, ...mockFs };
});

// ──────────────────────────────────────────────────────────────────────────────

import { IQRALogger } from '#infra/logger';
import { IQRAExecutionLoop } from '#core/loop';
import { IQRAEvolution } from '#evolution/self_evolve';
import fs from 'fs';

const MockedIQRALogger = vi.mocked(IQRALogger);
const mockedFs = vi.mocked(fs);

// Helper: build a metadata object for runTask
const meta = (id: string = 'task-1', intention: string = 'test intention') => ({
  id,
  intention,
});

describe('IQRAExecutionLoop: IQRALogger integration (PR: route console.* through IQRALogger)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // By default there is no state file → fresh state
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.writeFileSync.mockImplementation(() => {});
    mockedFs.appendFileSync.mockImplementation(() => {});
    mockedFs.rmSync.mockImplementation(() => {});
  });

  // ── runTask: cycle info log ───────────────────────────────────────────────

  it('calls IQRALogger.info with cycle number on every runTask call', async () => {
    const task = vi.fn().mockResolvedValue(undefined);
    await IQRAExecutionLoop.runTask(task, meta());

    const cycleCall = MockedIQRALogger.info.mock.calls.find(([msg]) =>
      msg.includes('🌙 Cycle')
    );
    expect(cycleCall).toBeDefined();
  });

  it('includes honestyIndex and intention in the cycle info meta', async () => {
    const task = vi.fn().mockResolvedValue(undefined);
    await IQRAExecutionLoop.runTask(task, meta('t1', 'my intention'));

    const cycleCall = MockedIQRALogger.info.mock.calls.find(([msg]) =>
      msg.includes('🌙 Cycle')
    );
    expect(cycleCall![1]).toMatchObject({ intention: 'my intention' });
    expect(typeof cycleCall![1].honestyIndex).toBe('number');
  });

  // ── runTask: success log ──────────────────────────────────────────────────

  it('calls IQRALogger.info("✅ Task succeeded") when task resolves', async () => {
    const task = vi.fn().mockResolvedValue(undefined);
    await IQRAExecutionLoop.runTask(task, meta('success-id'));

    const successCall = MockedIQRALogger.info.mock.calls.find(([msg]) =>
      msg.includes('✅ Task succeeded')
    );
    expect(successCall).toBeDefined();
    expect(successCall![1]).toMatchObject({ id: 'success-id' });
  });

  it('does NOT call IQRALogger.error("❌ Task failed") on success', async () => {
    await IQRAExecutionLoop.runTask(vi.fn().mockResolvedValue(undefined), meta());

    const failCalls = MockedIQRALogger.error.mock.calls.filter(([msg]) =>
      msg.includes('❌ Task failed')
    );
    expect(failCalls).toHaveLength(0);
  });

  // ── runTask: failure log ──────────────────────────────────────────────────

  it('calls IQRALogger.error("❌ Task failed") with id and error message when task throws', async () => {
    const boom = new Error('something went wrong');
    const task = vi.fn().mockRejectedValue(boom);

    await IQRAExecutionLoop.runTask(task, meta('fail-id', 'risky op'));

    const failCall = MockedIQRALogger.error.mock.calls.find(([msg]) =>
      msg.includes('❌ Task failed')
    );
    expect(failCall).toBeDefined();
    expect(failCall![1]).toMatchObject({ id: 'fail-id', error: 'something went wrong' });
  });

  it('does NOT call IQRALogger.info("✅ Task succeeded") when task throws', async () => {
    await IQRAExecutionLoop.runTask(vi.fn().mockRejectedValue(new Error('boom')), meta());

    const successCalls = MockedIQRALogger.info.mock.calls.filter(([msg]) =>
      msg.includes('✅ Task succeeded')
    );
    expect(successCalls).toHaveLength(0);
  });

  // ── tasbihReset: triggered every 3rd failure ──────────────────────────────

  it('calls IQRALogger.info("📿 [TASBIH]") after every 3rd consecutive failure', async () => {
    const fail = vi.fn().mockRejectedValue(new Error('err'));

    await IQRAExecutionLoop.runTask(fail, meta('a1'));
    await IQRAExecutionLoop.runTask(fail, meta('a2'));
    // Third failure should trigger tasbihReset
    await IQRAExecutionLoop.runTask(fail, meta('a3'));

    const tasbihCall = MockedIQRALogger.info.mock.calls.find(([msg]) =>
      msg.includes('📿 [TASBIH]')
    );
    expect(tasbihCall).toBeDefined();
  });

  it('does NOT call IQRALogger.info("📿 [TASBIH]") after only 2 consecutive failures', async () => {
    const fail = vi.fn().mockRejectedValue(new Error('err'));

    await IQRAExecutionLoop.runTask(fail, meta('b1'));
    await IQRAExecutionLoop.runTask(fail, meta('b2'));

    const tasbihCall = MockedIQRALogger.info.mock.calls.find(([msg]) =>
      msg.includes('📿 [TASBIH]')
    );
    expect(tasbihCall).toBeUndefined();
  });

  // ── extractWisdom: every 7th cycle ───────────────────────────────────────

  it('calls IQRALogger.info("📜 [WISDOM]") on the 7th cycle', async () => {
    const task = vi.fn().mockResolvedValue(undefined);

    for (let i = 0; i < 7; i++) {
      await IQRAExecutionLoop.runTask(task, meta(`w${i}`));
    }

    const wisdomCall = MockedIQRALogger.info.mock.calls.find(([msg]) =>
      msg.includes('📜 [WISDOM]')
    );
    expect(wisdomCall).toBeDefined();
  });

  // ── evolution error: IQRALogger.error ────────────────────────────────────

  it('calls IQRALogger.error("Evolution cycle failed") when IQRAEvolution.runEvolutionCycle rejects', async () => {
    vi.mocked(IQRAEvolution.runEvolutionCycle).mockRejectedValue(new Error('evo fail'));

    const task = vi.fn().mockResolvedValue(undefined);
    // Need to reach cycle 7 to trigger evolution
    for (let i = 0; i < 7; i++) {
      await IQRAExecutionLoop.runTask(task, meta(`ev${i}`));
    }

    // Allow the async rejection to settle
    await new Promise(resolve => setTimeout(resolve, 0));

    const evoError = MockedIQRALogger.error.mock.calls.find(([msg]) =>
      msg.includes('Evolution cycle failed')
    );
    expect(evoError).toBeDefined();
  });

  // ── loadState: corrupt state file → IQRALogger.error ────────────────────

  it('calls IQRALogger.error("Error loading state, resetting") when state file is unreadable', async () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockImplementation(() => {
      throw new SyntaxError('Unexpected token');
    });

    const task = vi.fn().mockResolvedValue(undefined);
    await IQRAExecutionLoop.runTask(task, meta());

    const stateError = MockedIQRALogger.error.mock.calls.find(([msg]) =>
      msg.includes('Error loading state')
    );
    expect(stateError).toBeDefined();
    expect(stateError![1]).toHaveProperty('err');
  });

  it('recovers from corrupt state file and still calls cycle info log', async () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockImplementation(() => {
      throw new SyntaxError('corrupt');
    });

    const task = vi.fn().mockResolvedValue(undefined);
    await IQRAExecutionLoop.runTask(task, meta());

    const cycleCall = MockedIQRALogger.info.mock.calls.find(([msg]) =>
      msg.includes('🌙 Cycle')
    );
    expect(cycleCall).toBeDefined();
  });

  // ── performTopologicalReset: every 40th cycle ────────────────────────────

  it('calls IQRALogger.info("✨ [TOPOLOGICAL_RESET]") on cycle 40', async () => {
    const task = vi.fn().mockResolvedValue(undefined);
    // readFileSync is invoked for reward ledger; return empty so it is handled gracefully
    mockedFs.existsSync.mockImplementation((p: string) => {
      if (String(p).includes('reward_ledger')) return false;
      if (String(p).includes('trust_chain')) return false;
      return false;
    });

    for (let i = 0; i < 40; i++) {
      await IQRAExecutionLoop.runTask(task, meta(`c${i}`));
    }

    const resetCall = MockedIQRALogger.info.mock.calls.find(([msg]) =>
      msg.includes('TOPOLOGICAL_RESET')
    );
    expect(resetCall).toBeDefined();
  });

  // ── no direct console.log calls for loop breadcrumbs ─────────────────────

  it('does NOT emit raw console.log for cycle header (uses IQRALogger.info)', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const task = vi.fn().mockResolvedValue(undefined);
    await IQRAExecutionLoop.runTask(task, meta());

    // Old message: '--- 🌙 Cycle N | Honesty X% ---'
    const oldStyleCall = consoleSpy.mock.calls.find(([msg]) =>
      typeof msg === 'string' && msg.includes('--- 🌙 Cycle')
    );
    expect(oldStyleCall).toBeUndefined();
    consoleSpy.mockRestore();
  });

  it('does NOT emit raw console.log for task-succeeded breadcrumb', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await IQRAExecutionLoop.runTask(vi.fn().mockResolvedValue(undefined), meta());

    // Old message: '✅ Task Succeeded.'
    const oldSuccessCall = consoleSpy.mock.calls.find(([msg]) =>
      typeof msg === 'string' && msg === '✅ Task Succeeded.'
    );
    expect(oldSuccessCall).toBeUndefined();
    consoleSpy.mockRestore();
  });
});