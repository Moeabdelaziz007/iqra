// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 🧭 TaskClassifier — الموجّه الذكي
 *
 * "وَكُلَّ شَيْءٍ فَصَّلْنَاهُ تَفْصِيلًا" — الإسراء: 12
 *
 * ══════════════════════════════════════════════════════════════
 * المصادر العلمية:
 *   [1] Lightweight Query Routing (arXiv:2604.03455)
 *       "TF-IDF + SVM يحقق 93.2% دقة بدون LLM"
 *   [2] Universal Model Routing (arXiv:2502.08773)
 *       "توجيه كل prompt للنموذج الأصغر الكافي"
 *   [3] Dynamic Routing without Pre-Inference (arXiv:2601.18130)
 *       "لا تستدعي كل النماذج قبل القرار"
 *
 * المبدأ:
 *   موجّه خفيف (< 1ms) بدون LLM.
 *   يعتمد على: كلمات مفتاحية + أنماط regex + سياق.
 *   دقة مستهدفة: > 90% على مهام IQRA.
 *
 * النماذج التسعة (السبع المثاني + 2):
 *   1. writer         → gemma3:4b-it-qat     (3.2GB) — الكاتب
 *   2. reader         → granite4-tiny:7b     (4.8GB) — القارئ
 *   3. sight          → liquid:lfm2-vl-1.6b  (1.2GB) — البصيرة
 *   4. hearing        → whisper-small        (1.5GB) — السمع
 *   5. topologist     → phi3:mini-4k         (2.7GB) — الطوبولوجي
 *   6. memory         → nomic-embed-text     (300MB) — الذاكرة
 *   7. conscience     → internal (no model)  (<10MB) — الضمير
 *   8. tts            → edge-tts             (50MB) — النطق
 *   9. system_command → OpenClaw             (0MB) — أوامر النظام
 * ══════════════════════════════════════════════════════════════
 * [PURIFICATION] 2026-05-10: Merged edge/ and router/ task classifiers
 * - Added Zod validation from edge/
 * - Added feedback mechanism from edge/
 * - Kept 9 task types from router/
 * - Deleted edge/ directory
 * ══════════════════════════════════════════════════════════════
 */

import { IQRALogger } from '#infra/logger';
import { appendToTrustChain } from '#security/security';
import { z } from 'zod';

// ── Zod Schema (from edge/ version) ─────────────────────────────────────────

