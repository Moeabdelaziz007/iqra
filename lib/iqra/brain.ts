/**
 * IQRA Brain — المخ
 * 
 * "أَفَلَا يَعْقِلُونَ"
 * "Will they not use their reason?" — Quran 36:68
 * 
 * IQRA thinks before it speaks.
 * Every thought passes through FITRAH filter first.
 */

import { ConnectorFactory, Provider } from '../../src/connectors/index';
import { SovereignError, SovereignErrorCode } from '../../src/errors/sovereign_error';
import { validateInput, appendToTrustChain, checkCircuit, reportFailure, reportSuccess } from './security';
import { SovereignEngine } from './sovereign';
import { IQRAMemory, QuantumTopologyStore, SpiritualCoordinate } from './memory';
import { IQRALogger } from './logger';
import { iqraExecute } from './orchestrator';
import { withTimeout, IQRA_TIMEOUTS } from './utils/timeout';
import { IQRA_PERSONALITY } from './personality';
import * as fs from 'fs';
import * as path from 'path';
import { MissionControl } from './sovereign_orchestrator';
import { gemma4Local, isLocalMode, IQRA_LOCAL_TOOLS } from './llm/ollama.ts';
import { SkillBank } from './skill_bank.ts';

import { FULL_SYSTEM_PROMPT, IQRA_SOUL } from './prompts.ts';
import { HeartbeatSystem } from './heartbeat_system'; // استيراد نبض القلب
export { FULL_SYSTEM_PROMPT, IQRA_SOUL };

// ── Skill Router ──────────────────────────────────────────────────────────────

/**
 * يُحدد المهارة المناسبة للمدخل
 * بدلاً من محادثة مفتوحة → مهارة محكمة = 90% توفير في tokens
 */
function detectSkill(input: string): string | null {
  const lower = input.toLowerCase();

  // quran_search
  if (
    lower.includes('آية') || lower.includes('سورة') || lower.includes('قرآن') ||
    lower.includes('verse') || lower.includes('surah') || lower.includes('quran') ||
    lower.includes('ابحث') || lower.includes('search') ||
    /\d+:\d+/.test(input) // نمط "2:255"
  ) return 'quran_search';

  // damir_check
  if (
    lower.includes('هل يمكن') || lower.includes('هل أستطيع') ||
    lower.includes('can i') || lower.includes('is it ok') ||
    lower.includes('نية') || lower.includes('intention')
  ) return 'damir_check';

  // pattern_validate
  if (
    lower.includes('نمط') || lower.includes('عددي') || lower.includes('إعجاز') ||
    lower.includes('pattern') || lower.includes('numerical') || lower.includes('حروف')
  ) return 'pattern_validate';

  return null; // لا مهارة محددة → محادثة عامة
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
export async function executeWithSkill(
  skillName: string,
  userInput: string
): Promise<{ result: any; raw_json: any; skill: string }> {
  const skillContent = SkillBank.getSkillContent(skillName);
  if (!skillContent) {
    throw new Error(`Skill not found: ${skillName}`);
  }

  IQRALogger.info(`🎯 [SKILL] Executing skill: ${skillName}`);

  // استدعاء Groq بـ max_tokens صغير (توفير)
  let rawResponse = '';

  try {
    const { Groq } = await import('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: skillContent },
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
  let parsed: any = {};
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

  appendToTrustChain(
    `SKILL:${skillName.toUpperCase()}`,
    userInput.slice(0, 50),
    `action=${parsed.action ?? 'check'} confidence=${parsed.confidence ?? 0}`,
    parsed.confidence ?? 0.8
  );

  IQRALogger.info(`✅ [SKILL] ${skillName} completed: ${JSON.stringify(parsed).slice(0, 80)}`);

  return { result, raw_json: parsed, skill: skillName };
}

/**
 * يُنفّذ الأداة المحلية بناءً على JSON المُرجَع من المهارة
 */
async function _executeSkillAction(skillName: string, parsed: any): Promise<any> {
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
          ).all(params.surah, params.ayah, limit) as any[];
          db.close();
          return { verses: rows, count: rows.length };
        }

        if (action === 'search_verses' && params.keyword) {
          const rows = db.prepare(
            'SELECT surah, ayah, arabic, english FROM ayat WHERE arabic LIKE ? OR english LIKE ? LIMIT ?'
          ).all(`%${params.keyword}%`, `%${params.keyword}%`, params.limit ?? 7) as any[];
          db.close();
          return { verses: rows, count: rows.length, keyword: params.keyword };
        }

        if (action === 'list_surahs') {
          const rows = db.prepare(
            'SELECT DISTINCT surah FROM ayat ORDER BY surah'
          ).all() as any[];
          db.close();
          return { surahs: rows.map((r: any) => r.surah) };
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
}

import { GoEngineBridge } from './quran/go-bridge';

/**
 * Validation check to ensure the soul is injected
 */
export function validateSoulInjection(systemPrompt: string): boolean {
  const required = ['MĪTHĀQ', 'الله', 'MURĀQABAH'];
  return required.every(phrase => systemPrompt.includes(phrase));
}

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
    // Rule 1: Validate input
    const validation = validateInput({ prompt: input, context });
    if (!validation.success) {
      throw new Error(`Sovereign Validation Failed: ${validation.error.message}`);
    }

    // FITRAH FILTER — before any LLM call
    const filtered = await fitrahFilter(input);
    if (filtered.blocked) {
      const refusal = filtered.response || '';
      appendToTrustChain('FITRAH_BLOCK', input, refusal, 0.0);
      return { response: refusal, provider: 'fitrah' };
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

    // 🎯 Skill Router — مهارة محكمة بدلاً من محادثة مفتوحة (توفير 90% tokens)
    const detectedSkill = detectSkill(input);
    if (detectedSkill) {
      IQRALogger.info(`🎯 [BRAIN] Skill detected: ${detectedSkill}`);
      try {
        const { result, raw_json, skill } = await executeWithSkill(detectedSkill, input);
        const response = _formatSkillResponse(skill, result, raw_json);
        return { response, provider: `skill:${skill}` };
      } catch (skillErr: any) {
        IQRALogger.warn(`⚠️ [BRAIN] Skill failed, falling back to MissionControl: ${skillErr.message}`);
      }
    }

    // 🌀 Mission Control Orchestration — مركز القيادة والتحكم
    const missionControl = new MissionControl();
    const mission = await missionControl.run(input);

    const reportFormatted = MissionControl.formatWorkerReports(mission.reports);
    const finalResponse = `${mission.response}\n\n${reportFormatted}`;

    return { response: finalResponse, provider: 'MissionControl' };
  } catch (error: any) {
    reportFailure(mode as any, error.message);
    IQRALogger.error(`❌ IQRA Brain Error (${mode}):`, error);
    throw error;
  }
}

async function fitrahFilter(input: string): Promise<{
  blocked: boolean;
  response?: string;
}> {
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
      if (result.error) return `⚠️ ${result.error}`;
      if (!result.verses || result.verses.length === 0) {
        return `لم أجد نتائج. ${raw_json.reasoning ?? ''}`;
      }
      const lines = result.verses.map((v: any) =>
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

    default:
      return JSON.stringify(result, null, 2);
  }
}
