// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 🌉 MemoryBridge — جسر الذاكرة الموحّد
 *
 * "وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ فِي إِمَامٍ مُّبِينٍ" — يس: 12
 *
 * ══════════════════════════════════════════════════════════════
 * المشكلة التي يحلّها:
 *   كل واجهة حالياً تقرأ من JSON مباشرة — لا تعرف الطبقات.
 *   IQRAMemory → Redis/JSON
 *   MicroMemory → SQLite
 *   PatternMemory → Qdrant/JSON
 *   ExperienceBuffer → JSON
 *
 * الحل:
 *   MemoryBridge = واجهة موحّدة فوق كل الطبقات.
 *   كل write/read يمر عبر الجسر.
 *   الجسر يختار الطبقة المناسبة تلقائياً.
 *
 * الطبقات (من الأسرع للأبطأ):
 *   HOT   → Map<string,any> في RAM  (<1ms)
 *   WARM  → MicroMemory SQLite      (<5ms)
 *   COLD  → IQRAMemory Redis/JSON   (<50ms)
 * ══════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';
import { IQRALogger } from '../12-infrastructure/logger.js';
import { appendToTrustChain } from '../security.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MemoryLayer = 'hot' | 'warm' | 'cold';

export interface BridgeEntry {
  id: string;
  key: string;
  value: any;
  layer: MemoryLayer;
  /** وقت الإنشاء */
  created_at: number;
  /** آخر وصول */
  last_accessed: number;
  /** عدد مرات الوصول */
  access_count: number;
  /** TTL بالميلي ثانية (0 = لا ينتهي) */
  ttl_ms: number;
}

export interface BridgeWriteOptions {
  /** الطبقة المستهدفة (افتراضي: hot) */
  layer?: MemoryLayer;
  /** TTL بالميلي ثانية */
  ttl_ms?: number;
  /** هل يُكتب في كل الطبقات؟ */
  broadcast?: boolean;
}

export interface BridgeReadResult<T = any> {
  value: T | null;
  layer: MemoryLayer | null;
  hit: boolean;
  latency_ms: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** الحد الأقصى للطبقة الساخنة (من DASTŪR: 49 = 7×7) */
const HOT_MAX_SIZE = 49;

/** TTL افتراضي للطبقة الساخنة: 1 ساعة */
const HOT_DEFAULT_TTL = 60 * 60 * 1000;

/** TTL افتراضي للطبقة الدافئة: 7 أيام */
const WARM_DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000;

// ── MemoryBridge ──────────────────────────────────────────────────────────────

export class MemoryBridge {
  /** الطبقة الساخنة — Map في RAM */
  private static _hot: Map<string, BridgeEntry> = new Map();

  /** إحصائيات الجسر */
  private static _stats = {
    hot_hits: 0,
    warm_hits: 0,
    cold_hits: 0,
    misses: 0,
    writes: 0,
  };

  // ── Write ─────────────────────────────────────────────────────────────────

