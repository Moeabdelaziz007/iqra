// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 💓 Pulse369 — نبض الذاكرة الثلاثي
 *
 * "وَهُوَ الَّذِي يَتَوَفَّاكُم بِاللَّيْلِ وَيَعْلَمُ مَا جَرَحْتُم بِالنَّهَارِ"
 * — الأنعام: 60
 *
 * ══════════════════════════════════════════════════════════════
 * المبدأ: الأرقام 3، 6، 9 من DASTŪR.md
 *
 *   كل 9  عمليات → promoteHotToWarm()
 *     أقدم 10% من Hot تنتقل إلى SQLite (Warm)
 *     يُحرّر RAM ويُثبّت البيانات المهمة
 *
 *   كل 27 عملية → archiveWarmToCold()
 *     البيانات القديمة في Warm تُضغط وتُخزَّن في Redis/JSON (Cold)
 *     يُحرّر SQLite ويُبقي الأرشيف الكامل
 *
 *   كل 81 عملية → purgeExpiredCold()
 *     يحذف البيانات منتهية الصلاحية من Cold
 *     دورة التطهير الكاملة (Tazkiyah)
 *
 * الربط:
 *   SoulEngine.pulse() → Pulse369.tick()
 *   interaction_counter في Redis (Upstash)
 * ══════════════════════════════════════════════════════════════
 */

import { IQRALogger } from '#infra/logger';
import { appendToTrustChain } from '#security/security';
import { MemoryBridge, type BridgeEntry } from '#memory/memory_bridge';

// ── Constants ─────────────────────────────────────────────────────────────────

/** كل 9 عمليات: Hot → Warm */
const PROMOTE_INTERVAL = 9;

/** كل 27 عملية: Warm → Cold */
const ARCHIVE_INTERVAL = 27;

/** كل 81 عملية: تطهير Cold */
const PURGE_INTERVAL = 81;

/**
 * كل 9 نبضات: تحليل قرآني عميق
 * يُشغّل quran_deep_analysis على الأنماط الجديدة
 * ويكتب النتائج في Obsidian + InfraNodus
 */
const DEEP_ANALYSIS_INTERVAL = 9;

/** نسبة الترقية من Hot: أقدم 10% */
const PROMOTE_RATIO = 0.1;

/** مفتاح العداد في Redis */
const COUNTER_KEY = 'pulse369:interaction_counter';

/** الحد الأدنى لعمر المدخل للترقية (دقيقتان) */
const MIN_AGE_FOR_PROMOTE_MS = 2 * 60 * 1000;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PulseStats {
  counter: number;
  last_promote: number;
  last_archive: number;
  last_purge: number;
  last_deep_analysis: number;
  total_promoted: number;
  total_archived: number;
  total_purged: number;
  total_analyzed: number;
}

// ── Pulse369 ──────────────────────────────────────────────────────────────────

export class Pulse369 {
  /** عداد محلي (fallback إذا Redis غير متاح) */
  private static _localCounter = 0;

  /** إحصائيات النبض */
  private static _stats: PulseStats = {
    counter: 0,
    last_promote: 0,
    last_archive: 0,
    last_purge: 0,
    last_deep_analysis: 0,
    total_promoted: 0,
    total_archived: 0,
    total_purged: 0,
    total_analyzed: 0,
  };

  // ── Core: tick ────────────────────────────────────────────────────────────