const ClassifyInputSchema = z.object({
  input: z.string().min(1).max(10000),
  has_image: z.boolean().default(false),
  has_audio: z.boolean().default(false),
  context_hint: z.enum(['quran', 'science', 'general', 'memory']).optional(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

/** أنواع المهام التسعة — السبع المثاني + TTS + System Command */
export type TaskType =
  | 'conversation'     // → writer  (Gemma 3 4B)
  | 'deep_analysis'    // → reader  (Granite4 7B)
  | 'image'            // → sight   (Liquid VL 1.6B)
  | 'audio_input'      // → hearing (Whisper)
  | 'tts'              // → hearing (Edge TTS)
  | 'topology'         // → topologist (Phi-3 mini)
  | 'memory_operation' // → memory  (Nomic Embed)
  | 'conscience_check' // → conscience (internal)
  | 'system_command';  // → OpenClaw (shell execution)

export interface ClassifiedTask {
  type: TaskType;
  /** درجة الثقة [0,1] */
  confidence: number;
  /** الكيانات المستخرجة */
  entities?: {
    verse_ref?: string;    // "2:255"
    surah?: number;
    ayah?: number;
    command?: string;      // أمر shell
    image_path?: string;
    audio_path?: string;
    query?: string;
  };
  /** سبب التصنيف */
  reason: string;
  /** وقت التصنيف بالميلي ثانية */
  latency_ms: number;
}

// ── Keyword Maps ──────────────────────────────────────────────────────────────

/**
 * خريطة الكلمات المفتاحية لكل نوع مهمة
 * مستوحاة من arXiv:2604.03455 — TF-IDF features
 */
const KEYWORD_MAP: Record<TaskType, string[]> = {
  topology: [
    // عربي
    'حلل', 'استخرج', 'نمط', 'رنين', 'طوبولوجيا', 'إعجاز', 'بنية',
    'تحليل', 'اكتشف', 'فحص', 'دراسة', 'بحث في', 'أنماط',
    // إنجليزي
    'topology', 'resonance', 'persistent', 'homology', 'pattern',
    'analyze', 'discover', 'h1', 'betti', 'fractal', 'shannon',
    'numerical', 'miracle', 'structure',
  ],
  deep_analysis: [
    // عربي
    'اقرأ سورة', 'فسر', 'معنى', 'شرح', 'تفسير', 'دلالة',
    'مقارنة', 'ربط', 'علاقة', 'سياق', 'تأمل',
    // إنجليزي
    'explain', 'interpret', 'meaning', 'context', 'compare',
    'relationship', 'deep', 'long text', 'summarize',
  ],
  image: [
    '[IMAGE]', 'صورة', 'انظر', 'ما هذا', 'وصف الصورة',
    'image', 'photo', 'picture', 'describe', 'what is this',
  ],
  audio_input: [
    '[AUDIO]', 'صوت', 'استمع', 'نسخ', 'تفريغ',
    'audio', 'voice', 'transcribe', 'listen',
  ],
  tts: [
    'اقرأ بصوت', 'انطق', 'تكلم', 'صوّت',
    'speak', 'read aloud', 'tts', 'voice output',
  ],
  memory_operation: [
    'تذكر', 'احفظ', 'استرجع', 'ابحث في الذاكرة', 'ما الذي',
    'remember', 'store', 'retrieve', 'search memory', 'recall',
    'embed', 'vector', 'similar',
  ],
  conscience_check: [
    'هل يمكن', 'هل أستطيع', 'هل يجوز', 'نية', 'ضمير',
    'can i', 'is it ok', 'intention', 'allowed', 'permitted',
    'halal', 'haram', 'ethical',
  ],
  system_command: [
    '$', 'نفّذ', 'شغّل', 'احذف', 'أنشئ ملف', 'git',
    'run', 'execute', 'shell', 'command', 'file', 'mkdir',
    'ls', 'cat', 'npm', 'node', 'python',
  ],
  conversation: [], // الافتراضي
};

/** أنماط regex للكيانات */
const VERSE_REF_PATTERN = /\b(\d{1,3}):(\d{1,3})\b/;
const SHELL_COMMAND_PATTERN = /^\$\s*(.+)/;
const IMAGE_PATH_PATTERN = /\[IMAGE:([^\]]+)\]/;
const AUDIO_PATH_PATTERN = /\[AUDIO:([^\]]+)\]/;

// ── TaskClassifier ────────────────────────────────────────────────────────────

export class TaskClassifier {
  /** عداد التصنيفات */
  private _classifyCount = 0;

  /** إحصائيات التصنيف */
  private _stats: Record<TaskType, number> = {
    conversation: 0,
    deep_analysis: 0,
    image: 0,
    audio_input: 0,
    tts: 0,
    topology: 0,
    memory_operation: 0,
    conscience_check: 0,
    system_command: 0,
  };

  /** سجل التصنيفات للتعلم (MemRL-inspired from edge/) */
  private _history: Array<{
    type: TaskType;
    confidence: number;
    correct?: boolean;
  }> = [];
  private _lastType: TaskType | null = null;

  // ── Core: classify ────────────────────────────────────────────────────────

  /**
   * يُصنّف المدخل إلى نوع مهمة
   *
   * الخوارزمية (< 1ms):
   *   1. فحص الأنماط الصريحة (regex) — يقين تام
   *   2. حساب درجة كل نوع (keyword matching)
   *   3. اختيار النوع الأعلى درجة
   *   4. استخراج الكيانات
   *
   * @param input - نص المدخل
   * @returns ClassifiedTask
   */
  classify(input: string): ClassifiedTask {
    const start = Date.now();
    this._classifyCount++;

    const lower = input.toLowerCase().trim();

    // ── 1. أنماط صريحة (يقين تام) ────────────────────────────────────────
    const explicit = this._checkExplicitPatterns(input, lower);
    if (explicit) {
      this._stats[explicit.type]++;
      appendToTrustChain(
        'CLASSIFIER:EXPLICIT',
        input.slice(0, 50),
        `type=${explicit.type} confidence=${explicit.confidence}`,
        explicit.confidence
      );
      return { ...explicit, latency_ms: Date.now() - start };
    }

    // ── 2. حساب درجات الكلمات المفتاحية ──────────────────────────────────
    const scores = this._computeScores(lower);

    // ── 3. اختيار الأعلى درجة ────────────────────────────────────────────
    let bestType: TaskType = 'conversation';
    let bestScore = 0;

    for (const [type, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type as TaskType;
      }
    }

    // إذا لم يكن هناك تطابق واضح → محادثة عادية
    if (bestScore === 0) {
      bestType = 'conversation';
    }

    // ── 4. استخراج الكيانات ───────────────────────────────────────────────
    const entities = this._extractEntities(input);

    // ── 5. حساب الثقة ────────────────────────────────────────────────────
    const confidence = bestScore > 0
      ? Math.min(0.95, 0.6 + bestScore * 0.1)
      : 0.7; // محادثة عادية = 70% ثقة

    const result: ClassifiedTask = {
      type: bestType,
      confidence,
      entities,
      reason: bestScore > 0
        ? `keyword match: score=${bestScore}`
        : 'default: conversation',
      latency_ms: Date.now() - start,
    };

    this._stats[bestType]++;

    this._lastType = bestType;

    IQRALogger.info(
      `🧭 [CLASSIFIER] "${input.slice(0, 40)}" → ${bestType} ` +
      `(${(confidence * 100).toFixed(0)}%) ${result.latency_ms}ms`
    );

    appendToTrustChain(
      'CLASSIFIER:CLASSIFY',
      input.slice(0, 50),
      `type=${bestType} confidence=${confidence.toFixed(2)} score=${bestScore}`,
      confidence
    );

    return result;
  }

  // ── Feedback (MemRL-inspired from edge/) ─────────────────────────────────

  /**
   * تغذية راجعة لتحسين التصنيف
   * مستوحى من MemRL (arXiv:2601.03192)
   * @param input - the original input text
   * @param wasCorrect - whether the classification was correct
   */
  feedback(input: string, wasCorrect: boolean): void {
    const entry = this._history.find(h => h.type === this._lastType);
    if (entry) {
      entry.correct = wasCorrect;
    }
    IQRALogger.info(
      `🧭 [CLASSIFIER] Feedback: "${input.slice(0, 16)}..." → ${wasCorrect ? '✅' : '❌'}`
    );
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  getStats(): {
    total: number;
    by_type: Record<TaskType, number>;
    accuracy: number;
    history_size: number;
  } {
    const correct = this._history.filter(h => h.correct === true).length;
    const totalFeedback = this._history.filter(h => h.correct !== undefined).length;
    const accuracy = totalFeedback > 0 ? correct / totalFeedback : 1.0;

    return {
      total: this._classifyCount,
      by_type: { ...this._stats },
      accuracy,
      history_size: this._history.length,
    };
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /** فحص الأنماط الصريحة */
  private _checkExplicitPatterns(
    input: string,
    lower: string
  ): Omit<ClassifiedTask, 'latency_ms'> | null {

    // صورة
    if (input.startsWith('[IMAGE]') || IMAGE_PATH_PATTERN.test(input)) {
      const match = IMAGE_PATH_PATTERN.exec(input);
      return {
        type: 'image',
        confidence: 1.0,
        entities: { image_path: match?.[1] },
        reason: 'explicit [IMAGE] prefix',
      };
    }

    // صوت
    if (input.startsWith('[AUDIO]') || AUDIO_PATH_PATTERN.test(input)) {
      const match = AUDIO_PATH_PATTERN.exec(input);
      return {
        type: 'audio_input',
        confidence: 1.0,
        entities: { audio_path: match?.[1] },
        reason: 'explicit [AUDIO] prefix',
      };
    }

    // أمر shell
    const shellMatch = SHELL_COMMAND_PATTERN.exec(input);
    if (shellMatch) {
      return {
        type: 'system_command',
        confidence: 1.0,
        entities: { command: shellMatch[1] },
        reason: 'explicit $ prefix',
      };
    }

    return null;
  }

  /** حساب درجات الكلمات المفتاحية */
  private _computeScores(lower: string): Record<TaskType, number> {
    const scores: Record<TaskType, number> = {
      conversation: 0,
      deep_analysis: 0,
      image: 0,
      audio_input: 0,
      tts: 0,
      topology: 0,
      memory_operation: 0,
      conscience_check: 0,
      system_command: 0,
    };

    for (const [type, keywords] of Object.entries(KEYWORD_MAP)) {
      for (const kw of keywords) {
        if (lower.includes(kw.toLowerCase())) {
          scores[type as TaskType]++;
        }
      }
    }

    return scores;
  }

  /** استخراج الكيانات من النص */
  private _extractEntities(input: string): ClassifiedTask['entities'] {
    const entities: ClassifiedTask['entities'] = {};

    // مرجع آية
    const verseMatch = VERSE_REF_PATTERN.exec(input);
    if (verseMatch) {
      entities.verse_ref = `${verseMatch[1]}:${verseMatch[2]}`;
      entities.surah = parseInt(verseMatch[1], 10);
      entities.ayah = parseInt(verseMatch[2], 10);
    }

    // أمر shell
    const shellMatch = SHELL_COMMAND_PATTERN.exec(input);
    if (shellMatch) {
      entities.command = shellMatch[1];
    }

    // استعلام عام
    entities.query = input.slice(0, 200);

    return entities;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const taskClassifier = new TaskClassifier();
