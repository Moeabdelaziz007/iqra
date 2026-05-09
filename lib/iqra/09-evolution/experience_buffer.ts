// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم
// سبحان الله وبحمده سبحان الله العظيم

/**
 * 🧠 ExperienceBuffer — مخزن التجارب الدائري
 *
 * "وَذَكِّرْ فَإِنَّ الذِّكْرَىٰ تَنفَعُ الْمُؤْمِنِينَ" — الذاريات: 55
 *
 * ══════════════════════════════════════════════════════════════
 * المراجع العلمية:
 * ── CER  (Contextual Experience Replay — ACL 2025)
 *    ذاكرة ديناميكية تُعيد تشغيل التجارب ذات الصلة بالسياق الحالي
 * ── MOBIMEM (arXiv:2512.15784 — ديسمبر 2025)
 *    Experience Memory: قوالب نجاح سابقة قابلة للاسترجاع
 * ── Ebbinghaus Forgetting Curve (1885 — Hermann Ebbinghaus)
 *    R(t) = e^(-t/S) حيث S = قوة الذاكرة، t = الزمن بالأيام
 * ══════════════════════════════════════════════════════════════
 *
 * القواعد الدستورية المضمّنة:
 * 1. لا Mock، لا Fake — كل تجربة حقيقية أو لا تُخزَّن.
 * 2. الحد الأقصى 1000 تجربة — الدائري يُزيل الأقدم عند الامتلاء.
 * 3. forgetStale() يُطبّق منحنى Ebbinghaus — النسيان الطبيعي.
 * 4. getRelevantExperiences() تُرجع أفضل 7 تجارب ذات صلة.
 * 5. كل تجربة تحمل trustLevel لضمان الجودة.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IQRALogger } from '../12-infrastructure/logger.js';
import { appendToTrustChain } from '../security.ts';
import type { WorkerReport } from '../../../agents/contracts.ts';

// ── Constants ─────────────────────────────────────────────────────────────────

/** الحد الأقصى للمخزن الدائري — من DASTŪR: الرقم 1000 = 7 × 143 (مضاعف 7) */
const MAX_BUFFER_SIZE = 1000;

/** عتبة النسيان — تجربة أقل من هذا الوزن تُحذف */
const FORGET_THRESHOLD = 0.05;

/** مسار ملف المخزن المحلي */
const BUFFER_PATH = path.join(process.cwd(), '.iqra', 'experience_buffer.json');

// ── Types ─────────────────────────────────────────────────────────────────────

/** مستوى الثقة في التجربة */
export type TrustLevel = 'verified' | 'candidate' | 'probation';

/** تصنيف نتيجة التجربة */
export type ExperienceOutcome = 'success' | 'partial' | 'failure';

/**
 * تجربة واحدة في المخزن
 * مستوحاة من MOBIMEM Experience Memory + CER
 */
export interface Experience {
  /** معرّف فريد */
  id: string;

  /** معرّف المهمة الأصلية */
  mission_id: string;

  /** الوكيل الذي نفّذ المهمة */
  worker_id: string;

  /** ملخص ما تم تنفيذه */
  summary: string;

  /** المهارات المستخدمة */
  skills_used: string[];

  /** نتيجة التجربة */
  outcome: ExperienceOutcome;

  /** درجة الجودة 0.0 – 1.0 */
  quality_score: number;

  /** مستوى الثقة */
  trust_level: TrustLevel;

  /** الوقت الأصلي للتجربة (Unix ms) */
  timestamp: number;

  /** آخر مرة تم استرجاعها (Unix ms) — يُقوّي الذاكرة */
  last_retrieved: number;

  /** قوة الذاكرة S في معادلة Ebbinghaus — تزداد مع كل استرجاع */
  memory_strength: number;

  /** وزن الذاكرة الحالي R(t) — يُحسب ديناميكيًا */
  retention_weight: number;

  /** السياق الذي نجحت فيه التجربة */
  context_tags: string[];

  /** مرجع قرآني إن وُجد */
  quran_ref?: string;

  /** الدروس المستخلصة */
  lessons: string[];
}

