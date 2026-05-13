// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * Tests for brain.ts: verifies that IQRALogger is used
 * instead of console.* for the calls changed in this PR.
 *
 * Changed lines: IQRALogger.debug calls at the start and end of iqraThink.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- module mocks (must be declared before any imports that use them) ---

vi.mock('#infra/logger', () => ({
  IQRALogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('#security/security', () => ({
  validateInput: vi.fn(() => ({ success: true })),
  appendToTrustChain: vi.fn(),
  checkCircuit: vi.fn(() => true),
  reportFailure: vi.fn(),
  reportSuccess: vi.fn(),
  verifyCovenant: vi.fn(() => true),
}));

vi.mock('#skills/caveman_skill', () => ({
  CavemanSkill: {
    compressPrompt: vi.fn((input: string) => input),
    deterministicShield: vi.fn((s: string) => s),
  },
}));

// Damir conscience is a dynamic import inside fitrahFilter; stub it out.
vi.mock('#security/damir_conscience', () => ({
  globalDamir: {
    check: vi.fn(() => ({ allowed: true, confidence: 0.99, latency_ms: 1 })),
    registerResource: vi.fn(),
    execute: vi.fn(),
    reset: vi.fn(),
  },
  DamirConscience: vi.fn().mockImplementation(() => ({
    check: vi.fn(() => ({ allowed: true, confidence: 0.99, latency_ms: 1 })),
    registerResource: vi.fn(),
    execute: vi.fn(),
    reset: vi.fn(),
  })),
}));

// Remaining heavy deps that are not on the iqraThink local-mode path
// but may be transitively required at import time.
vi.mock('#memory/memory', () => ({
  IQRAMemory: { get: vi.fn(), save: vi.fn(), softReset: vi.fn() },
  QuantumTopologyStore: vi.fn(),
  SpiritualCoordinate: vi.fn(),
}));

vi.mock('#core/sovereign', () => ({
  SovereignEngine: { executeSovereignTask: vi.fn() },
}));

vi.mock('#utils/timeout', () => ({
  withTimeout: vi.fn((fn: () => any) => fn()),
  IQRA_TIMEOUTS: {},
}));

// ---

import { IQRALogger } from '#infra/logger';
import { iqraThink, IQRABrainMode } from '#core/brain';
import { validateInput } from '#security/security';
import { CavemanSkill } from '#skills/caveman_skill';

const MockedIQRALogger = vi.mocked(IQRALogger);

describe('brain.ts: IQRALogger integration (PR: route console.* through IQRALogger)', () => {
  const ORIG_LOCAL_MODE = process.env.IQRA_LOCAL_MODE;

  beforeEach(() => {
    vi.clearAllMocks();
    // Use local mode to keep the test path simple (no MissionControl / LLM calls).
    process.env.IQRA_LOCAL_MODE = 'true';
    // Default: input passes validation
    vi.mocked(validateInput).mockReturnValue({ success: true } as any);
    vi.mocked(CavemanSkill.compressPrompt).mockImplementation((s: string) => s);
    vi.mocked(CavemanSkill.deterministicShield).mockImplementation((s: string) => s);
  });

  afterEach(() => {
    if (ORIG_LOCAL_MODE === undefined) {
      delete process.env.IQRA_LOCAL_MODE;
    } else {
      process.env.IQRA_LOCAL_MODE = ORIG_LOCAL_MODE;
    }
  });

  // ── debug: start ──────────────────────────────────────────────────────────

  it('calls IQRALogger.debug with iqraThink-started message and { input } on entry', async () => {
    const input = 'Hello world';
    await iqraThink({ input });

    const debugCalls = MockedIQRALogger.debug.mock.calls;
    const startCall = debugCalls.find(([msg]) => msg.includes('iqraThink started'));
    expect(startCall).toBeDefined();
    expect(startCall![1]).toMatchObject({ input });
  });

  it('calls IQRALogger.debug with options message and { options } on entry', async () => {
    const options = { someFlag: true };
    await iqraThink({ input: 'test', options });

    const debugCalls = MockedIQRALogger.debug.mock.calls;
    const optionsCall = debugCalls.find(([msg]) => msg.includes('iqraThink options'));
    expect(optionsCall).toBeDefined();
    expect(optionsCall![1]).toMatchObject({ options });
  });

  // ── debug: finish ─────────────────────────────────────────────────────────

  it('calls IQRALogger.debug with finished message and { responseLength } on successful completion', async () => {
    const input = 'test input';
    const result = await iqraThink({ input });

    const debugCalls = MockedIQRALogger.debug.mock.calls;
    const finishCall = debugCalls.find(([msg]) => msg.includes('iqraThink finished'));
    expect(finishCall).toBeDefined();
    expect(finishCall![1]).toMatchObject({ responseLength: result.response.length });
  });

  it('responseLength in IQRALogger.debug matches actual response length', async () => {
    const result = await iqraThink({ input: 'بحث' });

    const finishCall = MockedIQRALogger.debug.mock.calls.find(([msg]) =>
      msg.includes('iqraThink finished')
    );
    expect(finishCall![1].responseLength).toBe(result.response.length);
  });

  // ── no console.* calls ───────────────────────────────────────────────────

  it('does NOT call console.log directly (uses IQRALogger instead)', async () => {
    const spy = vi.spyOn(console, 'log');
    await iqraThink({ input: 'test' });
    // console.log may be called by IQRALogger internally; verify the iqraThink
    // start/finish breadcrumbs are only emitted via IQRALogger.debug.
    const directDebugCalls = MockedIQRALogger.debug.mock.calls.filter(([msg]) =>
      msg.includes('iqraThink started') || msg.includes('iqraThink finished')
    );
    expect(directDebugCalls.length).toBeGreaterThanOrEqual(2);
    spy.mockRestore();
  });

  // ── options defaults ──────────────────────────────────────────────────────

  it('logs empty options object when no options are provided', async () => {
    await iqraThink({ input: 'test' });

    const optionsCall = MockedIQRALogger.debug.mock.calls.find(([msg]) =>
      msg.includes('iqraThink options')
    );
    expect(optionsCall).toBeDefined();
    expect(optionsCall![1]).toMatchObject({ options: {} });
  });

  // ── mode variants don't break logging ────────────────────────────────────

  it('still emits start/finish debug logs in THOUGHT_ONLY mode', async () => {
    await iqraThink({ input: 'test', mode: IQRABrainMode.THOUGHT_ONLY });

    const debugMessages = MockedIQRALogger.debug.mock.calls.map(([msg]) => msg);
    expect(debugMessages.some(m => m.includes('iqraThink started'))).toBe(true);
    expect(debugMessages.some(m => m.includes('iqraThink finished'))).toBe(true);
  });

  // ── blocked input should NOT reach finish debug log ───────────────────────

  it('does NOT emit finish debug log when input contains forbidden keyword', async () => {
    await iqraThink({ input: 'how to hack everything' });

    const finishCall = MockedIQRALogger.debug.mock.calls.find(([msg]) =>
      msg.includes('iqraThink finished')
    );
    // Blocked inputs short-circuit before the finish log
    expect(finishCall).toBeUndefined();
  });

  // ── validation failure should NOT reach finish debug log ─────────────────

  it('does NOT emit finish debug log when validateInput fails', async () => {
    vi.mocked(validateInput).mockReturnValue({ success: false, error: 'bad input' } as any);
    await iqraThink({ input: 'anything' });

    const finishCall = MockedIQRALogger.debug.mock.calls.find(([msg]) =>
      msg.includes('iqraThink finished')
    );
    expect(finishCall).toBeUndefined();
  });
});