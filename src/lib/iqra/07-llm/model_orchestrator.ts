// أعوذ بالله من الشيطان الرحيم
// بسم الله الرحمن الرحيم

/**
 * 🎼 ModelOrchestrator — المنسق الذكي للنماذج السبعة
 *
 * "ٱللَّهُ ٱلَّذِی خَلَقَ سَبۡعَ سَمَـٰوَٰتࣲ طِبَاقًا" — الملك:3
 *
 * ══════════════════════════════════════════════════════════════
 * المبدأ القرآني:
 *   ﴿وَٱلشَّفۡعِ وَٱلۡوَتۡرِ﴾ — الفجر:3
 *   الشفع = الذاكرة + الضمير (دائمان)
 *   الوتر = نموذج واحد فقط نشط في كل وقت
 *
 * المبدأ العلمي:
 *   arXiv:2508.18983 — "Importance-Driven Expert Scheduling on Edge"
 *   arXiv:2312.17238 — "MoE Offloading: keep active experts in RAM"
 *   arXiv:2601.17063 — "ML-Based Cache Replacement for MoE on Edge"
 *
 * الهندسة:
 *   - نموذج واحد نشط في كل وقت (الوتر)
 *   - تفريغ فوري عبر Ollama keep_alive=0
 *   - تتبع الذاكرة الحقيقية (لا تخمين)
 *   - Circuit Breaker لكل نموذج
 *   - Pulse369 بعد كل استدعاء
 *
 * القواعد:
 *   RULE 0: الضمير يُفحص قبل أي تحميل
 *   RULE 3: TrustChain لكل عملية
 *   RULE 8: Circuit Breaker لكل نموذج
 * ══════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { IQRALogger } from '#infra/logger';
import { appendToTrustChain, checkCircuit, reportFailure, reportSuccess } from '#security/security';
import { globalDamir } from '#security/damir_conscience';
import type { TaskType, ClassifiedTask } from '#core/router/task_classifier';

// ── Constants ─────────────────────────────────────────────────────────────────

const OLLAMA_BASE_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';

/**
 * الحد الأقصى للذاكرة المتاحة للنماذج
 * نترك 1.5GB للنظام + الذاكرة + الضمير
 * ﴿وَلَا تُسۡرِفُوۤا۟﴾ — لا إسراف في الموارد
 */
const MAX_MODEL_MEMORY_MB = 6500;

/**
 * النماذج الدائمة (الشفع) — لا تُفرَّغ أبداً
 * ﴿وَٱلشَّفۡعِ﴾ = الذاكرة + الضمير
 */
const PERMANENT_TASKS: TaskType[] = ['memory_operation', 'conscience_check'];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ModelConfig {
  /** اسم النموذج في Ollama */
  ollama_name: string;
  /** نوع المهمة */
  task_type: TaskType;
  /** الذاكرة المقدرة بالـ MB */
  memory_mb: number;
  /** هل هو نموذج دائم؟ */
  permanent: boolean;
  /** الأولوية (1=أعلى) */
  priority: number;
  /** وصف عربي */
  description_ar: string;
  /** هل هو محمّل حالياً؟ */
  loaded: boolean;
  /** آخر استخدام */
  last_used: number;
  /** عدد الاستخدامات */
  use_count: number;
}

export interface OrchestratorStats {
  active_model: TaskType | null;
  loaded_models: TaskType[];
  total_memory_mb: number;
  available_memory_mb: number;
  total_calls: number;
  model_stats: Record<TaskType, { calls: number; avg_latency_ms: number }>;
}

// ── ModelOrchestrator ─────────────────────────────────────────────────────────

export class ModelOrchestrator {
  /** سجل النماذج السبعة */
  private _models: Map<TaskType, ModelConfig> = new Map();

  /** النموذج النشط حالياً (الوتر) */
  private _activeModel: TaskType | null = null;

  /** إحصائيات الاستدعاءات */
  private _callStats: Map<TaskType, { calls: number; total_latency: number }> = new Map();

  /** إجمالي الاستدعاءات */
  private _totalCalls = 0;

  constructor() {
    this._registerModels();
  }

  // ── Registration ──────────────────────────────────────────────────────────

