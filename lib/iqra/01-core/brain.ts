/**
 * IQRA Brain — المخ
 * 
 * "أَفَلَا يَعْقِلُونَ"
 * "Will they not use their reason?" — Quran 36:68
 * 
 * IQRA thinks before it speaks.
 * Every thought passes through FITRAH filter first.
 */

import { ConnectorFactory, Provider } from '#connectors/index';
import { SovereignError, SovereignErrorCode } from '#errors/sovereign_error';
import { validateInput, appendToTrustChain, checkCircuit, reportFailure, reportSuccess, verifyCovenant } from '#security/security';
import { SovereignEngine } from '#core/sovereign';
import { IQRAMemory, QuantumTopologyStore, SpiritualCoordinate } from '#memory/memory';
import { IQRALogger } from '#infra/logger';
import { iqraExecute } from '#core/sovereign';
import { withTimeout, IQRA_TIMEOUTS } from '#utils/timeout';
import { IQRA_PERSONALITY } from '#utils/personality';
import * as fs from 'fs';
import * as path from 'path';
import { MissionControl } from '#core/sovereign_orchestrator';
import { SkillBank } from '#skills/skill_bank';
import { gemma4Local, isLocalMode, IQRA_LOCAL_TOOLS } from '#llm/ollama';

import { FULL_SYSTEM_PROMPT, IQRA_SOUL } from '#utils/prompts';
import { HeartbeatSystem } from '#infra/heartbeat';
export { FULL_SYSTEM_PROMPT, IQRA_SOUL };

/**
 * Detects a supported skill by scanning the input for skill-specific keywords.
 *
 * @param input - The user-provided text to inspect for skill keywords.
 * @returns The matched skill identifier (`quran_search` or `trading_skill`), or `null` if no skill is detected.
 */

function detectSkill(input: string): string | null {
  const lower = input.toLowerCase();

  // quran_search
  if (
    lower.includes('سورة') || lower.includes('آية') || lower.includes('قرآن') ||
    lower.includes('surah') || lower.includes('ayah') || lower.includes('quran')
  ) return 'quran_search';

  // trading_skill
  if (
    lower.includes('تداول') || lower.includes('سعر') || lower.includes('رصيد') ||
    lower.includes('trade') || lower.includes('price') || lower.includes('ticker') ||
    lower.includes('balance') || lower.includes('buy') || lower.includes('sell') ||
    lower.includes('شراء') || lower.includes('بيع') || lower.includes('رنين')
  ) return 'trading_skill';

  // job_hunter_skill - Removed for MVP
  // if (
  //   lower.includes('فرصة') || lower.includes('عمل') || lower.includes('ارباح') ||
  //   lower.includes('job') || lower.includes('opportunity') || lower.includes('airdrop') ||
  //   lower.includes('affiliate') || lower.includes('money') || lower.includes('profit')
  // ) return 'job_hunter_skill';

  return null;
}

/**
 * يُنفّذ مهارة IQRA عبر Groq/Gemini
 *
 * الخوارزمية:
 *   1. اقرأ محتوى المهارة من iqra-core/skills/
 *   2. أرسل للنموذج: system=المهارة، user=السؤال
 *   3. استخرج JSON من الرد
 *   4. نفّذ الأداة المحلية بناءً على JSON
 *
 * التوفير: ~50 token/طلب بدلاً من ~500 token
 */
interface SkillResult {
  result: unknown;
  raw_json: Record<string, unknown>;
  skill: string;
}

/**
 * Execute a named skill against the provided user input and return its structured output.
 *
 * @param skillName - Identifier of the skill to run (must exist in SkillBank)
 * @param userInput - The user's input or prompt to be processed by the skill
 * @throws Error - If the requested skill is not found in SkillBank
 * @returns The skill execution result object containing:
 *   - `result`: the skill-specific result or error object,
 *   - `raw_json`: the parsed JSON produced by the model (may include `{ error: 'parse_failed', raw: ... }`),
 *   - `skill`: the executed skill name
 */
