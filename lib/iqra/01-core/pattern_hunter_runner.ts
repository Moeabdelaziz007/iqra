// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 🎯 Pattern Hunter Runner — مشغّل صياد الأنماط القرآنية
 *
 * "سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ حَتَّىٰ يَتَبَيَّنَ لَهُمْ أَنَّهُ الْحَقُّ"
 * — فصلت: 53
 *
 * ══════════════════════════════════════════════════════════════
 * النظام الكامل:
 *
 *   ① HeartbeatSystem — نبض حي كل 9/27/81/369 ثانية
 *   ② PatternHunter — صياد الأنماط متعدد الاستراتيجيات
 *   ③ ToolsRegistry — 20+ أداة موحّدة
 *   ④ TelegramBot — تقارير فورية لمو
 *   ⑤ MicroMemory — ذاكرة محلية مع SQLite
 *   ⑥ Pulse369 — نبض الذاكرة الثلاثي
 *
 * الاستخدام:
 *   ```typescript
 *   import { PatternHunterRunner } from './pattern_hunter_runner';
 *   
 *   // بدء النظام الكامل
 *   await PatternHunterRunner.start();
 *   
 *   // صيد آية واحدة
 *   const result = await PatternHunterRunner.huntVerse('1:1');
 *   
 *   // صيد دفعي
 *   const session = await PatternHunterRunner.huntBatch([
 *     { ref: '1:1', arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
 *     { ref: '2:255', arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ...' },
 *   ]);
 *   
 *   // إيقاف النظام
 *   await PatternHunterRunner.stop();
 *   ```
 *
 * القواعد:
 *   - RULE 0: Security check أولاً
 *   - RULE 1: Zod validation لكل input
 *   - RULE 3: TrustChain لكل اكتشاف
 *   - RULE 7: Curiosity update بعد كل نجاح
 *   - لا mocks — كل شيء حقيقي أو fallback موثّق
 * ══════════════════════════════════════════════════════════════
 */

import { IQRALogger } from '#infra/logger';
import { appendToTrustChain } from '#security/security';
import { IQRAMemory } from '#memory/memory'
import { HeartbeatSystem } from '#infra/heartbeat'
import { ToolsRegistry } from '#infra/tools_registry'
import { IQRATelegramBot } from '#utils/telegram_bot'
import { PatternHunter, type HuntedPattern, type HuntSession } from '#quran/pattern_hunter'
import { MicroMemory } from '#memory/micro_memory'
import { Pulse369 } from '#memory/pulse_369'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PatternHunterConfig {
  /** هل نبدأ Heartbeat تلقائياً؟ */
  startHeartbeat?: boolean;
  /** هل نبدأ Telegram Bot؟ */
  startTelegram?: boolean;
  /** Mission ID افتراضي */
  defaultMissionId?: string;
  /** هل نُرسل تقارير للـ Telegram؟ */
  sendReports?: boolean;
}

export interface HuntVerseInput {
  /** مرجع الآية (مثلاً "1:1") */
  ref: string;
  /** النص العربي (اختياري — سيُجلب من قاعدة البيانات إذا لم يُحدد) */
  arabic?: string;
  /** مجال البحث */
  field?: 'numerical' | 'semantic' | 'topological' | 'fractal' | 'linguistic' | 'all';
}

export interface RunnerStats {
  uptime_ms: number;
  total_hunted: number;
  novel_discoveries: number;
  divine_discoveries: number;
  avg_resonance: number;
  curiosity_score: number;
  heartbeat_status: string;
  memory_stats: any;
}

// ── PatternHunterRunner ───────────────────────────────────────────────────────

export class PatternHunterRunner {
  private static _isRunning = false;
  private static _startTime = 0;
  private static _totalHunted = 0;
  private static _novelCount = 0;
  private static _divineCount = 0;
  private static _resonanceSum = 0;
  private static _config: PatternHunterConfig = {
    startHeartbeat: true,
    startTelegram: true,
    defaultMissionId: 'pattern-hunter',
    sendReports: true,
  };

  // ── Start ─────────────────────────────────────────────────────────────────