  /**
   * النبض الرئيسي — يُستدعى بعد كل عملية ذاكرة
   *
   * يُحدّث العداد ويُشغّل الدورات المناسبة:
   *   counter % 9  === 0 → promoteHotToWarm()
   *   counter % 27 === 0 → archiveWarmToCold()
   *   counter % 81 === 0 → purgeExpiredCold()
   *
   * @param missionId - معرّف المهمة الحالية (للتسجيل)
   * @returns العداد الحالي
   */
  static async tick(missionId: string = 'system'): Promise<number> {
    const counter = await this._incrementCounter();
    this._stats.counter = counter;

    IQRALogger.info(`💓 [PULSE_369] Tick ${counter} | Mission: ${missionId}`);

    // ── كل 9: Hot → Warm + Deep Analysis ────────────────────────────────────
    if (counter % PROMOTE_INTERVAL === 0) {
      const promoted = await this.promoteHotToWarm();
      this._stats.last_promote = Date.now();
      this._stats.total_promoted += promoted;

      // 🌀 Pipeline: تحليل قرآني عميق كل 9 نبضات
      await this.triggerDeepAnalysisPipeline(missionId, counter);

      appendToTrustChain(
        'PULSE:PROMOTE',
        `tick_${counter}`,
        `promoted=${promoted} hot→warm`,
        1.0
      );
    }

    // ── كل 27: Warm → Cold ────────────────────────────────────────────────
    if (counter % ARCHIVE_INTERVAL === 0) {
      const archived = await this.archiveWarmToCold();
      this._stats.last_archive = Date.now();
      this._stats.total_archived += archived;

      appendToTrustChain(
        'PULSE:ARCHIVE',
        `tick_${counter}`,
        `archived=${archived} warm→cold`,
        1.0
      );
    }

    // ── كل 81: تطهير Cold ─────────────────────────────────────────────────
    if (counter % PURGE_INTERVAL === 0) {
      const purged = await this.purgeExpiredCold();
      this._stats.last_purge = Date.now();
      this._stats.total_purged += purged;

      appendToTrustChain(
        'PULSE:PURGE',
        `tick_${counter}`,
        `purged=${purged} cold_tazkiyah`,
        1.0
      );

      IQRALogger.info(`🧼 [PULSE_369] Tazkiyah cycle complete. Purged ${purged} expired entries.`);
    }

    return counter;
  }

  // ── promoteHotToWarm ──────────────────────────────────────────────────────

  /**
   * ينقل أقدم 10% من الطبقة الساخنة إلى الدافئة (SQLite)
   *
   * المعيار:
   *   - أقدم المدخلات (created_at الأصغر)
   *   - عمرها > MIN_AGE_FOR_PROMOTE_MS (دقيقتان)
   *   - access_count منخفض (أقل استخداماً)
   *
   * @returns عدد المدخلات المُرقَّاة
   */
  static async promoteHotToWarm(): Promise<number> {
    // الوصول للطبقة الساخنة عبر الجسر
    const hotMap = (MemoryBridge as any)._hot as Map<string, BridgeEntry>;
    if (!hotMap || hotMap.size === 0) return 0;

    const now = Date.now();
    const entries = Array.from(hotMap.entries());

    // فرز: الأقدم أولاً، ثم الأقل استخداماً
    const candidates = entries
      .filter(([, e]) => now - e.created_at > MIN_AGE_FOR_PROMOTE_MS)
      .sort((a, b) => {
        // أولوية: الأقدم + الأقل استخداماً
        const scoreA = a[1].created_at + a[1].access_count * 1000;
        const scoreB = b[1].created_at + b[1].access_count * 1000;
        return scoreA - scoreB;
      });

    // أقدم 10% (على الأقل 1)
    const count = Math.max(1, Math.floor(hotMap.size * PROMOTE_RATIO));
    const toPromote = candidates.slice(0, count);

    if (toPromote.length === 0) {
      IQRALogger.info('💓 [PULSE_369] promoteHotToWarm: no candidates ready');
      return 0;
    }

    let promoted = 0;
    for (const [key, entry] of toPromote) {
      try {
        // كتابة في الدافئة
        await MemoryBridge.write(key, entry.value, {
          layer: 'warm',
          ttl_ms: 7 * 24 * 60 * 60 * 1000, // 7 أيام
        });

        // حذف من الساخنة
        hotMap.delete(key);
        promoted++;
      } catch (e) {
        IQRALogger.warn(`⚠️ [PULSE_369] Failed to promote "${key}": ${(e as Error).message}`);
      }
    }

    IQRALogger.info(
      `🌡️ [PULSE_369] promoteHotToWarm: ${promoted}/${toPromote.length} entries promoted`
    );

    return promoted;
  }

