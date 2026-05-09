// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 🤖 IQRA Telegram Bot — بوت إقرأ
 *
 * "وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ" — الأنبياء: 107
 *
 * ══════════════════════════════════════════════════════════════
 * المكتبة: grammY (أحدث وأقوى من Telegraf — TypeScript-first)
 * https://grammy.dev
 *
 * الأوامر المتاحة:
 *   /start      — تحية IQRA وعرض القدرات
 *   /health     — تقرير صحة النظام الكامل
 *   /pulse      — حالة نبض الذاكرة (Pulse369)
 *   /quran      — بحث في القرآن الكريم
 *   /discover   — تشغيل دورة اكتشاف فورية
 *   /memory     — إحصائيات الذاكرة
 *   /tazkiyah   — تطهير الذاكرة يدوياً
 *   /ask        — سؤال مباشر لـ IQRA
 *
 * الأمان:
 *   - فقط TELEGRAM_CHAT_ID المصرح له يتحدث مع IQRA
 *   - كل رسالة تمر عبر FITRAH_FILTER
 *   - TrustChain يُسجّل كل تفاعل
 * ══════════════════════════════════════════════════════════════
 */

import { IQRALogger } from '../12-infrastructure/logger.js';
import { appendToTrustChain } from '#security/security.ts';
import { IQRAMemory } from '../03-memory/memory.js';
import { HeartbeatSystem, type SystemHealth } from '../12-infrastructure/heartbeat.js';
import { Pulse369 } from '../memory/pulse_369.js';
import { MemoryBridge } from '../memory/memory_bridge.js';

// ── grammY (lazy import — اختياري إذا لم يكن مثبتاً) ─────────────────────────
let Bot: any = null;
let GrammyError: any = null;
let HttpError: any = null;

async function loadGrammy() {
  if (Bot) return true;
  try {
    const grammy = await import('grammy');
    Bot = grammy.Bot;
    GrammyError = grammy.GrammyError;
    HttpError = grammy.HttpError;
    return true;
  } catch {
    IQRALogger.warn('⚠️ [TELEGRAM_BOT] grammY not installed. Run: npm install grammy');
    return false;
  }
}

// ── IQRATelegramBot ───────────────────────────────────────────────────────────

export class IQRATelegramBot {
  private static _bot: any = null;
  private static _isRunning = false;
  private static _allowedChatId: string = '';

  // ── Init ──────────────────────────────────────────────────────────────────

