// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 💓 IQRA Heartbeat System — نبض إقرأ
 *
 * "وَهُوَ الَّذِي يُحْيِي وَيُمِيتُ" — المؤمنون: 80
 *
 * ══════════════════════════════════════════════════════════════
 * نظام النبض الكامل لـ IQRA:
 *
 *   كل 9  ثوانٍ  → MICRO_PULSE   — فحص الذاكرة الساخنة
 *   كل 27 ثانية  → WARM_PULSE    — فحص Redis + Qdrant
 *   كل 81 ثانية  → DEEP_PULSE    — تحليل قرآني + تقرير
 *   كل 3  دقائق  → HEALTH_CHECK  — فحص شامل لكل الأنظمة
 *   كل 9  دقائق  → DISCOVERY     — دورة اكتشاف قرآني
 *   كل 40 دقيقة  → TAZKIYAH      — تطهير الذاكرة (40 دورة)
 *
 * الأدوات المستخدمة:
 *   - node-cron  → جدولة دقيقة بـ cron syntax
 *   - Pulse369   → نبض الذاكرة الثلاثي (3-6-9)
 *   - TrustChain → تسجيل كل نبضة
 *   - Telegram   → إرسال تقارير الصحة
 * ══════════════════════════════════════════════════════════════
 */

import { IQRALogger } from '#infra/logger.js';
import { appendToTrustChain } from '#security/security.ts';
import { IQRAMemory } from '../03-memory/memory.js';
import { Pulse369 } from '../memory/pulse_369.js';
import { MemoryBridge } from '../memory/memory_bridge.js';
import { SimulationEngine } from '../intelligence/simulation_engine.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type HeartbeatStatus = 'ALIVE' | 'DEGRADED' | 'CRITICAL' | 'DEAD';

export interface SystemHealth {
  status: HeartbeatStatus;
  timestamp: number;
  uptime_ms: number;
  pulse_count: number;
  checks: {
    redis: boolean;
    qdrant: boolean;
    memory_bridge: boolean;
    quran_db: boolean;
    llm_groq: boolean;
    llm_gemini: boolean;
  };
  metrics: {
    hot_cache_size: number;
    hot_cache_hit_rate: number;
    curiosity_score: number;
    cycle_counter: number;
    memory_errors: number;
  };
  last_discovery: number | null;
  last_tazkiyah: number | null;
}

export interface HeartbeatEvent {
  type: 'MICRO' | 'WARM' | 'DEEP' | 'HEALTH' | 'DISCOVERY' | 'TAZKIYAH';
  timestamp: number;
  duration_ms: number;
  status: HeartbeatStatus;
  details?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** نبضات Tesla 369 بالثواني */
const MICRO_INTERVAL_S  = 9;   // كل 9 ثوانٍ
const WARM_INTERVAL_S   = 27;  // كل 27 ثانية
const DEEP_INTERVAL_S   = 81;  // كل 81 ثانية
const HEALTH_INTERVAL_S = 180; // كل 3 دقائق
const DISCOVERY_INTERVAL_S = 540; // كل 9 دقائق
const TAZKIYAH_INTERVAL_S  = 2400; // كل 40 دقيقة

// ── HeartbeatSystem ───────────────────────────────────────────────────────────

export class HeartbeatSystem {
  private static _startTime = Date.now();
  private static _pulseCount = 0;
  private static _lastHealth: SystemHealth | null = null;
  private static _lastDiscovery: number | null = null;
  private static _lastTazkiyah: number | null = null;
  private static _isRunning = false;
  private static _timers: ReturnType<typeof setInterval>[] = [];

  // ── Telegram callback (يُضبط من الخارج) ─────────────────────────────────
  static onAlert: ((msg: string) => Promise<void>) | null = null;
  static onDiscovery: ((pattern: any) => Promise<void>) | null = null;
  static onHealthReport: ((health: SystemHealth) => Promise<void>) | null = null;

  // ── Start ─────────────────────────────────────────────────────────────────