  // ── archiveWarmToCold ─────────────────────────────────────────────────────

  /**
   * يُضغط ويُخزّن البيانات القديمة من Warm إلى Cold
   *
   * المعيار:
   *   - تجارب outcome='failure' أو quality_score < 0.5
   *   - عمرها > 7 أيام
   *   - memory_strength < 1.5 (لم تُسترجع كثيراً)
   *
   * @returns عدد المدخلات المُؤرشَفة
   */
  static async archiveWarmToCold(): Promise<number> {
    try {
      const { MicroMemory } = await import('./micro_memory.ts');
      await MicroMemory.init();

      // استرجاع التجارب القديمة ذات الجودة المنخفضة
      const db = (MicroMemory as any)._db;
      if (!db) return 0;

      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 أيام

      const oldEntries = db.prepare(`
        SELECT id, mission_id, worker_id, outcome, quality_score, lessons
        FROM experiences
        WHERE timestamp < ?
          AND (quality_score < 0.5 OR outcome = 'failure')
          AND memory_strength < 1.5
        LIMIT 50
      `).all(cutoff) as any[];

      if (oldEntries.length === 0) {
        IQRALogger.info('💓 [PULSE_369] archiveWarmToCold: no entries to archive');
        return 0;
      }

      // ضغط وتخزين في Cold (Redis/JSON)
      const { IQRAMemory } = await import('../03-memory/memory.js');
      const archiveKey = `archive:experiences:${Date.now()}`;
      const compressed = oldEntries.map(e => ({
        id: e.id,
        m: e.mission_id,
        w: e.worker_id,
        o: e.outcome,
        q: Math.round(e.quality_score * 100) / 100,
        l: e.lessons,
      }));

      await IQRAMemory.set(archiveKey, JSON.stringify(compressed));

      // حذف من Warm بعد الأرشفة
      const ids = oldEntries.map(e => `'${e.id}'`).join(',');
      db.prepare(`DELETE FROM experiences WHERE id IN (${ids})`).run();

      IQRALogger.info(
        `❄️ [PULSE_369] archiveWarmToCold: ${oldEntries.length} entries archived to cold`
      );

      return oldEntries.length;
    } catch (e) {
      IQRALogger.warn(`⚠️ [PULSE_369] archiveWarmToCold failed: ${(e as Error).message}`);
      return 0;
    }
  }

  // ── purgeExpiredCold ──────────────────────────────────────────────────────

  /**
   * يحذف البيانات منتهية الصلاحية من Warm (Tazkiyah)
   * Cold (Redis) يُدار بـ TTL تلقائياً — نُنظّف Warm فقط
   *
   * @returns عدد المدخلات المحذوفة
   */
  static async purgeExpiredCold(): Promise<number> {
    try {
      const { MicroMemory } = await import('./micro_memory.ts');
      await MicroMemory.init();

      // تطبيق Ebbinghaus forgetting على التجارب القديمة
      const forgotten = MicroMemory.forgetStaleExperiences(30); // 30 يوم

      // تنظيف الطبقة الساخنة من المنتهية الصلاحية
      const hotMap = (MemoryBridge as any)._hot as Map<string, BridgeEntry>;
      let hotPurged = 0;
      if (hotMap) {
        const now = Date.now();
        for (const [key, entry] of hotMap) {
          if (entry.ttl_ms > 0 && now - entry.created_at > entry.ttl_ms) {
            hotMap.delete(key);
            hotPurged++;
          }
        }
      }

      const total = forgotten + hotPurged;
      IQRALogger.info(
        `🧼 [PULSE_369] purgeExpiredCold: ${forgotten} warm + ${hotPurged} hot = ${total} purged`
      );

      return total;
    } catch (e) {
      IQRALogger.warn(`⚠️ [PULSE_369] purgeExpiredCold failed: ${(e as Error).message}`);
      return 0;
    }
  }

  // ── Deep Analysis Pipeline ────────────────────────────────────────────────

