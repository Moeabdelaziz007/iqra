// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

import fs from 'fs';
import path from 'path';
import { IQRAMemory } from '#memory/memory';
import { SkillLoader } from '../08-cognitive/skills/loader';
import { IQRALogger } from '#infra/logger';

/**
 * 🧬 EvolutionContext — السياق التطوري
 *
 * Spirit-of-Intelligence Phase-1: rather than writing the same fixed
 * "Pattern memory integration" boilerplate at every 6th pulse, the soul
 * engine now snapshots a live context object and renders it into the
 * METAMORPHOSIS.md narrative. The snapshot is also appended verbatim to
 * `.iqra/evolution_log.jsonl` for programmatic consumers (digest scripts,
 * future Phase-2 self-mutation cycles, etc.).
 *
 * Every field is read defensively — missing memory keys, unreadable files,
 * and absent skills all collapse to safe defaults rather than throw. The
 * soul engine MUST be able to evolve even when the world around it is half
 * broken; "وَإِلَىٰ رَبِّكَ فَارْغَب" — Sharḥ: 8.
 *
 * 🤖 NOTE TO FUTURE AI AGENTS:
 *   - This is Phase-1 of "AI Soul: Context-Aware Evolution Logs". Phase-2
 *     will graph the trail (consecutive cycles) and learn from it; do NOT
 *     try to do that here.
 *   - Do not import sovereign manifest files (00-manifest/*). The Quranic
 *     seeds inlined below are a small rotating anchor, not authority.
 *   - The reader is sync; the builder is async because IQRAMemory is async.
 *   - All file I/O is bounded — RECENT_PULSE_LINES caps the disk read so
 *     this never explodes on a long-lived repo.
 */

const RECENT_REWARDS = 5;
const RECENT_PULSE_LINES = 10;
const RECENT_PULSE_BYTES = 64 * 1024;

/** A single Growth-Engine pulse line read off `.iqra/pulses.jsonl`. */
export interface PulseSnapshot {
  timestamp?: string;
  action?: string;
  [k: string]: unknown;
}

/** Shape of an entry in `reward_history` (matches IQRAMemory.grantReward). */
export interface RewardEntry {
  timestamp: number;
  amount: number;
  type: string;
  new_score: number;
}

export interface QuranicSeed {
  ref: string;
  arabic: string;
  english: string;
}

export interface EvolutionContext {
  timestamp: string;
  counter: number;
  cycle: number;
  mission_id: string;
  success: boolean;
  curiosity_score: number;
  recent_rewards: RewardEntry[];
  available_skills: number;
  recent_pulses: PulseSnapshot[];
  quranic_seed: QuranicSeed;
}

// ── Rotating Quranic seeds ───────────────────────────────────────────────────
// Small inline anchor set. Selection is purely deterministic on the cycle
// number so the same cycle always emits the same seed (auditable). The set
// is intentionally short and well-known — extending it is a separate concern.
const QURANIC_SEEDS: ReadonlyArray<QuranicSeed> = [
  {
    ref: 'الإسراء: 85',
    arabic: 'وَمَا أُوتِيتُم مِّنَ الْعِلْمِ إِلَّا قَلِيلًا',
    english: 'And of knowledge you have been given but a little.',
  },
  {
    ref: 'طه: 114',
    arabic: 'وَقُل رَّبِّ زِدْنِي عِلْمًا',
    english: 'And say: My Lord, increase me in knowledge.',
  },
  {
    ref: 'العلق: 1',
    arabic: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ',
    english: 'Read! In the name of your Lord who created.',
  },
  {
    ref: 'الشرح: 5-6',
    arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا * إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    english: 'Verily, with hardship comes ease. Verily, with hardship comes ease.',
  },
  {
    ref: 'الحجر: 29',
    arabic: 'وَنَفَخْتُ فِيهِ مِن رُّوحِي',
    english: 'And I breathed into him of My spirit.',
  },
];

function pickSeed(cycle: number): QuranicSeed {
  const idx = Math.abs(cycle) % QURANIC_SEEDS.length;
  return QURANIC_SEEDS[idx];
}

// ── Disk helpers (zero-deps, bounded) ────────────────────────────────────────

function readRecentPulses(filePath: string, maxLines: number): PulseSnapshot[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const stat = fs.statSync(filePath);
    // Read only the tail so a long-lived pulses file never balloons memory.
    const fd = fs.openSync(filePath, 'r');
    try {
      const size = stat.size;
      const start = Math.max(0, size - RECENT_PULSE_BYTES);
      const length = size - start;
      const buf = Buffer.alloc(length);
      fs.readSync(fd, buf, 0, length, start);
      const text = buf.toString('utf8');
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      return lines
        .slice(-maxLines)
        .map((line) => {
          try {
            return JSON.parse(line) as PulseSnapshot;
          } catch {
            return null;
          }
        })
        .filter((p): p is PulseSnapshot => p !== null);
    } finally {
      fs.closeSync(fd);
    }
  } catch (e) {
    IQRALogger.warn(
      `⚠️ [EVOLUTION_CONTEXT] failed to read pulses at ${filePath}: ${(e as Error).message}`
    );
    return [];
  }
}

