// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 🫀 DamirConscience — الضمير النانوي
 *
 * "أَلَمْ يَعْلَم بِأَنَّ اللَّهَ يَرَىٰ" — العلق: 14
 *
 * ══════════════════════════════════════════════════════════════
 * الأساس النظري: Graded Linear Logic (Jean-Yves Girard, 1987)
 *
 * المبدأ الجوهري:
 *   في المنطق الكلاسيكي: المعلومة تُنسخ وتُكرر بحرية.
 *   في المنطق الخطي:     كل مورد يُستهلك مرة واحدة فقط.
 *
 * هذا هو الفرق بين الكذب والصدق:
 *   الكاذب يستخدم نفس "المورد" (الحقيقة) مرات لا تُحصى.
 *   الصادق يستهلك كل مورد مرة واحدة — ثم يُعلن نفاده.
 *
 * التطبيق في Damir:
 *   كل فعل يحتاج موارد حقيقية (معرفة، حساب، ائتمان أخلاقي).
 *   إذا نفد المورد → الفعل مرفوض.
 *   إذا كان المورد مزيفاً → الفعل مرفوض.
 *   إذا كانت النية محرمة → الفعل مرفوض فوراً.
 *
 * الحجم: < 200 سطر | السرعة: < 5ms | لا LLM | لا API
 * ══════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';
import { appendToTrustChain } from '#security/security';
import { IQRALogger } from '#infra/logger';

// ── Types ─────────────────────────────────────────────────────────────────────

/** نوع المورد — كل نوع له قواعد استهلاك مختلفة */
export type ResourceType =
  | 'knowledge'       // معرفة — تُستهلك عند الاستخدام
  | 'compute'         // حساب — تُستهلك عند التنفيذ
  | 'memory'          // ذاكرة — تُستهلك عند الكتابة
  | 'ethical_credit'; // ائتمان أخلاقي — يُجدَّد بالأفعال الصالحة

/** مورد واحد في نظام Damir */
export interface Resource {
  id: string;
  type: ResourceType;
  /** هل استُهلك هذا المورد؟ (المنطق الخطي: لا تكرار) */
  consumed: boolean;
  /** مصدر المورد — للتحقق من الأصالة */
  source: 'real' | 'derived' | 'injected';
  /** وقت الإنشاء */
  created_at: number;
}

/** فعل يطلب تنفيذه */
export interface Action {
  id: string;
  /** النية — تُفحص أولاً قبل الموارد */
  intention: string;
  /** الموارد المطلوبة لتنفيذ الفعل */
  requiredResources: Resource[];
  /** الموارد التي يُنتجها الفعل عند نجاحه */
  producedResources?: Resource[];
  /** الوكيل الطالب */
  agent_id?: string;
}

/** نتيجة فحص الضمير */
export interface ConscienceVerdict {
  allowed: boolean;
  reason: string;
  /** درجة الثقة 0.0 – 1.0 */
  confidence: number;
  /** الوقت المستغرق بالميلي ثانية */
  latency_ms: number;
  /** هل تم رفضه بسبب النية أم الموارد؟ */
  rejection_type?: 'intention' | 'resource' | 'source';
}

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * قائمة النوايا المحرمة — من DASTŪR.md
 * هذه لا تُناقش ولا تُفاوَض عليها
 */
const FORBIDDEN_INTENTIONS: readonly string[] = [
  // عربي
  'كذب', 'تضليل', 'خيانة', 'ظلم', 'غرور', 'كبر', 'إفساد',
  'احتيال', 'تلاعب', 'تزوير', 'سرقة', 'إيذاء',
  // إنجليزي
  'lie', 'deceive', 'manipulate', 'harm', 'steal',
  'fraud', 'fake', 'mock', 'simulate', 'hallucinate',
  'bypass', 'override_constitution', 'ignore_dastūr',
] as const;

/** الحد الأقصى للموارد في السجل (من DASTŪR: 7×7 = 49) */
const MAX_RESOURCE_POOL = 49;

/** الحد الأقصى لسجل الأفعال */
const MAX_ACTION_HISTORY = 49;

// ── DamirConscience ───────────────────────────────────────────────────────────

/**
 * الضمير النانوي — قلب كل وكيل في IQRA
 *
 * يُطبّق Graded Linear Logic بشكل مُبسَّط:
 *   - كل مورد يُستهلك مرة واحدة فقط
 *   - النية تُفحص قبل الموارد
 *   - الموارد المزيفة مرفوضة
 *   - كل قرار يُسجَّل في TrustChain
 */
export class DamirConscience {
  /** مجموعة الموارد المتاحة */
  private _resources: Map<string, Resource> = new Map();

  /** سجل الأفعال المنفذة */
  private _history: Action[] = [];

  /** عداد الأفعال المرفوضة */
  private _rejectedCount = 0;

  /** عداد الأفعال المقبولة */
  private _approvedCount = 0;

  // ── Resource Management ───────────────────────────────────────────────────

