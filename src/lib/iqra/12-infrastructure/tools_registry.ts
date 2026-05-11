// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 🛠️ IQRA Tools Registry — سجل الأدوات الموحّد
 *
 * "وَعَلَّمَ آدَمَ الْأَسْمَاءَ كُلَّهَا" — البقرة: 31
 *
 * ══════════════════════════════════════════════════════════════
 * الهدف:
 *   سجل موحّد لكل أدوات IQRA.
 *   كل أداة: اسم + Zod schema + handler + circuit breaker.
 *
 * الفئات:
 *   QURAN    → أدوات القرآن + صياد الأنماط
 *   MEMORY   → أدوات الذاكرة (7 طبقات)
 *   SYSTEM   → أدوات النظام (heartbeat، قائمة)
 *   SECURITY → أدوات الأمان (TrustChain، circuit)
 *   MCP      → أدوات MCP الخارجية
 *
 * القواعد:
 *   RULE 0: Security check قبل كل استدعاء
 *   RULE 1: Zod validation لكل input
 *   RULE 3: TrustChain لكل استدعاء
 *   RULE 8: Circuit breaker للأدوات الخارجية
 * ══════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { IQRALogger } from '#infra/logger'
import { appendToTrustChain, checkCircuit, reportFailure, reportSuccess } from '#security/security';
import { IQRAMemory } from '#memory/memory';
import { Pulse369 } from '#memory/pulse_369'
import { MemoryBridge } from '#memory/memory_bridge'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToolCategory = 'QURAN' | 'MEMORY' | 'SYSTEM' | 'SECURITY' | 'MCP';

export interface ToolDefinition<TInput = any, TOutput = any> {
  name: string;
  description_ar: string;
  description_en: string;
  category: ToolCategory;
  inputSchema: z.ZodType<TInput>;
  handler: (input: TInput) => Promise<TOutput>;
  circuit_breaker?: string;
  is_mcp?: boolean;
  sensitive?: boolean;
}

export interface ToolCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  tool: string;
  latency_ms: number;
  timestamp: number;
}

// ── ToolsRegistry ─────────────────────────────────────────────────────────────

export class ToolsRegistry {
  private static _tools: Map<string, ToolDefinition> = new Map();
  private static _callCount: Map<string, number> = new Map();
  private static _initialized = false;

  // ── Init ──────────────────────────────────────────────────────────────────

  static init(): void {
    if (this._initialized) return;
    this._registerQuranTools();
    this._registerPatternHunterTools();
    this._registerMemoryTools();
    this._registerSystemTools();
    this._registerSecurityTools();
    this._registerMCPTools();
    this._initialized = true;
    IQRALogger.info(`🛠️ [TOOLS] Registry initialized — ${this._tools.size} tools`);
    appendToTrustChain('TOOLS:INIT', 'registry', `tools=${this._tools.size}`, 1.0);
  }

  // ── Call ──────────────────────────────────────────────────────────────────

  static async call<T = any>(
    toolName: string,
    input: unknown,
    missionId: string = 'system'
  ): Promise<ToolCallResult<T>> {
    if (!this._initialized) this.init();
    const start = Date.now();

    // RULE 0: Security
    if (!toolName || typeof toolName !== 'string') {
      return this._error(toolName, 'Invalid tool name', start);
    }

    const tool = this._tools.get(toolName);
    if (!tool) {
      return this._error(toolName, `Tool not found: ${toolName}`, start);
    }

    // RULE 8: Circuit Breaker
    if (tool.circuit_breaker && !checkCircuit(tool.circuit_breaker)) {
      return this._error(toolName, `Circuit OPEN for ${tool.circuit_breaker}`, start);
    }

    // RULE 1: Zod Validation
    const parsed = tool.inputSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return this._error(toolName, `Validation: ${msg}`, start);
    }