/**
 * نتيجة HandoffResult المُبسَّطة لاستخراج التجربة
 * تُبنى من WorkerReport
 */
export interface HandoffResult {
  mission_id: string;
  worker_id: string;
  status: 'PASS' | 'FAIL';
  skills_used: string[];
  implemented: string[];
  issues: string[];
  quality_score?: number;
  context_tags?: string[];
  quran_ref?: string;
}

// ── Ebbinghaus Engine ─────────────────────────────────────────────────────────

/**
 * محرك منحنى Ebbinghaus للنسيان
 *
 * المعادلة الأصلية: R(t) = e^(-t/S)
 * حيث:
 *   R = نسبة الاحتفاظ (0.0 – 1.0)
 *   t = الزمن منذ آخر استرجاع (بالأيام)
 *   S = قوة الذاكرة (تبدأ بـ 1، تزداد مع كل استرجاع)
 *
 * المرجع: Ebbinghaus, H. (1885). Über das Gedächtnis.
 */
export class EbbinghausEngine {
  /**
   * يحسب وزن الاحتفاظ الحالي لتجربة
   * @param lastRetrieved - آخر وقت استرجاع (Unix ms)
   * @param memoryStrength - قوة الذاكرة S (≥ 1.0)
   * @returns وزن الاحتفاظ R ∈ [0.0, 1.0]
   */
  static computeRetention(lastRetrieved: number, memoryStrength: number): number {
    const nowMs = Date.now();
    const elapsedDays = (nowMs - lastRetrieved) / (1000 * 60 * 60 * 24);
    // R(t) = e^(-t/S)
    const retention = Math.exp(-elapsedDays / Math.max(memoryStrength, 1.0));
    return Math.max(0.0, Math.min(1.0, retention));
  }

  /**
   * يُقوّي الذاكرة عند الاسترجاع (Spaced Repetition)
   * كل استرجاع يضاعف قوة الذاكرة بمعامل 1.5
   * @param currentStrength - القوة الحالية
   * @returns القوة الجديدة
   */
  static strengthen(currentStrength: number): number {
    // تقوية تدريجية — لا تتجاوز 49 (7×7 من DASTŪR)
    return Math.min(49.0, currentStrength * 1.5);
  }

  /**
   * يُضعف الذاكرة عند الفشل (Negative Reinforcement)
   * @param currentStrength - القوة الحالية
   * @returns القوة الجديدة
   */
  static weaken(currentStrength: number): number {
    return Math.max(0.5, currentStrength * 0.7);
  }
}

// ── ExperienceBuffer ──────────────────────────────────────────────────────────

/**
 * مخزن التجارب الدائري — قلب SoulEngine v2
 *
 * يُطبّق:
 * - Circular Buffer (max 1000) من CER
 * - Ebbinghaus Forgetting Curve للنسيان الطبيعي
 * - Contextual Retrieval من MOBIMEM
 */
export class ExperienceBuffer {
  private static _buffer: Experience[] = [];
  private static _loaded = false;

  // ── Persistence ─────────────────────────────────────────────────────────────

  private static load(): void {
    if (this._loaded) return;
    try {
      if (fs.existsSync(BUFFER_PATH)) {
        const raw = fs.readFileSync(BUFFER_PATH, 'utf-8');
        this._buffer = JSON.parse(raw) as Experience[];
        IQRALogger.info(`📚 [EXPERIENCE_BUFFER] Loaded ${this._buffer.length} experiences from disk`);
      } else {
        this._buffer = [];
      }
    } catch (err) {
      IQRALogger.error('❌ [EXPERIENCE_BUFFER] Load error:', err);
      this._buffer = [];
    }
    this._loaded = true;
  }