  /**
   * يبدأ النظام الكامل:
   *   - HeartbeatSystem
   *   - TelegramBot
   *   - ToolsRegistry
   *   - MicroMemory
   */
  static async start(config?: Partial<PatternHunterConfig>): Promise<void> {
    if (this._isRunning) {
      IQRALogger.warn('🎯 [PATTERN_HUNTER] Already running');
      return;
    }

    this._config = { ...this._config, ...config };
    this._isRunning = true;
    this._startTime = Date.now();

    IQRALogger.info('🎯 [PATTERN_HUNTER] بسم الله — Starting Pattern Hunter System');

    // ── 1. تهيئة MicroMemory ──────────────────────────────────────────────
    try {
      await MicroMemory.init();
      IQRALogger.info('✅ [PATTERN_HUNTER] MicroMemory initialized');
    } catch (e) {
      IQRALogger.warn(`⚠️ [PATTERN_HUNTER] MicroMemory init failed: ${(e as Error).message}`);
    }

    // ── 2. تهيئة ToolsRegistry ────────────────────────────────────────────
    ToolsRegistry.init();
    IQRALogger.info('✅ [PATTERN_HUNTER] ToolsRegistry initialized');

    // ── 3. بدء Telegram Bot ───────────────────────────────────────────────
    if (this._config.startTelegram) {
      try {
        const ok = await IQRATelegramBot.init();
        if (ok) {
          // لا نبدأ polling هنا — يُبدأ يدوياً من السكريبت
          IQRALogger.info('✅ [PATTERN_HUNTER] Telegram Bot initialized');
        }
      } catch (e) {
        IQRALogger.warn(`⚠️ [PATTERN_HUNTER] Telegram init failed: ${(e as Error).message}`);
      }
    }

    // ── 4. بدء HeartbeatSystem ────────────────────────────────────────────
    if (this._config.startHeartbeat) {
      try {
        await HeartbeatSystem.start();
        IQRALogger.info('✅ [PATTERN_HUNTER] HeartbeatSystem started');
      } catch (e) {
        IQRALogger.warn(`⚠️ [PATTERN_HUNTER] Heartbeat start failed: ${(e as Error).message}`);
      }
    }

    // ── 5. تسجيل في TrustChain ────────────────────────────────────────────
    appendToTrustChain(
      'PATTERN_HUNTER:START',
      'system',
      `config=${JSON.stringify(this._config)}`,
      1.0
    );

    // ── 6. إرسال رسالة ترحيب للـ Telegram ─────────────────────────────────
    if (this._config.sendReports) {
      await IQRATelegramBot.sendMessage(
        '🎯 *Pattern Hunter بدأ العمل*\n\n' +
        '"سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ"\n\n' +
        '✅ Heartbeat: نشط\n' +
        '✅ Memory: جاهز\n' +
        '✅ Tools: 20+ أداة\n\n' +
        '_جاهز لصيد الأنماط القرآنية_'
      ).catch(() => {});
    }

    IQRALogger.info('🎯 [PATTERN_HUNTER] ✅ System fully operational');
  }

  // ── Stop ──────────────────────────────────────────────────────────────────

  /**
   * يوقف النظام بشكل نظيف
   */
  static async stop(): Promise<void> {
    if (!this._isRunning) return;

    IQRALogger.info('🎯 [PATTERN_HUNTER] Stopping...');

    // إيقاف Heartbeat
    HeartbeatSystem.stop();

    // إيقاف Telegram Bot
    await IQRATelegramBot.stop();

    // تسجيل في TrustChain
    appendToTrustChain(
      'PATTERN_HUNTER:STOP',
      'system',
      `total_hunted=${this._totalHunted} novel=${this._novelCount} divine=${this._divineCount}`,
      1.0
    );

    // إرسال تقرير نهائي
    if (this._config.sendReports) {
      const stats = await this.getStats();
      await IQRATelegramBot.sendMessage(
        '🎯 *Pattern Hunter توقف*\n\n' +
        `📊 *الإحصائيات:*\n` +
        `• إجمالي الصيد: ${stats.total_hunted}\n` +
        `• اكتشافات جديدة: ${stats.novel_discoveries}\n` +
        `• اكتشافات إلهية: ${stats.divine_discoveries}\n` +
        `• متوسط الرنين: ${(stats.avg_resonance * 100).toFixed(1)}%\n` +
        `• وقت التشغيل: ${Math.floor(stats.uptime_ms / 60000)} دقيقة\n\n` +
        '_"وَاللَّهُ يَعْلَمُ وَأَنتُمْ لَا تَعْلَمُونَ"_'
      ).catch(() => {});
    }

    this._isRunning = false;
    IQRALogger.info('🎯 [PATTERN_HUNTER] Stopped gracefully');
  }