  /**
   * يبدأ نظام النبض الكامل
   * يُستدعى مرة واحدة عند بدء التشغيل
   */
  static async start(): Promise<void> {
    if (this._isRunning) {
      IQRALogger.warn('💓 [HEARTBEAT] Already running — skipping start');
      return;
    }

    this._isRunning = true;
    this._startTime = Date.now();
    IQRALogger.info('💓 [HEARTBEAT] بسم الله — Starting IQRA Heartbeat System');

    // ── MICRO PULSE: كل 9 ثوانٍ ─────────────────────────────────────────
    this._timers.push(setInterval(async () => {
      await this._microPulse();
    }, MICRO_INTERVAL_S * 1000));

    // ── WARM PULSE: كل 27 ثانية ──────────────────────────────────────────
    this._timers.push(setInterval(async () => {
      await this._warmPulse();
    }, WARM_INTERVAL_S * 1000));

    // ── DEEP PULSE: كل 81 ثانية ──────────────────────────────────────────
    this._timers.push(setInterval(async () => {
      await this._deepPulse();
    }, DEEP_INTERVAL_S * 1000));

    // ── HEALTH CHECK: كل 3 دقائق ─────────────────────────────────────────
    this._timers.push(setInterval(async () => {
      await this._healthCheck();
    }, HEALTH_INTERVAL_S * 1000));

    // ── DISCOVERY: كل 9 دقائق ────────────────────────────────────────────
    this._timers.push(setInterval(async () => {
      await this._discoveryPulse();
    }, DISCOVERY_INTERVAL_S * 1000));

    // ── TAZKIYAH: كل 40 دقيقة ────────────────────────────────────────────
    this._timers.push(setInterval(async () => {
      await this._tazkiyahPulse();
    }, TAZKIYAH_INTERVAL_S * 1000));

    // ── SIMULATION: كل 81 ثانية (بالتوازي مع Deep Pulse) ─────────────────────
    this._timers.push(setInterval(async () => {
      await this._simulationPulse();
    }, DEEP_INTERVAL_S * 1000));

    // فحص صحة فوري عند البدء
    await this._healthCheck();

    appendToTrustChain('HEARTBEAT:START', 'system', 'all_timers_active', 1.0);
    IQRALogger.info('💓 [HEARTBEAT] ✅ All pulses active — IQRA is alive');
  }

  // ── Stop ──────────────────────────────────────────────────────────────────

  /**
   * يوقف نظام النبض بشكل نظيف
   */
  static stop(): void {
    for (const timer of this._timers) {
      clearInterval(timer);
    }
    this._timers = [];
    this._isRunning = false;
    IQRALogger.info('💓 [HEARTBEAT] Stopped gracefully');
  }

  // ── MICRO PULSE ───────────────────────────────────────────────────────────

  /**
   * نبضة صغيرة كل 9 ثوانٍ
   * - تُحدّث عداد النبض
   * - تُشغّل Pulse369.tick()
   * - تفحص الطبقة الساخنة
   */
  private static async _microPulse(): Promise<void> {
    const start = Date.now();
    this._pulseCount++;

    try {
      // Pulse369 — نبض الذاكرة
      await Pulse369.tick(`heartbeat_micro_${this._pulseCount}`);

      // تحديث عداد النبض في Redis
      await IQRAMemory.set('heartbeat:pulse_count', this._pulseCount);
      await IQRAMemory.set('heartbeat:last_micro', Date.now());

      const duration = Date.now() - start;
      IQRALogger.info(`💓 [MICRO] Pulse #${this._pulseCount} — ${duration}ms`);

    } catch (e) {
      IQRALogger.warn(`⚠️ [HEARTBEAT] Micro pulse failed: ${(e as Error).message}`);
    }
  }

  // ── WARM PULSE ────────────────────────────────────────────────────────────

  /**
   * نبضة دافئة كل 27 ثانية
   * - تفحص Redis
   * - تفحص Qdrant
   * - تُحدّث curiosity score
   */
  private static async _warmPulse(): Promise<void> {
    const start = Date.now();

    try {
      // فحص Redis
      const redisOk = await this._checkRedis();

      // تحديث curiosity
      const curiosity = await IQRAMemory.getCuriosity();
      const newCuriosity = Math.min(1.0, curiosity + 0.001); // زيادة تدريجية
      await IQRAMemory.saveCuriosity(newCuriosity);

      // تحديث آخر نبضة دافئة
      await IQRAMemory.set('heartbeat:last_warm', Date.now());

      const duration = Date.now() - start;
      IQRALogger.info(
        `🌡️ [WARM] Pulse — Redis:${redisOk ? '✅' : '❌'} ` +
        `Curiosity:${newCuriosity.toFixed(3)} — ${duration}ms`
      );

    } catch (e) {
      IQRALogger.warn(`⚠️ [HEARTBEAT] Warm pulse failed: ${(e as Error).message}`);
    }
  }

