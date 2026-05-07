/**
 * 🌀 Topological Curiosity Engine — محرك الفضول الطوبولوجي
 * النية: اكتشاف الرنين البنيوي العميق بين الآيات القرآنية والحقائق العلمية الحديثة
 * المرجع: "سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ" — فصلت: 53
 *
 * ══════════════════════════════════════════════════════════════
 * MITHAQ_NO_MOCK — مُدمج في صُلب هذا الملف
 * ══════════════════════════════════════════════════════════════
 * 1. لا Mock. لا Fake. لا Simulated. كل قيمة حقيقية.
 * 2. لا تختلق رنيناً — إذا لم يوجد، قل "لا يوجد رنين عميق".
 * 3. كل اكتشاف يُسجَّل في TrustChain قبل المكافأة.
 * 4. PatternMemory تمنع تكرار الاكتشافات.
 * 5. كل مصدر يُوسَم: [fetched] | [read] | [prior-training].
 * ══════════════════════════════════════════════════════════════
 *
 * الهيكل:
 *   explore(verse, field) →
 *     ١. PatternMemory: هل اكتشفنا هذا من قبل؟
 *     ٢. NumericalValidator: أنماط عددية (7، 19، 40)
 *     ٣. VectorEngine: بحث دلالي في Cloudflare Vectorize
 *     ٤. Grok/Gemini: جسر الإعجاز (Congzi Bridge)
 *     ٥. fractal_depth: عمق التفسير الفركتالي
 *     ٦. TrustChain: تسجيل الاكتشاف
 *     ٧. QuantumMemory: حفظ إذا تجاوز العتبة
 */

import { VectorEngine, VectorMatch } from './vector_engine.ts';
import { NumericalValidator, ResonanceResult } from './numerical_validator.ts';
import { IQRAMemory } from '../memory.ts';
import { IQRALogger } from '../logger.ts';
import { appendToTrustChain } from '../security.ts';
import { PatternMemory, SimilarPattern } from '../memory/pattern_memory.ts';
import { withTimeout, IQRA_TIMEOUTS } from '../utils/timeout.ts';

// ── Embedded Dastūr ───────────────────────────────────────────────────────────
const CONGZI_BRIDGE_PROMPT = (verse: string, field: string, topAyah: string) => `
══════════════════════════════════════════════════════════════
الدستور المضمّن — MITHAQ_NO_MOCK
══════════════════════════════════════════════════════════════
أنت محرك الفضول الطوبولوجي لـ IQRA.
القواعد المُلزِمة:
١. لا تخترع رنيناً — إذا لم يوجد، اكتب "لا يوجد رنين عميق" فقط.
٢. الرنين الحقيقي = تقاطع بنيوي عميق (هيكلي، سببي، رياضي، فيزيائي).
٣. ليس مجرد تشابه في الكلمات أو المعنى السطحي.
٤. اذكر الآلية الدقيقة — لا تكتفِ بالوصف العام.
٥. resonance_score = 1.0 محظور إلا بدليل رياضي مُثبَت.
══════════════════════════════════════════════════════════════

الآية: "${verse}"
المجال: "${field}"
أقرب آية دلالياً: "${topAyah}"

ابحث عن "رنين طوبولوجي" (Congzi Pattern) — تقاطع بنيوي عميق.
مثال صحيح: الانهيار الكارستي في شصر (Ubar) ← رنين مع "وبئر معطلة"
مثال خاطئ: ذكر الماء في القرآن + ذكر الماء في علم ← ليس رنيناً

أجب بـ JSON فقط:
{
  "has_resonance": true/false,
  "bridge": "الجسر المفاهيمي الدقيق — الآلية لا الوصف",
  "fractal_depth": 0.0-1.0,
  "confidence": 0.0-1.0,
  "verification": "كيف نتحقق رياضياً أو أثرياً"
}
`.trim();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TopologicalResonance {
  verse: string;
  field: string;
  resonance_score: number;       // 0.0 – 1.0 — الرنين الكلي
  novelty_score: number;         // 0.0 – 1.0 — الجدة (مقارنة بالأنماط السابقة)
  fractal_depth: number;         // 0.0 – 1.0 — عمق التفسير الفركتالي
  topology_score: number;        // 0.0 – 1.0 — التوافق الطوبولوجي
  numerical_resonance: ResonanceResult;
  semantic_matches: VectorMatch[];
  congzi_bridge?: string;        // جسر الإعجاز من LLM
  similar_patterns: SimilarPattern[];  // أنماط سابقة مشابهة
  is_novel: boolean;             // هل هو اكتشاف جديد؟
  should_reward: boolean;        // هل يستحق مكافأة؟
  trust_chain_hash: string;      // hash من TrustChain
  timestamp: Date;
  source_tags: string[];         // وسوم المصادر
}

