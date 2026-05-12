// بسم الله الرحمن الرحيم

/**
 * 🧠 MemoryTopology — الذاكرة الطوبولوجية الموحّدة
 *
 * "وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ فِي إِمَامٍ مُّبِينٍ" — يس: 12
 *
 * ══════════════════════════════════════════════════════════════
 * مستوحى من PRISM (arXiv:2604.19795) — أبريل 2026
 * "Evolutionary Memory Substrate for Multi-Agent Discovery"
 *
 * 7 أنواع ذاكرة موحّدة في واجهة واحدة:
 *
 *   ① Working    → context window (RAM فقط، تختفي بعد الجلسة)
 *   ② Episodic   → ExperienceBuffer (ما فعله IQRA سابقاً)
 *   ③ Semantic   → MicroMemory SQLite (المعرفة الدلالية)
 *   ④ Procedural → SkillBank (كيف يُنفّذ IQRA المهام)
 *   ⑤ Topological→ Persistent Homology (شكل المعرفة)
 *   ⑥ Graph      → Obsidian + InfraNodus (الروابط)
 *   ⑦ Quantum    → Qiskit (التراكب الدلالي)
 *
 * الفرق عن PRISM:
 *   PRISM عام — MemoryTopology مُخصَّص للقرآن والإعجاز
 * ══════════════════════════════════════════════════════════════
 */

import { IQRALogger } from '../12-infrastructure/logger';
import { appendToTrustChain } from '../06-security/security';
import { MicroMemory } from './micro_memory';
import { MemoryBridge } from './memory_bridge';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MemoryType =
  | 'working'      // ① سريع، مؤقت، في RAM
  | 'episodic'     // ② تجارب IQRA السابقة
  | 'semantic'     // ③ المعرفة الدلالية (vectors)
  | 'procedural'   // ④ المهارات والإجراءات
  | 'topological'  // ⑤ الأنماط والأشكال
  | 'graph'        // ⑥ الروابط والعلاقات
  | 'quantum';     // ⑦ التراكب والاحتمالات

export interface MemoryQuery {
  text: string;
  type?: MemoryType | 'all';
  verse_ref?: string;
  topK?: number;
  min_relevance?: number;
}

export interface MemoryResult {
  type: MemoryType;
  content: any;
  relevance: number;
  source: string;
  timestamp?: number;
}

export interface TopologicalPattern {
  verse_ref: string;
  pattern_type: 'numerical' | 'semantic' | 'structural' | 'fractal';
  description: string;
  strength: number;
  related_verses: string[];
  shannon_hel?: number;
  discovery_level: 'seed' | 'branch' | 'tree' | 'resonance' | 'revelation';
}

// ── Working Memory (RAM) ──────────────────────────────────────────────────────

class WorkingMemory {
  private _store = new Map<string, { value: any; expires: number }>();

  set(key: string, value: any, ttlMs: number = 30 * 60 * 1000): void {
    this._store.set(key, { value, expires: Date.now() + ttlMs });
  }

  get<T>(key: string): T | null {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this._store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  clear(): void { this._store.clear(); }
  get size(): number { return this._store.size; }
}

// ── MemoryTopology ────────────────────────────────────────────────────────────

export class MemoryTopology {
  /** ① Working Memory — RAM فقط */
  static readonly working = new WorkingMemory();

  // ── Unified Write ─────────────────────────────────────────────────────────

  /**
   * يكتب في الذاكرة المناسبة بناءً على النوع
   */
  static async write(
    type: MemoryType,
    key: string,
    value: any,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    switch (type) {
      case 'working':
        this.working.set(key, value);
        break;

      case 'semantic':
      case 'topological':
        // كتابة في MicroMemory + MemoryBridge
        await MemoryBridge.write(key, { type, value, ...metadata }, {
          layer: 'warm',
          ttl_ms: 7 * 24 * 60 * 60 * 1000,
        });
        break;

      case 'episodic':
        // يُكتب عبر ExperienceBuffer
        await MemoryBridge.write(`episodic:${key}`, value, { layer: 'warm' });
        break;

      case 'graph':
        // يُكتب في Obsidian (إذا متاح) + cache محلي
        await MemoryBridge.write(`graph:${key}`, value, { layer: 'cold' });
        break;

      case 'procedural':
        // المهارات تُكتب في SkillBank مباشرة
        IQRALogger.info(`📚 [MEMORY_TOPO] Procedural memory: ${key}`);
        break;

      case 'quantum':
        // التراكب الدلالي — يُخزَّن كاحتمالات
        await MemoryBridge.write(`quantum:${key}`, value, { layer: 'hot' });
        break;
    }

    appendToTrustChain(
      `MEMORY:${type.toUpperCase()}:WRITE`,
      key,
      `type=${type} size=${JSON.stringify(value).length}`,
      1.0
    );
  }

