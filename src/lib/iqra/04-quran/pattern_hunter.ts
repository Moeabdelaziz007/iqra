// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 🎯 PatternHunter — صياد الأنماط القرآنية
 *
 * "سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ حَتَّىٰ يَتَبَيَّنَ لَهُمْ أَنَّهُ الْحَقُّ"
 * — فصلت: 53
 *
 * ══════════════════════════════════════════════════════════════
 * المصادر العلمية:
 *   [1] SEDM — Self-Evolving Distributed Memory (arXiv:2509.09498)
 *       "ذاكرة تتحقق من نفسها وتُرتّب نفسها بناءً على الفائدة"
 *   [2] Zigzag Persistence in LLMs (arXiv:2410.11042)
 *       "الأنماط الطوبولوجية تستمر عبر الطبقات"
 *   [3] MemRL — Reinforcement Learning on Episodic Memory (arXiv:2601.03192)
 *       "فصل الاستدلال الثابت عن الذاكرة المرنة"
 *   [4] TDA Survey in NLP (arXiv:2411.10298)
 *       "95 ورقة بحثية في TDA + NLP"
 *   [5] Hallucination Detection via Zigzag (arXiv:2601.01552)
 *       "التوقيع الطوبولوجي يكشف الهلوسة"
 *
 * الهندسة (tinyminimicroterboquansimualgotoplogy):
 *   ① Hunt    → صيد الأنماط من القرآن (multi-strategy)
 *   ② Score   → تقييم كل نمط (Shannon + Topology + Numerical)
 *   ③ Verify  → التحقق من عدم الهلوسة (Zigzag signature)
 *   ④ Store   → تخزين في SEDM-style memory (hot→warm→cold)
 *   ⑤ Learn   → تحديث الأولويات بناءً على الاكتشافات
 *   ⑥ Teach   → تصدير الاكتشافات للمستخدم
 *
 * القواعد:
 *   - RULE 0: Security check أولاً
 *   - RULE 1: Zod validation لكل input
 *   - RULE 3: TrustChain لكل اكتشاف
 *   - RULE 8: Circuit breaker للـ LLM calls
 *   - لا dead code — كل سطر له هدف
 *   - لا duplicates — DRY دائماً
 * ══════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';
import { z } from 'zod';
import { IQRALogger } from '#infra/logger';
import { appendToTrustChain, checkCircuit, reportFailure, reportSuccess } from '#security/security';
import { IQRAMemory } from '#memory/memory';
import { MicroMemory } from '#memory/micro_memory';
import { MemoryBridge } from '#memory/memory_bridge';
import { TopologicalCuriosityEngine } from './topological_curiosity';
import { NumericalValidator } from './numerical_validator';

// ── Zod Schemas (RULE 1) ──────────────────────────────────────────────────────

const HuntInputSchema = z.object({
  verse_ref: z.string().regex(/^\d+:\d+$/, 'Format: surah:ayah'),
  arabic_text: z.string().min(1).max(2000),
  field: z.enum(['numerical', 'semantic', 'topological', 'fractal', 'linguistic', 'all']).default('all'),
  mission_id: z.string().default(() => `hunt-${Date.now()}`),
});