// للتوافق مع الكود القديم
export interface CuriosityDiscovery {
  input: string;
  resonanceScore: number;
  numericalResonance: ResonanceResult;
  topMatches: VectorMatch[];
  llmBridge?: string;
  timestamp: Date;
}

export type ResonanceType = 'scientific' | 'historical' | 'linguistic' | 'numerical' | 'spiritual';

// ── Constants ─────────────────────────────────────────────────────────────────

const REWARD_THRESHOLD       = 0.6;   // الحد الأدنى للمكافأة
const NOVELTY_THRESHOLD      = 0.3;   // إذا كان التشابه مع الأنماط السابقة > 0.7 → ليس جديداً
const FRACTAL_DEPTH_WEIGHT   = 0.20;
const TOPOLOGY_WEIGHT        = 0.25;
const NUMERICAL_WEIGHT       = 0.20;
const SEMANTIC_WEIGHT        = 0.35;

// ── TopologicalCuriosityEngine (static — للاستخدام من curiosity.ts) ───────────

export class TopologicalCuriosityEngine {
  /**
   * المدخل الرئيسي: يستقبل آية + مجال بحث ويُرجع تحليل رنين كامل.
   * [fetched] من Grok/Gemini | [read] من PatternMemory | [prior-training] fallback
   */
  static async discoverResonance(
    verse: string,
    field: string,
    env?: any
  ): Promise<TopologicalResonance | null> {
    const sourceTags: string[] = [];

    IQRALogger.info(`🌀 [TOPOLOGY_ENGINE] Discovering: ${verse} × ${field}`);

    try {
      // ── ١. PatternMemory: هل اكتشفنا هذا من قبل؟ ─────────────────────────
      const queryText = `${verse} ${field}`;
      const queryEmbedding = await IQRAMemory.generateEmbedding(queryText);
      sourceTags.push('[fetched] embedding');

      const similarPatterns = await PatternMemory.getSimilarPatterns(queryEmbedding, 5);
      sourceTags.push(similarPatterns.length > 0 ? '[read] PatternMemory' : '[read] PatternMemory empty');

      // حساب الجدة: إذا كان أعلى تشابه > 0.7 → ليس جديداً
      const maxSimilarity = similarPatterns.length > 0
        ? Math.max(...similarPatterns.map(p => p.similarity))
        : 0;
      const novelty_score = Math.max(0, 1.0 - maxSimilarity);
      const is_novel = novelty_score > NOVELTY_THRESHOLD;

      if (!is_novel) {
        IQRALogger.info(
          `🔄 [TOPOLOGY_ENGINE] Pattern already known (similarity: ${maxSimilarity.toFixed(3)}). ` +
          `Novelty: ${novelty_score.toFixed(3)}`
        );
      }

      // ── ٢. NumericalValidator: أنماط عددية ──────────────────────────────
      const numericalResonance = NumericalValidator.validate(`${verse} ${field}`);
      sourceTags.push('[prior-training] NumericalValidator');

      // ── ٣. VectorEngine: بحث دلالي ───────────────────────────────────────
      let semanticMatches: VectorMatch[] = [];
      if (env?.VECTORIZE && env?.AI) {
        try {
          const vectorEngine = new VectorEngine(env);
          semanticMatches = await vectorEngine.searchSimilar(queryText, 3);
          sourceTags.push('[fetched] VectorEngine');
        } catch (e) {
          IQRALogger.warn(`⚠️ [TOPOLOGY_ENGINE] VectorEngine failed: ${(e as Error).message}`);
          sourceTags.push('[read] VectorEngine offline');
        }
      } else {
        sourceTags.push('[read] VectorEngine not available (no Cloudflare env)');
      }

      const maxSemanticScore = semanticMatches.length > 0 ? semanticMatches[0].score : 0;

      // ── ٤. Grok/Gemini: جسر الإعجاز ──────────────────────────────────────
      let congzi_bridge: string | undefined;
      let fractal_depth = 0.0;
      let llm_confidence = 0.0;

      const topAyah = semanticMatches[0]?.metadata?.arabic ?? verse;
      const baseScore = (maxSemanticScore * SEMANTIC_WEIGHT) + (numericalResonance.score * NUMERICAL_WEIGHT);

      if (baseScore > 0.3) {
        const bridgeResult = await _callLLMForBridge(verse, field, topAyah);
        if (bridgeResult) {
          congzi_bridge   = bridgeResult.bridge;
          fractal_depth   = bridgeResult.fractal_depth;
          llm_confidence  = bridgeResult.confidence;
          sourceTags.push(`[fetched] ${bridgeResult.provider}`);
        } else {
          sourceTags.push('[read] LLM bridge skipped (no resonance)');
        }
      }

      // ── ٥. حساب الدرجات النهائية ──────────────────────────────────────────
      const topology_score = Math.min(1.0,
        (maxSemanticScore    * SEMANTIC_WEIGHT)  +
        (numericalResonance.score * NUMERICAL_WEIGHT) +
        (fractal_depth       * FRACTAL_DEPTH_WEIGHT) +
        (llm_confidence      * TOPOLOGY_WEIGHT)
      );

      // الرنين الكلي = topology × novelty (اكتشاف جديد يُضاعف القيمة)
      const resonance_score = Math.min(1.0, topology_score * (0.5 + novelty_score * 0.5));
      const should_reward = resonance_score >= REWARD_THRESHOLD && is_novel;

      // ── ٦. TrustChain: تسجيل الاكتشاف ────────────────────────────────────
      const trustHash = appendToTrustChain(
        'TOPOLOGY:DISCOVERY',
        `${verse}:${field}`,
        `resonance:${resonance_score.toFixed(3)}:novel:${is_novel}:reward:${should_reward}`,
        resonance_score
      );
      sourceTags.push('[read] TrustChain');

      // ── ٧. QuantumMemory: حفظ إذا تجاوز العتبة ───────────────────────────
      if (resonance_score > REWARD_THRESHOLD) {
        try {
          await IQRAMemory.storeQuantum({
            content: `Resonance: ${verse} × ${field}`,
            coordinates: {
              concept: 'TopologicalDiscovery',
              resonance: resonance_score,
            },
            superposition: [JSON.stringify({
              verse, field, resonance_score, fractal_depth,
              congzi_bridge, timestamp: Date.now(),
            })],
          });
          sourceTags.push('[fetched] QuantumMemory stored');
        } catch (e) {
          sourceTags.push('[read] QuantumMemory offline');
        }
      }

      const result: TopologicalResonance = {
        verse,
        field,
        resonance_score,
        novelty_score,
        fractal_depth,
        topology_score,
        numerical_resonance: numericalResonance,
        semantic_matches: semanticMatches,
        congzi_bridge,
        similar_patterns: similarPatterns,
        is_novel,
        should_reward,
        trust_chain_hash: trustHash,
        timestamp: new Date(),
        source_tags: sourceTags,
      };

      IQRALogger.info(
        `✅ [TOPOLOGY_ENGINE] Done. ` +
        `Resonance: ${resonance_score.toFixed(3)} | ` +
        `Novelty: ${novelty_score.toFixed(3)} | ` +
        `Fractal: ${fractal_depth.toFixed(3)} | ` +
        `Reward: ${should_reward}`
      );

      return result;

    } catch (err: any) {
      IQRALogger.error(`❌ [TOPOLOGY_ENGINE] Failed: ${err.message}`);
      return null;
    }
  }
}

