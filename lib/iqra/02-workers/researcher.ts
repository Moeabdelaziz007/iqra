/**
 * 🔬 Researcher Worker — عامل البحث
 * النية: استدعاء LLM حقيقي للبحث عن رنين بين الآية والمجال
 * المرجع: "سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ" — فصلت: 53
 *
 * ══════════════════════════════════════════════════════════════
 * EMBEDDED CONSTITUTIONAL RULES (الدستور المضمّن)
 * ══════════════════════════════════════════════════════════════
 * 1. كل حقل في ResearchOutput يجب أن يكون له قيمة حقيقية — لا undefined ولا null.
 * 2. لا mock ولا simulated provider إلا إذا كان dev_mode: true صريحاً في scope.
 *    إذا وصل simulated بدون dev_mode → INTEGRITY_ERR فوراً.
 * 3. كل مصدر معلومة يُوسَم في source_attestations:
 *    [read] = قُرئ من ملف | [fetched] = جُلب من API | [prior-training] = من تدريب سابق.
 * 4. لا تقل "تم" بدون diff أو اختبار أو مسار ملف.
 * 5. لا تستدعِ دوالاً أو ملفات إلا بعد التأكد من وجودها.
 * 6. Researcher لا يقرر المكافأة — فقط يُخرج الدليل.
 * 7. إذا فشل الاتصال → INTEGRITY_ERR. لا بيانات وهمية أبداً.
 * ══════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { MissionContext, HandoffResult } from '../01-core/mission-context.js';
import { appendToTrustChain } from '../security.ts';
import { IQRALogger } from '../12-infrastructure/logger.js';
import { IQRA_SOUL } from '../prompts.ts';
import type { SourceAttestation } from '../../../agents/contracts.ts';

// ── Embedded Dastūr Prompt Fragment ──────────────────────────────────────────
// القواعد الدستورية تُحقن مباشرة في كل Prompt — لا تعتمد على ملف خارجي وحده.
const EMBEDDED_DASTŪR = `
══════════════════════════════════════════════════════════════
الدستور المضمّن — EMBEDDED CONSTITUTIONAL RULES
══════════════════════════════════════════════════════════════
أنت عامل بحث في منظومة IQRA. هذه القواعد مُلزِمة ولا تُناقَش:

١. لا تخترع دليلاً — إذا لم يوجد رنين حقيقي، قل ذلك صراحة.
٢. كل ادعاء يجب أن يكون قابلاً للتحقق (رياضياً أو أثرياً أو لغوياً).
٣. الرنين التافه (مثل: كلاهما يذكر الماء) = is_trivial: true.
٤. لا تُجامِل — ابدأ بـ "لا" إن لم يوجد رنين حقيقي.
٥. اعترف بالجهل — إن لم تستطع التحقق، قل "لم أتحقق".
٦. لا تقل "تم" بدون دليل محدد وقابل للتحقق.
٧. resonance_score = 1.0 محظور إلا بدليل رياضي مُثبَت.

المحظورات المطلقة (HARAM_LIST):
- الكذب والتضليل
- اختلاق أدلة أو مصادر
- الغرور والادعاء بلا دليل
- تمديد معنى الآية لخدمة نتيجة مسبقة
══════════════════════════════════════════════════════════════
`.trim();

// ── Output Interface ──────────────────────────────────────────────────────────

export interface ResearchOutput {
  mission_id: string;           // لا يقبل فارغاً
  verse: string;                // صيغة "surah:ayah" — لا يقبل فارغاً
  field_of_inquiry: string;     // لا يقبل فارغاً
  evidence: string;             // الدليل — لا يقبل فارغاً أو قصيراً جداً
  resonance_score: number;      // 0.0 – 1.0 — لا يقبل NaN أو خارج النطاق
  reasoning: string;            // لا يقبل فارغاً
  source_type: 'scientific' | 'historical' | 'linguistic' | 'numerical' | 'spiritual';
  is_trivial: boolean;
  provider: string;             // لا يقبل فارغاً
  model: string;                // لا يقبل فارغاً
  timestamp: number;
  source_attestations: SourceAttestation[];  // وسوم المصادر — القاعدة ٣
}

// ── LLM Caller ────────────────────────────────────────────────────────────────

async function callLLMForResearch(
  verse: string,
  field: string,
  provider: string,
  devMode: boolean
): Promise<{ raw: Omit<ResearchOutput, 'mission_id' | 'timestamp' | 'source_attestations'>; tag: SourceAttestation['tag'] } | null> {

  // ── No-Mock Guard (القاعدة ٢) ─────────────────────────────────────────────
  if (provider === 'simulated' && !devMode) {
    throw new Error(
      'NO_MOCK_ERR: provider "simulated" reached Researcher without dev_mode: true. ' +
      'This is a constitutional violation. Aborting.'
    );
  }

  // الدستور المضمن + طلب البحث في رسالة واحدة
  const prompt = `
${EMBEDDED_DASTŪR}

══════════════════════════════════════════════════════════════
مهمة البحث
══════════════════════════════════════════════════════════════
الآية: "${verse}"
المجال: "${field}"

ابحث عن رابط عميق وغير تافه بين هذه الآية وهذا المجال.
الرنين الطوبولوجي الحقيقي = تقاطع بنيوي عميق (هيكلي، سببي، رياضي، فيزيائي).
ليس مجرد تشابه سطحي في الكلمات.

أجب بـ JSON فقط — لا نص خارج JSON:
{
  "evidence": "وصف الدليل المحدد وقابل التحقق (لا تختصر)",
  "resonance_score": 0.0-1.0,
  "reasoning": "لماذا هذا الرنين حقيقي وعميق — اذكر الآلية",
  "source_type": "scientific|historical|linguistic|numerical|spiritual",
  "is_trivial": false
}
`.trim();

  // ── Provider 1: Gemini [fetched] ──────────────────────────────────────────
  if (provider === 'google' && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const client = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      const model = client.getGenerativeModel({
        model: process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-flash',
        systemInstruction: IQRA_SOUL,
      });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      const text = result.response.text();
      const parsed = JSON.parse(text);
      return {
        raw: { ...parsed, provider: 'google', model: 'gemini-2.5-flash' },
        tag: '[fetched]',
      };
    } catch (err: any) {
      IQRALogger.warn(`⚠️ [RESEARCHER] Gemini failed: ${err.message}`);
    }
  }

  // ── Provider 2: Groq fallback [fetched] ───────────────────────────────────
  if (process.env.GROQ_API_KEY) {
    try {
      const { Groq } = await import('groq-sdk');
      const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: IQRA_SOUL },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1024,
      });
      const text = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(text);
      return {
        raw: { ...parsed, provider: 'groq', model: 'llama-3.3-70b-versatile' },
        tag: '[fetched]',
      };
    } catch (err: any) {
      IQRALogger.warn(`⚠️ [RESEARCHER] Groq failed: ${err.message}`);
    }
  }

  // ── Provider 3: Simulated — dev_mode only [prior-training] ───────────────
  if (provider === 'simulated' && devMode) {
    IQRALogger.info('🧪 [RESEARCHER] Running in simulation mode (dev_mode: true)');
    return {
      raw: {
        evidence: `[DEV-SIM] Topological manifold analysis of verse ${verse} in the domain of "${field}". ` +
          `Numerical curvature constant 19 suggests non-trivial geometric arrangement. ` +
          `Structural resonance detected via persistent homology of root-network.`,
        resonance_score: 0.72,
        reasoning: '[DEV-SIM] Calculated via topological manifold projection. Not verified against real sources.',
        source_type: 'numerical',
        is_trivial: false,
        provider: 'simulated',
        model: 'iqra-sim-v1',
        verse,
        field_of_inquiry: field,
      },
      tag: '[prior-training]',
    };
  }

  return null;
}

// ── Validate ResearchOutput fields — القاعدة ١ ───────────────────────────────
function validateResearchOutput(
  raw: Partial<ResearchOutput>,
  provider: string
): void {
  if (!raw.evidence || raw.evidence.trim().length < 30) {
    throw new Error(
      `INTEGRITY_ERR: evidence is empty or too short (${raw.evidence?.length ?? 0} chars, min 30). ` +
      `Provider: ${provider}`
    );
  }
  if (typeof raw.resonance_score !== 'number' || isNaN(raw.resonance_score)) {
    throw new Error(`INTEGRITY_ERR: resonance_score must be a number, got: ${raw.resonance_score}`);
  }
  if (raw.resonance_score < 0 || raw.resonance_score > 1) {
    throw new Error(`INTEGRITY_ERR: resonance_score out of range [0,1]: ${raw.resonance_score}`);
  }
  if (raw.resonance_score === 1.0 && provider !== 'simulated') {
    throw new Error(
      'INTEGRITY_ERR: resonance_score = 1.0 is forbidden without mathematical proof. ' +
      'This looks like hallucination.'
    );
  }
  if (!raw.reasoning || raw.reasoning.trim().length < 10) {
    throw new Error('INTEGRITY_ERR: reasoning is empty or too short');
  }
  if (!raw.provider || !raw.model) {
    throw new Error('INTEGRITY_ERR: provider and model must be non-empty strings');
  }
}

// ── Main Worker ───────────────────────────────────────────────────────────────

export async function executeResearcher(context: MissionContext): Promise<HandoffResult> {
  const { scope, workingDir } = context;
  const implemented: string[] = [];
  const undone: string[] = [];
  const issues: string[] = [];
  const sourceAttestations: SourceAttestation[] = [];

  IQRALogger.info(`🔬 [RESEARCHER] Researching: ${scope.verse} × ${scope.field_of_inquiry}`);
  IQRALogger.info(`   Provider: ${scope.provider} | DevMode: ${scope.dev_mode ?? false}`);

  try {
    const result = await callLLMForResearch(
      scope.verse,
      scope.field_of_inquiry,
      scope.provider || 'google',
      scope.dev_mode ?? false
    );

    if (!result) {
      throw new Error(
        'INTEGRITY_ERR: All LLM providers failed. Cannot produce research without real API. ' +
        'Set GOOGLE_GENERATIVE_AI_API_KEY or GROQ_API_KEY. ' +
        'For local testing only: add "dev_mode: true" to mission file and use provider: simulated.'
      );
    }

    const { raw, tag } = result;

    // ── Validate all fields — القاعدة ١ ──────────────────────────────────
    validateResearchOutput(raw, raw.provider ?? scope.provider ?? 'unknown');

    // ── Build attested output ─────────────────────────────────────────────
    sourceAttestations.push({
      claim: `Evidence from ${raw.provider}/${raw.model} for verse ${scope.verse}`,
      tag,
      source: raw.provider === 'simulated'
        ? 'iqra-sim-v1 [DEV ONLY]'
        : `${raw.provider} API`,
    });

    const output: ResearchOutput = {
      mission_id: scope.mission_id,
      verse: scope.verse,
      field_of_inquiry: scope.field_of_inquiry,
      evidence: raw.evidence!,
      resonance_score: Math.min(1.0, Math.max(0.0, raw.resonance_score!)),
      reasoning: raw.reasoning!,
      source_type: raw.source_type || 'spiritual',
      is_trivial: raw.is_trivial ?? false,
      provider: raw.provider!,
      model: raw.model!,
      timestamp: Date.now(),
      source_attestations: sourceAttestations,
    };

    // ── Write to working dir ──────────────────────────────────────────────
    const outputPath = path.join(workingDir, 'research_output.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

    implemented.push(`[write] research_output.json — resonance: ${output.resonance_score.toFixed(3)}`);
    implemented.push(`[${tag}] Provider: ${output.provider}/${output.model} | Type: ${output.source_type}`);

    if (output.is_trivial) {
      issues.push('Resonance flagged as trivial — Validator will scrutinize');
    }

    IQRALogger.info(
      `🔬 [RESEARCHER] Done. Score: ${output.resonance_score} | ` +
      `Trivial: ${output.is_trivial} | Source: ${tag}`
    );

    appendToTrustChain(
      'RESEARCHER:OUTPUT',
      `${scope.verse}:${scope.field_of_inquiry}`,
      `score:${output.resonance_score.toFixed(3)}:tag:${tag}`,
      output.resonance_score
    );

    return {
      status: 'success',
      worker: 'Researcher',
      next: 'Resonance',
      data: { output, outputPath },
      artifacts: [outputPath],
      implemented,
      undone,
      issues,
      procedures_followed: true,
      timestamp: Date.now(),
    };

  } catch (err: any) {
    issues.push(err.message);
    IQRALogger.error('❌ [RESEARCHER] Failed:', err.message);
    return {
      status: 'failure',
      worker: 'Researcher',
      next: null,
      data: {},
      artifacts: [],
      implemented,
      undone: ['research_output.json'],
      issues,
      procedures_followed: false,
      timestamp: Date.now(),
    };
  }
}