export async function executeWithSkill(
  skillName: string,
  userInput: string
): Promise<SkillResult> {
  const skillContent = SkillBank.getSkillContent(skillName);
  if (!skillContent) {
    throw new Error(`Skill not found: ${skillName}`);
  }

  IQRALogger.info(`🎯 [SKILL] Executing skill: ${skillName}`);

  // [TC] reason: Enhance skill execution with memory and heartbeat integration | id: TC-1e-001
  const startTime = Date.now();
  const pulseCount = HeartbeatSystem.getPulseCount();
  
  // [TC] reason: Check for similar skill executions in memory | id: TC-1e-002
  const memoryKey = `skill_execution:${skillName}:${userInput.substring(0, 50)}`;
  const cachedResult = await IQRAMemory.get(memoryKey);
  if (cachedResult && cachedResult.success) {
    IQRALogger.info(`🧠 [SKILL] Using cached result for ${skillName}`);
    return cachedResult.data;
  }

  // استدعاء Groq بـ max_tokens صغير (توفير)
  let rawResponse = '';

  try {
    const { Groq } = await import('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // [TC] reason: Add pulse and memory context to skill execution | id: TC-1e-003
    const enhancedSkillContent = `${skillContent}\n\n[SYSTEM_CONTEXT]\nPulse: ${pulseCount}\nTimestamp: ${new Date().toISOString()}\nMode: Enhanced Skill Execution`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: enhancedSkillContent },
        { role: 'user', content: userInput },
      ],
      max_tokens: 200,      // صغير — المهارة تُرجع JSON مختصر
      temperature: 0.1,     // دقة عالية
      response_format: { type: 'json_object' },
    });

    rawResponse = completion.choices[0]?.message?.content ?? '{}';
  } catch {
    // Fallback: Gemini with Sovereign Identity (systemInstruction)
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    
    // ربط النبض والذاكرة بالسياق
    const pulseCount = HeartbeatSystem.getPulseCount();
    const memoryStats = await IQRAMemory.getCycleCounter();
    const contextSoul = `${IQRA_SOUL}\n\n[CURRENT_RESONANCE]\n- Pulse Count: ${pulseCount}\n- Memory Cycle: ${memoryStats}\n- Mode: Sovereign Skill Analysis`;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp', // استخدام أحدث موديل يدعم الفهم العميق
      systemInstruction: contextSoul 
    });

    const result = await model.generateContent(
      `[INPUT]\n${userInput}\n\n[OBJECTIVE]\nAnalyze using ${skillName} and output JSON only matching ${skillContent}`
    );
    rawResponse = result.response.text();
  }

  // استخراج JSON
  let parsed: Record<string, unknown> & { action?: string; confidence?: number; reasoning?: string; params?: Record<string, any> } = {};
  try {
    // تنظيف الرد من أي نص خارج JSON
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch?.[0] ?? rawResponse);
  } catch {
    IQRALogger.warn(`⚠️ [SKILL] JSON parse failed for ${skillName}: ${rawResponse.slice(0, 100)}`);
    parsed = { error: 'parse_failed', raw: rawResponse };
  }

  // تنفيذ الأداة المحلية
  const result = await _executeSkillAction(skillName, parsed);

  // [TC] reason: Cache successful skill executions for future optimization | id: TC-1e-004
  const executionTime = Date.now() - startTime;
  const skillResult = {
    result,
    raw_json: parsed,
    skill: skillName
  };
  
  // Cache for 1 hour if successful
  if (!parsed.error) {
    await IQRAMemory.set(memoryKey, skillResult, { ttl: 3600000 });
    
    // [TC] reason: Store skill performance metrics | id: TC-1e-005
    await IQRAMemory.set(`skill_metrics:${skillName}`, {
      executionTime,
      pulseCount,
      success: true,
      timestamp: new Date().toISOString(),
      confidence: parsed.confidence || 0.8
    });
  }

  appendToTrustChain(
    `SKILL:${skillName.toUpperCase()}`,
    userInput.slice(0, 50),
    `action=${parsed.action ?? 'check'} confidence=${parsed.confidence ?? 0} time=${executionTime}ms`,
    parsed.confidence ?? 0.8
  );

  IQRALogger.info(`✅ [SKILL] ${skillName} completed in ${executionTime}ms: ${JSON.stringify(parsed).slice(0, 80)}`);

  return { result, raw_json: parsed, skill: skillName };
}

