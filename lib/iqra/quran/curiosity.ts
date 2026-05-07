/**
 * 🌀 Curiosity Engine | محرك الفضول
 * "وَفِي أَنفُسِكُمْ ۚ أَفَلَا تُبْصِرُونَ" — الذاريات: 21
 *
 * Proxy موحّد لـ TopologicalCuriosityEngine.
 * يدعم بيئتين:
 *   - Cloudflare Workers: عبر explore() مع VectorEngine
 *   - Node.js / Mission Pipeline: عبر discoverResonance() بدون env
 */

import { IQRALogger } from '../logger.ts';
import {
  TopologicalCuriosity,
  TopologicalCuriosityEngine,
  type TopologicalResonance,
  type CuriosityDiscovery,
  type ResonanceType,
} from './topological_curiosity.ts';
import { VectorEngine } from './vector_engine.ts';
import { IQRAMemory } from '../memory.ts';

export type { CuriosityDiscovery, TopologicalResonance, ResonanceType };

export class CuriosityEngine {
  // ── للاستخدام في Mission Pipeline (Node.js) ───────────────────────────────
  /**
   * يكتشف الرنين بين آية ومجال بحث.
   * لا يحتاج Cloudflare env — يعمل في Node.js مباشرة.
   */
  static async discoverResonance(
    verse: string,
    field: string,
    env?: any
  ): Promise<TopologicalResonance | null> {
    IQRALogger.info(`🌀 [CURIOSITY] discoverResonance: ${verse} × ${field}`);
    return TopologicalCuriosityEngine.discoverResonance(verse, field, env);
  }

  // ── للاستخدام في Cloudflare Workers ──────────────────────────────────────
  /**
   * يستكشف الرنين مع VectorEngine (يحتاج Cloudflare env).
   */
  static async explore(
    input: string,
    env: any,
    sessionId: string = 'global'
  ): Promise<CuriosityDiscovery | null> {
    IQRALogger.info(`🌀 [CURIOSITY] Session [${sessionId}] exploring: ${input.substring(0, 50)}...`);
    try {
      const vectorEngine = new VectorEngine(env);
      const memory = new IQRAMemory();
      const engine = new TopologicalCuriosity(vectorEngine, memory);
      return await engine.explore(input);
    } catch (err: any) {
      IQRALogger.warn(`⚠️ [CURIOSITY] Exploration failed: ${err.message}`);
      return null;
    }
  }
}