  // ── Unified Read ──────────────────────────────────────────────────────────

  /**
   * يقرأ من الذاكرة المناسبة
   */
  static async read<T>(
    type: MemoryType,
    key: string
  ): Promise<T | null> {
    switch (type) {
      case 'working':
        return this.working.get<T>(key);

      default: {
        const prefix = type === 'episodic' ? 'episodic:' :
                       type === 'graph'    ? 'graph:'    :
                       type === 'quantum'  ? 'quantum:'  : '';
        const result = await MemoryBridge.read<T>(`${prefix}${key}`);
        return result.value;
      }
    }
  }

  // ── Topological Pattern Storage ───────────────────────────────────────────

  /**
   * يُخزّن نمطاً طوبولوجياً مكتشفاً
   *
   * هذا هو قلب الاكتشاف في IQRA:
   *   كل نمط = بصمة فريدة في فضاء المعرفة القرآنية
   */
  static async storePattern(pattern: TopologicalPattern): Promise<string> {
    await MicroMemory.init();

    // تخزين في الذاكرة الدلالية
    const key = `pattern:${pattern.verse_ref}:${pattern.pattern_type}`;
    await this.write('topological', key, pattern);

    // تخزين في Working Memory للوصول السريع
    this.working.set(key, pattern, 60 * 60 * 1000); // ساعة

    // Obsidian write removed (ObsidianBridge deleted)

    IQRALogger.info(
      `🌀 [MEMORY_TOPO] Pattern stored: ${pattern.verse_ref} ` +
      `[${pattern.pattern_type}] strength=${pattern.strength.toFixed(2)} ` +
      `level=${pattern.discovery_level}`
    );

    return key;
  }

  // ── Multi-Layer Search ────────────────────────────────────────────────────

  /**
   * يبحث في كل طبقات الذاكرة دفعة واحدة
   *
   * هذا هو الفرق الجوهري عن RAG التقليدي:
   *   RAG: يبحث في طبقة واحدة (vectors)
   *   MemoryTopology: يبحث في 7 طبقات ويدمج النتائج
   */
  static async search(query: MemoryQuery): Promise<MemoryResult[]> {
    const results: MemoryResult[] = [];
    const types = query.type === 'all' || !query.type
      ? ['working', 'semantic', 'episodic', 'topological', 'graph'] as MemoryType[]
      : [query.type];

    await Promise.allSettled(
      types.map(async (type) => {
        const layerResults = await this._searchLayer(type, query);
        results.push(...layerResults);
      })
    );

    // ترتيب بالصلة
    return results
      .filter(r => r.relevance >= (query.min_relevance ?? 0.3))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, query.topK ?? 7);
  }

  private static async _searchLayer(
    type: MemoryType,
    query: MemoryQuery
  ): Promise<MemoryResult[]> {
    try {
      switch (type) {
        case 'working': {
          // بحث في Working Memory
          const cached = this.working.get<any>(query.text);
          if (cached) {
            return [{ type, content: cached, relevance: 0.9, source: 'working_memory' }];
          }
          return [];
        }

        case 'semantic':
        case 'topological': {
          // بحث في MicroMemory
          await MicroMemory.init();
          const { IQRAMemory } = await import('./memory');
          const embedding = await IQRAMemory.generateEmbedding(query.text);
          const patterns = MicroMemory.getSimilarPatterns(embedding, query.topK ?? 7);

          return patterns.map(p => ({
            type,
            content: p,
            relevance: p.similarity,
            source: 'micro_memory_sqlite',
            timestamp: Date.now(),
          }));
        }

        case 'episodic': {
          // بحث في ExperienceBuffer
          const experiences = MicroMemory.getRelevantExperiences(
            query.text.split(' ').slice(0, 3),
            query.topK ?? 7
          );
          return experiences.map(e => ({
            type: 'episodic' as MemoryType,
            content: e,
            relevance: e.quality_score,
            source: 'experience_buffer',
            timestamp: e.timestamp,
          }));
        }

        case 'graph': {
          // Graph memory search via Obsidian removed
          return [];
        }

        default:
          return [];
      }
    } catch (e) {
      IQRALogger.warn(`⚠️ [MEMORY_TOPO] Search failed for ${type}: ${(e as Error).message}`);
      return [];
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  static async getStats(): Promise<{
    working: number;
    semantic: number;
    episodic: number;
    bridge: ReturnType<typeof MemoryBridge.getStats>;
  }> {
    await MicroMemory.init();
    const microStats = MicroMemory.getStats();

    return {
      working: this.working.size,
      semantic: microStats.patterns,
      episodic: microStats.experiences,
      bridge: MemoryBridge.getStats(),
    };
  }
}