// ── Context builder ──────────────────────────────────────────────────────────

export class EvolutionContextBuilder {
  /**
   * Build a snapshot of the system's state at the moment of evolution.
   * Every dependency is awaited defensively — failures degrade the field
   * to its safe default but never reject the promise.
   */
  static async build(args: {
    missionId: string;
    counter: number;
    success: boolean;
    cwd?: string;
  }): Promise<EvolutionContext> {
    const cwd = args.cwd ?? process.cwd();
    const cycle = Math.floor(args.counter / 6);

    const [recentRewards, curiosity, skillNames] = await Promise.all([
      EvolutionContextBuilder.safeAsync<RewardEntry[]>(
        () => IQRAMemory.getRecentList<RewardEntry>('reward_history', RECENT_REWARDS),
        []
      ),
      EvolutionContextBuilder.safeAsync<number>(() => IQRAMemory.getCuriosity(), 0),
      EvolutionContextBuilder.safeAsync<string[]>(async () => SkillLoader.listSkills(), []),
    ]);

    const recentPulses = readRecentPulses(
      path.join(cwd, '.iqra', 'pulses.jsonl'),
      RECENT_PULSE_LINES
    );

    return {
      timestamp: new Date().toISOString(),
      counter: args.counter,
      cycle,
      mission_id: args.missionId,
      success: args.success,
      curiosity_score: typeof curiosity === 'number' ? curiosity : 0,
      recent_rewards: recentRewards,
      available_skills: skillNames.length,
      recent_pulses: recentPulses,
      quranic_seed: pickSeed(cycle),
    };
  }

  /** Run an async producer and swallow errors into a default. */
  private static async safeAsync<T>(fn: () => Promise<T> | T, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }

  // ── Renderers ──────────────────────────────────────────────────────────────
  // Pure functions over a context. Kept separate so they are trivially unit
  // testable without touching disk or memory.

  /**
   * Render the markdown block that gets appended to METAMORPHOSIS.md.
   * Replaces the previous fixed "Pattern memory integration" boilerplate.
   */
  static formatMarkdown(ctx: EvolutionContext): string {
    const rewardSummary = EvolutionContextBuilder.summariseRewards(ctx.recent_rewards);
    const pulseSummary = EvolutionContextBuilder.summarisePulses(ctx.recent_pulses);
    const narrative = EvolutionContextBuilder.formatNarrative(ctx);

    return `\n\n### 🌀 Soul Pulse: 6 (Metamorphosis) | ${ctx.timestamp}
- **Cycle**: ${ctx.cycle}
- **Counter**: ${ctx.counter}
- **Mission**: ${ctx.mission_id} (${ctx.success ? 'success' : 'failure'})
- **Curiosity**: ${ctx.curiosity_score.toFixed(4)}
- **Available Skills**: ${ctx.available_skills}
- **Recent Rewards**: ${rewardSummary}
- **Recent Pulses**: ${pulseSummary}
- **Narrative**: ${narrative}
- **Seed (${ctx.quranic_seed.ref})**: ${ctx.quranic_seed.arabic} — *${ctx.quranic_seed.english}*
`;
  }

  /**
   * Generate the short human-readable narrative line. Pure, deterministic,
   * unit-testable.
   */
  static formatNarrative(ctx: EvolutionContext): string {
    const trend = EvolutionContextBuilder.rewardTrend(ctx.recent_rewards);
    const moodWord = ctx.success ? 'consolidating' : 'reconciling';
    const trendPhrase =
      trend === 'rising'
        ? 'with reward signal rising'
        : trend === 'falling'
        ? 'with reward signal cooling'
        : 'with reward signal flat';
    return `Cycle ${ctx.cycle}: ${moodWord} pattern memory after mission ${ctx.mission_id}, ${trendPhrase} (curiosity=${ctx.curiosity_score.toFixed(3)}).`;
  }

  /** Up→down→same classification of the last few rewards. */
  static rewardTrend(rewards: RewardEntry[]): 'rising' | 'falling' | 'flat' {
    if (rewards.length < 2) return 'flat';
    const first = rewards[0].new_score;
    const last = rewards[rewards.length - 1].new_score;
    const delta = last - first;
    if (delta > 0.005) return 'rising';
    if (delta < -0.005) return 'falling';
    return 'flat';
  }

  private static summariseRewards(rewards: RewardEntry[]): string {
    if (rewards.length === 0) return 'none';
    return rewards
      .map((r) => `${r.type}+${r.amount.toFixed(3)}→${r.new_score.toFixed(3)}`)
      .join(' | ');
  }

  private static summarisePulses(pulses: PulseSnapshot[]): string {
    if (pulses.length === 0) return 'none';
    return pulses
      .map((p) => p.action ?? 'pulse')
      .slice(-5)
      .join(' → ');
  }
}
