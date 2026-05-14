// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * Unit tests for the pure renderers in EvolutionContextBuilder. Focuses on
 * the formatMarkdown / formatNarrative / rewardTrend helpers, which take a
 * fully-built EvolutionContext and produce deterministic strings — so the
 * tests do not need to touch disk or IQRAMemory.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('#infra/logger', () => ({
  IQRALogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  EvolutionContext,
  EvolutionContextBuilder,
  RewardEntry,
} from '../../lib/iqra/01-core/evolution_context';

function ctx(overrides: Partial<EvolutionContext> = {}): EvolutionContext {
  return {
    timestamp: '2026-05-14T00:00:00.000Z',
    counter: 12,
    cycle: 2,
    mission_id: 'mission/test-1',
    success: true,
    curiosity_score: 0.5,
    recent_rewards: [],
    available_skills: 7,
    recent_pulses: [],
    quranic_seed: {
      ref: 'طه: 114',
      arabic: 'وَقُل رَّبِّ زِدْنِي عِلْمًا',
      english: 'And say: My Lord, increase me in knowledge.',
    },
    ...overrides,
  };
}

function reward(amount: number, newScore: number, type = 'direct'): RewardEntry {
  return { timestamp: 0, amount, type, new_score: newScore };
}

describe('EvolutionContextBuilder.rewardTrend', () => {
  it('returns "flat" when fewer than 2 rewards are supplied', () => {
    expect(EvolutionContextBuilder.rewardTrend([])).toBe('flat');
    expect(EvolutionContextBuilder.rewardTrend([reward(0.1, 0.4)])).toBe('flat');
  });

  it('classifies a rising new_score series as "rising"', () => {
    const trend = EvolutionContextBuilder.rewardTrend([
      reward(0.1, 0.30),
      reward(0.1, 0.40),
      reward(0.1, 0.55),
    ]);
    expect(trend).toBe('rising');
  });

  it('classifies a falling new_score series as "falling"', () => {
    const trend = EvolutionContextBuilder.rewardTrend([
      reward(0.1, 0.60),
      reward(0.1, 0.40),
      reward(0.1, 0.35),
    ]);
    expect(trend).toBe('falling');
  });

  it('treats sub-epsilon drift as "flat"', () => {
    const trend = EvolutionContextBuilder.rewardTrend([
      reward(0.1, 0.500),
      reward(0.1, 0.501),
    ]);
    expect(trend).toBe('flat');
  });
});

describe('EvolutionContextBuilder.formatNarrative', () => {
  it('uses "consolidating" wording for a successful mission', () => {
    const out = EvolutionContextBuilder.formatNarrative(ctx({ success: true }));
    expect(out).toContain('consolidating pattern memory');
  });

  it('uses "reconciling" wording for a failed mission', () => {
    const out = EvolutionContextBuilder.formatNarrative(ctx({ success: false }));
    expect(out).toContain('reconciling pattern memory');
  });

  it('references the cycle, mission id, and curiosity score', () => {
    const out = EvolutionContextBuilder.formatNarrative(
      ctx({ cycle: 4, mission_id: 'mission/quran-batch', curiosity_score: 0.7321 })
    );
    expect(out).toContain('Cycle 4');
    expect(out).toContain('mission/quran-batch');
    expect(out).toContain('curiosity=0.732');
  });
});

describe('EvolutionContextBuilder.formatMarkdown', () => {
  it('produces a Soul Pulse 6 block with all context fields rendered', () => {
    const out = EvolutionContextBuilder.formatMarkdown(
      ctx({
        counter: 12,
        cycle: 2,
        mission_id: 'mission/test-1',
        success: true,
        curiosity_score: 0.5,
        recent_rewards: [reward(0.1, 0.4), reward(0.1, 0.55)],
        available_skills: 7,
        recent_pulses: [
          { timestamp: 't', action: 'self-heal' },
          { timestamp: 't', action: 'auto-index' },
        ],
      })
    );

    // Header
    expect(out).toContain('### 🌀 Soul Pulse: 6 (Metamorphosis)');
    // Live context values
    expect(out).toContain('**Cycle**: 2');
    expect(out).toContain('**Counter**: 12');
    expect(out).toContain('**Mission**: mission/test-1 (success)');
    expect(out).toContain('**Curiosity**: 0.5000');
    expect(out).toContain('**Available Skills**: 7');
    // Reward summary contains amount + new_score
    expect(out).toContain('direct+0.100→0.400');
    // Pulse summary is a left-to-right arrow chain
    expect(out).toContain('self-heal → auto-index');
    // Quranic seed gets both Arabic and English lines
    expect(out).toContain('طه: 114');
    expect(out).toContain('My Lord, increase me in knowledge');
    // Narrative is embedded
    expect(out).toContain('consolidating pattern memory after mission mission/test-1');
  });

  it('falls back to "none" for empty reward and pulse lists', () => {
    const out = EvolutionContextBuilder.formatMarkdown(ctx());
    expect(out).toContain('**Recent Rewards**: none');
    expect(out).toContain('**Recent Pulses**: none');
  });
});