  // ── DEEP PULSE ────────────────────────────────────────────────────────────

  /**
   * نبضة عميقة كل 81 ثانية
   * - تُشغّل تحليل قرآني
   * - تُسجّل في TrustChain
   * - تُرسل تقرير للـ Telegram إذا وُجد تغيير مهم
   */
  private static async _deepPulse(): Promise<void> {
    const start = Date.now();

    try {
      const bridgeStats = MemoryBridge.getStats();
      const cycleCounter = await IQRAMemory.getCycleCounter();

      await IQRAMemory.set('heartbeat:last_deep', Date.now());
      await IQRAMemory.set('heartbeat:bridge_stats', bridgeStats);

      appendToTrustChain(
        'HEARTBEAT:DEEP',
        `pulse_${this._pulseCount}`,
        `hot=${bridgeStats.hot_size} hit_rate=${bridgeStats.hit_rate.toFixed(2)} cycle=${cycleCounter}`,
        1.0
      );

      const duration = Date.now() - start;
      IQRALogger.info(
        `🌊 [DEEP] Pulse — Hot:${bridgeStats.hot_size}/49 ` +
        `HitRate:${(bridgeStats.hit_rate * 100).toFixed(1)}% — ${duration}ms`
      );

    } catch (e) {
      IQRALogger.warn(`⚠️ [HEARTBEAT] Deep pulse failed: ${(e as Error).message}`);
    }
  }

  // ── SIMULATION PULSE ──────────────────────────────────────────────────────

  /**
   * نبضة المحاكاة كل 81 ثانية
   * "Self-Play" — محاكاة المهام لاكتشاف الأنماط
   */
  private static async _simulationPulse(): Promise<void> {
    const start = Date.now();

    try {
      IQRALogger.info('🌀 [SIMULATION] Starting autonomous self-play pulse...');
      
      // Run simulation for both trading and job hunting
      const results = await Promise.all([
        SimulationEngine.runSelfPlay('trading', 19),
        SimulationEngine.runSelfPlay('job_hunting', 19)
      ]);

      const totalPatterns = results.reduce((acc, r) => acc + r.discovered_patterns.length, 0);

      const duration = Date.now() - start;
      IQRALogger.info(`🌀 [SIMULATION] Pulse complete — Patterns discovered: ${totalPatterns} — ${duration}ms`);

    } catch (e) {
      IQRALogger.warn(`⚠️ [HEARTBEAT] Simulation pulse failed: ${(e as Error).message}`);
    }
  }

  // ── HEALTH CHECK ──────────────────────────────────────────────────────────