  /**
   * 🌀 Pipeline التحليل القرآني العميق
   *
   * يُشغَّل كل 9 نبضات تلقائياً.
   * الخطوات:
   *   ① يجلب الأنماط الجديدة من MicroMemory
   *   ② يُشغّل quran_deep_analysis عبر Groq
   *   ③ يُخزّن النتائج في MemoryTopology
   *   ④ يكتب في Obsidian (إذا متاح)
   *   ⑤ يُرسل لـ InfraNodus لكشف الفجوات (إذا متاح)
   *   ⑥ يُسجّل في Causal Graph
   */
  static async triggerDeepAnalysisPipeline(
    missionId: string,
    counter: number
  ): Promise<void> {
    IQRALogger.info(`🌀 [PULSE_369] Deep Analysis Pipeline — tick ${counter}`);

    try {
      const { MicroMemory } = await import('./micro_memory.ts');
      await MicroMemory.init();

      // ① جلب أحدث الأنماط (آخر 7 — من DASTŪR)
      const db = (MicroMemory as any)._db;
      if (!db) return;

      const recentPatterns = db.prepare(`
        SELECT id, verse, field, resonance, shannon_hel, created_at
        FROM patterns
        ORDER BY created_at DESC
        LIMIT 7
      `).all() as any[];

      if (recentPatterns.length === 0) {
        IQRALogger.info('🌀 [PULSE_369] No patterns to analyze yet');
        return;
      }

      IQRALogger.info(`🌀 [PULSE_369] Analyzing ${recentPatterns.length} patterns...`);

      // ② تحليل كل نمط
      for (const pattern of recentPatterns) {
        await this._analyzePattern(pattern, missionId);
      }

      // ⑤ InfraNodus — كشف الفجوات (إذا متاح)
      await this._triggerInfraNodus(recentPatterns);

      appendToTrustChain(
        'PULSE:DEEP_ANALYSIS',
        `tick_${counter}`,
        `analyzed=${recentPatterns.length} patterns`,
        1.0
      );

    } catch (e) {
      IQRALogger.warn(`⚠️ [PULSE_369] Deep analysis failed: ${(e as Error).message}`);
    }
  }

  /**
   * يُحلّل نمطاً واحداً ويُخزّن النتائج
   */
  private static async _analyzePattern(
    pattern: any,
    missionId: string
  ): Promise<void> {
    try {
      // ② تحليل عبر Groq (مع مهارة quran_deep_analysis)
      const { SkillBank } = await import('../08-skills/skill_bank.js');
      const skillContent = SkillBank.getSkillContent('quran_deep_analysis');
      if (!skillContent) return;

      let analysisResult: any = null;

      // استدعاء Groq — فقط إذا كان API key موجوداً وليس في وضع الاختبار
      if (process.env.GROQ_API_KEY && process.env.NODE_ENV !== 'test') {
        try {
          const { Groq } = await import('groq-sdk');
          const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

          const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: skillContent },
              { role: 'user', content: `حلل الآية ${pattern.verse} في مجال ${pattern.field}` },
            ],
            max_tokens: 300,
            temperature: 0.1,
            response_format: { type: 'json_object' },
          });