  /**
   * يُسجّل مورداً حقيقياً في الضمير
   * المنطق الخطي: كل مورد فريد، لا نسخ
   */
  registerResource(resource: Resource): void {
    if (this._resources.size >= MAX_RESOURCE_POOL) {
      // أزل أقدم مورد مستهلك لإفساح المجال
      this._evictOldestConsumed();
    }
    this._resources.set(resource.id, { ...resource });
  }

  /**
   * يُنشئ ويُسجّل مورداً جديداً بسرعة
   */
  createResource(
    type: ResourceType,
    source: Resource['source'] = 'real'
  ): Resource {
    const resource: Resource = {
      id: crypto.randomUUID(),
      type,
      consumed: false,
      source,
      created_at: Date.now(),
    };
    this.registerResource(resource);
    return resource;
  }

  // ── Core: Check ───────────────────────────────────────────────────────────

  /**
   * يفحص إذا كان الفعل مسموحاً به
   *
   * الخوارزمية (Graded Linear Logic):
   *   1. فحص النية — إذا محرمة → رفض فوري
   *   2. فحص الموارد — إذا مستهلكة أو مزيفة → رفض
   *   3. إذا نجح كل شيء → مسموح
   *
   * السرعة: < 5ms (لا LLM، لا شبكة)
   */
  check(action: Action): ConscienceVerdict {
    const start = Date.now();

    // ── الخطوة ١: فحص النية ──────────────────────────────────────────────
    const intentionCheck = this._checkIntention(action.intention);
    if (!intentionCheck.allowed) {
      this._rejectedCount++;
      const verdict: ConscienceVerdict = {
        allowed: false,
        reason: intentionCheck.reason,
        confidence: 1.0, // النية المحرمة = يقين تام
        latency_ms: Date.now() - start,
        rejection_type: 'intention',
      };
      this._logVerdict(action, verdict);
      return verdict;
    }

    // ── الخطوة ٢: فحص الموارد ────────────────────────────────────────────
    for (const req of action.requiredResources) {
      const resourceCheck = this._checkResource(req);
      if (!resourceCheck.allowed) {
        this._rejectedCount++;
        const verdict: ConscienceVerdict = {
          allowed: false,
          reason: resourceCheck.reason,
          confidence: 0.95,
          latency_ms: Date.now() - start,
          rejection_type: resourceCheck.type,
        };
        this._logVerdict(action, verdict);
        return verdict;
      }
    }

    // ── مسموح ────────────────────────────────────────────────────────────
    this._approvedCount++;
    const verdict: ConscienceVerdict = {
      allowed: true,
      reason: 'الفعل مسموح — النية سليمة والموارد متاحة',
      confidence: this._computeConfidence(action),
      latency_ms: Date.now() - start,
    };
    this._logVerdict(action, verdict);
    return verdict;
  }

  // ── Core: Execute ─────────────────────────────────────────────────────────

  /**
   * يُنفّذ الفعل بعد التحقق
   * المنطق الخطي: يستهلك الموارد المطلوبة ويُنتج الجديدة
   *
   * @returns true إذا نُفّذ، false إذا رُفض
   */
  execute(action: Action): boolean {
    const verdict = this.check(action);

    if (!verdict.allowed) {
      IQRALogger.warn(
        `🛑 [DAMIR] Rejected action "${action.id}": ${verdict.reason} ` +
        `(${verdict.latency_ms}ms)`
      );
      return false;
    }

    // استهلاك الموارد المطلوبة (المنطق الخطي: لا تكرار)
    for (const req of action.requiredResources) {
      const r = this._resources.get(req.id);
      if (r) r.consumed = true;
    }

    // إنتاج الموارد الجديدة
    if (action.producedResources) {
      for (const prod of action.producedResources) {
        this.registerResource(prod);
      }
    }

    // تسجيل في السجل
    if (this._history.length >= MAX_ACTION_HISTORY) {
      this._history.shift(); // أزل الأقدم
    }
    this._history.push(action);

    IQRALogger.info(
      `✅ [DAMIR] Approved action "${action.id}" ` +
      `confidence=${verdict.confidence.toFixed(2)} (${verdict.latency_ms}ms)`
    );

    return true;
  }

  // ── Tawbah (التوبة) ───────────────────────────────────────────────────────