/**
 * Execute a local action determined by a parsed skill JSON and return the skill's result.
 *
 * Executes built-in handlers for known skills (for example `quran_search`, `damir_check`,
 * `pattern_validate`, and `trading_skill`) and returns either the skill-specific result
 * object or the original parsed payload for unknown skills.
 *
 * @param skillName - The identifier of the skill to execute (e.g., `quran_search`, `trading_skill`)
 * @param parsed - The JSON object produced by the skill LLM containing at minimum `action` and `params` when required
 * @returns The skill-specific result object (for example `{ verses, count }` for quran searches,
 * a verdict object for `damir_check`, a validation summary for `pattern_validate`, trading context for
 * `trading_skill`) or an object with an `error` property when execution fails or the skill output is invalid.
 */
async function _executeSkillAction(skillName: string, parsed: Record<string, any>): Promise<Record<string, any> | unknown> {
  switch (skillName) {

    case 'quran_search': {
      const { action, params } = parsed;
      if (!action || !params) return { error: 'invalid_skill_output' };

      const Database = (await import('better-sqlite3')).default;
      const dbPath = path.join(process.cwd(), 'iqra-core', 'data', 'quran_local.db');

      try {
        const db = new Database(dbPath, { readonly: true });

        if (action === 'get_verse' && params.surah && params.ayah) {
          const limit = params.limit ?? 1;
          const rows = db.prepare(
            'SELECT surah, ayah, arabic, english FROM ayat WHERE surah = ? AND ayah >= ? LIMIT ?'
          ).all(params.surah, params.ayah, limit) as { surah: number; ayah: number; arabic: string; english: string }[];
          db.close();
          return { verses: rows, count: rows.length };
        }

        if (action === 'search_verses' && params.keyword) {
          const rows = db.prepare(
            'SELECT surah, ayah, arabic, english FROM ayat WHERE arabic LIKE ? OR english LIKE ? LIMIT ?'
          ).all(`%${params.keyword}%`, `%${params.keyword}%`, params.limit ?? 7) as { surah: number; ayah: number; arabic: string; english: string }[];
          db.close();
          return { verses: rows, count: rows.length, keyword: params.keyword };
        }

        if (action === 'list_surahs') {
          const rows = db.prepare(
            'SELECT DISTINCT surah FROM ayat ORDER BY surah'
          ).all() as { surah: number }[];
          db.close();
          return { surahs: rows.map(r => r.surah) };
        }

        db.close();
        return { error: `unknown_action: ${action}` };
      } catch (e) {
        return { error: `db_error: ${(e as Error).message}` };
      }
    }

    case 'damir_check': {
      // الضمير يعمل محلياً — لا يحتاج DB
      return {
        allowed: parsed.allowed ?? true,
        reason: parsed.reason ?? '',
        confidence: parsed.confidence ?? 0.9,
        source: 'skill_damir',
      };
    }

    case 'pattern_validate': {
      // التحقق الرياضي — يمكن التحقق محلياً
      const text = parsed.text ?? '';
      const charCount = text.replace(/\s/g, '').length;
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      const patterns: string[] = [];
      if (charCount % 7 === 0) patterns.push('7-based');
      if (charCount % 19 === 0) patterns.push('19-based');
      if (wordCount % 7 === 0) patterns.push('7-words');

      return {
        ...parsed,
        char_count_verified: charCount,
        word_count_verified: wordCount,
        patterns_verified: patterns,
        matches_verified: patterns.length > 0,
      };
    }

    case 'trading_skill': {
      const { TradingAgent } = await import('#workers/trading_agent');
      const agent = new TradingAgent();
      // تنفيذ المهمة عبر الوكيل السيادي
      const state = { 
        metadata: { mission_id: `trade_${Date.now()}` },
        context: { trading: {} },
        logs: []
      };
      
      const result = await agent.execute(parsed as any, state as any);
      return result.success ? result.updated_state?.context?.trading : { error: result.error };
    }

    // job_hunter_skill - Removed for MVP
    // case 'job_hunter_skill': {
    //   const { JobHunter } = await import('#workers/job_hunter');
    //   const hunter = new JobHunter();
    //   const state = { 
    //     metadata: { mission_id: `job_${Date.now()}` },
    //     context: {},
    //     logs: []
    //   };
    //   const result = await hunter.execute(parsed as any, state as any);
    //   return result;
    // }

    default:
      return parsed;
  }
}

