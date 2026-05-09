// بسم الله الرحمن الرحيم

/**
 * 🤖 Gemma4Local — نموذج Gemma محلي مع Function Calling
 *
 * "وَعَلَّمَكَ مَا لَمْ تَكُن تَعْلَمُ" — النساء: 113
 *
 * ══════════════════════════════════════════════════════════════
 * يدعم:
 *   - gemma3:27b  (مثبت — 17GB)
 *   - gemma4:4b   (إذا تم تحميله — 3-4GB)
 *   - أي نموذج Ollama آخر
 *
 * Function Calling:
 *   get_verse(surah, ayah)       ← من quran_local.db
 *   analyze_resonance(text)      ← من ResonanceWorker
 *   damir_check(intention)       ← من DamirConscience
 *   search_patterns(query, topK) ← من MicroMemory
 *   get_reward_stats()           ← من RewardLedger
 *
 * الوضع المحلي:
 *   IQRA_LLM_LOCAL=true → يستخدم Ollama
 *   IQRA_LLM_LOCAL=false → يستخدم Groq/Gemini (الافتراضي)
 * ══════════════════════════════════════════════════════════════
 */

import path from 'path';
import { IQRALogger } from '../12-infrastructure/logger.js';
import { appendToTrustChain } from '../security.ts';

// ── Constants ─────────────────────────────────────────────────────────────────

const OLLAMA_BASE_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';

/**
 * النموذج المفضل — يُختار تلقائياً بناءً على المتاح
 * الأولوية: gemma3:4b → gemma3:2b → gemma3:1b → gemma4:4b → gemma3:27b
 *
 * ملاحظة: gemma3:27b يحتاج ~18GB RAM — غير عملي على أجهزة 8GB
 * gemma3:4b (~3GB) هو الخيار الأمثل لأجهزة 8GB
 */
const PREFERRED_MODELS = ['gemma3:4b', 'gemma3:2b', 'gemma3:1b', 'gemma4:4b', 'gemma3:27b'];

/** timeout للاستدعاء المحلي */
const LOCAL_TIMEOUT_MS = 120_000; // دقيقتان

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: OllamaToolCall[];
}

export interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, any>;
  };
}

export interface IQRAFunction {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required?: string[];
    };
  };
}

export interface OllamaResponse {
  model: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
}

// ── IQRA Tools Definition ─────────────────────────────────────────────────────

/**
 * أدوات IQRA المتاحة للنموذج المحلي
 * Gemma 4 يستدعيها مباشرة بدون تحليل JSON يدوي
 */