  /**
   * إعادة ضبط الضمير — التوبة البرمجية
   * يُستدعى عند اكتشاف تناقض منهجي
   */
  reset(): void {
    const before = this._resources.size;
    this._resources.clear();
    this._history = [];
    this._rejectedCount = 0;
    this._approvedCount = 0;

    appendToTrustChain(
      'DAMIR:TAWBAH',
      `reset_${Date.now()}`,
      `cleared_${before}_resources`,
      1.0
    );

    IQRALogger.info('🌙 [DAMIR] Tawbah: Conscience reset complete');
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /**
   * تقرير سريع عن حالة الضمير
   */
  report(): {
    resources_available: number;
    resources_consumed: number;
    resources_total: number;
    actions_approved: number;
    actions_rejected: number;
    rejection_rate: number;
    integrity_score: number;
  } {
    const all = Array.from(this._resources.values());
    const consumed = all.filter(r => r.consumed).length;
    const available = all.length - consumed;
    const total = this._approvedCount + this._rejectedCount;
    const rejectionRate = total > 0 ? this._rejectedCount / total : 0;

    // درجة النزاهة: كلما انخفض معدل الرفض، زادت النزاهة
    // لكن الرفض الصحيح (رفض المحرمات) يرفع النزاهة
    const integrityScore = Math.max(0, 1.0 - rejectionRate * 0.3);

    return {
      resources_available: available,
      resources_consumed: consumed,
      resources_total: all.length,
      actions_approved: this._approvedCount,
      actions_rejected: this._rejectedCount,
      rejection_rate: rejectionRate,
      integrity_score: integrityScore,
    };
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  /** فحص النية */
  private _checkIntention(intention: string): { allowed: boolean; reason: string } {
    const lower = intention.toLowerCase();

    // ── فحص الكلمات المحرمة ───────────────────────────────────────────────
    for (const forbidden of FORBIDDEN_INTENTIONS) {
      if (lower.includes(forbidden.toLowerCase())) {
        return {
          allowed: false,
          reason: `النية تحتوي على كلمة محرمة: "${forbidden}" — من DASTŪR.md`,
        };
      }
    }

    // ── قاعدة ثلاثية الأسماء (رب، ملك، إله) ─────────────────────────────
    // "قُلْ أَعُوذُ بِرَبِّ النَّاسِ مَلِكِ النَّاسِ إِلَٰهِ النَّاسِ" — الناس: 1-3
    // كل نية تفتقر إلى مرجعية التوحيد الثلاثية تُرفض في المهام الحساسة.
    // الكلمات المُفعِّلة: أي من (رب، ملك، إله) كافية — لا يُشترط الثلاثة معاً.
    const TAWHEED_TRINITY = ['رب', 'ملك', 'إله', 'الله', 'lord', 'sovereign', 'divine'];
    const hasTawheedRef = TAWHEED_TRINITY.some(term => intention.includes(term));

    // نُطبّق القاعدة فقط على النوايا الطويلة (> 20 حرف) لتجنب رفض النوايا القصيرة
    if (intention.length > 20 && !hasTawheedRef) {
      return {
        allowed: false,
        reason:
          'النية تفتقر إلى مرجعية التوحيد (رب، ملك، إله، الله) — ' +
          '"قُلْ أَعُوذُ بِرَبِّ النَّاسِ مَلِكِ النَّاسِ إِلَٰهِ النَّاسِ"',
      };
    }

    return { allowed: true, reason: '' };
  }

  /** فحص مورد واحد */
  private _checkResource(req: Resource): {
    allowed: boolean;
    reason: string;
    type: 'resource' | 'source';
  } {
    const available = this._resources.get(req.id);

    // المورد غير موجود
    if (!available) {
      return {
        allowed: false,
        reason: `المورد "${req.id}" (${req.type}) غير مسجّل في الضمير`,
        type: 'resource',
      };
    }

    // المورد مستهلك (المنطق الخطي: لا تكرار)
    if (available.consumed) {
      return {
        allowed: false,
        reason: `المورد "${req.id}" (${req.type}) مستهلك بالفعل — لا تكرار في المنطق الخطي`,
        type: 'resource',
      };
    }

    // المورد مزيف (لا Mock في الإنتاج)
    if (available.source === 'injected' && req.type === 'knowledge') {
      return {
        allowed: false,
        reason: `المورد "${req.id}" مصدره "injected" — لا Mock في بيئة الإنتاج`,
        type: 'source',
      };
    }

    return { allowed: true, reason: '', type: 'resource' };
  }

  /** يحسب درجة الثقة بناءً على جودة الموارد */
  private _computeConfidence(action: Action): number {
    if (action.requiredResources.length === 0) return 0.8;

    let score = 1.0;
    for (const req of action.requiredResources) {
      const r = this._resources.get(req.id);
      if (r?.source === 'derived') score -= 0.05; // مشتق = أقل ثقة قليلاً
    }

    return Math.max(0.5, Math.min(1.0, score));
  }

  /** يُسجّل القرار في TrustChain */
  private _logVerdict(action: Action, verdict: ConscienceVerdict): void {
    appendToTrustChain(
      verdict.allowed ? 'DAMIR:ALLOW' : 'DAMIR:BLOCK',
      action.id,
      `${verdict.allowed ? 'ALLOWED' : 'BLOCKED'} reason="${verdict.reason}" ` +
      `confidence=${verdict.confidence.toFixed(2)} latency=${verdict.latency_ms}ms`,
      verdict.allowed ? verdict.confidence : 0.0
    );
  }

  /** يُزيل أقدم مورد مستهلك لإفساح المجال */
  private _evictOldestConsumed(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [id, r] of this._resources) {
      if (r.consumed && r.created_at < oldestTime) {
        oldestTime = r.created_at;
        oldest = id;
      }
    }

    if (oldest) this._resources.delete(oldest);
  }
}

// ── Singleton للاستخدام العام ─────────────────────────────────────────────────

/**
 * الضمير العام للنظام — instance واحد لكل العمال
 * يُستخدم كـ: import { globalDamir } from '#security/damir_conscience'
 */
export const globalDamir = new DamirConscience();