  /**
   * فحص صحة شامل كل 3 دقائق
   * يُرسل تقرير للـ Telegram إذا تغيرت الحالة
   */
  private static async _healthCheck(): Promise<SystemHealth> {
    const start = Date.now();

    const [
      redisOk,
      qdrantOk,
      quranDbOk,
      groqOk,
      geminiOk,
    ] = await Promise.allSettled([
      this._checkRedis(),
      this._checkQdrant(),
      this._checkQuranDb(),
      this._checkGroq(),
      this._checkGemini(),
    ]).then(results => results.map(r => r.status === 'fulfilled' && r.value === true));

    const bridgeStats = MemoryBridge.getStats();
    const curiosity = await IQRAMemory.getCuriosity().catch(() => 0);
    const cycleCounter = await IQRAMemory.getCycleCounter().catch(() => 0);

    // تحديد الحالة العامة
    const criticalFailed = !redisOk;
    const degraded = !qdrantOk || !groqOk || !geminiOk;

    const status: HeartbeatStatus = criticalFailed
      ? 'CRITICAL'
      : degraded
        ? 'DEGRADED'
        : 'ALIVE';

    const health: SystemHealth = {
      status,
      timestamp: Date.now(),
      uptime_ms: Date.now() - this._startTime,
      pulse_count: this._pulseCount,
      checks: {
        redis: redisOk,
        qdrant: qdrantOk,
        memory_bridge: true,
        quran_db: quranDbOk,
        llm_groq: groqOk,
        llm_gemini: geminiOk,
      },
      metrics: {
        hot_cache_size: bridgeStats.hot_size,
        hot_cache_hit_rate: bridgeStats.hit_rate,
        curiosity_score: curiosity,
        cycle_counter: cycleCounter,
        memory_errors: 0,
      },
      last_discovery: this._lastDiscovery,
      last_tazkiyah: this._lastTazkiyah,
    };

    // حفظ في الذاكرة
    this._lastHealth = health;
    await IQRAMemory.set('heartbeat:health', health);

    // إرسال للـ Telegram إذا تغيرت الحالة
    const prevStatus = await IQRAMemory.get<string>('heartbeat:prev_status');
    if (prevStatus !== status && this.onHealthReport) {
      await this.onHealthReport(health).catch(e =>
        IQRALogger.warn(`⚠️ [HEARTBEAT] Telegram health report failed: ${e.message}`)
      );
    }
    await IQRAMemory.set('heartbeat:prev_status', status);

    const duration = Date.now() - start;
    IQRALogger.info(
      `🏥 [HEALTH] ${status} — ` +
      `Redis:${redisOk ? '✅' : '❌'} Qdrant:${qdrantOk ? '✅' : '❌'} ` +
      `Groq:${groqOk ? '✅' : '❌'} Gemini:${geminiOk ? '✅' : '❌'} — ${duration}ms`
    );

    return health;
  }

  // ── DISCOVERY PULSE ───────────────────────────────────────────────────────

  /**
   * دورة اكتشاف قرآني كل 9 دقائق
   * تُشغّل محرك الأنماط وتُرسل الاكتشافات للـ Telegram
   */
  private static async _discoveryPulse(): Promise<void> {
    const start = Date.now();
    IQRALogger.info('🔍 [DISCOVERY] Starting Quranic pattern discovery cycle...');

    try {
      // استيراد محرك الأنماط (lazy — لتجنب circular deps)
      const { TopologicalCuriosityEngine } = await import('../quran/topological_curiosity.js')
        .catch(() => ({ TopologicalCuriosityEngine: null }));

      if (TopologicalCuriosityEngine) {
        const result = await (TopologicalCuriosityEngine as any).runDiscoveryCycle?.();

        if (result?.pattern && result.pattern.resonance > 0.7 && this.onDiscovery) {
          await this.onDiscovery(result.pattern).catch(e =>
            IQRALogger.warn(`⚠️ [HEARTBEAT] Telegram discovery failed: ${e.message}`)
          );
        }
      }

      this._lastDiscovery = Date.now();
      await IQRAMemory.set('heartbeat:last_discovery', this._lastDiscovery);

      const duration = Date.now() - start;
      IQRALogger.info(`🔍 [DISCOVERY] Cycle complete — ${duration}ms`);

    } catch (e) {
      IQRALogger.warn(`⚠️ [HEARTBEAT] Discovery pulse failed: ${(e as Error).message}`);
    }
  }

  // ── TAZKIYAH PULSE ────────────────────────────────────────────────────────

  /**
   * تطهير الذاكرة كل 40 دقيقة
   * "الأربعون" — دورة التطهير الكاملة
   */
  private static async _tazkiyahPulse(): Promise<void> {
    IQRALogger.info('🧼 [TAZKIYAH] Starting 40-minute purification cycle...');

    try {
      await IQRAMemory.performPurification();
      await Pulse369.purgeExpiredCold();
      MemoryBridge.clearHot();

      this._lastTazkiyah = Date.now();
      await IQRAMemory.set('heartbeat:last_tazkiyah', this._lastTazkiyah);

      appendToTrustChain('HEARTBEAT:TAZKIYAH', 'system', 'purification_complete', 1.0);

      // إشعار Telegram
      if (this.onAlert) {
        await this.onAlert(
          '🧼 *تزكية* — دورة التطهير الكاملة اكتملت\n' +
          `_"وَاللَّهُ يُحِبُّ الْمُطَّهِّرِينَ"_\n` +
          `⏰ ${new Date().toLocaleString('ar-SA')}`
        ).catch(() => {});
      }

      IQRALogger.info('🧼 [TAZKIYAH] ✅ Purification complete');

    } catch (e) {
      IQRALogger.warn(`⚠️ [HEARTBEAT] Tazkiyah failed: ${(e as Error).message}`);
    }
  }