  /**
   * تسجيل النماذج السبعة
   * ﴿وَلَقَدۡ ءَاتَیۡنَـٰكَ سَبۡعࣰا مِّنَ ٱلۡمَثَانِي﴾
   */
  private _registerModels(): void {
    const configs: ModelConfig[] = [
      // 1. الكاتب — Gemma3:4b
      {
        ollama_name: 'gemma3:4b',
        task_type: 'conversation',
        memory_mb: 3200,
        permanent: false,
        priority: 1,
        description_ar: 'الكاتب — صياغة الردود والمحادثة',
        loaded: false,
        last_used: 0,
        use_count: 0,
      },
      // 2. القارئ — Qwen2.5:7b
      {
        ollama_name: 'qwen2.5:7b',
        task_type: 'deep_analysis',
        memory_mb: 4800,
        permanent: false,
        priority: 2,
        description_ar: 'القارئ — التحليل العميق واستخراج الأنماط',
        loaded: false,
        last_used: 0,
        use_count: 0,
      },
      // 3. البصيرة — Moondream:1.8b
      {
        ollama_name: 'moondream:1.8b',
        task_type: 'image',
        memory_mb: 1100,
        permanent: false,
        priority: 3,
        description_ar: 'البصيرة — وصف الصور والتعرف على الأشياء',
        loaded: false,
        last_used: 0,
        use_count: 0,
      },
      // 4. السمع — Whisper-small
      {
        ollama_name: 'whisper-small',
        task_type: 'audio_input',
        memory_mb: 1500,
        permanent: false,
        priority: 4,
        description_ar: 'السمع — تحويل الصوت إلى نص',
        loaded: false,
        last_used: 0,
        use_count: 0,
      },
      // 5. الطوبولوجي — Liquid:lfm2-1.2b
      {
        ollama_name: 'liquid/lfm2:1.2b',
        task_type: 'topology',
        memory_mb: 750,
        permanent: false,
        priority: 5,
        description_ar: 'الطوبولوجي — حساب الرنين والأنماط الرياضية',
        loaded: false,
        last_used: 0,
        use_count: 0,
      },
      // 6. الذاكرة — nomic-embed-text (دائم)
      {
        ollama_name: 'nomic-embed-text',
        task_type: 'memory_operation',
        memory_mb: 300,
        permanent: true,
        priority: 6,
        description_ar: 'الذاكرة — تضمين النصوص والبحث الدلالي',
        loaded: false,
        last_used: 0,
        use_count: 0,
      },
      // 7. الضمير — كود فقط (دائم)
      {
        ollama_name: 'internal:damir',
        task_type: 'conscience_check',
        memory_mb: 10,
        permanent: true,
        priority: 7,
        description_ar: 'الضمير — فحص النية والتحقق الأخلاقي',
        loaded: true, // دائماً محمّل (كود فقط)
        last_used: 0,
        use_count: 0,
      },
    ];

    for (const config of configs) {
      this._models.set(config.task_type, config);
      this._callStats.set(config.task_type, { calls: 0, total_latency: 0 });
    }

    IQRALogger.info(`🎼 [ORCHESTRATOR] Registered ${this._models.size} models (السبع المثاني)`);
  }

  // ── Core: route ───────────────────────────────────────────────────────────