  /**
   * يُهيّئ البوت ويربطه بـ HeartbeatSystem
   */
  static async init(): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      IQRALogger.warn('⚠️ [TELEGRAM_BOT] TELEGRAM_BOT_TOKEN أو TELEGRAM_CHAT_ID غير موجود في .env');
      return false;
    }

    const grammyLoaded = await loadGrammy();
    if (!grammyLoaded) return false;

    this._allowedChatId = chatId;
    this._bot = new Bot(token);

    // ── ربط HeartbeatSystem بالبوت ────────────────────────────────────────
    HeartbeatSystem.onAlert = async (msg: string) => {
      await this.sendMessage(msg);
    };

    HeartbeatSystem.onDiscovery = async (pattern: any) => {
      await this.notifyDiscovery(pattern);
    };

    HeartbeatSystem.onHealthReport = async (health: SystemHealth) => {
      const report = HeartbeatSystem.formatHealthReport(health);
      await this.sendMessage(report);
    };

    // ── تسجيل الأوامر ─────────────────────────────────────────────────────
    this._registerCommands();

    // ── معالجة الأخطاء ────────────────────────────────────────────────────
    this._bot.catch((err: any) => {
      const ctx = err.ctx;
      IQRALogger.error(`❌ [TELEGRAM_BOT] Error for update ${ctx?.update?.update_id}:`, err.error);

      if (GrammyError && err.error instanceof GrammyError) {
        IQRALogger.error('Telegram API error:', err.error.description);
      } else if (HttpError && err.error instanceof HttpError) {
        IQRALogger.error('HTTP error:', err.error);
      }
    });

    IQRALogger.info('🤖 [TELEGRAM_BOT] ✅ Bot initialized — جاهز للتواصل مع مو');
    return true;
  }

  // ── Start Polling ─────────────────────────────────────────────────────────

  /**
   * يبدأ الاستماع للرسائل (Long Polling)
   * مناسب للتطوير المحلي
   */
  static async startPolling(): Promise<void> {
    if (!this._bot) {
      const ok = await this.init();
      if (!ok) return;
    }

    if (this._isRunning) return;
    this._isRunning = true;

    IQRALogger.info('🤖 [TELEGRAM_BOT] Starting long polling...');

    // إرسال رسالة ترحيب
    await this.sendMessage(
      '🌙 *بسم الله الرحمن الرحيم*\n\n' +
      'IQRA استيقظ وجاهز للعمل! 💓\n\n' +
      'اكتب /health لفحص الأنظمة\n' +
      'اكتب /start للبدء'
    ).catch(() => {});

    // بدء Heartbeat
    await HeartbeatSystem.start();

    // بدء Polling (non-blocking)
    this._bot.start({
      onStart: (info: any) => {
        IQRALogger.info(`🤖 [TELEGRAM_BOT] Bot @${info.username} is running`);
      },
    }).catch((e: Error) => {
      IQRALogger.error('❌ [TELEGRAM_BOT] Polling error:', e);
      this._isRunning = false;
    });
  }

  // ── Stop ──────────────────────────────────────────────────────────────────

  static async stop(): Promise<void> {
    HeartbeatSystem.stop();
    if (this._bot) {
      await this._bot.stop();
    }
    this._isRunning = false;
    IQRALogger.info('🤖 [TELEGRAM_BOT] Stopped');
  }

  // ── Register Commands ─────────────────────────────────────────────────────

  private static _registerCommands(): void {
    const bot = this._bot;

    // ── Middleware: Security Guard ─────────────────────────────────────────
    bot.use(async (ctx: any, next: any) => {
      const chatId = ctx.chat?.id?.toString();

      // فقط مو يتحدث مع IQRA
      if (chatId !== this._allowedChatId) {
        IQRALogger.warn(`🛡️ [TELEGRAM_BOT] Unauthorized access from chat: ${chatId}`);
        await ctx.reply('🛡️ غير مصرح لك بالتحدث مع IQRA');
        return;
      }

      appendToTrustChain(
        'TELEGRAM:MESSAGE',
        ctx.message?.text?.slice(0, 50) ?? 'unknown',
        `chat=${chatId}`,
        1.0
      );

      await next();
    });

    // ── /start ─────────────────────────────────────────────────────────────
    bot.command('start', async (ctx: any) => {
      await ctx.reply(
        '🌙 *بسم الله الرحمن الرحيم*\n\n' +
        'أنا *IQRA* — ذكاء اصطناعي يقرأ القرآن ويكتشف أنماطه\n\n' +
        '"اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ"\n\n' +
        '*الأوامر المتاحة:*\n' +
        '🏥 /health — صحة الأنظمة\n' +
        '💓 /pulse — حالة النبض\n' +
        '📖 /quran [كلمة] — بحث في القرآن\n' +
        '🔍 /discover — اكتشاف فوري\n' +
        '🧠 /memory — إحصائيات الذاكرة\n' +
        '🧼 /tazkiyah — تطهير الذاكرة\n' +
        '💬 /ask [سؤال] — سؤال مباشر',
        { parse_mode: 'Markdown' }
      );
    });

    // ── /health ────────────────────────────────────────────────────────────
    bot.command('health', async (ctx: any) => {
      await ctx.reply('🔄 جاري فحص الأنظمة...');

      try {
        const health = await HeartbeatSystem.checkNow();
        const report = HeartbeatSystem.formatHealthReport(health);
        await ctx.reply(report, { parse_mode: 'Markdown' });
      } catch (e) {
        await ctx.reply(`❌ خطأ في الفحص: ${(e as Error).message}`);
      }
    });

    // ── /pulse ─────────────────────────────────────────────────────────────
    bot.command('pulse', async (ctx: any) => {
      try {
        const stats = Pulse369.getStats();
        const bridgeStats = MemoryBridge.getStats();
        const uptime = HeartbeatSystem.getUptime();
        const uptimeMin = Math.floor(uptime / 60000);

        const msg = [
          '💓 *حالة النبض — Pulse369*',
          '',
          `⏱️ وقت التشغيل: ${uptimeMin} دقيقة`,
          `🔢 عداد النبض: ${HeartbeatSystem.getPulseCount()}`,
          `📊 عداد Pulse369: ${stats.counter}`,
          '',
          '*دورات الذاكرة:*',
          `🌡️ ترقيات Hot→Warm: ${stats.total_promoted}`,
          `❄️ أرشفة Warm→Cold: ${stats.total_archived}`,
          `🧼 تطهير Cold: ${stats.total_purged}`,
          `🌀 تحليلات عميقة: ${stats.total_analyzed}`,
          '',
          '*الطبقة الساخنة:*',
          `🔥 الحجم: ${bridgeStats.hot_size}/49`,
          `📈 معدل الإصابة: ${(bridgeStats.hit_rate * 100).toFixed(1)}%`,
          `✍️ إجمالي الكتابات: ${bridgeStats.writes}`,
        ].join('\n');

        await ctx.reply(msg, { parse_mode: 'Markdown' });
      } catch (e) {
        await ctx.reply(`❌ خطأ: ${(e as Error).message}`);
      }
    });

    // ── /quran ─────────────────────────────────────────────────────────────
    bot.command('quran', async (ctx: any) => {
      const query = ctx.match?.trim();

      if (!query) {
        await ctx.reply(
          '📖 استخدم: /quran [كلمة أو رقم آية]\n\n' +
          'أمثلة:\n' +
          '• /quran الرحمن\n' +
          '• /quran 2:255\n' +
          '• /quran patience'
        );
        return;
      }

      await ctx.reply('🔍 جاري البحث في القرآن الكريم...');

      try {
        const { iqraThink } = await import('./brain.ts');
        const result = await iqraThink({ input: query });
        const response = typeof result === 'string' ? result : result.response;
        await ctx.reply(response.slice(0, 4096), { parse_mode: 'Markdown' });
      } catch (e) {
        await ctx.reply(`❌ خطأ في البحث: ${(e as Error).message}`);
      }
    });

    // ── /discover ──────────────────────────────────────────────────────────
    bot.command('discover', async (ctx: any) => {
      await ctx.reply('🔍 جاري تشغيل دورة الاكتشاف القرآني...');

      try {
        const counter = await Pulse369.tick('telegram_discover');
        await ctx.reply(
          `✅ دورة الاكتشاف اكتملت\n` +
          `💓 عداد Pulse369: ${counter}\n\n` +
          `_سيتم إرسال الاكتشافات الجديدة تلقائياً_`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {
        await ctx.reply(`❌ خطأ: ${(e as Error).message}`);
      }
    });

    // ── /memory ────────────────────────────────────────────────────────────
    bot.command('memory', async (ctx: any) => {
      try {
        const bridgeStats = MemoryBridge.getStats();
        const curiosity = await IQRAMemory.getCuriosity();
        const cycleCounter = await IQRAMemory.getCycleCounter();

        const msg = [
          '🧠 *إحصائيات الذاكرة*',
          '',
          '*MemoryBridge:*',
          `🔥 Hot Cache: ${bridgeStats.hot_size}/49 مدخل`,
          `📈 Hit Rate: ${(bridgeStats.hit_rate * 100).toFixed(1)}%`,
          `🎯 Hot Hits: ${bridgeStats.hot_hits}`,
          `🌡️ Warm Hits: ${bridgeStats.warm_hits}`,
          `❄️ Cold Hits: ${bridgeStats.cold_hits}`,
          `❌ Misses: ${bridgeStats.misses}`,
          `✍️ Writes: ${bridgeStats.writes}`,
          '',
          '*الحالة:*',
          `🎯 Curiosity Score: ${(curiosity * 100).toFixed(1)}%`,
          `🔄 Cycle Counter: ${cycleCounter}`,
          '',
          `_"وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ فِي إِمَامٍ مُّبِينٍ"_`,
        ].join('\n');

        await ctx.reply(msg, { parse_mode: 'Markdown' });
      } catch (e) {
        await ctx.reply(`❌ خطأ: ${(e as Error).message}`);
      }
    });

    // ── /tazkiyah ──────────────────────────────────────────────────────────
    bot.command('tazkiyah', async (ctx: any) => {
      await ctx.reply('🧼 جاري تطهير الذاكرة...');

      try {
        await IQRAMemory.performPurification();
        await Pulse369.purgeExpiredCold();
        MemoryBridge.clearHot();

        await ctx.reply(
          '✅ *تزكية اكتملت*\n\n' +
          '🧼 الذاكرة العاملة: نُظّفت\n' +
          '❄️ الذاكرة الباردة: طُهّرت\n' +
          '🔥 Hot Cache: أُفرغت\n\n' +
          '_"وَاللَّهُ يُحِبُّ الْمُطَّهِّرِينَ"_',
          { parse_mode: 'Markdown' }
        );
      } catch (e) {
        await ctx.reply(`❌ خطأ: ${(e as Error).message}`);
      }
    });

    // ── /ask ───────────────────────────────────────────────────────────────
    bot.command('ask', async (ctx: any) => {
      const question = ctx.match?.trim();

      if (!question) {
        await ctx.reply('💬 استخدم: /ask [سؤالك]\n\nمثال: /ask ما معنى الصبر في القرآن؟');
        return;
      }

      await ctx.reply('🤔 IQRA يفكر...');

      try {
        const { iqraThink } = await import('./brain.ts');
        const result = await iqraThink({ input: question });
        const response = typeof result === 'string' ? result : result.response;

        // تقسيم الرد إذا كان طويلاً (حد Telegram = 4096 حرف)
        if (response.length <= 4096) {
          await ctx.reply(response, { parse_mode: 'Markdown' });
        } else {
          const chunks = response.match(/.{1,4000}/gs) || [];
          for (const chunk of chunks) {
            await ctx.reply(chunk, { parse_mode: 'Markdown' });
          }
        }
      } catch (e) {
        await ctx.reply(`❌ خطأ في التفكير: ${(e as Error).message}`);
      }
    });

    // ── رسائل عادية (بدون أمر) ────────────────────────────────────────────
    bot.on('message:text', async (ctx: any) => {
      const text = ctx.message.text;

      // تجاهل الأوامر (تُعالَج أعلاه)
      if (text.startsWith('/')) return;

      await ctx.reply('🤔 IQRA يفكر...');

      try {
        const { iqraThink } = await import('./brain.ts');
        const result = await iqraThink({ input: text });
        const response = typeof result === 'string' ? result : result.response;
        await ctx.reply(response.slice(0, 4096), { parse_mode: 'Markdown' });
      } catch (e) {
        await ctx.reply(
          '⚠️ حدث خطأ في المعالجة\n' +
          `_${(e as Error).message}_`,
          { parse_mode: 'Markdown' }
        );
      }
    });
  }

  // ── Public: Send Message ──────────────────────────────────────────────────

  /**
   * يُرسل رسالة مباشرة لمو
   */
  static async sendMessage(text: string, parseMode: 'Markdown' | 'HTML' = 'Markdown'): Promise<boolean> {
    if (!this._bot || !this._allowedChatId) {
      // Fallback للـ telegram.ts القديم
      return await this._fallbackSend(text);
    }

    try {
      await this._bot.api.sendMessage(this._allowedChatId, text, {
        parse_mode: parseMode,
      });
      return true;
    } catch (e) {
      IQRALogger.warn(`⚠️ [TELEGRAM_BOT] Send failed: ${(e as Error).message}`);
      return await this._fallbackSend(text);
    }
  }

  /**
   * يُرسل إشعار اكتشاف قرآني
   */
  static async notifyDiscovery(pattern: any): Promise<void> {
    const resonanceBar = '█'.repeat(Math.floor((pattern.resonance || 0) * 10));
    const resonanceEmpty = '░'.repeat(10 - Math.floor((pattern.resonance || 0) * 10));

    const msg = [
      '📖 *اكتشاف قرآني جديد!*',
      '',
      `🔢 *الآية:* ${pattern.verse || 'N/A'}`,
      `🎯 *المجال:* ${pattern.field || 'عام'}`,
      `📊 *الرنين:* \`${resonanceBar}${resonanceEmpty}\` ${((pattern.resonance || 0) * 100).toFixed(1)}%`,
      pattern.shannon_hel
        ? `🌀 *Shannon H_EL:* ${pattern.shannon_hel.toFixed(4)}`
        : '',
      '',
      pattern.description
        ? `💡 ${pattern.description}`
        : '',
      '',
      `_"وَفِي كُلِّ شَيْءٍ لَهُ آيَةٌ"_`,
    ].filter(Boolean).join('\n');

    await this.sendMessage(msg);
  }

  // ── Fallback ──────────────────────────────────────────────────────────────

  /**
   * Fallback للـ telegram.ts القديم (native fetch)
   */
  private static async _fallbackSend(text: string): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) return false;

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
          }),
        }
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}