export const IQRA_LOCAL_TOOLS: IQRAFunction[] = [
  {
    type: 'function',
    function: {
      name: 'get_verse',
      description: 'يجلب آية قرآنية من قاعدة البيانات المحلية بالعربية والإنجليزية',
      parameters: {
        type: 'object',
        properties: {
          surah: { type: 'number', description: 'رقم السورة (1-114)' },
          ayah:  { type: 'number', description: 'رقم الآية في السورة' },
        },
        required: ['surah', 'ayah'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_verses',
      description: 'يبحث في القرآن الكريم بالنص العربي أو الإنجليزي',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'نص البحث' },
          limit: { type: 'number', description: 'عدد النتائج (افتراضي: 5)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'damir_check',
      description: 'يفحص نية الفعل عبر الضمير النانوي — يُرجع allowed/blocked',
      parameters: {
        type: 'object',
        properties: {
          intention: { type: 'string', description: 'النية المُراد فحصها' },
        },
        required: ['intention'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_reward_stats',
      description: 'يُرجع إحصائيات المكافآت والمسارات البكر',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compute_shannon_hel',
      description: 'يحسب إنتروبي Shannon للحرف الأخير في النص — يكشف البصمة القرآنية',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'النص المُراد تحليله' },
        },
        required: ['text'],
      },
    },
  },
];

// ── Tool Executor ─────────────────────────────────────────────────────────────

/**
 * يُنفّذ أداة IQRA بناءً على اسمها ومعاملاتها
 */
async function executeIQRATool(
  name: string,
  args: Record<string, any>
): Promise<any> {
  IQRALogger.info(`🔧 [OLLAMA] Executing tool: ${name}(${JSON.stringify(args)})`);

  switch (name) {
    // ── get_verse ──────────────────────────────────────────────────────────
    case 'get_verse': {
      const { surah, ayah } = args;
      if (!surah || !ayah) return { error: 'surah and ayah required' };

      try {
        const Database = (await import('better-sqlite3')).default;
        const dbPath = path.join(process.cwd(), 'iqra-core', 'data', 'quran_local.db');
        const db = new Database(dbPath, { readonly: true });
        const row = db.prepare(
          'SELECT arabic, english, juz, page FROM ayat WHERE surah = ? AND ayah = ?'
        ).get(surah, ayah) as any;
        db.close();

        if (!row) return { error: `Verse ${surah}:${ayah} not found` };
        return {
          reference: `${surah}:${ayah}`,
          arabic: row.arabic,
          english: row.english || '(translation not available)',
          juz: row.juz,
          page: row.page,
        };
      } catch (e) {
        return { error: `DB error: ${(e as Error).message}` };
      }
    }

    // ── search_verses ──────────────────────────────────────────────────────
    case 'search_verses': {
      const { query, limit = 5 } = args;
      if (!query) return { error: 'query required' };

      try {
        const Database = (await import('better-sqlite3')).default;
        const dbPath = path.join(process.cwd(), 'iqra-core', 'data', 'quran_local.db');
        const db = new Database(dbPath, { readonly: true });
        const rows = db.prepare(`
          SELECT surah, ayah, arabic, english
          FROM ayat
          WHERE arabic LIKE ? OR english LIKE ?
          LIMIT ?
        `).all(`%${query}%`, `%${query}%`, limit) as any[];
        db.close();

        return {
          count: rows.length,
          results: rows.map(r => ({
            reference: `${r.surah}:${r.ayah}`,
            arabic: r.arabic,
            english: r.english || '',
          })),
        };
      } catch (e) {
        return { error: `Search error: ${(e as Error).message}` };
      }
    }

    // ── damir_check ────────────────────────────────────────────────────────
    case 'damir_check': {
      const { intention } = args;
      if (!intention) return { error: 'intention required' };

      try {
        const { DamirConscience } = await import('../damir_conscience.ts');
        const damir = new DamirConscience();
        const action = {
          id: `tool_check_${Date.now()}`,
          intention,
          requiredResources: [],
        };
        const verdict = damir.check(action);
        return {
          allowed: verdict.allowed,
          reason: verdict.reason,
          confidence: verdict.confidence,
          latency_ms: verdict.latency_ms,
        };
      } catch (e) {
        return { error: `Damir error: ${(e as Error).message}` };
      }
    }

    // ── get_reward_stats ───────────────────────────────────────────────────
    case 'get_reward_stats': {
      try {
        const { RewardLedger } = await import('../rewards/ledger.ts');
        const summary = RewardLedger.getSummary();
        return summary;
      } catch (e) {
        return { error: `Reward error: ${(e as Error).message}` };
      }
    }

    // ── compute_shannon_hel ────────────────────────────────────────────────
    case 'compute_shannon_hel': {
      const { text } = args;
      if (!text) return { error: 'text required' };

      try {
        const { MicroMemory } = await import('../memory/micro_memory.ts');
        const hel = MicroMemory.computeShannonHEL(text);
        const { isQuranLike, confidence } = MicroMemory.hasQuranSignature(text);
        return { hel, is_quran_like: isQuranLike, confidence };
      } catch (e) {
        return { error: `Shannon error: ${(e as Error).message}` };
      }
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Gemma4Local ───────────────────────────────────────────────────────────────

export class Gemma4Local {
  private _model: string | null = null;
  private _available: boolean | null = null;

  // ── Model Detection ───────────────────────────────────────────────────────

  /**
   * يكتشف أفضل نموذج متاح في Ollama
   */
  async detectModel(): Promise<string | null> {
    if (this._model) return this._model;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) return null;

      const data = await res.json() as { models: Array<{ name: string }> };
      const available = data.models.map(m => m.name);

      for (const preferred of PREFERRED_MODELS) {
        if (available.some(m => m.startsWith(preferred.split(':')[0]))) {
          this._model = available.find(m => m.startsWith(preferred.split(':')[0])) ?? preferred;
          IQRALogger.info(`🤖 [OLLAMA] Detected model: ${this._model}`);
          return this._model;
        }
      }

      // أي نموذج متاح
      if (available.length > 0) {
        this._model = available[0];
        IQRALogger.info(`🤖 [OLLAMA] Using available model: ${this._model}`);
        return this._model;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * يتحقق من توفر Ollama
   */
  async isAvailable(): Promise<boolean> {
    if (this._available !== null) return this._available;
    const model = await this.detectModel();
    this._available = model !== null;
    return this._available;
  }

  // ── Core: call ────────────────────────────────────────────────────────────

  /**
   * يستدعي النموذج المحلي مع دعم Function Calling
   *
   * الخوارزمية:
   *   1. أرسل الرسائل + الأدوات للنموذج
   *   2. إذا طلب النموذج أداة → نفّذها وأضف النتيجة
   *   3. أعد الاستدعاء مع النتيجة (حتى 7 مرات من DASTŪR)
   *   4. أرجع الرد النهائي
   *
   * @param messages - الرسائل
   * @param tools    - الأدوات المتاحة (اختياري)
   * @param maxToolCalls - الحد الأقصى لاستدعاءات الأدوات (7 من DASTŪR)
   */
  async call(
    messages: OllamaMessage[],
    tools: IQRAFunction[] = IQRA_LOCAL_TOOLS,
    maxToolCalls: number = 7
  ): Promise<string> {
    const model = await this.detectModel();
    if (!model) {
      throw new Error('OLLAMA_ERR: No model available. Run: ollama pull gemma4:4b');
    }

    let currentMessages = [...messages];
    let toolCallCount = 0;

    while (toolCallCount < maxToolCalls) {
      const response = await this._rawCall(model, currentMessages, tools);

      // ── لا يوجد tool_calls → رد نهائي ────────────────────────────────
      if (!response.message.tool_calls || response.message.tool_calls.length === 0) {
        appendToTrustChain(
          'OLLAMA:RESPONSE',
          model,
          `tools_used=${toolCallCount} length=${response.message.content.length}`,
          1.0
        );
        return response.message.content;
      }

      // ── يوجد tool_calls → نفّذها ──────────────────────────────────────
      IQRALogger.info(
        `🔧 [OLLAMA] Tool calls requested: ${response.message.tool_calls.length}`
      );

      // أضف رد النموذج (مع tool_calls)
      currentMessages.push(response.message);

      // نفّذ كل أداة وأضف نتيجتها
      for (const toolCall of response.message.tool_calls) {
        const result = await executeIQRATool(
          toolCall.function.name,
          toolCall.function.arguments
        );

        currentMessages.push({
          role: 'tool',
          content: JSON.stringify(result),
        });

        IQRALogger.info(
          `✅ [OLLAMA] Tool ${toolCall.function.name} executed: ` +
          `${JSON.stringify(result).slice(0, 100)}`
        );
      }

      toolCallCount++;
    }

    // تجاوز الحد الأقصى — أرجع آخر رد
    IQRALogger.warn(`⚠️ [OLLAMA] Max tool calls (${maxToolCalls}) reached`);
    const finalResponse = await this._rawCall(model, currentMessages, []);
    return finalResponse.message.content;
  }

  /**
   * استدعاء بسيط بدون Function Calling
   */
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: OllamaMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
    return this.call(messages, []); // بدون أدوات
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async _rawCall(
    model: string,
    messages: OllamaMessage[],
    tools: IQRAFunction[]
  ): Promise<OllamaResponse> {
    // خيارات الذاكرة — مهمة على أجهزة 8GB RAM
    // num_ctx: 2048 يكفي لمعظم مهام IQRA ويوفر ~60% من استهلاك RAM
    // num_threads: يستخدم أنوية CPU المتاحة (0 = تلقائي)
    // num_gpu: 0 على Mac Intel (لا GPU مخصص)
    const isLargeModel = model.includes('27b') || model.includes('70b') || model.includes('671b');
    const options = {
      num_ctx: isLargeModel ? 1024 : 2048,
      num_gpu: 0,
      num_threads: 0, // تلقائي — Ollama يختار الأنسب
    };

    const body: any = {
      model,
      messages,
      stream: false,
      options,
    };

    // gemma3 لا يدعم tools API — نستخدم prompt-based fallback
    const supportsTools = !model.startsWith('gemma3');
    if (tools.length > 0 && supportsTools) {
      body.tools = tools;
    } else if (tools.length > 0 && !supportsTools) {
      // Prompt-based function calling للنماذج التي لا تدعم tools API
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'user') {
        const toolsDesc = tools.map(t =>
          `- ${t.function.name}(${Object.keys(t.function.parameters.properties ?? {}).join(', ')}): ${t.function.description}`
        ).join('\n');

        body.messages = [
          ...messages.slice(0, -1),
          {
            role: 'user',
            content: `${lastMsg.content}\n\n[الأدوات المتاحة:\n${toolsDesc}\n\nإذا احتجت أداة، اكتب: TOOL_CALL: {"name":"اسم_الأداة","args":{...}}]`,
          },
        ];
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOCAL_TIMEOUT_MS);

    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Ollama HTTP ${res.status}: ${err}`);
      }

      const data = await res.json() as OllamaResponse;

      // Parse prompt-based tool calls للنماذج التي لا تدعم tools API
      if (!supportsTools && tools.length > 0 && data.message?.content) {
        const toolCallMatch = data.message.content.match(
          /TOOL_CALL:\s*(\{[^}]+\})/
        );
        if (toolCallMatch) {
          try {
            const parsed = JSON.parse(toolCallMatch[1]);
            data.message.tool_calls = [{
              function: { name: parsed.name, arguments: parsed.args ?? {} },
            }];
          } catch { /* ignore parse errors */ }
        }
      }

      return data;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const gemma4Local = new Gemma4Local();

// ── isLocalMode ───────────────────────────────────────────────────────────────

/**
 * هل الوضع المحلي مُفعَّل؟
 * IQRA_LLM_LOCAL=true → يستخدم Ollama
 */
export function isLocalMode(): boolean {
  return process.env.IQRA_LLM_LOCAL === 'true';
}