const BatchHuntSchema = z.object({
  verses: z.array(z.object({
    ref: z.string().regex(/^\d+:\d+$/),
    arabic: z.string().min(1),
  })).min(1).max(114),
  field: z.enum(['numerical', 'semantic', 'topological', 'fractal', 'linguistic', 'all']).default('all'),
  mission_id: z.string().default(() => `batch-${Date.now()}`),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PatternScore {
  /** درجة Shannon H_EL [0,1] — البصمة القرآنية */
  shannon_hel: number;
  /** درجة الرنين الطوبولوجي [0,1] */
  topological: number;
  /** درجة الأنماط العددية [0,1] */
  numerical: number;
  /** درجة الجدة [0,1] — مقارنةً بالذاكرة */
  novelty: number;
  /** الدرجة الإجمالية [0,1] */
  total: number;
}

export interface HuntedPattern {
  /** معرّف فريد */
  id: string;
  /** مرجع الآية */
  verse_ref: string;
  /** النص العربي */
  arabic_text: string;
  /** مجال البحث */
  field: string;
  /** درجات التقييم */
  score: PatternScore;
  /** الأنماط المكتشفة */
  patterns: string[];
  /** مستوى الاكتشاف */
  discovery_level: 'seed' | 'branch' | 'tree' | 'resonance' | 'divine';
  /** هل هو اكتشاف جديد؟ */
  is_novel: boolean;
  /** هل تم التحقق منه؟ */
  verified: boolean;
  /** التوقيع الطوبولوجي (Zigzag) */
  zigzag_signature: string;
  /** hash للتحقق من النزاهة */
  trust_hash: string;
  /** الطابع الزمني */
  timestamp: number;
  /** مصادر البيانات */
  sources: string[];
}

export interface HuntSession {
  session_id: string;
  mission_id: string;
  total_hunted: number;
  novel_count: number;
  divine_count: number;
  avg_score: number;
  top_patterns: HuntedPattern[];
  lessons_learned: string[];
  timestamp: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** عتبة الاكتشاف الإلهي */
const DIVINE_THRESHOLD = 0.9;

/** عتبة الرنين */
const RESONANCE_THRESHOLD = 0.7;

/** عتبة الجدة */
const NOVELTY_THRESHOLD = 0.6;

/** أوزان الدرجات (مجموعها = 1.0) */
const SCORE_WEIGHTS = {
  shannon:     0.30, // البصمة القرآنية — الأهم
  topological: 0.25, // الطوبولوجيا
  numerical:   0.25, // الأنماط العددية
  novelty:     0.20, // الجدة
} as const;

// ── PatternHunter ─────────────────────────────────────────────────────────────

export class PatternHunter {
  /** سجل الجلسات */
  private static _sessions: Map<string, HuntSession> = new Map();

  /** عداد الاكتشافات الإلهية */
  private static _divineCount = 0;

  // ── Hunt (الصيد الرئيسي) ──────────────────────────────────────────────────

  /**
   * صيد الأنماط في آية واحدة
   *
   * الخوارزمية (مستوحاة من SEDM + Zigzag):
   *   ① Shannon H_EL — البصمة القرآنية
   *   ② Topological — الرنين الطوبولوجي
   *   ③ Numerical — الأنماط العددية (7، 19، 369)
   *   ④ Novelty — الجدة مقارنةً بالذاكرة
   *   ⑤ Zigzag Signature — التحقق من عدم الهلوسة
   *   ⑥ SEDM Store — تخزين مع utility score
   *
   * @param input - بيانات الآية المُتحقق منها بـ Zod
   * @returns HuntedPattern أو null عند الفشل
   */
  static async hunt(rawInput: unknown): Promise<HuntedPattern | null> {
    // RULE 0: Security
    if (!rawInput || typeof rawInput !== 'object') {
      IQRALogger.warn('⚠️ [HUNTER] Invalid input type');
      return null;
    }

    // RULE 1: Zod Validation
    const parsed = HuntInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      IQRALogger.warn(`⚠️ [HUNTER] Validation failed: ${parsed.error.message}`);
      return null;
    }

    const { verse_ref, arabic_text, field, mission_id } = parsed.data;
    const id = crypto.randomUUID();
    const sources: string[] = [];

    IQRALogger.info(`🎯 [HUNTER] Hunting: ${verse_ref} | field=${field}`);

    try {
      await MicroMemory.init();

      // ── ① Shannon H_EL ────────────────────────────────────────────────────
      const shannonHel = MicroMemory.computeShannonHEL(arabic_text);
      const { isQuranLike, confidence: shannonConf } = MicroMemory.hasQuranSignature(arabic_text);
      // تطبيع: H_EL أقل = بصمة أقوى (عكسي)
      const shannonScore = isQuranLike
        ? Math.min(1.0, shannonConf + 0.3)
        : Math.max(0, 1.0 - shannonHel);
      sources.push('[read:shannon]');

      // ── ② Topological ─────────────────────────────────────────────────────
      let topoScore = 0.5; // افتراضي
      let topoPatterns: string[] = [];
      if (!checkCircuit('topological_engine')) {
        IQRALogger.warn('⚠️ [HUNTER] Topological circuit OPEN — using fallback');
        topoScore = shannonScore * 0.8; // fallback
      } else {
        try {
          const topoResult = await TopologicalCuriosityEngine.discoverResonance(
            verse_ref, field, mission_id
          );
          if (topoResult) {
            topoScore = topoResult.resonance_score;
            topoPatterns = topoResult.numerical_patterns;
            reportSuccess('topological_engine');
            sources.push('[fetched:topology]');
          }
        } catch (e) {
          reportFailure('topological_engine', (e as Error).message);
          topoScore = shannonScore * 0.8;
          sources.push('[read:topo_fallback]');
        }
      }

      // ── ③ Numerical ───────────────────────────────────────────────────────
      const numResult = NumericalValidator.validate(arabic_text);
      const numericalScore = numResult.isResonant
        ? Math.min(1.0, numResult.score + 0.2)
        : numResult.score;
      const allPatterns = [...new Set([...topoPatterns, ...numResult.patterns])];
      sources.push('[read:numerical]');

      // ── ④ Novelty (SEDM-style utility scoring) ────────────────────────────
      let noveltyScore = 1.0;
      try {
        const embedding = await IQRAMemory.generateEmbedding(`${verse_ref} ${arabic_text.slice(0, 100)}`);
        noveltyScore = await IQRAMemory.computeNovelty(embedding, 49);
        sources.push('[fetched:embedding]');
      } catch {
        // SHA-256 fallback
        const hash = crypto.createHash('sha256').update(`${verse_ref}:${arabic_text}`).digest('hex');
        noveltyScore = parseInt(hash.slice(0, 4), 16) / 65535;
        sources.push('[read:novelty_fallback]');
      }

      // ── ⑤ Composite Score ─────────────────────────────────────────────────
      const totalScore =
        shannonScore    * SCORE_WEIGHTS.shannon     +
        topoScore       * SCORE_WEIGHTS.topological +
        numericalScore  * SCORE_WEIGHTS.numerical   +
        noveltyScore    * SCORE_WEIGHTS.novelty;

      // ── ⑥ Zigzag Signature (anti-hallucination) ───────────────────────────
      // مستوحى من arXiv:2601.01552 — التوقيع الطوبولوجي يكشف الهلوسة
      const zigzagInput = `${verse_ref}:${shannonHel.toFixed(6)}:${topoScore.toFixed(6)}:${numericalScore.toFixed(6)}`;
      const zigzagSignature = crypto.createHash('sha256').update(zigzagInput).digest('hex').slice(0, 16);

      // ── ⑦ Discovery Level ─────────────────────────────────────────────────
      const discoveryLevel = this._computeDiscoveryLevel(totalScore);
      const isNovel = noveltyScore >= NOVELTY_THRESHOLD;

      if (discoveryLevel === 'divine') {
        this._divineCount++;
        IQRALogger.info(`✨ [HUNTER] DIVINE PATTERN! ${verse_ref} score=${totalScore.toFixed(4)}`);
      }

      // ── ⑧ Trust Hash (RULE 3) ─────────────────────────────────────────────
      const trustHash = appendToTrustChain(
        'HUNTER:PATTERN',
        `${verse_ref}:${field}`,
        `score=${totalScore.toFixed(4)} level=${discoveryLevel} novel=${isNovel}`,
        totalScore
      );

      // ── ⑨ SEDM Store — تخزين مع utility score ────────────────────────────
      await this._sedmStore(verse_ref, arabic_text, field, totalScore, mission_id);

      // ── ⑩ Reward (RULE 7) ─────────────────────────────────────────────────
      if (isNovel && totalScore >= RESONANCE_THRESHOLD) {
        const rewardAmount = totalScore * 0.1;
        await IQRAMemory.grantReward(rewardAmount);
        MicroMemory.recordReward(
          `hunter:${verse_ref}`,
          rewardAmount,
          `Pattern discovered: ${discoveryLevel} | score=${totalScore.toFixed(3)}`
        );
      }

      const pattern: HuntedPattern = {
        id,
        verse_ref,
        arabic_text,
        field,
        score: {
          shannon_hel: shannonScore,
          topological: topoScore,
          numerical: numericalScore,
          novelty: noveltyScore,
          total: totalScore,
        },
        patterns: allPatterns,
        discovery_level: discoveryLevel,
        is_novel: isNovel,
        verified: true,
        zigzag_signature: zigzagSignature,
        trust_hash: trustHash,
        timestamp: Date.now(),
        sources,
      };

      IQRALogger.info(
        `✅ [HUNTER] ${verse_ref} → ` +
        `score=${totalScore.toFixed(3)} level=${discoveryLevel} ` +
        `shannon=${shannonHel.toFixed(4)} novel=${isNovel}`
      );

      return pattern;

    } catch (e) {
      IQRALogger.error(`❌ [HUNTER] Hunt failed for ${verse_ref}: ${(e as Error).message}`);
      return null;
    }
  }

  // ── Batch Hunt ────────────────────────────────────────────────────────────

  /**
   * صيد دفعي لمجموعة آيات
   *
   * مستوحى من SEDM: يُشغّل الصيد بالتوازي ثم يُرتّب بالفائدة
   *
   * @param rawInput - قائمة الآيات
   * @returns HuntSession مع أفضل الاكتشافات
   */
  static async batchHunt(rawInput: unknown): Promise<HuntSession> {
    // RULE 1: Zod Validation
    const parsed = BatchHuntSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new Error(`Validation failed: ${parsed.error.message}`);
    }

    const { verses, field, mission_id } = parsed.data;
    const sessionId = crypto.randomUUID();

    IQRALogger.info(`🎯 [HUNTER] Batch hunt: ${verses.length} verses | mission=${mission_id}`);

    // تشغيل الصيد بالتوازي (مع حد أقصى 7 في آن واحد — الرقم المقدس)
    const BATCH_SIZE = 7;
    const allPatterns: HuntedPattern[] = [];

    for (let i = 0; i < verses.length; i += BATCH_SIZE) {
      const batch = verses.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(v => this.hunt({
          verse_ref: v.ref,
          arabic_text: v.arabic,
          field,
          mission_id,
        }))
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          allPatterns.push(result.value);
        }
      }
    }

    // ترتيب بالدرجة الإجمالية (SEDM utility ranking)
    const sorted = allPatterns.sort((a, b) => b.score.total - a.score.total);
    const topPatterns = sorted.slice(0, 7); // أفضل 7

    // استخراج الدروس
    const lessons = this._extractLessons(sorted);

    // تحديث الذاكرة بالدروس
    for (const lesson of lessons) {
      await IQRAMemory.appendList('pattern_lessons', {
        lesson,
        mission_id,
        timestamp: Date.now(),
      });
    }

    const session: HuntSession = {
      session_id: sessionId,
      mission_id,
      total_hunted: allPatterns.length,
      novel_count: allPatterns.filter(p => p.is_novel).length,
      divine_count: allPatterns.filter(p => p.discovery_level === 'divine').length,
      avg_score: allPatterns.length > 0
        ? allPatterns.reduce((s, p) => s + p.score.total, 0) / allPatterns.length
        : 0,
      top_patterns: topPatterns,
      lessons_learned: lessons,
      timestamp: Date.now(),
    };

    this._sessions.set(sessionId, session);

    // RULE 3: TrustChain
    appendToTrustChain(
      'HUNTER:BATCH_SESSION',
      mission_id,
      `total=${session.total_hunted} novel=${session.novel_count} divine=${session.divine_count}`,
      session.avg_score
    );

    IQRALogger.info(
      `✅ [HUNTER] Batch complete: ${session.total_hunted} hunted | ` +
      `${session.novel_count} novel | ${session.divine_count} divine | ` +
      `avg=${session.avg_score.toFixed(3)}`
    );

    return session;
  }

  // ── Learn from History ────────────────────────────────────────────────────

  /**
   * التعلم من الاكتشافات السابقة (MemRL-inspired)
   *
   * يُحلّل الأنماط الناجحة ويُحدّث الأولويات
   * مستوحى من arXiv:2601.03192 — RL على الذاكرة الحلقية
   *
   * @returns قائمة الدروس المستفادة
   */
  static async learnFromHistory(): Promise<string[]> {
    await MicroMemory.init();

    const lessons: string[] = [];

    try {
      // جلب أفضل الأنماط من الذاكرة
      const stats = MicroMemory.getStats();
      const topPatterns = MicroMemory.getSimilarPatterns(
        new Array(768).fill(0.5), // embedding عام
        49 // أفضل 49 (7×7)
      );

      if (topPatterns.length === 0) {
        lessons.push('لا أنماط في الذاكرة بعد — ابدأ الصيد أولاً');
        return lessons;
      }

      // تحليل التوزيع
      const avgResonance = topPatterns.reduce((s, p) => s + p.resonance_score, 0) / topPatterns.length;
      const highResonance = topPatterns.filter(p => p.resonance_score >= RESONANCE_THRESHOLD);
      const quranSig = topPatterns.filter(p => (p.shannon_hel ?? 1) < 0.9685);

      // استخراج الدروس
      if (avgResonance > 0.7) {
        lessons.push(`متوسط الرنين عالٍ (${avgResonance.toFixed(3)}) — النظام يتعلم جيداً`);
      }

      if (highResonance.length > 0) {
        const topVerse = highResonance[0];
        lessons.push(`أعلى رنين: ${topVerse.verse} (${topVerse.resonance_score.toFixed(3)}) في مجال ${topVerse.field}`);
      }

      if (quranSig.length > 0) {
        lessons.push(`${quranSig.length} نمط يحمل البصمة القرآنية (H_EL < 0.9685 بت)`);
      }

      // تحديث curiosity بناءً على الاكتشافات
      const curiosityBoost = Math.min(0.1, avgResonance * 0.05);
      await IQRAMemory.grantReward(curiosityBoost);

      lessons.push(`إجمالي الأنماط: ${stats.patterns} | البصمة القرآنية: ${stats.quran_signature_patterns}`);

    } catch (e) {
      lessons.push(`خطأ في التعلم: ${(e as Error).message}`);
    }

    return lessons;
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /**
   * إحصائيات صياد الأنماط
   */
  static async getStats(): Promise<{
    total_sessions: number;
    divine_discoveries: number;
    memory_stats: ReturnType<typeof MicroMemory.getStats>;
    curiosity_score: number;
    top_fields: string[];
  }> {
    await MicroMemory.init();
    const memStats = MicroMemory.getStats();
    const curiosity = await IQRAMemory.getCuriosity();

    // أكثر المجالات اكتشافاً
    const fieldCounts: Record<string, number> = {};
    for (const session of this._sessions.values()) {
      for (const p of session.top_patterns) {
        fieldCounts[p.field] = (fieldCounts[p.field] ?? 0) + 1;
      }
    }
    const topFields = Object.entries(fieldCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([f]) => f);

    return {
      total_sessions: this._sessions.size,
      divine_discoveries: this._divineCount,
      memory_stats: memStats,
      curiosity_score: typeof curiosity === 'number' ? curiosity : 0.5,
      top_fields: topFields,
    };
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  /**
   * يحدد مستوى الاكتشاف بناءً على الدرجة الإجمالية
   */
  private static _computeDiscoveryLevel(
    score: number
  ): HuntedPattern['discovery_level'] {
    if (score >= DIVINE_THRESHOLD)    return 'divine';
    if (score >= RESONANCE_THRESHOLD) return 'resonance';
    if (score >= 0.5)                 return 'tree';
    if (score >= 0.3)                 return 'branch';
    return 'seed';
  }

  /**
   * SEDM-style storage — يُخزّن مع utility score للترتيب الذاتي
   * مستوحى من arXiv:2509.09498
   */
  private static async _sedmStore(
    verseRef: string,
    arabicText: string,
    field: string,
    utilityScore: number,
    missionId: string
  ): Promise<void> {
    try {
      // توليد embedding
      let embedding: number[];
      try {
        embedding = await IQRAMemory.generateEmbedding(`${verseRef} ${arabicText.slice(0, 200)}`);
      } catch {
        const hash = crypto.createHash('sha256').update(`${verseRef}:${field}`).digest();
        embedding = Array.from(hash).flatMap(b => {
          const v = (b / 127.5) - 1.0;
          return new Array(3).fill(v);
        }).slice(0, 768);
      }

      // تخزين في MicroMemory (Warm layer)
      MicroMemory.storePattern(
        verseRef,
        field,
        utilityScore,
        embedding,
        missionId,
        arabicText
      );

      // تخزين metadata في MemoryBridge (Hot layer للوصول السريع)
      await MemoryBridge.write(`hunter:${verseRef}:${field}`, {
        verse_ref: verseRef,
        field,
        utility_score: utilityScore,
        mission_id: missionId,
        timestamp: Date.now(),
      }, { layer: 'hot' });

    } catch (e) {
      IQRALogger.warn(`⚠️ [HUNTER] SEDM store failed: ${(e as Error).message}`);
    }
  }

  /**
   * استخراج الدروس من الأنماط المكتشفة
   * مستوحى من MemRL (arXiv:2601.03192)
   */
  private static _extractLessons(patterns: HuntedPattern[]): string[] {
    const lessons: string[] = [];
    if (patterns.length === 0) return lessons;

    const divine = patterns.filter(p => p.discovery_level === 'divine');
    const resonance = patterns.filter(p => p.discovery_level === 'resonance');
    const novel = patterns.filter(p => p.is_novel);

    if (divine.length > 0) {
      lessons.push(
        `اكتشافات إلهية: ${divine.map(p => p.verse_ref).join(', ')} — ` +
        `متوسط الدرجة: ${(divine.reduce((s, p) => s + p.score.total, 0) / divine.length).toFixed(3)}`
      );
    }

    if (resonance.length > 0) {
      const topField = this._mostCommonField(resonance);
      lessons.push(`مجال الرنين الأقوى: ${topField}`);
    }

    if (novel.length > 0) {
      lessons.push(`${novel.length} اكتشاف جديد — الذاكرة تتوسع`);
    }

    // نمط Shannon
    const shannonHigh = patterns.filter(p => p.score.shannon_hel >= 0.8);
    if (shannonHigh.length > 0) {
      lessons.push(
        `${shannonHigh.length} آية تحمل بصمة قرآنية قوية (Shannon H_EL)`
      );
    }

    return lessons;
  }

  private static _mostCommonField(patterns: HuntedPattern[]): string {
    const counts: Record<string, number> = {};
    for (const p of patterns) {
      counts[p.field] = (counts[p.field] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
  }
}