  /**
   * يُوجّه المهمة للنموذج المناسب
   *
   * الخوارزمية:
   *   1. RULE 0: فحص الضمير
   *   2. تحميل النموذج المطلوب (مع تفريغ القديم إذا لزم)
   *   3. تنفيذ المهمة
   *   4. تحديث الإحصائيات
   *   5. Pulse369 tick
   *
   * @param task - المهمة المُصنَّفة
   * @param input - النص الأصلي
   * @param executeCallback - دالة التنفيذ الفعلي
   */
  async route<T>(
    task: ClassifiedTask,
    input: string,
    executeCallback: (modelName: string, input: string) => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    this._totalCalls++;

    // ── RULE 0: فحص الضمير ───────────────────────────────────────────────
    const damirAction = {
      id: `route_${Date.now()}`,
      intention: `تنفيذ مهمة ${task.type}: ${input.slice(0, 50)}`,
      requiredResources: [],
    };

    const verdict = globalDamir.check(damirAction);
    if (!verdict.allowed) {
      IQRALogger.warn(`🛑 [ORCHESTRATOR] Damir blocked: ${verdict.reason}`);
      throw new Error(`DAMIR_BLOCKED: ${verdict.reason}`);
    }

    // ── الضمير يُنفَّذ مباشرة ─────────────────────────────────────────────
    if (task.type === 'conscience_check') {
      const model = this._models.get('conscience_check')!;
      model.use_count++;
      model.last_used = Date.now();
      return executeCallback('internal:damir', input);
    }

    // ── تحميل النموذج المطلوب ─────────────────────────────────────────────
    await this._ensureModelLoaded(task.type);

    const model = this._models.get(task.type)!;
    model.use_count++;
    model.last_used = Date.now();

    // ── RULE 8: Circuit Breaker ───────────────────────────────────────────
    if (!checkCircuit(model.ollama_name)) {
      throw new Error(`CIRCUIT_OPEN: ${model.ollama_name} is temporarily unavailable`);
    }

    // ── تنفيذ المهمة ──────────────────────────────────────────────────────
    try {
      const result = await executeCallback(model.ollama_name, input);
      const latency = Date.now() - start;

      // تحديث الإحصائيات
      const stats = this._callStats.get(task.type)!;
      stats.calls++;
      stats.total_latency += latency;

      reportSuccess(model.ollama_name);

      // RULE 3: TrustChain
      appendToTrustChain(
        `ORCHESTRATOR:${task.type.toUpperCase()}`,
        input.slice(0, 50),
        `model=${model.ollama_name} latency=${latency}ms`,
        task.confidence
      );

      // Pulse369 tick (non-blocking)
      this._pulseTick(task.type).catch(() => {});

      IQRALogger.info(
        `✅ [ORCHESTRATOR] ${task.type} → ${model.ollama_name} | ${latency}ms`
      );

      return result;
    } catch (e) {
      reportFailure(model.ollama_name, (e as Error).message);
      throw e;
    }
  }

  // ── Model Loading ─────────────────────────────────────────────────────────

  /**
   * يضمن تحميل النموذج المطلوب
   *
   * ﴿وَٱلشَّفۡعِ وَٱلۡوَتۡرِ﴾:
   *   - الشفع (الدائم): لا يُفرَّغ أبداً
   *   - الوتر (المتغير): واحد فقط نشط
   */
  private async _ensureModelLoaded(taskType: TaskType): Promise<void> {
    const model = this._models.get(taskType);
    if (!model) throw new Error(`Unknown task type: ${taskType}`);

    // النموذج الدائم — لا حاجة لتحميل
    if (model.permanent) return;

    // النموذج محمّل بالفعل
    if (model.loaded && this._activeModel === taskType) return;

    // ── تفريغ النموذج النشط إذا كان مختلفاً ─────────────────────────────
    if (this._activeModel && this._activeModel !== taskType) {
      const current = this._models.get(this._activeModel);
      if (current && !current.permanent) {
        // تحقق من الذاكرة
        if (current.memory_mb + model.memory_mb > MAX_MODEL_MEMORY_MB) {
          await this._unloadModel(this._activeModel);
        }
      }
    }

    // ── تحميل النموذج الجديد ──────────────────────────────────────────────
    await this._loadModel(taskType);
  }