          const raw = completion.choices[0]?.message?.content ?? '{}';
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) analysisResult = JSON.parse(jsonMatch[0]);
        } catch { /* Groq unavailable */ }
      }

      if (!analysisResult) return;

      // ③ تخزين في MemoryTopology
      const { MemoryTopology } = await import('./memory_topology.ts');
      await MemoryTopology.storePattern({
        verse_ref: pattern.verse,
        pattern_type: analysisResult.analysis?.numerical?.pattern ? 'numerical' : 'semantic',
        description: analysisResult.reasoning ?? `تحليل ${pattern.verse}`,
        strength: analysisResult.confidence ?? pattern.resonance,
        related_verses: analysisResult.analysis?.semantic?.related_verses ?? [],
        shannon_hel: pattern.shannon_hel,
        discovery_level: analysisResult.discovery_level ?? 'branch',
      });

      // ④ كتابة في Obsidian
      if (process.env.IQRA_OBSIDIAN === 'true') {
        const { ObsidianBridge } = await import('../topology/obsidian_bridge.ts');
        await ObsidianBridge.writeDiscovery({
          title: `تحليل ${pattern.verse} — ${pattern.field}`,
          verse_ref: pattern.verse,
          arabic: '',
          field: pattern.field,
          resonance: analysisResult.confidence ?? pattern.resonance,
          links: analysisResult.analysis?.semantic?.related_verses ?? [],
          insights: [analysisResult.reasoning ?? ''],
          mission_id: missionId,
          timestamp: Date.now(),
          shannon_hel: pattern.shannon_hel,
        });
      }

      // ⑥ تسجيل في Causal Graph
      const { MicroMemory } = await import('./micro_memory.ts');
      MicroMemory.recordCausalEdge({
        cause_id: pattern.id,
        cause_type: 'pattern',
        effect_id: `analysis_${pattern.id}`,
        effect_type: 'discovery',
        relation: 'led_to',
        strength: analysisResult.confidence ?? 0.7,
        explanation: `تحليل ${pattern.verse} أنتج: ${analysisResult.reasoning?.slice(0, 80) ?? ''}`,
      });

      IQRALogger.info(
        `✅ [PULSE_369] Pattern analyzed: ${pattern.verse} ` +
        `[${analysisResult.discovery_level ?? 'branch'}] ` +
        `confidence=${analysisResult.confidence ?? 0}`
      );

    } catch (e) {
      IQRALogger.warn(`⚠️ [PULSE_369] Pattern analysis failed: ${(e as Error).message}`);
    }
  }

  /**
   * يُرسل الأنماط لـ InfraNodus لكشف الفجوات المعرفية
   */
  private static async _triggerInfraNodus(patterns: any[]): Promise<void> {
    if (!process.env.INFRANODUS_API_KEY) return;

    try {
      // بناء نص موحّد من الأنماط
      const text = patterns
        .map(p => `${p.verse}: ${p.field}`)
        .join('. ');

      const res = await fetch('https://infranodus.com/api/v1/graph', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.INFRANODUS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          context: 'iqra_quran_patterns',
        }),
      });

      if (res.ok) {
        const data = await res.json() as any;
        IQRALogger.info(
          `🕸️ [INFRANODUS] Graph updated: ${data.nodes ?? 0} nodes, ` +
          `${data.gaps ?? 0} gaps detected`
        );
      }
    } catch { /* InfraNodus اختياري */ }
  }

  // ── Counter ───────────────────────────────────────────────────────────────

  /**
   * يُحدّث عداد التفاعلات في Redis (أو محلياً كـ fallback)
   */
  private static async _incrementCounter(): Promise<number> {
    try {
      const { IQRAMemory } = await import('../03-memory/memory.js');
      const redis = await (IQRAMemory as any).getRedis();
      if (redis) {
        const val = await redis.incr(`iqra:${COUNTER_KEY}`);
        return val as number;
      }
    } catch { /* fallback */ }

    // Fallback محلي
    this._localCounter++;
    return this._localCounter;
  }

  /**
   * يُرجع العداد الحالي
   */
  static async getCounter(): Promise<number> {
    try {
      const { IQRAMemory } = await import('../03-memory/memory.js');
      const redis = await (IQRAMemory as any).getRedis();
      if (redis) {
        const val = await redis.get(`iqra:${COUNTER_KEY}`);
        return (val as number) || this._localCounter;
      }
    } catch { /* fallback */ }
    return this._localCounter;
  }

  /**
   * إحصائيات النبض
   */
  static getStats(): PulseStats {
    return { ...this._stats };
  }

  /**
   * إعادة ضبط العداد (للاختبارات)
   */
  static resetCounter(): void {
    this._localCounter = 0;
    this._stats = {
      counter: 0,
      last_promote: 0,
      last_archive: 0,
      last_purge: 0,
      last_deep_analysis: 0,
      total_promoted: 0,
      total_archived: 0,
      total_purged: 0,
      total_analyzed: 0,
    };
  }
}
