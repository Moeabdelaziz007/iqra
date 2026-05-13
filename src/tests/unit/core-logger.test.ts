// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * Tests for core.ts (AgentCore): verifies that IQRALogger is used
 * instead of console.* for the three call-sites changed in this PR:
 *
 *   1. istikharah()  → IQRALogger.error when IQRAFilter rejects input
 *   2. basmalah()    → IQRALogger.info('بسم الله الرحمن الرحيم')
 *   3. execute()     → IQRALogger.error('Voice failed', { err }) on voice error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── module mocks ─────────────────────────────────────────────────────────────

vi.mock('#infra/logger', () => ({
  IQRALogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('#memory/memory', () => ({
  IQRAMemory: {
    softReset: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('#security/filter', () => ({
  IQRAFilter: {
    validate: vi.fn().mockResolvedValue({ isAllowed: true }),
  },
}));

vi.mock('#utils/voice', () => ({
  IQRAVoice: {
    speak: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('#core/shura', () => ({
  ShuraProtocol: {
    request: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('#core/tawbah', () => ({
  TAWBAH: {
    perform: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('#core/brain', () => ({
  iqraThink: vi.fn().mockResolvedValue({ response: 'ok response', provider: 'test' }),
  IQRABrainMode: {
    FAST_RESPONSE: 'FAST_RESPONSE',
    THOUGHT_ONLY: 'THOUGHT_ONLY',
    DEEP_ANALYSIS: 'DEEP_ANALYSIS',
    DEEP_THINKING: 'DEEP_THINKING',
    LOCAL_SKILL: 'LOCAL_SKILL',
    QURAN_ANALYSIS: 'QURAN_ANALYSIS',
  },
}));

vi.mock('#utils/style', () => ({
  applyIQRAStyle: vi.fn((s: string) => s),
}));

vi.mock('#core/constants', () => ({
  DASTUR: {},
  MURAQABAH: {},
}));

// ──────────────────────────────────────────────────────────────────────────────

import { IQRALogger } from '#infra/logger';
import { AgentCore } from '#core/core';
import { IQRAFilter } from '#security/filter';
import { IQRAVoice } from '#utils/voice';
import { IQRABrainMode } from '#core/brain';

const MockedIQRALogger = vi.mocked(IQRALogger);

describe('AgentCore: IQRALogger integration (PR: route console.* through IQRALogger)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default happy-path mocks
    vi.mocked(IQRAFilter.validate).mockResolvedValue({ isAllowed: true } as any);
    vi.mocked(IQRAVoice.speak).mockResolvedValue(undefined);
  });

  // ── basmalah: IQRALogger.info ─────────────────────────────────────────────

  it('calls IQRALogger.info with the basmala when execution proceeds', async () => {
    await AgentCore.execute('test input');

    const infoCalls = MockedIQRALogger.info.mock.calls;
    const basmalahCall = infoCalls.find(([msg]) =>
      msg.includes('بسم الله الرحمن الرحيم')
    );
    expect(basmalahCall).toBeDefined();
  });

  it('does NOT call console.log for the basmala (uses IQRALogger.info instead)', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await AgentCore.execute('test input');

    // console.log may be called by IQRALogger internals; check the specific
    // message that used to be console.log('بسم الله الرحمن الرحيم') is absent
    // from any direct call that bypasses IQRALogger.
    const basmalahLogCall = consoleSpy.mock.calls.find(([msg]) =>
      typeof msg === 'string' && msg === 'بسم الله الرحمن الرحيم'
    );
    // Direct console.log with that exact literal should not exist (IQRALogger
    // wraps it with a formatted prefix like [INFO]).
    expect(basmalahLogCall).toBeUndefined();
    consoleSpy.mockRestore();
  });

  // ── istikharah: IQRALogger.error when rejected ────────────────────────────

  it('calls IQRALogger.error with reason when IQRAFilter rejects input', async () => {
    vi.mocked(IQRAFilter.validate).mockResolvedValue({
      isAllowed: false,
      reason: 'forbidden content',
    } as any);

    await expect(AgentCore.execute('bad input')).rejects.toThrow('ISTIKHARAH_FAILED');

    const errorCalls = MockedIQRALogger.error.mock.calls;
    const fitrahCall = errorCalls.find(([msg]) => msg.includes('FITRAH'));
    expect(fitrahCall).toBeDefined();
    expect(fitrahCall![1]).toMatchObject({ reason: 'forbidden content' });
  });

  it('includes the rejection reason in the IQRALogger.error meta object', async () => {
    const reason = 'violates IQRA ethics';
    vi.mocked(IQRAFilter.validate).mockResolvedValue({ isAllowed: false, reason } as any);

    await expect(AgentCore.execute('bad')).rejects.toThrow();

    const errorCall = MockedIQRALogger.error.mock.calls.find(([msg]) =>
      msg.includes('FITRAH')
    );
    expect(errorCall![1].reason).toBe(reason);
  });

  it('does NOT call IQRALogger.error for FITRAH when input is allowed', async () => {
    vi.mocked(IQRAFilter.validate).mockResolvedValue({ isAllowed: true } as any);

    await AgentCore.execute('good input');

    const fitrahErrors = MockedIQRALogger.error.mock.calls.filter(([msg]) =>
      msg.includes('FITRAH')
    );
    expect(fitrahErrors).toHaveLength(0);
  });

  // ── voice failure: IQRALogger.error ──────────────────────────────────────

  it('calls IQRALogger.error("Voice failed") when IQRAVoice.speak rejects', async () => {
    const voiceError = new Error('TTS unavailable');
    vi.mocked(IQRAVoice.speak).mockRejectedValue(voiceError);

    await AgentCore.execute('input', IQRABrainMode.FAST_RESPONSE as any);

    // Voice errors are caught asynchronously; wait a tick for the rejection to propagate
    await new Promise(resolve => setTimeout(resolve, 0));

    const voiceErrorCall = MockedIQRALogger.error.mock.calls.find(([msg]) =>
      msg.includes('Voice failed')
    );
    expect(voiceErrorCall).toBeDefined();
    expect(voiceErrorCall![1]).toMatchObject({ err: voiceError });
  });

  it('does NOT call IQRALogger.error for voice when mode is not FAST_RESPONSE', async () => {
    const voiceError = new Error('TTS unavailable');
    vi.mocked(IQRAVoice.speak).mockRejectedValue(voiceError);

    await AgentCore.execute('input', IQRABrainMode.THOUGHT_ONLY as any);

    await new Promise(resolve => setTimeout(resolve, 0));

    const voiceErrorCall = MockedIQRALogger.error.mock.calls.find(([msg]) =>
      msg.includes('Voice failed')
    );
    // speak is only triggered in FAST_RESPONSE mode
    expect(voiceErrorCall).toBeUndefined();
  });

  it('does NOT call console.error directly for voice failure', async () => {
    const voiceError = new Error('TTS unavailable');
    vi.mocked(IQRAVoice.speak).mockRejectedValue(voiceError);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await AgentCore.execute('input', IQRABrainMode.FAST_RESPONSE as any);
    await new Promise(resolve => setTimeout(resolve, 0));

    // The raw string 'Voice failed:' was the old console.error message; it should not appear
    const directVoiceError = consoleSpy.mock.calls.find(
      ([msg]) => typeof msg === 'string' && msg === 'Voice failed:'
    );
    expect(directVoiceError).toBeUndefined();
    consoleSpy.mockRestore();
  });
});