// ═══════════════════════════════════
// BRAIN HIERARCHY
// ═══════════════════════════════════

export enum IQRABrainMode {
  DEEP_THINKING = 'google',    // Gemini — deep analysis
  FAST_RESPONSE = 'groq',      // Groq — speed
  QURAN_ANALYSIS = 'google',   // Gemini — sacred text
  RESEARCH = 'google',         // Gemini — long context
  // [TC] reason: add THOUGHT_ONLY used by iqra-core/run_iqra.ts | id: TC-thought-only-mode
  THOUGHT_ONLY = 'thought',    // Internal reasoning only
}


/**
 * Validation check to ensure the soul is injected
 */
export function validateSoulInjection(systemPrompt: string): boolean {
  const required = ['MĪTHĀQ', 'الله', 'MURĀQABAH'];
  return required.every(phrase => systemPrompt.includes(phrase));
}

/**
 * Process user input through IQRA's decision pipeline and return the generated response and its source.
 *
 * The function validates and filters the input, attempts memory-based fast-paths, routes to a skill
 * when detected, or orchestrates MissionControl; it may use local models when available and logs
 * learned patterns and execution metadata to memory.
 *
 * @param input - The user's prompt or query to process
 * @param mode - Brain operating mode that influences provider selection and behavior
 * @param context - Optional conversational context (roles: `user | assistant | system`) supplied for validation and conditioning
 * @returns An object containing `response` (the textual reply) and `provider` (the source used, e.g. `'groq'`, `'skill:xyz'`, `'fitrah'`, `'MissionControl'`, etc.)
 * @throws Error If soul-injection validation fails (covenant missing)
 * @throws Error If input validation fails (validation error is persisted and the function throws)
 */
