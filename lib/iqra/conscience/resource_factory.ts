// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 🏭 ResourceFactory — مصنع الموارد
 *
 * "وَآتَاكُم مِّن كُلِّ مَا سَأَلْتُمُوهُ" — إبراهيم: 34
 *
 * ══════════════════════════════════════════════════════════════
 * يُحوّل MissionContext إلى قائمة موارد مطلوبة لـ DamirConscience
 *
 * كل مهمة تحتاج موارد حقيقية:
 *   knowledge:quran   — معرفة قرآنية (تُستهلك عند الاستخدام)
 *   knowledge:hadith  — معرفة حديثية
 *   compute:groq      — حساب LLM (تُستهلك عند الاستدعاء)
 *   compute:gemini    — حساب Gemini
 *   compute:local     — حساب محلي (لا يُستهلك — مجاني)
 *   memory:embedding  — ذاكرة تضمين (تُستهلك عند الكتابة)
 *   memory:sqlite     — ذاكرة SQLite
 *   ethical_credit    — ائتمان أخلاقي (يُجدَّد بالأفعال الصالحة)
 * ══════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';
import type { Resource, ResourceType } from '../damir_conscience.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

/** سياق المهمة المُبسَّط لاستخراج الموارد */
export interface MissionResourceContext {
  mission_id: string;
  worker_id: string;
  intention: string;
  /** هل تحتاج المهمة إلى LLM؟ */
  needs_llm?: boolean;
  /** مزود LLM المطلوب */
  llm_provider?: 'groq' | 'gemini' | 'local' | 'ollama';
  /** هل تحتاج إلى بحث قرآني؟ */
  needs_quran?: boolean;
  /** هل تحتاج إلى تضمين (embedding)؟ */
  needs_embedding?: boolean;
  /** هل تحتاج إلى كتابة في الذاكرة؟ */
  needs_memory_write?: boolean;
  /** موارد إضافية مخصصة */
  extra_resources?: Array<{ type: ResourceType; source: Resource['source'] }>;
}

/** نتيجة المصنع */
export interface FactoryResult {
  resources: Resource[];
  intention: string;
  mission_id: string;
  worker_id: string;
}

// ── ResourceFactory ───────────────────────────────────────────────────────────

export class ResourceFactory {

  /**
   * يُنشئ قائمة موارد من سياق المهمة
   *
   * القاعدة: كل مورد حقيقي = source:'real'
   *          كل مورد مشتق = source:'derived'
   *          لا injected في الإنتاج
   */
  static fromMissionContext(ctx: MissionResourceContext): FactoryResult {
    const resources: Resource[] = [];

    // ── ائتمان أخلاقي — دائماً مطلوب ────────────────────────────────────────
    resources.push(this._make('ethical_credit', 'real'));

    // ── موارد LLM ────────────────────────────────────────────────────────────
    if (ctx.needs_llm !== false) {
      const provider = ctx.llm_provider ?? 'groq';
      const source: Resource['source'] = provider === 'local' || provider === 'ollama'
        ? 'real'    // محلي = حقيقي دائماً
        : 'real';   // API = حقيقي إذا كان المفتاح موجوداً

      resources.push(this._make('compute', source));
    }

    // ── موارد القرآن ──────────────────────────────────────────────────────────
    if (ctx.needs_quran) {
      resources.push(this._make('knowledge', 'real'));
    }

    // ── موارد التضمين ─────────────────────────────────────────────────────────
    if (ctx.needs_embedding) {
      resources.push(this._make('compute', 'real'));
      resources.push(this._make('memory', 'real'));
    }

    // ── موارد الكتابة في الذاكرة ──────────────────────────────────────────────
    if (ctx.needs_memory_write) {
      resources.push(this._make('memory', 'real'));
    }

    // ── موارد إضافية ──────────────────────────────────────────────────────────
    if (ctx.extra_resources) {
      for (const extra of ctx.extra_resources) {
        resources.push(this._make(extra.type, extra.source));
      }
    }

    return {
      resources,
      intention: ctx.intention,
      mission_id: ctx.mission_id,
      worker_id: ctx.worker_id,
    };
  }

  /**
   * يُنشئ موارد من WorkerReport بعد التنفيذ
   * يُستخدم لتسجيل الموارد المُنتَجة في الضمير
   */
  static fromWorkerOutput(
    workerId: string,
    implemented: string[],
    quality: number = 0.8
  ): Resource[] {
    const resources: Resource[] = [];

    // كل مهمة منفذة تُنتج ائتماناً أخلاقياً
    if (implemented.length > 0) {
      resources.push(this._make('ethical_credit', 'derived'));
    }

    // إذا كانت الجودة عالية، تُنتج معرفة مشتقة
    if (quality >= 0.7) {
      resources.push(this._make('knowledge', 'derived'));
    }

    return resources;
  }

  /**
   * يُنشئ موارد لوكيل محدد بناءً على دوره
   */
  static forWorker(
    workerId: string,
    missionId: string,
    intention: string
  ): FactoryResult {
    const workerConfigs: Record<string, Partial<MissionResourceContext>> = {
      'ResonanceWorker': {
        needs_llm: false,       // الرنين محلي — لا LLM
        needs_quran: true,
        needs_embedding: true,
        needs_memory_write: false,
      },
      'ResearchWorker': {
        needs_llm: true,
        llm_provider: 'groq',
        needs_quran: true,
        needs_embedding: false,
        needs_memory_write: true,
      },
      'BuilderWorker': {
        needs_llm: true,
        llm_provider: 'groq',
        needs_quran: false,
        needs_embedding: false,
        needs_memory_write: true,
      },
      'ValidationWorker': {
        needs_llm: true,
        llm_provider: 'gemini',
        needs_quran: true,
        needs_embedding: false,
        needs_memory_write: false,
      },
      'ReporterWorker': {
        needs_llm: false,       // التقرير محلي
        needs_quran: false,
        needs_embedding: false,
        needs_memory_write: true,
      },
      'PlannerWorker': {
        needs_llm: true,
        llm_provider: 'groq',
        needs_quran: false,
        needs_embedding: false,
        needs_memory_write: false,
      },
    };

    const config = workerConfigs[workerId] ?? {
      needs_llm: true,
      llm_provider: 'groq',
    };

    return this.fromMissionContext({
      mission_id: missionId,
      worker_id: workerId,
      intention,
      ...config,
    });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private static _make(type: ResourceType, source: Resource['source']): Resource {
    return {
      id: crypto.randomUUID(),
      type,
      consumed: false,
      source,
      created_at: Date.now(),
    };
  }
}