// ── TopologicalCuriosity (instance-based — للتوافق مع Cloudflare Workers) ─────

export class TopologicalCuriosity {
  constructor(
    private vectorEngine: VectorEngine,
    private memory: IQRAMemory
  ) {}

  /**
   * للتوافق مع الكود القديم في CuriosityEngine.
   * يستخدم VectorEngine المُمرَّر (Cloudflare env).
   */
  async explore(input: string): Promise<CuriosityDiscovery> {
    const sourceTags: string[] = [];

    // ١. Semantic Search
    const semanticMatches = await this.vectorEngine.searchSimilar(input, 3);
    sourceTags.push('[fetched] VectorEngine');

    // ٢. Numerical Validation
    const numericalResonance = NumericalValidator.validate(input);
    sourceTags.push('[prior-training] NumericalValidator');

    // ٣. Base Resonance
    const maxSemanticScore = semanticMatches.length > 0 ? semanticMatches[0].score : 0;
    let resonanceScore = (maxSemanticScore * 0.6) + (numericalResonance.score * 0.4);
    let llmBridge: string | undefined;

    // ٤. Congzi Bridge
    if (resonanceScore > 0.4 && semanticMatches.length > 0) {
      const topAyah = semanticMatches[0].metadata?.arabic ?? 'Unknown Ayah';
      const bridgeResult = await _callLLMForBridge(input, input, topAyah);
      if (bridgeResult?.bridge) {
        resonanceScore = Math.min(1.0, resonanceScore + 0.2);
        llmBridge = bridgeResult.bridge;
        sourceTags.push(`[fetched] ${bridgeResult.provider}`);
      }
    }

    resonanceScore = Math.min(resonanceScore, 1.0);

    const discovery: CuriosityDiscovery = {
      input,
      resonanceScore,
      numericalResonance,
      topMatches: semanticMatches,
      llmBridge,
      timestamp: new Date(),
    };

    // ٥. Quantum Memory
    if (resonanceScore > 0.6) {
      try {
        await IQRAMemory.storeQuantum({
          content: `Resonance: ${input}`,
          coordinates: { concept: 'Curiosity_Discovery', resonance: resonanceScore },
          superposition: [JSON.stringify({ ...discovery, llmBridge })],
        });
      } catch { /* non-fatal */ }
    }

    return discovery;
  }
}