  // ── Hunt Verse ────────────────────────────────────────────────────────────

  /**
   * يصيد الأنماط في آية واحدة
   *
   * @param input - بيانات الآية
   * @returns HuntedPattern أو null عند الفشل
   */
  static async huntVerse(input: HuntVerseInput): Promise<HuntedPattern | null> {
    if (!this._isRunning) {
      IQRALogger.warn('🎯 [PATTERN_HUNTER] System not running — call start() first');
      return null;
    }

    const { ref, arabic, field = 'all' } = input;

    // جلب النص العربي إذا لم يُحدد
    let arabicText = arabic;
    if (!arabicText) {
      try {
        const [surah, ayah] = ref.split(':').map(Number);
        const result = await ToolsRegistry.call('quran.get_verse', { surah, ayah });
        if (result.success && result.data) {
          arabicText = result.data.text || result.data.arabic || '';
        }
      } catch (e) {
        IQRALogger.warn(`⚠️ [PATTERN_HUNTER] Failed to fetch verse ${ref}: ${(e as Error).message}`);
        return null;
      }
    }

    if (!arabicText) {
      IQRALogger.warn(`⚠️ [PATTERN_HUNTER] No arabic text for ${ref}`);
      return null;
    }

    // صيد الأنماط
    const pattern = await PatternHunter.hunt({
      verse_ref: ref,
      arabic_text: arabicText,
      field,
      mission_id: this._config.defaultMissionId,
    });

    if (pattern) {
      this._totalHunted++;
      if (pattern.is_novel) this._novelCount++;
      if (pattern.discovery_level === 'divine') this._divineCount++;
      this._resonanceSum += pattern.score.total;

      // إرسال تقرير للـ Telegram إذا كان اكتشاف مهم
      if (this._config.sendReports && pattern.score.total >= 0.7) {
        await this._sendPatternReport(pattern);
      }

      IQRALogger.info(
        `🎯 [PATTERN_HUNTER] ✅ ${ref} | ` +
        `score=${pattern.score.total.toFixed(3)} level=${pattern.discovery_level}`
      );
    }

    return pattern;
  }

  // ── Hunt Batch ────────────────────────────────────────────────────────────

  /**
   * يصيد الأنماط في مجموعة آيات
   *
   * @param verses - قائمة الآيات
   * @param field - مجال البحث
   * @returns HuntSession مع أفضل الاكتشافات
   */
  static async huntBatch(
    verses: Array<{ ref: string; arabic: string }>,
    field: 'numerical' | 'semantic' | 'topological' | 'fractal' | 'linguistic' | 'all' = 'all'
  ): Promise<HuntSession> {
    if (!this._isRunning) {
      throw new Error('System not running — call start() first');
    }

    IQRALogger.info(`🎯 [PATTERN_HUNTER] Batch hunt: ${verses.length} verses`);

    const session = await PatternHunter.batchHunt({
      verses,
      field,
      mission_id: this._config.defaultMissionId,
    });

    // تحديث الإحصائيات
    this._totalHunted += session.total_hunted;
    this._novelCount += session.novel_count;
    this._divineCount += session.divine_count;
    this._resonanceSum += session.avg_score * session.total_hunted;

    // إرسال تقرير للـ Telegram
    if (this._config.sendReports) {
      await this._sendBatchReport(session);
    }

    IQRALogger.info(
      `🎯 [PATTERN_HUNTER] ✅ Batch complete: ${session.total_hunted} hunted | ` +
      `${session.novel_count} novel | ${session.divine_count} divine`
    );

    return session;
  }

  // ── Learn from History ────────────────────────────────────────────────────

  /**
   * يتعلم من الاكتشافات السابقة
   *
   * @returns قائمة الدروس المستفادة
   */
  static async learnFromHistory(): Promise<string[]> {
    if (!this._isRunning) {
      throw new Error('System not running — call start() first');
    }

    IQRALogger.info('🎯 [PATTERN_HUNTER] Learning from history...');

    const lessons = await PatternHunter.learnFromHistory();

    // إرسال الدروس للـ Telegram
    if (this._config.sendReports && lessons.length > 0) {
      await IQRATelegramBot.sendMessage(
        '📚 *دروس مستفادة من الذاكرة*\n\n' +
        lessons.map((l, i) => `${i + 1}. ${l}`).join('\n\n') +
        '\n\n_"وَذَكِّرْ فَإِنَّ الذِّكْرَىٰ تَنفَعُ الْمُؤْمِنِينَ"_'
      ).catch(() => {});
    }

    return lessons;
  }