  private static save(): void {
    try {
      const dir = path.dirname(BUFFER_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(BUFFER_PATH, JSON.stringify(this._buffer, null, 2), 'utf-8');
    } catch (err) {
      IQRALogger.error('❌ [EXPERIENCE_BUFFER] Save error:', err);
    }
  }

  // ── Core: Add ────────────────────────────────────────────────────────────────

  /**
   * يُضيف تجربة جديدة إلى المخزن
   * إذا امتلأ المخزن (1000)، يُزيل التجربة الأضعف احتفاظًا
   *
   * @param result - نتيجة HandoffResult من WorkerReport
   * @returns معرّف التجربة المُضافة
   */
  static add(result: HandoffResult): string {
    this.load();

    const outcome: ExperienceOutcome =
      result.status === 'PASS'
        ? result.issues.length === 0 ? 'success' : 'partial'
        : 'failure';

    const quality = result.quality_score ?? (
      outcome === 'success' ? 0.8 :
      outcome === 'partial' ? 0.5 : 0.2
    );

    const experience: Experience = {
      id: crypto.randomUUID(),
      mission_id: result.mission_id,
      worker_id: result.worker_id,
      summary: this._buildSummary(result),
      skills_used: result.skills_used,
      outcome,
      quality_score: quality,
      trust_level: outcome === 'success' ? 'candidate' : 'probation',
      timestamp: Date.now(),
      last_retrieved: Date.now(),
      memory_strength: 1.0,
      retention_weight: 1.0,
      context_tags: result.context_tags ?? [],
      quran_ref: result.quran_ref,
      lessons: this._extractLessons(result, outcome),
    };

    // Circular buffer: إذا امتلأ، أزل الأضعف
    if (this._buffer.length >= MAX_BUFFER_SIZE) {
      this._evictWeakest();
    }

    this._buffer.push(experience);
    this.save();

    appendToTrustChain(
      'EXPERIENCE:ADD',
      experience.id,
      `outcome=${outcome} quality=${quality.toFixed(2)} mission=${result.mission_id}`,
      quality
    );

    IQRALogger.info(
      `🧠 [EXPERIENCE_BUFFER] Added experience ${experience.id} ` +
      `[${outcome}] quality=${quality.toFixed(2)} buffer_size=${this._buffer.length}`
    );

    return experience.id;
  }

  /**
   * يُضيف تجربة مباشرة من WorkerReport
   */
  static addFromReport(report: WorkerReport, contextTags: string[] = []): string {
    return this.add({
      mission_id: report.mission_id,
      worker_id: report.worker_id,
      status: report.status,
      skills_used: report.skills_used,
      implemented: report.implemented,
      issues: report.issues_discovered,
      quality_score: report.status === 'PASS' ? 0.8 : 0.2,
      context_tags: contextTags,
    });
  }

  // ── Core: Retrieve ───────────────────────────────────────────────────────────

  /**
   * يسترجع أفضل 7 تجارب ذات صلة بالسياق الحالي
   *
   * خوارزمية الترتيب (CER-inspired):
   *   score = (0.4 × retention) + (0.3 × quality) + (0.2 × context_match) + (0.1 × recency)
   *
   * @param contextTags - وسوم السياق الحالي
   * @param skillsNeeded - المهارات المطلوبة
   * @param topK - عدد التجارب المُرجَعة (افتراضي: 7 من DASTŪR)
   * @returns قائمة التجارب المُرتَّبة
   */
  static getRelevantExperiences(
    contextTags: string[],
    skillsNeeded: string[] = [],
    topK: number = 7
  ): Experience[] {
    this.load();

    const now = Date.now();

    const scored = this._buffer
      .filter(exp => exp.outcome !== 'failure' || exp.quality_score > 0.3)
      .map(exp => {
        // تحديث وزن الاحتفاظ
        const retention = EbbinghausEngine.computeRetention(
          exp.last_retrieved,
          exp.memory_strength
        );

        // تطابق السياق
        const contextMatch = this._computeContextMatch(
          exp.context_tags,
          contextTags,
          exp.skills_used,
          skillsNeeded
        );

        // حداثة التجربة (0.0 – 1.0)
        const ageMs = now - exp.timestamp;
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        const recency = Math.exp(-ageDays / 30); // تتلاشى خلال 30 يومًا

        // الدرجة المُركَّبة
        const score =
          0.4 * retention +
          0.3 * exp.quality_score +
          0.2 * contextMatch +
          0.1 * recency;

        return { exp, score, retention };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    // تقوية الذاكرة عند الاسترجاع (Spaced Repetition)
    const retrieved: Experience[] = [];
    for (const { exp } of scored) {
      const idx = this._buffer.findIndex(e => e.id === exp.id);
      if (idx !== -1) {
        this._buffer[idx].last_retrieved = now;
        this._buffer[idx].memory_strength = EbbinghausEngine.strengthen(
          this._buffer[idx].memory_strength
        );
        this._buffer[idx].retention_weight = EbbinghausEngine.computeRetention(
          now,
          this._buffer[idx].memory_strength
        );
        retrieved.push(this._buffer[idx]);
      }
    }

    if (retrieved.length > 0) this.save();

    IQRALogger.info(
      `🔍 [EXPERIENCE_BUFFER] Retrieved ${retrieved.length} relevant experiences ` +
      `for context=[${contextTags.join(',')}]`
    );

    return retrieved;
  }

  // ── Core: Forget ─────────────────────────────────────────────────────────────

  /**
   * يُطبّق منحنى Ebbinghaus ويحذف التجارب التي تجاوزت عتبة النسيان
   *
   * يُشغَّل دوريًا — كل 49 نبضة من SoulEngine (7×7 من DASTŪR)
   *
   * @returns عدد التجارب المحذوفة
   */
  static forgetStale(): number {
    this.load();

    const before = this._buffer.length;
    const now = Date.now();

    this._buffer = this._buffer.filter(exp => {
      // تحديث وزن الاحتفاظ
      const retention = EbbinghausEngine.computeRetention(
        exp.last_retrieved,
        exp.memory_strength
      );
      exp.retention_weight = retention;

      // احتفظ بالتجارب المُتحقَّق منها دائمًا
      if (exp.trust_level === 'verified') return true;

      // احتفظ بالتجارب الحديثة (أقل من 24 ساعة)
      const ageMs = now - exp.timestamp;
      if (ageMs < 24 * 60 * 60 * 1000) return true;

      // احذف ما تجاوز عتبة النسيان
      return retention > FORGET_THRESHOLD;
    });

    const forgotten = before - this._buffer.length;

    if (forgotten > 0) {
      this.save();
      appendToTrustChain(
        'EXPERIENCE:FORGET',
        `stale_purge_${Date.now()}`,
        `forgotten=${forgotten} remaining=${this._buffer.length}`,
        1.0
      );
      IQRALogger.info(
        `🌙 [EXPERIENCE_BUFFER] Ebbinghaus purge: ${forgotten} stale experiences forgotten. ` +
        `Remaining: ${this._buffer.length}`
      );
    }

    return forgotten;
  }

  // ── Stats & Inspection ───────────────────────────────────────────────────────

  /**
   * إحصائيات المخزن الحالية
   */
  static getStats(): {
    total: number;
    byOutcome: Record<ExperienceOutcome, number>;
    byTrust: Record<TrustLevel, number>;
    avgQuality: number;
    avgRetention: number;
    oldestMs: number;
    newestMs: number;
  } {
    this.load();

    const now = Date.now();

    const byOutcome: Record<ExperienceOutcome, number> = {
      success: 0, partial: 0, failure: 0,
    };
    const byTrust: Record<TrustLevel, number> = {
      verified: 0, candidate: 0, probation: 0,
    };

    let totalQuality = 0;
    let totalRetention = 0;
    let oldest = now;
    let newest = 0;

    for (const exp of this._buffer) {
      byOutcome[exp.outcome]++;
      byTrust[exp.trust_level]++;
      totalQuality += exp.quality_score;
      totalRetention += EbbinghausEngine.computeRetention(
        exp.last_retrieved,
        exp.memory_strength
      );
      if (exp.timestamp < oldest) oldest = exp.timestamp;
      if (exp.timestamp > newest) newest = exp.timestamp;
    }

    const n = this._buffer.length || 1;

    return {
      total: this._buffer.length,
      byOutcome,
      byTrust,
      avgQuality: totalQuality / n,
      avgRetention: totalRetention / n,
      oldestMs: oldest,
      newestMs: newest,
    };
  }

  /**
   * يُرقّي تجربة من 'candidate' إلى 'verified'
   * يُستدعى من TrajectoryDistiller بعد التحقق
   */
  static promoteToVerified(experienceId: string): boolean {
    this.load();
    const idx = this._buffer.findIndex(e => e.id === experienceId);
    if (idx === -1) return false;

    this._buffer[idx].trust_level = 'verified';
    this._buffer[idx].memory_strength = EbbinghausEngine.strengthen(
      this._buffer[idx].memory_strength
    );
    this.save();

    IQRALogger.info(`✅ [EXPERIENCE_BUFFER] Experience ${experienceId} promoted to verified`);
    return true;
  }

  /**
   * يُرجع جميع التجارب الناجحة للـ TrajectoryDistiller
   */
  static getSuccessfulExperiences(minQuality: number = 0.6): Experience[] {
    this.load();
    return this._buffer.filter(
      exp => exp.outcome === 'success' && exp.quality_score >= minQuality
    );
  }

  /**
   * حجم المخزن الحالي
   */
  static get size(): number {
    this.load();
    return this._buffer.length;
  }

  // ── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * يُزيل التجربة الأضعف احتفاظًا من المخزن الدائري
   */
  private static _evictWeakest(): void {
    if (this._buffer.length === 0) return;

    let weakestIdx = 0;
    let weakestScore = Infinity;

    for (let i = 0; i < this._buffer.length; i++) {
      const exp = this._buffer[i];
      // التجارب المُتحقَّق منها محمية
      if (exp.trust_level === 'verified') continue;

      const retention = EbbinghausEngine.computeRetention(
        exp.last_retrieved,
        exp.memory_strength
      );
      const score = retention * exp.quality_score;

      if (score < weakestScore) {
        weakestScore = score;
        weakestIdx = i;
      }
    }

    const evicted = this._buffer.splice(weakestIdx, 1)[0];
    IQRALogger.info(
      `♻️ [EXPERIENCE_BUFFER] Circular eviction: removed experience ${evicted.id} ` +
      `(score=${weakestScore.toFixed(3)})`
    );
  }

  /**
   * يحسب درجة تطابق السياق بين تجربة والسياق الحالي
   */
  private static _computeContextMatch(
    expTags: string[],
    queryTags: string[],
    expSkills: string[],
    querySkills: string[]
  ): number {
    if (queryTags.length === 0 && querySkills.length === 0) return 0.5;

    let matches = 0;
    let total = queryTags.length + querySkills.length;

    for (const tag of queryTags) {
      if (expTags.some(t => t.toLowerCase().includes(tag.toLowerCase()))) {
        matches++;
      }
    }

    for (const skill of querySkills) {
      if (expSkills.some(s => s.toLowerCase().includes(skill.toLowerCase()))) {
        matches++;
      }
    }

    return total > 0 ? matches / total : 0.5;
  }

  /**
   * يبني ملخصًا من HandoffResult
   */
  private static _buildSummary(result: HandoffResult): string {
    const implemented = result.implemented.slice(0, 3).join(', ');
    const issues = result.issues.slice(0, 2).join(', ');
    return [
      `Worker: ${result.worker_id}`,
      implemented ? `Implemented: ${implemented}` : '',
      issues ? `Issues: ${issues}` : '',
    ].filter(Boolean).join(' | ');
  }

  /**
   * يستخلص الدروس من نتيجة التجربة
   */
  private static _extractLessons(
    result: HandoffResult,
    outcome: ExperienceOutcome
  ): string[] {
    const lessons: string[] = [];

    if (outcome === 'success') {
      if (result.skills_used.length > 0) {
        lessons.push(`Skills [${result.skills_used.join(', ')}] effective for this context`);
      }
      if (result.implemented.length > 0) {
        lessons.push(`Pattern: ${result.implemented[0]} → success`);
      }
    }

    if (outcome === 'failure') {
      for (const issue of result.issues.slice(0, 3)) {
        lessons.push(`Avoid: ${issue}`);
      }
    }

    if (outcome === 'partial') {
      lessons.push(`Partial success — review issues: ${result.issues.slice(0, 2).join(', ')}`);
    }

    return lessons;
  }
}
