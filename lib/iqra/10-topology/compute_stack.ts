// بسم الله الرحمن الرحيم

/**
 * ⚡ ComputeStack — منظومة الحوسبة الموحّدة
 *
 * "وَسَخَّرَ لَكُم مَّا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ جَمِيعًا" — الجاثية: 13
 *
 * ══════════════════════════════════════════════════════════════
 * يُوحّد كل موارد الحوسبة المجانية في واجهة واحدة:
 *
 *   LPU:     Groq (14,400 req/day) + Cerebras (1M tok/day)
 *   GPU:     Gemini 2.5 Flash (1M tok/day)
 *   CPU:     Ollama gemma3:4b (محلي، لا حدود)
 *   Quantum: Qiskit simulator (محلي، 24 qubits)
 *   Graph:   Obsidian + InfraNodus
 *
 * الاختيار التلقائي بناءً على:
 *   - حجم المهمة (tokens)
 *   - نوع المهمة (reasoning/search/quantum)
 *   - الحدود المتبقية
 *   - السرعة المطلوبة
 * ══════════════════════════════════════════════════════════════
 */

import { IQRALogger } from '../12-infrastructure/logger.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ComputeProvider =
  | 'groq_lpu'
  | 'cerebras_lpu'
  | 'gemini_gpu'
  | 'ollama_cpu'
  | 'qiskit_quantum'
  | 'obsidian_graph';

export interface ComputeTask {
  type: 'reasoning' | 'search' | 'analysis' | 'quantum' | 'graph' | 'generation';
  estimated_tokens: number;
  requires_arabic: boolean;
  requires_long_context: boolean;
  offline_ok: boolean;
  priority: 'speed' | 'quality' | 'economy';
}

export interface ComputeResult {
  provider: ComputeProvider;
  model: string;
  response: string;
  tokens_used: number;
  latency_ms: number;
}

// ── Daily Budget Tracker ──────────────────────────────────────────────────────

const _budget = {
  groq:     { used: 0, limit: 14400, reset_hour: 0 },
  cerebras: { used: 0, limit: 1_000_000, reset_hour: 0 },
  gemini:   { used: 0, limit: 1_000_000, reset_hour: 0 },
};

function _checkBudget(provider: 'groq' | 'cerebras' | 'gemini', tokens: number): boolean {
  const b = _budget[provider];
  const now = new Date();
  if (now.getHours() === 0 && now.getHours() !== b.reset_hour) {
    b.used = 0;
    b.reset_hour = 0;
  }
  return b.used + tokens <= b.limit;
}

function _consumeBudget(provider: 'groq' | 'cerebras' | 'gemini', tokens: number): void {
  _budget[provider].used += tokens;
}

// ── ComputeStack ──────────────────────────────────────────────────────────────

export class ComputeStack {

  // ── Router ────────────────────────────────────────────────────────────────

  /**
   * يختار أفضل مورد حوسبة للمهمة
   *
   * قواعد الاختيار:
   *   1. quantum → Qiskit
   *   2. graph/search → Obsidian
   *   3. long_context (>32K) → Gemini
   *   4. speed + arabic → Cerebras (أسرع) أو Groq
   *   5. offline → Ollama
   *   6. economy → Gemini (أرخص)
   */
  static route(task: ComputeTask): ComputeProvider {
    // ١. مهام الكم
    if (task.type === 'quantum') return 'qiskit_quantum';

    // ٢. مهام الرسم البياني
    if (task.type === 'graph') return 'obsidian_graph';

    // ٣. بدون إنترنت
    if (task.offline_ok && !process.env.GROQ_API_KEY) return 'ollama_cpu';

    // ٤. سياق طويل جداً
    if (task.requires_long_context || task.estimated_tokens > 32_000) {
      if (_checkBudget('gemini', task.estimated_tokens)) return 'gemini_gpu';
    }

    // ٥. السرعة أولاً
    if (task.priority === 'speed') {
      if (process.env.CEREBRAS_API_KEY && _checkBudget('cerebras', task.estimated_tokens)) {
        return 'cerebras_lpu'; // 3000 tok/sec
      }
      if (_checkBudget('groq', task.estimated_tokens)) {
        return 'groq_lpu'; // 800 tok/sec
      }
    }

    // ٦. الاقتصاد
    if (task.priority === 'economy') {
      if (_checkBudget('gemini', task.estimated_tokens)) return 'gemini_gpu';
    }

    // ٧. الافتراضي: Groq
    if (_checkBudget('groq', task.estimated_tokens)) return 'groq_lpu';
    if (_checkBudget('cerebras', task.estimated_tokens)) return 'cerebras_lpu';
    if (_checkBudget('gemini', task.estimated_tokens)) return 'gemini_gpu';

    // ٨. Fallback: محلي
    return 'ollama_cpu';
  }

  // ── Execute ───────────────────────────────────────────────────────────────