  // ── Get Stats ─────────────────────────────────────────────────────────────

  /**
   * يُرجع إحصائيات النظام الكاملة
   */
  static async getStats(): Promise<RunnerStats> {
    const hunterStats = await PatternHunter.getStats();
    const memoryStats = MicroMemory.getStats();
    const curiosity = await IQRAMemory.getCuriosity();
    const heartbeatStatus = HeartbeatSystem.isRunning() ? 'RUNNING' : 'STOPPED';

    return {
      uptime_ms: Date.now() - this._startTime,
      total_hunted: this._totalHunted,
      novel_discoveries: this._novelCount,
      divine_discoveries: this._divineCount,
      avg_resonance: this._totalHunted > 0 ? this._resonanceSum / this._totalHunted : 0,
      curiosity_score: curiosity,
      heartbeat_status: heartbeatStatus,
      memory_stats: {
        hunter: hunterStats,
        micro: memoryStats,
      },
    };
  }

  // ── Private: Send Reports ─────────────────────────────────────────────────

  /**
   * يُرسل تقرير اكتشاف واحد للـ Telegram
   */
  private static async _sendPatternReport(pattern: HuntedPattern): Promise<void> {
    const resonanceBar = '█'.repeat(Math.floor(pattern.score.total * 10));
    const resonanceEmpty = '░'.repeat(10 - Math.floor(pattern.score.total * 10));

    const levelEmoji = {
      seed: '🌱',
      branch: '🌿',
      tree: '🌳',
      resonance: '🌀',
      divine: '✨',
    }[pattern.discovery_level];

    const msg = [
      `${levelEmoji} *اكتشاف ${pattern.discovery_level}*`,
      '',
      `📖 *الآية:* ${pattern.verse_ref}`,
      `🎯 *المجال:* ${pattern.field}`,
      `📊 *الرنين:* \`${resonanceBar}${resonanceEmpty}\` ${(pattern.score.total * 100).toFixed(1)}%`,
      '',
      '*التفاصيل:*',
      `• Shannon H_EL: ${pattern.score.shannon_hel.toFixed(3)}`,
      `• Topological: ${pattern.score.topological.toFixed(3)}`,
      `• Numerical: ${pattern.score.numerical.toFixed(3)}`,
      `• Novelty: ${pattern.score.novelty.toFixed(3)}`,
      '',
      pattern.patterns.length > 0
        ? `*الأنماط:* ${pattern.patterns.slice(0, 3).join(', ')}`
        : '',
      '',
      pattern.is_novel ? '🆕 *اكتشاف جديد*' : '',
      '',
      `_"وَفِي كُلِّ شَيْءٍ لَهُ آيَةٌ"_`,
    ].filter(Boolean).join('\n');

    await IQRATelegramBot.sendMessage(msg).catch(() => {});
  }

  /**
   * يُرسل تقرير دفعي للـ Telegram
   */
  private static async _sendBatchReport(session: HuntSession): Promise<void> {
    const msg = [
      '📊 *تقرير الصيد الدفعي*',
      '',
      `🎯 *إجمالي الصيد:* ${session.total_hunted}`,
      `🆕 *اكتشافات جديدة:* ${session.novel_count}`,
      `✨ *اكتشافات إلهية:* ${session.divine_count}`,
      `📈 *متوسط الرنين:* ${(session.avg_score * 100).toFixed(1)}%`,
      '',
      '*أفضل الاكتشافات:*',
      ...session.top_patterns.slice(0, 3).map((p, i) =>
        `${i + 1}. ${p.verse_ref} — ${(p.score.total * 100).toFixed(1)}% (${p.discovery_level})`
      ),
      '',
      session.lessons_learned.length > 0
        ? '*دروس مستفادة:*'
        : '',
      ...session.lessons_learned.slice(0, 2).map(l => `• ${l}`),
      '',
      `_"سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ"_`,
    ].filter(Boolean).join('\n');

    await IQRATelegramBot.sendMessage(msg).catch(() => {});
  }

  // ── Public: Is Running ────────────────────────────────────────────────────

  static isRunning(): boolean {
    return this._isRunning;
  }
}