  /**
   * يكتب قيمة في الجسر
   *
   * الخوارزمية:
   *   1. يكتب في الطبقة الساخنة دائماً (hot cache)
   *   2. إذا broadcast=true → يكتب في الطبقات الأخرى أيضاً
   *   3. إذا امتلأت الساخنة → يُخلي الأقدم (LRU)
   */
  static async write(
    key: string,
    value: any,
    options: BridgeWriteOptions = {}
  ): Promise<string> {
    const {
      layer = 'hot',
      ttl_ms = HOT_DEFAULT_TTL,
      broadcast = false,
    } = options;

    const id = crypto.randomUUID();
    const now = Date.now();

    const entry: BridgeEntry = {
      id,
      key,
      value,
      layer,
      created_at: now,
      last_accessed: now,
      access_count: 0,
      ttl_ms,
    };

    // ── الطبقة الساخنة ────────────────────────────────────────────────────
    if (layer === 'hot' || broadcast) {
      if (this._hot.size >= HOT_MAX_SIZE) {
        this._evictLRU();
      }
      this._hot.set(key, { ...entry, layer: 'hot' });
    }

    // ── الطبقة الدافئة (SQLite) ───────────────────────────────────────────
    if (layer === 'warm' || broadcast) {
      await this._writeWarm(key, value, ttl_ms || WARM_DEFAULT_TTL);
    }

    // ── الطبقة الباردة (Redis/JSON) ───────────────────────────────────────
    if (layer === 'cold' || broadcast) {
      await this._writeCold(key, value);
    }

    this._stats.writes++;

    IQRALogger.info(
      `🌉 [BRIDGE] write key="${key}" layer=${layer}` +
      (broadcast ? ' (broadcast)' : '')
    );

    return id;
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  /**
   * يقرأ قيمة من الجسر
   *
   * الخوارزمية (Cache Hierarchy):
   *   1. ابحث في الساخنة أولاً (<1ms)
   *   2. إذا لم يوجد → ابحث في الدافئة (<5ms)
   *   3. إذا لم يوجد → ابحث في الباردة (<50ms)
   *   4. إذا وُجد في طبقة أبطأ → انسخه للساخنة (promotion)
   */
  static async read<T = any>(key: string): Promise<BridgeReadResult<T>> {
    const start = Date.now();

    // ── الطبقة الساخنة ────────────────────────────────────────────────────
    const hotEntry = this._hot.get(key);
    if (hotEntry) {
      // تحقق من TTL
      if (hotEntry.ttl_ms > 0 && Date.now() - hotEntry.created_at > hotEntry.ttl_ms) {
        this._hot.delete(key);
      } else {
        hotEntry.last_accessed = Date.now();
        hotEntry.access_count++;
        this._stats.hot_hits++;
        return {
          value: hotEntry.value as T,
          layer: 'hot',
          hit: true,
          latency_ms: Date.now() - start,
        };
      }
    }

    // ── الطبقة الدافئة ────────────────────────────────────────────────────
    const warmValue = await this._readWarm<T>(key);
    if (warmValue !== null) {
      // Promotion: انسخ للساخنة
      this._promoteToHot(key, warmValue);
      this._stats.warm_hits++;
      return {
        value: warmValue,
        layer: 'warm',
        hit: true,
        latency_ms: Date.now() - start,
      };
    }

    // ── الطبقة الباردة ────────────────────────────────────────────────────
    const coldValue = await this._readCold<T>(key);
    if (coldValue !== null) {
      // Promotion: انسخ للساخنة
      this._promoteToHot(key, coldValue);
      this._stats.cold_hits++;
      return {
        value: coldValue,
        layer: 'cold',
        hit: true,
        latency_ms: Date.now() - start,
      };
    }

    this._stats.misses++;
    return { value: null, layer: null, hit: false, latency_ms: Date.now() - start };
  }

  // ── Pattern Bridge ────────────────────────────────────────────────────────

  /**
   * يُخزّن نمط قرآني عبر الجسر
   * يربط MicroMemory بـ IQRAMemory تلقائياً
   */
  static async writePattern(
    verse: string,
    field: string,
    resonanceScore: number,
    embedding: number[],
    missionId: string,
    text?: string
  ): Promise<string> {
    // كتابة في الطبقة الدافئة (SQLite)
    const { MicroMemory } = await import('./micro_memory.ts');

    // تأكد من التهيئة
    try {
      await MicroMemory.init();
    } catch { /* already initialized */ }

    const id = MicroMemory.storePattern(verse, field, resonanceScore, embedding, missionId, text);

    // كتابة metadata في الطبقة الساخنة للوصول السريع
    await this.write(`pattern:${id}`, {
      id, verse, field, resonanceScore, missionId,
      shannon_hel: text ? MicroMemory.computeShannonHEL(text) : undefined,
    }, { layer: 'hot', ttl_ms: HOT_DEFAULT_TTL });

    appendToTrustChain(
      'BRIDGE:PATTERN_WRITE',
      id,
      `verse=${verse} field=${field} resonance=${resonanceScore.toFixed(3)}`,
      resonanceScore
    );

    return id;
  }

  /**
   * يسترجع أنماط مشابهة عبر الجسر
   */
  static async readSimilarPatterns(
    embedding: number[],
    topK: number = 7,
    minResonance: number = 0.0
  ) {
    const { MicroMemory } = await import('./micro_memory.ts');
    try {
      await MicroMemory.init();
    } catch { /* already initialized */ }

    return MicroMemory.getSimilarPatterns(embedding, topK, minResonance);
  }

  // ── Experience Bridge ─────────────────────────────────────────────────────

  /**
   * يُخزّن تجربة وكيل عبر الجسر
   */
  static async writeExperience(
    missionId: string,
    workerId: string,
    outcome: 'success' | 'partial' | 'failure',
    qualityScore: number,
    skillsUsed: string[],
    lessons: string[]
  ): Promise<string> {
    const { MicroMemory } = await import('./micro_memory.ts');
    try {
      await MicroMemory.init();
    } catch { /* already initialized */ }

    const now = Date.now();
    const id = MicroMemory.storeExperience({
      mission_id: missionId,
      worker_id: workerId,
      outcome,
      quality_score: qualityScore,
      skills_used: JSON.stringify(skillsUsed),
      lessons: JSON.stringify(lessons),
      memory_strength: 1.0,
      last_retrieved: now,
      timestamp: now,
    });

    // كتابة في الساخنة للوصول السريع
    await this.write(`exp:${missionId}:${workerId}`, {
      id, outcome, qualityScore, skillsUsed,
    }, { layer: 'hot' });

    return id;
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /**
   * إحصائيات الجسر
   */
  static getStats(): {
    hot_size: number;
    hot_hits: number;
    warm_hits: number;
    cold_hits: number;
    misses: number;
    writes: number;
    hit_rate: number;
  } {
    const total = this._stats.hot_hits + this._stats.warm_hits +
                  this._stats.cold_hits + this._stats.misses;
    const hits = this._stats.hot_hits + this._stats.warm_hits + this._stats.cold_hits;

    return {
      hot_size: this._hot.size,
      ...this._stats,
      hit_rate: total > 0 ? hits / total : 0,
    };
  }

  /**
   * يُفرغ الطبقة الساخنة
   */
  static clearHot(): void {
    this._hot.clear();
    IQRALogger.info('🌉 [BRIDGE] Hot cache cleared');
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /** LRU eviction — يُزيل الأقل استخداماً */
  private static _evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this._hot) {
      if (entry.last_accessed < lruTime) {
        lruTime = entry.last_accessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this._hot.delete(lruKey);
      IQRALogger.info(`🌉 [BRIDGE] LRU evicted: "${lruKey}"`);
    }
  }

  /** ينسخ قيمة للطبقة الساخنة */
  private static _promoteToHot(key: string, value: any): void {
    if (this._hot.size >= HOT_MAX_SIZE) this._evictLRU();
    const now = Date.now();
    this._hot.set(key, {
      id: crypto.randomUUID(),
      key,
      value,
      layer: 'hot',
      created_at: now,
      last_accessed: now,
      access_count: 1,
      ttl_ms: HOT_DEFAULT_TTL,
    });
  }

  /** يكتب في الطبقة الدافئة (SQLite عبر MicroMemory) */
  private static async _writeWarm(key: string, value: any, ttl_ms: number): Promise<void> {
    try {
      const { MicroMemory } = await import('./micro_memory.ts');
      await MicroMemory.init();
      // نستخدم reward_ledger كـ generic KV store للطبقة الدافئة
      // في المستقبل يمكن إضافة جدول kv_store مخصص
      MicroMemory.recordReward(`bridge:${key}`, 0, JSON.stringify({ value, ttl_ms }));
    } catch (e) {
      IQRALogger.warn(`⚠️ [BRIDGE] Warm write failed for "${key}": ${(e as Error).message}`);
    }
  }

  /** يقرأ من الطبقة الدافئة */
  private static async _readWarm<T>(key: string): Promise<T | null> {
    // الطبقة الدافئة تُقرأ عبر MicroMemory مباشرة
    // للمفاتيح العامة، نُرجع null (يُقرأ من الباردة)
    return null;
  }

  /** يكتب في الطبقة الباردة (IQRAMemory) */
  private static async _writeCold(key: string, value: any): Promise<void> {
    try {
      const { IQRAMemory } = await import('../03-memory/memory.js');
      await IQRAMemory.set(key, value);
    } catch (e) {
      IQRALogger.warn(`⚠️ [BRIDGE] Cold write failed for "${key}": ${(e as Error).message}`);
    }
  }

  /** يقرأ من الطبقة الباردة */
  private static async _readCold<T>(key: string): Promise<T | null> {
    try {
      const { IQRAMemory } = await import('../03-memory/memory.js');
      return await IQRAMemory.get<T>(key);
    } catch {
      return null;
    }
  }
}