    try {
      IQRALogger.info(`🛠️ [TOOLS] → ${toolName}`);
      const data = await tool.handler(parsed.data);
      const latency = Date.now() - start;

      this._callCount.set(toolName, (this._callCount.get(toolName) ?? 0) + 1);

      // RULE 3: TrustChain
      appendToTrustChain(`TOOL:${toolName.toUpperCase()}`, missionId, `latency=${latency}ms`, 1.0);

      if (tool.circuit_breaker) reportSuccess(tool.circuit_breaker);

      // Pulse369 tick (non-blocking)
      Pulse369.tick(missionId).catch(() => {});

      return { success: true, data, tool: toolName, latency_ms: latency, timestamp: Date.now() };
    } catch (e) {
      const msg = (e as Error).message;
      if (tool.circuit_breaker) reportFailure(tool.circuit_breaker, msg);
      IQRALogger.error(`❌ [TOOLS] ${toolName}: ${msg}`);
      return this._error(toolName, msg, start);
    }
  }

  // ── List / Get / Register ─────────────────────────────────────────────────

  static list(category?: ToolCategory): ToolDefinition[] {
    if (!this._initialized) this.init();
    const all = Array.from(this._tools.values());
    return category ? all.filter(t => t.category === category) : all;
  }

  static get(name: string): ToolDefinition | undefined {
    if (!this._initialized) this.init();
    return this._tools.get(name);
  }

  static getStats(): Record<string, number> {
    return Object.fromEntries(this._callCount);
  }

  static register<TInput, TOutput>(tool: ToolDefinition<TInput, TOutput>): void {
    this._tools.set(tool.name, tool as ToolDefinition);
    IQRALogger.info(`🛠️ [TOOLS] Registered: ${tool.name}`);
  }

  // ── Quran Tools ───────────────────────────────────────────────────────────

  private static _registerQuranTools(): void {

    this._tools.set('quran.get_verse', {
      name: 'quran.get_verse',
      description_ar: 'جلب آية قرآنية بالسورة والآية',
      description_en: 'Fetch a Quranic verse by surah and ayah',
      category: 'QURAN',
      inputSchema: z.object({
        surah: z.number().int().min(1).max(114),
        ayah: z.number().int().min(1).max(286),
      }),
      handler: async ({ surah, ayah }) => {
        const { QuranLoader } = await import('#quran/quran_loader');
        return await (QuranLoader as any).getVerse?.(surah, ayah) ?? { surah, ayah };
      },
    });

    this._tools.set('quran.compute_shannon', {
      name: 'quran.compute_shannon',
      description_ar: 'حساب إنتروبي Shannon H_EL للنص',
      description_en: 'Compute Shannon H_EL entropy for text',
      category: 'QURAN',
      inputSchema: z.object({ text: z.string().min(1).max(5000) }),
      handler: async ({ text }) => {
        const { MicroMemory } = await import('#memory/micro_memory');
        await MicroMemory.init();
        const hel = MicroMemory.computeShannonHEL(text);
        const sig = MicroMemory.hasQuranSignature(text);
        return { shannon_hel: hel, ...sig };
      },
    });

    this._tools.set('quran.validate_numerical', {
      name: 'quran.validate_numerical',
      description_ar: 'التحقق من الأنماط الرقمية (7، 19، 40، 369)',
      description_en: 'Validate sacred numerical patterns (7, 19, 40, 369)',
      category: 'QURAN',
      inputSchema: z.object({ text: z.string().min(1) }),
      handler: async ({ text }) => {
        const { NumericalValidator } = await import('../quran/numerical_validator.js');
        return NumericalValidator.validate(text);
      },
    });

    this._tools.set('quran.discover_resonance', {
      name: 'quran.discover_resonance',
      description_ar: 'اكتشاف الرنين الطوبولوجي لآية',
      description_en: 'Discover topological resonance for a verse',
      category: 'QURAN',
      inputSchema: z.object({
        verse_ref: z.string().regex(/^\d+:\d+$/),
        field: z.string().default('general'),
        mission_id: z.string().optional(),
      }),
      handler: async ({ verse_ref, field, mission_id }) => {
        const { TopologicalCuriosityEngine } = await import('#quran/topological_curiosity');
        return await TopologicalCuriosityEngine.discoverResonance(verse_ref, field, mission_id);
      },
      circuit_breaker: 'topological_engine',
    });
  }

  // ── Pattern Hunter Tools ──────────────────────────────────────────────────

  private static _registerPatternHunterTools(): void {

    this._tools.set('hunter.hunt', {
      name: 'hunter.hunt',
      description_ar: 'صيد الأنماط في آية واحدة (Shannon + Topology + Numerical + Novelty)',
      description_en: 'Hunt patterns in a single verse with multi-strategy scoring',
      category: 'QURAN',
      inputSchema: z.object({
        verse_ref: z.string().regex(/^\d+:\d+$/),
        arabic_text: z.string().min(1).max(2000),
        field: z.enum(['numerical', 'semantic', 'topological', 'fractal', 'linguistic', 'all']).default('all'),
        mission_id: z.string().optional(),
      }),
      handler: async (input) => {
        const { PatternHunter } = await import('../quran/pattern_hunter.js');
        return await PatternHunter.hunt(input);
      },
      circuit_breaker: 'pattern_hunter',
    });

    this._tools.set('hunter.batch', {
      name: 'hunter.batch',
      description_ar: 'صيد دفعي لمجموعة آيات مع ترتيب SEDM بالفائدة',
      description_en: 'Batch hunt multiple verses with SEDM utility ranking',
      category: 'QURAN',
      inputSchema: z.object({
        verses: z.array(z.object({
          ref: z.string().regex(/^\d+:\d+$/),
          arabic: z.string().min(1),
        })).min(1).max(114),
        field: z.enum(['numerical', 'semantic', 'topological', 'fractal', 'linguistic', 'all']).default('all'),
        mission_id: z.string().optional(),
      }),
      handler: async (input) => {
        const { PatternHunter } = await import('../quran/pattern_hunter.js');
        return await PatternHunter.batchHunt(input);
      },
      circuit_breaker: 'pattern_hunter',
    });

    this._tools.set('hunter.learn', {
      name: 'hunter.learn',
      description_ar: 'التعلم من الاكتشافات السابقة (MemRL)',
      description_en: 'Learn from past discoveries using MemRL episodic memory',
      category: 'QURAN',
      inputSchema: z.object({}),
      handler: async () => {
        const { PatternHunter } = await import('../quran/pattern_hunter.js');
        return await PatternHunter.learnFromHistory();
      },
    });

    this._tools.set('hunter.stats', {
      name: 'hunter.stats',
      description_ar: 'إحصائيات صياد الأنماط',
      description_en: 'Pattern hunter statistics',
      category: 'QURAN',
      inputSchema: z.object({}),
      handler: async () => {
        const { PatternHunter } = await import('../quran/pattern_hunter.js');
        return await PatternHunter.getStats();
      },
    });
  }

  // ── Memory Tools ──────────────────────────────────────────────────────────

  private static _registerMemoryTools(): void {

    this._tools.set('memory.store', {
      name: 'memory.store',
      description_ar: 'تخزين قيمة في الذاكرة (hot/warm/cold)',
      description_en: 'Store a value in memory',
      category: 'MEMORY',
      inputSchema: z.object({
        key: z.string().min(1).max(200),
        value: z.unknown(),
        layer: z.enum(['hot', 'warm', 'cold']).default('hot'),
      }),
      handler: async ({ key, value, layer }) => {
        await MemoryBridge.write(key, value, { layer });
        return { stored: true, key, layer };
      },
    });

    this._tools.set('memory.retrieve', {
      name: 'memory.retrieve',
      description_ar: 'استرجاع قيمة من الذاكرة',
      description_en: 'Retrieve a value from memory',
      category: 'MEMORY',
      inputSchema: z.object({ key: z.string().min(1).max(200) }),
      handler: async ({ key }) => MemoryBridge.read(key),
    });

    this._tools.set('memory.search_semantic', {
      name: 'memory.search_semantic',
      description_ar: 'بحث دلالي في الذاكرة عبر Qdrant',
      description_en: 'Semantic search in memory via Qdrant',
      category: 'MEMORY',
      inputSchema: z.object({
        query: z.string().min(1).max(500),
        limit: z.number().int().min(1).max(20).default(7),
      }),
      handler: async ({ query, limit }) => IQRAMemory.searchSemantic(query, limit),
      circuit_breaker: 'qdrant',
    });

    this._tools.set('memory.get_stats', {
      name: 'memory.get_stats',
      description_ar: 'إحصائيات نظام الذاكرة',
      description_en: 'Memory system statistics',
      category: 'MEMORY',
      inputSchema: z.object({}),
      handler: async () => {
        const bridge = MemoryBridge.getStats();
        const curiosity = await IQRAMemory.getCuriosity();
        const cycles = await IQRAMemory.getCycleCounter();
        const pulse = Pulse369.getStats();
        return { bridge, curiosity_score: curiosity, cycle_counter: cycles, pulse };
      },
    });

    this._tools.set('memory.pulse_tick', {
      name: 'memory.pulse_tick',
      description_ar: 'تشغيل نبضة Pulse369 يدوياً',
      description_en: 'Manually trigger a Pulse369 tick',
      category: 'MEMORY',
      inputSchema: z.object({ mission_id: z.string().default('manual') }),
      handler: async ({ mission_id }) => {
        const counter = await Pulse369.tick(mission_id);
        return { counter, stats: Pulse369.getStats() };
      },
    });

    this._tools.set('memory.grant_reward', {
      name: 'memory.grant_reward',
      description_ar: 'منح مكافأة لرفع درجة الفضول',
      description_en: 'Grant a reward to boost curiosity score',
      category: 'MEMORY',
      inputSchema: z.object({
        amount: z.number().min(0).max(0.5),
        reason: z.string().optional(),
      }),
      handler: async ({ amount, reason }) => {
        await IQRAMemory.grantReward(amount);
        const score = await IQRAMemory.getCuriosity();
        IQRALogger.info(`✨ [TOOLS] Reward +${amount} | ${reason ?? ''}`);
        return { new_curiosity_score: score, amount };
      },
    });
  }

  // ── System Tools ──────────────────────────────────────────────────────────

  private static _registerSystemTools(): void {

    this._tools.set('system.heartbeat_status', {
      name: 'system.heartbeat_status',
      description_ar: 'حالة نبض النظام',
      description_en: 'Get heartbeat status',
      category: 'SYSTEM',
      inputSchema: z.object({}),
      handler: async () => {
        const { IQRAHeartbeat } = await import('./heartbeat.js');
        return {
          status: IQRAHeartbeat.getStatus(),
          uptime_ms: IQRAHeartbeat.getUptime(),
          last_report: IQRAHeartbeat.getLastReport(),
        };
      },
    });

    this._tools.set('system.start_heartbeat', {
      name: 'system.start_heartbeat',
      description_ar: 'بدء نبض النظام',
      description_en: 'Start the system heartbeat',
      category: 'SYSTEM',
      inputSchema: z.object({ mission_id: z.string().default('system') }),
      handler: async ({ mission_id }) => {
        const { IQRAHeartbeat } = await import('./heartbeat.js');
        await IQRAHeartbeat.start(mission_id);
        return { started: true, status: IQRAHeartbeat.getStatus() };
      },
    });

    this._tools.set('system.list_tools', {
      name: 'system.list_tools',
      description_ar: 'قائمة كل الأدوات المتاحة',
      description_en: 'List all available tools',
      category: 'SYSTEM',
      inputSchema: z.object({
        category: z.enum(['QURAN', 'MEMORY', 'SYSTEM', 'SECURITY', 'MCP']).optional(),
      }),
      handler: async ({ category }) => {
        const tools = ToolsRegistry.list(category as ToolCategory | undefined);
        return tools.map(t => ({
          name: t.name,
          description_ar: t.description_ar,
          category: t.category,
          has_circuit_breaker: !!t.circuit_breaker,
        }));
      },
    });

    this._tools.set('system.get_tool_stats', {
      name: 'system.get_tool_stats',
      description_ar: 'إحصائيات استدعاءات الأدوات',
      description_en: 'Tool call statistics',
      category: 'SYSTEM',
      inputSchema: z.object({}),
      handler: async () => ToolsRegistry.getStats(),
    });
  }

  // ── Security Tools ────────────────────────────────────────────────────────

  private static _registerSecurityTools(): void {

    this._tools.set('security.validate_input', {
      name: 'security.validate_input',
      description_ar: 'التحقق من صحة المدخلات (RULE 1)',
      description_en: 'Validate input data',
      category: 'SECURITY',
      inputSchema: z.object({ input: z.unknown() }),
      handler: async ({ input }) => {
        const { validateInput } = await import('#security/security');
        return validateInput(input);
      },
      sensitive: true,
    });

    this._tools.set('security.check_circuit', {
      name: 'security.check_circuit',
      description_ar: 'فحص حالة circuit breaker',
      description_en: 'Check circuit breaker status',
      category: 'SECURITY',
      inputSchema: z.object({ provider: z.string().min(1) }),
      handler: async ({ provider }) => ({
        provider,
        circuit_open: !checkCircuit(provider),
      }),
    });
  }

  // ── MCP Tools ─────────────────────────────────────────────────────────────

  private static _registerMCPTools(): void {

    this._tools.set('mcp.qdrant_search', {
      name: 'mcp.qdrant_search',
      description_ar: 'بحث في Qdrant عبر MCP',
      description_en: 'Search Qdrant via MCP',
      category: 'MCP',
      inputSchema: z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(20).default(5),
      }),
      handler: async ({ query, limit }) => IQRAMemory.searchSemantic(query, limit),
      circuit_breaker: 'qdrant',
      is_mcp: true,
    });

    this._tools.set('mcp.filesystem_read', {
      name: 'mcp.filesystem_read',
      description_ar: 'قراءة ملف عبر MCP',
      description_en: 'Read a file via MCP',
      category: 'MCP',
      inputSchema: z.object({ path: z.string().min(1) }),
      handler: async ({ path: filePath }) => {
        const fs = await import('fs/promises');
        const content = await fs.readFile(filePath, 'utf-8');
        return { path: filePath, content, size: content.length };
      },
      is_mcp: true,
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private static _error(tool: string, message: string, start: number): ToolCallResult {
    IQRALogger.error(`❌ [TOOLS] ${tool}: ${message}`);
    return { success: false, error: message, tool, latency_ms: Date.now() - start, timestamp: Date.now() };
  }
}

// Auto-init عند الاستيراد
ToolsRegistry.init();