  /**
   * يُنفّذ مهمة على المورد المختار
   */
  static async execute(
    task: ComputeTask,
    prompt: string,
    systemPrompt?: string
  ): Promise<ComputeResult> {
    const provider = this.route(task);
    const start = Date.now();

    IQRALogger.info(`⚡ [COMPUTE] Routing to: ${provider} (${task.estimated_tokens} tokens)`);

    switch (provider) {
      case 'groq_lpu':
        return this._callGroq(prompt, systemPrompt, start);

      case 'cerebras_lpu':
        return this._callCerebras(prompt, systemPrompt, start);

      case 'gemini_gpu':
        return this._callGemini(prompt, systemPrompt, start);

      case 'ollama_cpu':
        return this._callOllama(prompt, systemPrompt, start);

      case 'qiskit_quantum':
        return this._callQiskit(prompt, start);

      case 'obsidian_graph':
        return this._callObsidian(prompt, start);

      default:
        return this._callGroq(prompt, systemPrompt, start);
    }
  }

  // ── Providers ─────────────────────────────────────────────────────────────

  private static async _callGroq(
    prompt: string,
    system: string | undefined,
    start: number
  ): Promise<ComputeResult> {
    const { Groq } = await import('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const messages: any[] = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    const res = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 1024,
      temperature: 0.3,
    });

    const content = res.choices[0]?.message?.content ?? '';
    const tokens = res.usage?.total_tokens ?? 0;
    _consumeBudget('groq', tokens);

    return {
      provider: 'groq_lpu',
      model: 'llama-3.3-70b-versatile',
      response: content,
      tokens_used: tokens,
      latency_ms: Date.now() - start,
    };
  }

  private static async _callCerebras(
    prompt: string,
    system: string | undefined,
    start: number
  ): Promise<ComputeResult> {
    const messages: any[] = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.CEREBRAS_MODEL ?? 'llama-3.3-70b',
        messages,
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content ?? '';
    const tokens = data.usage?.total_tokens ?? 0;
    _consumeBudget('cerebras', tokens);

    return {
      provider: 'cerebras_lpu',
      model: 'llama-3.3-70b',
      response: content,
      tokens_used: tokens,
      latency_ms: Date.now() - start,
    };
  }

  /**
   * Together.ai — 60 RPM مجاناً، Llama 3.3 70B Turbo Free
   */
  private static async _callTogether(
    prompt: string,
    system: string | undefined,
    start: number
  ): Promise<ComputeResult> {
    const messages: any[] = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://api.together.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
        messages,
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content ?? '';
    const tokens = data.usage?.total_tokens ?? 0;

    return {
      provider: 'gemini_gpu', // نُعيد استخدام النوع
      model: 'llama-3.3-70b-turbo-free',
      response: content,
      tokens_used: tokens,
      latency_ms: Date.now() - start,
    };
  }

  private static async _callGemini(
    prompt: string,
    system: string | undefined,
    start: number
  ): Promise<ComputeResult> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: process.env.GOOGLE_GEMINI_MODEL ?? 'gemini-2.5-flash',
      systemInstruction: system,
    });

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    const tokens = result.response.usageMetadata?.totalTokenCount ?? 0;
    _consumeBudget('gemini', tokens);

    return {
      provider: 'gemini_gpu',
      model: 'gemini-2.5-flash',
      response: content,
      tokens_used: tokens,
      latency_ms: Date.now() - start,
    };
  }

  private static async _callOllama(
    prompt: string,
    system: string | undefined,
    start: number
  ): Promise<ComputeResult> {
    const { gemma4Local } = await import('../llm/ollama.ts');
    const response = await gemma4Local.generate(prompt, system);

    return {
      provider: 'ollama_cpu',
      model: process.env.OLLAMA_MODEL ?? 'gemma3:4b',
      response,
      tokens_used: 0, // محلي — لا عداد
      latency_ms: Date.now() - start,
    };
  }

  private static async _callQiskit(
    prompt: string,
    start: number
  ): Promise<ComputeResult> {
    // Qiskit يعمل عبر Python subprocess
    // في المرحلة الحالية: نُرجع تحليلاً نصياً
    // TODO: ربط حقيقي مع Qiskit عبر Python bridge
    const response = `[QUANTUM_SIM] تحليل كمومي لـ: "${prompt.slice(0, 50)}"\n` +
      `المحاكاة: Qiskit BasicSimulator (24 qubits)\n` +
      `الحالة: جاهز للتنفيذ — يحتاج Python + Qiskit`;

    return {
      provider: 'qiskit_quantum',
      model: 'qasm_simulator',
      response,
      tokens_used: 0,
      latency_ms: Date.now() - start,
    };
  }

  private static async _callObsidian(
    prompt: string,
    start: number
  ): Promise<ComputeResult> {
    const { ObsidianBridge } = await import('./obsidian_bridge.ts');
    const results = await ObsidianBridge.searchDiscoveries(prompt, 7);

    const response = results.length > 0
      ? `وجدت ${results.length} اكتشافات مشابهة:\n${results.map(r => `- ${r}`).join('\n')}`
      : `لم أجد اكتشافات مشابهة لـ: "${prompt.slice(0, 50)}"`;

    return {
      provider: 'obsidian_graph',
      model: 'local_vault',
      response,
      tokens_used: 0,
      latency_ms: Date.now() - start,
    };
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  static getBudgetStatus(): Record<string, { used: number; limit: number; remaining: number; pct: number }> {
    return Object.fromEntries(
      Object.entries(_budget).map(([k, v]) => [k, {
        used: v.used,
        limit: v.limit,
        remaining: v.limit - v.used,
        pct: Math.round((v.used / v.limit) * 100),
      }])
    );
  }
}