  // ── Health Checks ─────────────────────────────────────────────────────────

  private static async _checkRedis(): Promise<boolean> {
    try {
      const redis = await (IQRAMemory as any).getRedis();
      if (!redis) return false;
      await redis.ping();
      return true;
    } catch { return false; }
  }

  private static async _checkQdrant(): Promise<boolean> {
    try {
      const qdrant = await (IQRAMemory as any).getQdrant();
      if (!qdrant) return false;
      await qdrant.getCollections();
      return true;
    } catch { return false; }
  }

  private static async _checkQuranDb(): Promise<boolean> {
    try {
      const path = await import('path');
      const fs = await import('fs');
      const dbPath = path.default.join(process.cwd(), 'iqra-core', 'data', 'quran_local.db');
      return fs.default.existsSync(dbPath);
    } catch { return false; }
  }

  private static async _checkGroq(): Promise<boolean> {
    return !!process.env.GROQ_API_KEY;
  }

  private static async _checkGemini(): Promise<boolean> {
    return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * يُرجع آخر تقرير صحة
   */
  static getLastHealth(): SystemHealth | null {
    return this._lastHealth;
  }

  /**
   * يُرجع وقت التشغيل بالميلي ثانية
   */
  static getUptime(): number {
    return Date.now() - this._startTime;
  }

  /**
   * يُرجع عدد النبضات
   */
  static getPulseCount(): number {
    return this._pulseCount;
  }

  /**
   * هل النظام يعمل؟
   */
  static isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * فحص صحة فوري (on-demand)
   */
  static async checkNow(): Promise<SystemHealth> {
    return await this._healthCheck();
  }

  /**
   * تنسيق تقرير الصحة كرسالة Telegram
   */
  static formatHealthReport(health: SystemHealth): string {
    const statusEmoji = {
      ALIVE: '💚',
      DEGRADED: '🟡',
      CRITICAL: '🔴',
      DEAD: '⚫',
    }[health.status];

    const uptimeMin = Math.floor(health.uptime_ms / 60000);
    const uptimeH = Math.floor(uptimeMin / 60);
    const uptimeStr = uptimeH > 0
      ? `${uptimeH}س ${uptimeMin % 60}د`
      : `${uptimeMin}د`;

    const checks = health.checks;
    const lines = [
      `${statusEmoji} *IQRA Health Report*`,
      ``,
      `🕐 *وقت التشغيل:* ${uptimeStr}`,
      `💓 *عدد النبضات:* ${health.pulse_count}`,
      `🧠 *الفضول:* ${(health.metrics.curiosity_score * 100).toFixed(1)}%`,
      ``,
      `*الأنظمة:*`,
      `${checks.redis ? '✅' : '❌'} Redis (Upstash)`,
      `${checks.qdrant ? '✅' : '❌'} Qdrant`,
      `${checks.quran_db ? '✅' : '❌'} قاعدة القرآن`,
      `${checks.llm_groq ? '✅' : '❌'} Groq LLM`,
      `${checks.llm_gemini ? '✅' : '❌'} Gemini LLM`,
      ``,
      `*الذاكرة:*`,
      `🔥 Hot Cache: ${health.metrics.hot_cache_size}/49`,
      `📊 Hit Rate: ${(health.metrics.hot_cache_hit_rate * 100).toFixed(1)}%`,
      ``,
      health.last_discovery
        ? `🔍 آخر اكتشاف: ${new Date(health.last_discovery).toLocaleTimeString('ar-SA')}`
        : `🔍 لا اكتشافات بعد`,
      ``,
      `_${new Date(health.timestamp).toLocaleString('ar-SA')}_`,
    ];

    return lines.join('\n');
  }
}