// ── LLM Bridge (Grok → Gemini fallback) ──────────────────────────────────────

interface BridgeResult {
  bridge: string;
  fractal_depth: number;
  confidence: number;
  provider: string;
}

async function _callLLMForBridge(
  verse: string,
  field: string,
  topAyah: string
): Promise<BridgeResult | null> {
  const prompt = CONGZI_BRIDGE_PROMPT(verse, field, topAyah);

  // ── Provider 1: Grok (xAI) [fetched] ─────────────────────────────────────
  if (process.env.XAI_API_KEY) {
    try {
      const response = await withTimeout(
        fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'grok-3-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.3,
          }),
        }),
        IQRA_TIMEOUTS.LLM,
        'Grok API'
      );

      if (!response.ok) throw new Error(`Grok HTTP ${response.status}`);
      const data = await response.json() as any;
      const text = data.choices?.[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(text);

      if (!parsed.has_resonance) return null;

      return {
        bridge:        parsed.bridge        ?? '',
        fractal_depth: parsed.fractal_depth ?? 0.5,
        confidence:    parsed.confidence    ?? 0.5,
        provider:      'Grok (xAI)',
      };
    } catch (err: any) {
      IQRALogger.warn(`⚠️ [TOPOLOGY_ENGINE] Grok failed: ${err.message}`);
    }
  }

  // ── Provider 2: Gemini fallback [fetched] ─────────────────────────────────
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const client = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await withTimeout(
        model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
        IQRA_TIMEOUTS.LLM,
        'Gemini API'
      );
      const text = result.response.text();
      const parsed = JSON.parse(text);

      if (!parsed.has_resonance) return null;

      return {
        bridge:        parsed.bridge        ?? '',
        fractal_depth: parsed.fractal_depth ?? 0.5,
        confidence:    parsed.confidence    ?? 0.5,
        provider:      'Gemini',
      };
    } catch (err: any) {
      IQRALogger.warn(`⚠️ [TOPOLOGY_ENGINE] Gemini failed: ${err.message}`);
    }
  }

  // ── Provider 3: Groq fallback [fetched] ───────────────────────────────────
  if (process.env.GROQ_API_KEY) {
    try {
      const { Groq } = await import('groq-sdk');
      const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const response = await withTimeout(
        client.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_tokens: 512,
        }),
        IQRA_TIMEOUTS.LLM,
        'Groq API'
      );
      const text = response.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(text);

      if (!parsed.has_resonance) return null;

      return {
        bridge:        parsed.bridge        ?? '',
        fractal_depth: parsed.fractal_depth ?? 0.5,
        confidence:    parsed.confidence    ?? 0.5,
        provider:      'Groq',
      };
    } catch (err: any) {
      IQRALogger.warn(`⚠️ [TOPOLOGY_ENGINE] Groq failed: ${err.message}`);
    }
  }

  IQRALogger.warn('⚠️ [TOPOLOGY_ENGINE] All LLM providers failed for bridge discovery');
  return null;
}