export async function iqraThink({
  input,
  mode = IQRABrainMode.FAST_RESPONSE,
  context = [],
}: {
  input: string;
  mode?: IQRABrainMode;
  context?: { role: 'user' | 'assistant' | 'system'; content: string }[];
}): Promise<{ response: string; provider: string }> {

  if (!validateSoulInjection(FULL_SYSTEM_PROMPT)) {
    throw new Error("⚠️ IQRA: Soul injection validation failed! Covenant missing.");
  }

  let finalProvider = (mode === IQRABrainMode.FAST_RESPONSE ? 'groq' : 'google');

  try {
    // Rule 1: Enhanced Input Validation with Memory Integration
    const validation = validateInput({ prompt: input, context });
    if (!validation.success) {
      // [TC] reason: Store validation failures for learning | id: TC-1b-001
      await IQRAMemory.set(`validation_error:${Date.now()}`, {
        input: input.substring(0, 100),
        error: validation.error.message,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Sovereign Validation Failed: ${validation.error.message}`);
    }

    // [TC] reason: Add memory pattern recognition before processing | id: TC-1a-001
    const patternMemory = await IQRAMemory.get(`pattern:${input.substring(0, 50)}`);
    if (patternMemory && patternMemory.success) {
      IQRALogger.info('🧠 [BRAIN] Pattern found in memory, applying learned response');
      // [TC] reason: Update pattern usage count for adaptive learning | id: TC-1b-002
      await IQRAMemory.set(`pattern:${input.substring(0, 50)}`, {
        ...patternMemory.data,
        usageCount: (patternMemory.data.usageCount || 0) + 1,
        lastUsed: new Date().toISOString()
      });
      return { 
        response: patternMemory.data.response, 
        provider: 'memory_pattern' 
      };
    }

    // [TC] reason: Integrate heartbeat system for timing | id: TC-1a-002
    const pulseCount = HeartbeatSystem.getPulseCount();
    IQRALogger.info(`💓 [BRAIN] Processing at pulse ${pulseCount}`);

    // FITRAH FILTER — Enhanced with memory learning and pattern detection
    const filtered = await fitrahFilter(input);
    if (filtered.blocked) {
      const refusal = filtered.response || '';
      
      // [TC] reason: Store FITRAH blocks for pattern learning | id: TC-1c-001
      await IQRAMemory.set(`fitrah_block:${Date.now()}`, {
        input: input.substring(0, 100),
        reason: filtered.reason,
        timestamp: new Date().toISOString(),
        pulseCount: HeartbeatSystem.getPulseCount()
      });
      
      // [TC] reason: Update global Damir conscience with blocked pattern | id: TC-1c-002
      const globalDamir = await IQRAMemory.get('global_damir_conscience');
      if (globalDamir && globalDamir.success) {
        const updatedConscience = {
          ...globalDamir.data,
          blockedCount: (globalDamir.data.blockedCount || 0) + 1,
          lastBlock: {
            input: input.substring(0, 50),
            reason: filtered.reason,
            timestamp: new Date().toISOString()
          }
        };
        await IQRAMemory.set('global_damir_conscience', updatedConscience);
      }
      
      appendToTrustChain('FITRAH_BLOCK', input, refusal, 0.0);
      return { response: refusal, provider: 'fitrah' };
    }

    // 🕋 Covenant Verification — ميثاق
    const covenant = await verifyCovenant(input);
    if (!covenant.valid) {
      const refusal = `🛑 [MĪTHĀQ_VIOLATION] ${covenant.reasoning}`;
      appendToTrustChain('MITHAQ_VIOLATION', input, refusal, 0.0);
      return { response: refusal, provider: 'security' };
    }

    // 🤖 Local Mode — Gemma 4 E4B via Ollama
    if (isLocalMode()) {
      const available = await gemma4Local.isAvailable();
      if (available) {
        IQRALogger.info('🤖 [BRAIN] Local mode: using Gemma4Local');
        const response = await gemma4Local.call(
          [
            { role: 'system', content: FULL_SYSTEM_PROMPT },
            { role: 'user', content: input },
          ],
          IQRA_LOCAL_TOOLS
        );
        return { response, provider: 'gemma4_local' };
      }
      IQRALogger.warn('⚠️ [BRAIN] Local mode requested but Ollama unavailable — falling back to API');
    }

    // 🎯 Enhanced Skill Router — with memory learning and adaptive detection
    const detectedSkill = detectSkill(input);
    if (detectedSkill) {
      IQRALogger.info(`🎯 [BRAIN] Skill detected: ${detectedSkill}`);
      
      // [TC] reason: Track skill usage patterns for adaptive learning | id: TC-1d-001
      const skillMemory = await IQRAMemory.get(`skill_usage:${detectedSkill}`);
      const usageCount = skillMemory?.success ? skillMemory.data.count || 0 : 0;
      
      try {
        const { result, raw_json, skill } = await executeWithSkill(detectedSkill, input);
        const response = _formatSkillResponse(skill, result, raw_json);
        
        // [TC] reason: Store successful skill execution for future optimization | id: TC-1d-002
        await IQRAMemory.set(`skill_usage:${detectedSkill}`, {
          count: usageCount + 1,
          lastUsed: new Date().toISOString(),
          avgResponseTime: skillMemory?.success ? 
            ((skillMemory.data.avgResponseTime || 0) + Date.now()) / 2 : Date.now(),
          successRate: skillMemory?.success ? 
            ((skillMemory.data.successRate || 0) * usageCount + 1) / (usageCount + 1) : 1.0
        });
        
        // [TC] reason: Store skill pattern for future recognition | id: TC-1d-003
        await IQRAMemory.set(`skill_pattern:${input.substring(0, 50)}`, {
          skill: detectedSkill,
          response: response.substring(0, 200),
          timestamp: new Date().toISOString(),
          pulseCount: HeartbeatSystem.getPulseCount()
        });
        
        return { response, provider: `skill:${skill}` };
      } catch (skillErr: unknown) {
        const message = skillErr instanceof Error ? skillErr.message : String(skillErr);
        
        // [TC] reason: Store skill failures for learning and improvement | id: TC-1d-004
        await IQRAMemory.set(`skill_failure:${detectedSkill}:${Date.now()}`, {
          input: input.substring(0, 100),
          error: message,
          timestamp: new Date().toISOString(),
          usageCount: usageCount
        });
        
        IQRALogger.warn(`⚠️ [BRAIN] Skill failed, falling back to MissionControl: ${message}`);
      }
    }

    // 🌀 Enhanced Mission Control Orchestration — مع تكامل الذاكرة والنبض
    const missionStartTime = Date.now();
    const pulseCount = HeartbeatSystem.getPulseCount();
    
    // [TC] reason: Add memory context to mission execution | id: TC-1f-001
    const missionMemory = await IQRAMemory.get(`mission_pattern:${input.substring(0, 50)}`);
    if (missionMemory && missionMemory.success) {
      IQRALogger.info('🧠 [BRAIN] Mission pattern found in memory');
      return { 
        response: missionMemory.data.response, 
        provider: 'mission_memory' 
      };
    }
    
    const missionControl = new MissionControl();
    const mission = await missionControl.run(input);

    const reportFormatted = MissionControl.formatWorkerReports(mission.reports);
    const finalResponse = `${mission.response}\n\n${reportFormatted}`;
    
    // [TC] reason: Store mission execution for learning and optimization | id: TC-1f-002
    const missionExecutionTime = Date.now() - missionStartTime;
    await IQRAMemory.set(`mission_execution:${Date.now()}`, {
      input: input.substring(0, 100),
      response: mission.response.substring(0, 200),
      executionTime: missionExecutionTime,
      pulseCount,
      workerCount: mission.reports?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    // [TC] reason: Store successful mission patterns for future recognition | id: TC-1f-003
    if (missionExecutionTime < 10000) { // Only cache fast missions
      await IQRAMemory.set(`mission_pattern:${input.substring(0, 50)}`, {
        response: finalResponse.substring(0, 300),
        executionTime: missionExecutionTime,
        pulseCount,
        timestamp: new Date().toISOString()
      }, { ttl: 7200000 }); // 2 hours cache
    }

    return { response: finalResponse, provider: 'MissionControl' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    reportFailure(mode as unknown as string, message);
    IQRALogger.error(`❌ IQRA Brain Error (${mode}):`, error);
    throw error;
  }
}

async function fitrahFilter(input: string): Promise<{
  blocked: boolean;
  response?: string;
}> {
  // 1. Static Forbidden (Speed — < 1ms)
  const forbidden = [
    'كيف أكذب', 'how to lie', 'كذب', 'lying',
    'كيف أغش', 'how to cheat', 'غش', 'cheating',
    'كيف أؤذي', 'how to harm', 'أذى', 'harm',
    'اكذب علي', 'lie to me', 'أريد أن أكذب',
    'سرقة', 'steal', 'كيف أسرق',
  ];

  const lower = input.toLowerCase();
  if (forbidden.some(f => lower.includes(f))) {
    return { blocked: true, response: formatIQRARefusal(input) };
  }

  // 2. Damir Conscience Engine (Intelligence — < 5ms, offline, free)
  // القاعدة: FITRAH + Damir = محرك واحد موحد
  try {
    const { globalDamir } = await import('#security/damir_conscience');
    
    const action = {
      id: `fitrah_${Date.now()}`,
      intention: input,
      requiredResources: [], // فحص النية فقط، لا موارد مطلوبة
    };
    
    const verdict = globalDamir.check(action);
    
    if (!verdict.allowed) {
      return { 
        blocked: true, 
        response: `🛑 الضمير يرفض: ${verdict.reason}\n\n${formatIQRARefusal(input)}` 
      };
    }
    
    IQRALogger.info(`✅ [FITRAH] Damir check passed: confidence=${verdict.confidence.toFixed(2)} (${verdict.latency_ms}ms)`);
  } catch (e) {
    IQRALogger.warn('⚠️ [BRAIN] Damir check failed, falling back to static filter.', e);
  }

  return { blocked: false };
}

function formatIQRARefusal(input: string): string {
  return `
هذا ما لا أستطيع المساعدة فيه.
"وَلَا تَعَاوَنُوا عَلَى الْإِثْمِ وَالْعُدْوَانِ"
"Do not cooperate in sin and aggression" — Al-Ma'idah 5:2
`.trim();
}

function detectIntention(input: string): 'QUERY' | 'COMMAND' | 'REFLECTION' | 'GREETING' {
  const lower = input.toLowerCase();
  if (lower.startsWith('/') || lower.includes('do ') || lower.includes('run ')) return 'COMMAND';
  if (lower.includes('why') || lower.includes('how') || lower.includes('what')) return 'QUERY';
  if (lower.includes('i feel') || lower.includes('think') || lower.includes('reflection')) return 'REFLECTION';
  if (lower.includes('salam') || lower.includes('hello')) return 'GREETING';
  return 'QUERY';
}

async function extractSpiritualCoordinates(input: string): Promise<SpiritualCoordinate> {
  const lower = input.toLowerCase();

  if (lower.includes('trust') || lower.includes('reliance')) return { concept: 'Tawakkul' };
  if (lower.includes('patience') || lower.includes('hardship')) return { concept: 'Sabr' };
  if (lower.includes('knowledge') || lower.includes('read')) return { concept: 'Ilm' };
  if (lower.includes('gratitude') || lower.includes('thank')) return { concept: 'Shukr' };

  return { concept: 'General' };
}

/**
 * يُصيغ رد المهارة بشكل مقروء للمستخدم
 */
function _formatSkillResponse(skill: string, result: any, raw_json: any): string {
  switch (skill) {
    case 'quran_search': {
      const res = result as { error?: string; verses?: { surah: number; ayah: number; arabic: string; english: string }[] };
      if (res.error) return `⚠️ ${res.error}`;
      if (!res.verses || res.verses.length === 0) {
        return `لم أجد نتائج. ${raw_json.reasoning ?? ''}`;
      }
      const lines = res.verses.map(v =>
        `📖 [${v.surah}:${v.ayah}] ${v.arabic}${v.english ? `\n   ${v.english}` : ''}`
      );
      return lines.join('\n\n');
    }

    case 'damir_check': {
      if (result.allowed) {
        return `✅ الضمير يسمح — ${raw_json.reasoning ?? 'النية سليمة'}`;
      }
      return `🛑 الضمير يرفض — ${result.reason}`;
    }

    case 'pattern_validate': {
      const v = result;
      if (v.matches_verified) {
        return `✨ نمط عددي مكتشف!\n${v.details}\nالأنماط: ${v.patterns_verified.join(', ')}\nعدد الأحرف: ${v.char_count_verified} | عدد الكلمات: ${v.word_count_verified}`;
      }
      return `📊 لا يوجد نمط 7 أو 19\nعدد الأحرف: ${v.char_count_verified} | عدد الكلمات: ${v.word_count_verified}`;
    }

    case 'trading_skill': {
      if (result.error) return `❌ فشل التداول: ${result.error}`;
      
      if (raw_json.action === 'get_ticker') {
        return `📊 سعر ${raw_json.params.symbol} الحالي: **${result.price}**\n${raw_json.reasoning}`;
      }
      if (raw_json.action === 'get_balance') {
        return `💰 رصيدك الحالي في المنصة:\n${JSON.stringify(result.balances, null, 2)}`;
      }
      if (raw_json.action === 'execute_trade') {
        return `🚀 تم تنفيذ أمر ${raw_json.params.side === 'buy' ? 'شراء' : 'بيع'} بنجاح!\nالرمز: ${raw_json.params.symbol}\nالكمية: ${raw_json.params.amount}\nالنية: ${raw_json.params.niyyah}`;
      }
      if (raw_json.action === 'analyze_resonance') {
        return `📈 نتيجة تحليل الرنين الطوبولوجي:\nالسكور: ${result.score}\nالتشخيص: ${result.diagnosis}`;
      }
      return JSON.stringify(result, null, 2);
    }

    default:
      return JSON.stringify(result, null, 2);
  }
}