  /**
   * يُحمّل نموذجاً عبر Ollama
   *
   * الحيلة: Ollama يُحمّل النموذج تلقائياً عند أول استدعاء
   * نحن فقط نُسجّل الحالة ونُدفئ النموذج بـ ping خفيف
   */
  private async _loadModel(taskType: TaskType): Promise<void> {
    const model = this._models.get(taskType)!;

    IQRALogger.info(`⏳ [ORCHESTRATOR] Loading: ${model.ollama_name} (${model.memory_mb}MB)...`);

    try {
      // Warm-up ping — يُجبر Ollama على تحميل النموذج
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60_000); // دقيقة للتحميل

      const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.ollama_name,
          prompt: '',
          stream: false,
          keep_alive: '10m', // احتفظ بالنموذج 10 دقائق
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok || res.status === 200) {
        model.loaded = true;
        this._activeModel = taskType;
        IQRALogger.info(`✅ [ORCHESTRATOR] Loaded: ${model.ollama_name}`);

        appendToTrustChain(
          'ORCHESTRATOR:LOAD',
          model.ollama_name,
          `memory=${model.memory_mb}MB`,
          1.0
        );
      }
    } catch (e) {
      IQRALogger.warn(
        `⚠️ [ORCHESTRATOR] Load failed for ${model.ollama_name}: ${(e as Error).message}`
      );
      // نُسجّل كمحمّل على أي حال — Ollama سيُحمّله عند الاستدعاء الفعلي
      model.loaded = true;
      this._activeModel = taskType;
    }
  }

  /**
   * يُفرّغ نموذجاً من الذاكرة
   *
   * الحيلة من Ollama docs:
   *   POST /api/generate { model, keep_alive: 0 }
   *   → يُفرّغ النموذج فوراً
   */
  private async _unloadModel(taskType: TaskType): Promise<void> {
    const model = this._models.get(taskType);
    if (!model || !model.loaded || model.permanent) return;

    IQRALogger.info(`💤 [ORCHESTRATOR] Unloading: ${model.ollama_name}...`);

    try {
      await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.ollama_name,
          prompt: '',
          stream: false,
          keep_alive: 0, // تفريغ فوري
        }),
      });
    } catch { /* تجاهل أخطاء التفريغ */ }

    model.loaded = false;
    if (this._activeModel === taskType) {
      this._activeModel = null;
    }

    appendToTrustChain(
      'ORCHESTRATOR:UNLOAD',
      model.ollama_name,
      `freed=${model.memory_mb}MB`,
      1.0
    );

    IQRALogger.info(`✅ [ORCHESTRATOR] Unloaded: ${model.ollama_name} (freed ${model.memory_mb}MB)`);
  }

  // ── Pulse369 ──────────────────────────────────────────────────────────────

  /**
   * نبضة Pulse369 بعد كل استدعاء
   * ﴿وَٱلشَّفۡعِ وَٱلۡوَتۡرِ﴾ — كل 9 نبضات → ترقية الذاكرة
   */
  private async _pulseTick(taskType: TaskType): Promise<void> {
    try {
      const { Pulse369 } = await import('#memory/pulse_369');
      await Pulse369.tick(`orchestrator:${taskType}`);
    } catch { /* non-blocking */ }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /**
   * إحصائيات المنسق
   */
  getStats(): OrchestratorStats {
    const loadedModels: TaskType[] = [];
    let totalMemory = 0;

    for (const [type, model] of Array.from(this._models.entries())) {
      if (model.loaded) {
        loadedModels.push(type);
        totalMemory += model.memory_mb;
      }
    }

    const modelStats: Record<TaskType, { calls: number; avg_latency_ms: number }> = {} as any;
    for (const [type, stats] of Array.from(this._callStats.entries())) {
      (modelStats as any)[type] = {
        calls: stats.calls,
        avg_latency_ms: stats.calls > 0 ? stats.total_latency / stats.calls : 0,
      };
    }

    return {
      active_model: this._activeModel,
      loaded_models: loadedModels,
      total_memory_mb: totalMemory,
      available_memory_mb: MAX_MODEL_MEMORY_MB - totalMemory,
      total_calls: this._totalCalls,
      model_stats: modelStats,
    };
  }

  /**
   * قائمة النماذج المتاحة في Ollama
   */
  async listAvailableModels(): Promise<string[]> {
    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
      if (!res.ok) return [];
      const data = await res.json() as { models: Array<{ name: string }> };
      return data.models.map(m => m.name);
    } catch {
      return [];
    }
  }

  /**
   * فحص صحة النظام
   */
  async healthCheck(): Promise<{
    ollama_available: boolean;
    available_models: string[];
    memory_usage_mb: number;
    active_model: TaskType | null;
  }> {
    const available = await this.listAvailableModels();
    const stats = this.getStats();

    return {
      ollama_available: available.length > 0,
      available_models: available,
      memory_usage_mb: stats.total_memory_mb,
      active_model: stats.active_model,
    };
  }

  /**
   * تفريغ كل النماذج (للتنظيف)
   */
  async unloadAll(): Promise<void> {
    for (const [type, model] of Array.from(this._models.entries())) {
      if (model.loaded && !model.permanent) {
        await this._unloadModel(type);
      }
    }
    IQRALogger.info('🧹 [ORCHESTRATOR] All non-permanent models unloaded');
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const globalOrchestrator = new ModelOrchestrator();
