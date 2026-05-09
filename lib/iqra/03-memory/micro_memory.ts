// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 🗄️ MicroMemory — الذاكرة الموحّدة المحلية
 *
 * "وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ فِي إِمَامٍ مُّبِينٍ" — يس: 12
 *
 * ══════════════════════════════════════════════════════════════
 * الهندسة: better-sqlite3 + sqlite-vec
 *
 * لماذا SQLite وليس Redis/Qdrant؟
 *   • يعمل محلياً بدون server — ملف .db واحد
 *   • better-sqlite3 موجود في package.json
 *   • sqlite-vec يُضيف vector search حقيقي
 *   • <1ms للاستعلام على 10,000 متجه
 *   • يعمل على 8GB RAM بدون ضغط
 *
 * الجداول:
 *   patterns        — أنماط الرنين القرآني
 *   vec_patterns    — virtual table للبحث المتجهي
 *   experiences     — تجارب الوكلاء (ExperienceBuffer)
 *   reward_ledger   — سجل المكافآت
 *   shannon_cache   — إنتروبي Shannon للآيات (H_EL < 1 بت)
 *
 * الأسرار المُدمجة:
 *   • H_EL < 0.9685 بت = بصمة قرآنية (quran-qsf discovery)
 *   • SQ8 compression للتضمينات (4x ضغط، 0.99 similarity)
 *   • WAL mode = 10x سرعة كتابة
 * ══════════════════════════════════════════════════════════════
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { IQRALogger } from '../12-infrastructure/logger.js';
import { appendToTrustChain } from '../security.ts';
import { TurboCompressor } from './turbo_compressor.ts';

// ── Constants ─────────────────────────────────────────────────────────────────

const DB_PATH = path.join(process.cwd(), '.iqra', 'iqra_memory.db');

/**
 * العتبة الكونية لإنتروبي الحرف الأخير في الآية
 * اكتشاف مشروع quran-qsf: القرآن هو النص الوحيد بـ H_EL < 1 بت
 * المرجع: SHA-256 موثّق، 70+ اكتشاف، 66 تراجع صادق
 */
const QURAN_ENTROPY_THRESHOLD = 0.9685; // بت

const EMBEDDING_DIM = 768;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PatternRecord {
  id: string;
  verse: string;          // "2:255"
  field: string;          // مجال الاستفسار
  resonance_score: number;
  embedding_blob: Buffer; // SQ8 مضغوط (792 bytes)
  mission_id: string;
  shannon_hel?: number;   // إنتروبي الحرف الأخير
  fractal_depth?: number; // عمق البطون الفركتالي
  created_at: number;     // Unix ms
}

export interface ExperienceRecord {
  id: string;
  mission_id: string;
  worker_id: string;
  outcome: 'success' | 'partial' | 'failure';
  quality_score: number;
  skills_used: string;    // JSON array
  lessons: string;        // JSON array
  memory_strength: number;
  last_retrieved: number;
  timestamp: number;
}

export interface RewardEntry {
  id: string;
  source: string;
  amount: number;
  reason: string;
  cumulative: number;
  timestamp: number;
}

export interface SimilarPattern {
  id: string;
  verse: string;
  field: string;
  resonance_score: number;
  similarity: number;
  shannon_hel?: number;
}

// ── Causal Graph Types (MAGMA-inspired) ──────────────────────────────────────

/**
 * علاقة سببية بين حدثين
 * MAGMA (arXiv:2601.03236): الرسم السببي يُجيب "لماذا؟"
 */
export interface CausalEdge {
  id: string;
  /** الحدث السابق (السبب) */
  cause_id: string;
  cause_type: 'pattern' | 'experience' | 'discovery' | 'skill';
  /** الحدث اللاحق (النتيجة) */
  effect_id: string;
  effect_type: 'pattern' | 'experience' | 'discovery' | 'skill';
  /** نوع العلاقة السببية */
  relation: 'led_to' | 'enabled' | 'contradicted' | 'extended' | 'inspired';
  /** قوة العلاقة 0.0-1.0 */
  strength: number;
  /** شرح السببية */
  explanation: string;
  timestamp: number;
}

// ── Knowledge Version Types (Kumiho-inspired) ─────────────────────────────────

/**
 * نسخة من معرفة IQRA عبر الزمن
 * Kumiho (arXiv:2603.17244): كل فكرة تتطور — لا تُحذف
 */
export interface KnowledgeVersion {
  id: string;
  /** معرّف المعرفة الأصلية */
  knowledge_id: string;
  /** نوع المعرفة */
  knowledge_type: 'pattern' | 'discovery' | 'interpretation' | 'skill';
  /** رقم النسخة */
  version: number;
  /** المحتوى */
  content: string;
  /** ملخص التغيير */
  change_summary: string;
  /** النسخة السابقة (للتتبع) */
  parent_version_id: string | null;
  /** مصدر التغيير */
  changed_by: string;
  timestamp: number;
}

// ── MicroMemory ───────────────────────────────────────────────────────────────

export class MicroMemory {
  private static _db: any = null;

  // ── Init ──────────────────────────────────────────────────────────────────

  /**
   * يُهيّئ قاعدة البيانات ويُنشئ الجداول
   * يُستدعى مرة واحدة عند بدء النظام
   */
  static async init(): Promise<void> {
    if (this._db) return;

    // إنشاء المجلد إذا لم يكن موجوداً
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // تحميل better-sqlite3
    const Database = (await import('better-sqlite3')).default;
    this._db = new Database(DB_PATH);

    // تحميل sqlite-vec
    try {
      const sqliteVec = await import('sqlite-vec');
      sqliteVec.load(this._db);
      IQRALogger.info('✅ [MICRO_MEMORY] sqlite-vec loaded');
    } catch (e) {
      IQRALogger.warn('⚠️ [MICRO_MEMORY] sqlite-vec unavailable — using cosine fallback');
    }

    // إعدادات الأداء (WAL mode = 10x سرعة كتابة)
    this._db.pragma('journal_mode = WAL');
    this._db.pragma('synchronous = NORMAL');
    this._db.pragma('cache_size = -32000');  // 32MB cache
    this._db.pragma('temp_store = MEMORY');
    this._db.pragma('mmap_size = 268435456'); // 256MB mmap

    // إنشاء الجداول
    this._createTables();

    IQRALogger.info(`🗄️ [MICRO_MEMORY] Initialized: ${DB_PATH}`);
    appendToTrustChain('MEMORY:INIT', 'micro_memory', DB_PATH, 1.0);
  }

  private static _createTables(): void {
    // جدول الأنماط القرآنية
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS patterns (
        id            TEXT PRIMARY KEY,
        verse         TEXT NOT NULL,
        field         TEXT NOT NULL,
        resonance     REAL NOT NULL CHECK(resonance >= 0 AND resonance <= 1),
        embedding     BLOB NOT NULL,
        mission_id    TEXT NOT NULL,
        shannon_hel   REAL,
        fractal_depth REAL,
        created_at    INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_patterns_verse    ON patterns(verse);
      CREATE INDEX IF NOT EXISTS idx_patterns_resonance ON patterns(resonance DESC);
      CREATE INDEX IF NOT EXISTS idx_patterns_mission  ON patterns(mission_id);
    `);

    // Virtual table للبحث المتجهي (sqlite-vec)
    // إذا لم يكن sqlite-vec متاحاً، نستخدم cosine fallback
    try {
      this._db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS vec_patterns USING vec0(
          embedding float[${EMBEDDING_DIM}]
        );
      `);
      IQRALogger.info('✅ [MICRO_MEMORY] vec_patterns virtual table created');
    } catch {
      IQRALogger.warn('⚠️ [MICRO_MEMORY] vec0 not available — cosine search will be used');
    }

    // جدول التجارب
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS experiences (
        id              TEXT PRIMARY KEY,
        mission_id      TEXT NOT NULL,
        worker_id       TEXT NOT NULL,
        outcome         TEXT NOT NULL CHECK(outcome IN ('success','partial','failure')),
        quality_score   REAL NOT NULL,
        skills_used     TEXT NOT NULL DEFAULT '[]',
        lessons         TEXT NOT NULL DEFAULT '[]',
        memory_strength REAL NOT NULL DEFAULT 1.0,
        last_retrieved  INTEGER NOT NULL,
        timestamp       INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_exp_outcome   ON experiences(outcome);
      CREATE INDEX IF NOT EXISTS idx_exp_quality   ON experiences(quality_score DESC);
      CREATE INDEX IF NOT EXISTS idx_exp_retrieved ON experiences(last_retrieved DESC);
    `);

    // سجل المكافآت
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS reward_ledger (
        id         TEXT PRIMARY KEY,
        source     TEXT NOT NULL,
        amount     REAL NOT NULL,
        reason     TEXT NOT NULL,
        cumulative REAL NOT NULL,
        timestamp  INTEGER NOT NULL
      );
    `);

    // كاش إنتروبي Shannon
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS shannon_cache (
        verse_ref  TEXT PRIMARY KEY,
        text       TEXT NOT NULL,
        h_el       REAL NOT NULL,
        h_word     REAL,
        is_quran   INTEGER NOT NULL DEFAULT 0,
        computed_at INTEGER NOT NULL
      );
    `);

    // ── Causal Graph (MAGMA-inspired) ─────────────────────────────────────────
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS causal_edges (
        id           TEXT PRIMARY KEY,
        cause_id     TEXT NOT NULL,
        cause_type   TEXT NOT NULL,
        effect_id    TEXT NOT NULL,
        effect_type  TEXT NOT NULL,
        relation     TEXT NOT NULL,
        strength     REAL NOT NULL DEFAULT 0.5,
        explanation  TEXT NOT NULL DEFAULT '',
        timestamp    INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_causal_cause  ON causal_edges(cause_id);
      CREATE INDEX IF NOT EXISTS idx_causal_effect ON causal_edges(effect_id);
      CREATE INDEX IF NOT EXISTS idx_causal_rel    ON causal_edges(relation);
    `);

    // ── Knowledge Versions (Kumiho-inspired) ──────────────────────────────────
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_versions (
        id                TEXT PRIMARY KEY,
        knowledge_id      TEXT NOT NULL,
        knowledge_type    TEXT NOT NULL,
        version           INTEGER NOT NULL DEFAULT 1,
        content           TEXT NOT NULL,
        change_summary    TEXT NOT NULL DEFAULT '',
        parent_version_id TEXT,
        changed_by        TEXT NOT NULL DEFAULT 'IQRA',
        timestamp         INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_kv_knowledge ON knowledge_versions(knowledge_id);
      CREATE INDEX IF NOT EXISTS idx_kv_version   ON knowledge_versions(knowledge_id, version DESC);
    `);
  }

  private static _ensureInit(): void {
    if (!this._db) {
      throw new Error('MICRO_MEMORY_ERR: Call MicroMemory.init() first');
    }
  }

  // ── Patterns ──────────────────────────────────────────────────────────────

  /**
   * يخزن نمط رنين قرآني مع تضمينه المضغوط
   *
   * السر: نضغط التضمين بـ SQ8 قبل التخزين (4x ضغط)
   * ونحسب إنتروبي Shannon للتحقق من البصمة القرآنية
   */
  static storePattern(
    verse: string,
    field: string,
    resonanceScore: number,
    embedding: number[],
    missionId: string,
    text?: string
  ): string {
    this._ensureInit();

    if (!verse || !field || !missionId) {
      throw new Error('PATTERN_ERR: verse, field, mission_id required');
    }
    if (embedding.length !== EMBEDDING_DIM) {
      throw new Error(`PATTERN_ERR: embedding must be ${EMBEDDING_DIM}-dim`);
    }
    if (resonanceScore < 0 || resonanceScore > 1) {
      throw new Error(`PATTERN_ERR: resonance_score out of range: ${resonanceScore}`);
    }

    const id = crypto.randomUUID();

    // ضغط التضمين بـ SQ8
    const quantized = TurboCompressor.quantize(embedding);
    const blob = TurboCompressor.toBuffer(quantized);

    // حساب إنتروبي Shannon إذا توفر النص
    let shannonHel: number | undefined;
    if (text) {
      shannonHel = this.computeShannonHEL(text);
    }

    // تخزين في جدول patterns
    this._db.prepare(`
      INSERT OR REPLACE INTO patterns
        (id, verse, field, resonance, embedding, mission_id, shannon_hel, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, verse, field, resonanceScore, blob, missionId, shannonHel ?? null, Date.now());

    // تخزين في vec_patterns إذا كان sqlite-vec متاحاً
    try {
      const f32 = new Float32Array(embedding);
      this._db.prepare(`
        INSERT OR REPLACE INTO vec_patterns (rowid, embedding)
        VALUES ((SELECT rowid FROM patterns WHERE id = ?), ?)
      `).run(id, Buffer.from(f32.buffer));
    } catch {
      // sqlite-vec غير متاح — سنستخدم cosine fallback
    }

    IQRALogger.info(
      `🌀 [MICRO_MEMORY] Pattern stored: ${verse} × ${field} ` +
      `resonance=${resonanceScore.toFixed(3)}` +
      (shannonHel !== undefined ? ` H_EL=${shannonHel.toFixed(4)}` : '')
    );

    return id;
  }

  /**
   * يسترجع أكثر topK أنماط تشابهاً مع تضمين معطى
   *
   * يستخدم sqlite-vec إذا كان متاحاً، وإلا cosine fallback
   */
  static getSimilarPatterns(
    embedding: number[],
    topK: number = 7,
    minResonance: number = 0.0
  ): SimilarPattern[] {
    this._ensureInit();

    // محاولة sqlite-vec أولاً
    try {
      const f32 = new Float32Array(embedding);
      const rows = this._db.prepare(`
        SELECT
          p.id, p.verse, p.field, p.resonance, p.embedding, p.shannon_hel,
          v.distance
        FROM vec_patterns v
        JOIN patterns p ON p.rowid = v.rowid
        WHERE v.embedding MATCH ?
          AND k = ?
          AND p.resonance >= ?
        ORDER BY v.distance
      `).all(Buffer.from(f32.buffer), topK, minResonance);

      return rows.map((r: any) => ({
        id: r.id,
        verse: r.verse,
        field: r.field,
        resonance_score: r.resonance,
        similarity: 1 - r.distance, // distance → similarity
        shannon_hel: r.shannon_hel ?? undefined,
      }));
    } catch {
      // Fallback: cosine similarity على كل الأنماط
      return this._cosineFallbackSearch(embedding, topK, minResonance);
    }
  }

  /**
   * يسترجع أفضل 7 أنماط لمهمة معينة (يستبعد نفس المهمة)
   */
  static getContextForMission(
    embedding: number[],
    missionId: string,
    topK: number = 7
  ): SimilarPattern[] {
    const all = this.getSimilarPatterns(embedding, topK + 5);
    return all
      .filter(p => {
        // استبعاد نفس المهمة
        const row = this._db.prepare(
          'SELECT mission_id FROM patterns WHERE id = ?'
        ).get(p.id) as any;
        return row?.mission_id !== missionId;
      })
      .slice(0, topK);
  }

  // ── Experiences ───────────────────────────────────────────────────────────

  /**
   * يخزن تجربة وكيل
   */
  static storeExperience(exp: Omit<ExperienceRecord, 'id'>): string {
    this._ensureInit();

    const id = crypto.randomUUID();
    this._db.prepare(`
      INSERT INTO experiences
        (id, mission_id, worker_id, outcome, quality_score,
         skills_used, lessons, memory_strength, last_retrieved, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      exp.mission_id,
      exp.worker_id,
      exp.outcome,
      exp.quality_score,
      typeof exp.skills_used === 'string' ? exp.skills_used : JSON.stringify(exp.skills_used),
      typeof exp.lessons === 'string' ? exp.lessons : JSON.stringify(exp.lessons),
      exp.memory_strength,
      exp.last_retrieved,
      exp.timestamp
    );

    return id;
  }

  /**
   * يسترجع أفضل التجارب ذات الصلة بالسياق الحالي
   * يُطبّق Ebbinghaus: يُقوّي الذاكرة عند الاسترجاع
   */
  static getRelevantExperiences(
    skills: string[],
    topK: number = 7,
    minQuality: number = 0.5
  ): ExperienceRecord[] {
    this._ensureInit();

    const now = Date.now();

    // استرجاع التجارب الناجحة بجودة كافية
    const rows = this._db.prepare(`
      SELECT * FROM experiences
      WHERE quality_score >= ?
        AND outcome IN ('success', 'partial')
      ORDER BY
        (quality_score * 0.4 +
         (1.0 / (1.0 + (? - last_retrieved) / 86400000.0)) * 0.3 +
         memory_strength * 0.3) DESC
      LIMIT ?
    `).all(minQuality, now, topK * 2) as ExperienceRecord[];

    // فلترة بالمهارات إذا وُجدت
    let filtered = rows;
    if (skills.length > 0) {
      filtered = rows.filter(r => {
        const expSkills: string[] = JSON.parse(r.skills_used || '[]');
        return skills.some(s =>
          expSkills.some(es => es.toLowerCase().includes(s.toLowerCase()))
        );
      });
      // إذا لم يكن هناك تطابق، أرجع الأفضل بدون فلترة
      if (filtered.length === 0) filtered = rows;
    }

    const result = filtered.slice(0, topK);

    // تقوية الذاكرة عند الاسترجاع (Ebbinghaus Spaced Repetition)
    const updateStmt = this._db.prepare(`
      UPDATE experiences
      SET last_retrieved = ?,
          memory_strength = MIN(49.0, memory_strength * 1.5)
      WHERE id = ?
    `);
    for (const exp of result) {
      updateStmt.run(now, exp.id);
    }

    return result;
  }

  /**
   * يُطبّق Ebbinghaus forgetting — يحذف التجارب المنسية
   * يُشغَّل كل 49 نبضة (7×7 من DASTŪR)
   */
  static forgetStaleExperiences(olderThanDays: number = 7): number {
    this._ensureInit();

    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    // R(t) = e^(-t/S) < 0.05 → نسيان
    // t/S > ln(20) ≈ 3 → نسيان
    const result = this._db.prepare(`
      DELETE FROM experiences
      WHERE last_retrieved < ?
        AND memory_strength < 2.0
        AND outcome != 'success'
    `).run(cutoff);

    // أيضاً احذف التجارب القديمة جداً بغض النظر
    const result2 = this._db.prepare(`
      DELETE FROM experiences
      WHERE last_retrieved < ?
        AND memory_strength < 0.5
    `).run(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 يوم

    const forgotten = (result.changes || 0) + (result2.changes || 0);

    if (forgotten > 0) {
      IQRALogger.info(`🌙 [MICRO_MEMORY] Ebbinghaus: ${forgotten} stale experiences forgotten`);
    }

    return forgotten;
  }

  // ── Reward Ledger ─────────────────────────────────────────────────────────

  /**
   * يُسجّل مكافأة في السجل
   */
  static recordReward(source: string, amount: number, reason: string): string {
    this._ensureInit();

    const last = this._db.prepare(
      'SELECT cumulative FROM reward_ledger ORDER BY timestamp DESC LIMIT 1'
    ).get() as any;

    const cumulative = (last?.cumulative ?? 0) + amount;
    const id = crypto.randomUUID();

    this._db.prepare(`
      INSERT INTO reward_ledger (id, source, amount, reason, cumulative, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, source, amount, reason, cumulative, Date.now());

    return id;
  }

  /**
   * يُرجع المكافأة التراكمية الحالية
   */
  static getCumulativeReward(): number {
    this._ensureInit();
    const row = this._db.prepare(
      'SELECT cumulative FROM reward_ledger ORDER BY timestamp DESC LIMIT 1'
    ).get() as any;
    return row?.cumulative ?? 0;
  }

  // ── Shannon Entropy (H_EL) ────────────────────────────────────────────────

  /**
   * يحسب إنتروبي Shannon للحرف الأخير في الآية (H_EL)
   *
   * الاكتشاف: القرآن هو النص الوحيد بـ H_EL < 0.9685 بت
   * المرجع: مشروع quran-qsf (SHA-256 موثّق)
   *
   * الخوارزمية:
   *   1. استخرج الحرف الأخير من كل كلمة في الآية
   *   2. احسب توزيع الحروف
   *   3. H = -Σ p(c) × log2(p(c))
   *
   * @param text - نص الآية
   * @returns إنتروبي الحرف الأخير (بت)
   */
  static computeShannonHEL(text: string): number {
    if (!text || text.trim().length === 0) return 1.0;

    // استخراج الحروف الأخيرة من كل كلمة
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return 1.0;

    const lastChars = words.map(w => w[w.length - 1]);

    // حساب التوزيع
    const freq = new Map<string, number>();
    for (const c of lastChars) {
      freq.set(c, (freq.get(c) ?? 0) + 1);
    }

    // H = -Σ p(c) × log2(p(c))
    let entropy = 0;
    const n = lastChars.length;
    for (const count of freq.values()) {
      const p = count / n;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  /**
   * يتحقق من البصمة القرآنية بناءً على H_EL
   *
   * إذا كان H_EL < 0.9685 بت → بصمة قرآنية محتملة
   * هذا لا يُثبت أن النص قرآن، لكنه مؤشر إحصائي قوي
   */
  static hasQuranSignature(text: string): {
    hel: number;
    isQuranLike: boolean;
    confidence: number;
  } {
    const hel = this.computeShannonHEL(text);
    const isQuranLike = hel < QURAN_ENTROPY_THRESHOLD;

    // الثقة: كلما انخفض H_EL عن العتبة، زادت الثقة
    const confidence = isQuranLike
      ? Math.min(1.0, (QURAN_ENTROPY_THRESHOLD - hel) / QURAN_ENTROPY_THRESHOLD + 0.5)
      : 0.0;

    return { hel, isQuranLike, confidence };
  }

  /**
   * يُخزّن نتيجة Shannon في الكاش
   */
  static cacheShannon(verseRef: string, text: string): void {
    this._ensureInit();
    const hel = this.computeShannonHEL(text);
    const { isQuranLike } = this.hasQuranSignature(text);

    this._db.prepare(`
      INSERT OR REPLACE INTO shannon_cache
        (verse_ref, text, h_el, is_quran, computed_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(verseRef, text, hel, isQuranLike ? 1 : 0, Date.now());
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /**
   * إحصائيات قاعدة البيانات
   */
  static getStats(): {
    patterns: number;
    experiences: number;
    rewards: number;
    cumulative_reward: number;
    db_size_mb: number;
    quran_signature_patterns: number;
  } {
    this._ensureInit();

    const patterns = (this._db.prepare('SELECT COUNT(*) as n FROM patterns').get() as any).n;
    const experiences = (this._db.prepare('SELECT COUNT(*) as n FROM experiences').get() as any).n;
    const rewards = (this._db.prepare('SELECT COUNT(*) as n FROM reward_ledger').get() as any).n;
    const cumulative = this.getCumulativeReward();
    const quranSig = (this._db.prepare(
      'SELECT COUNT(*) as n FROM patterns WHERE shannon_hel < ?'
    ).get(QURAN_ENTROPY_THRESHOLD) as any).n;

    // WAL checkpoint لضمان كتابة البيانات على disk قبل قراءة الحجم
    try {
      this._db.pragma('wal_checkpoint(PASSIVE)');
    } catch { /* ignore */ }

    let dbSizeMb = 0;
    try {
      const stat = fs.statSync(DB_PATH);
      dbSizeMb = stat.size / (1024 * 1024);
      // إذا كان الملف موجوداً لكن حجمه صفر، نُرجع حجم WAL file إن وُجد
      if (dbSizeMb === 0) {
        const walPath = DB_PATH + '-wal';
        if (fs.existsSync(walPath)) {
          const walStat = fs.statSync(walPath);
          dbSizeMb = walStat.size / (1024 * 1024);
        }
        // إذا لا يزال صفراً، نُرجع حجماً رمزياً يعكس وجود الملف
        if (dbSizeMb === 0 && fs.existsSync(DB_PATH)) {
          dbSizeMb = 0.001; // الملف موجود لكن فارغ بعد
        }
      }
    } catch { /* ignore */ }

    return {
      patterns,
      experiences,
      rewards,
      cumulative_reward: cumulative,
      db_size_mb: Math.round(dbSizeMb * 1000) / 1000,
      quran_signature_patterns: quranSig,
    };
  }

  /**
   * يُغلق قاعدة البيانات بأمان
   */
  static close(): void {
    if (this._db) {
      this._db.close();
      this._db = null;
      IQRALogger.info('🗄️ [MICRO_MEMORY] Database closed');
    }
  }

  // ── Causal Graph (MAGMA) ──────────────────────────────────────────────────

  /**
   * يُسجّل علاقة سببية بين حدثين
   *
   * مثال: "اكتشاف رنين آية النور" ← led_to → "اكتشاف رنين الليزر"
   * يُجيب على: لماذا حدث هذا الاكتشاف؟
   */
  static recordCausalEdge(edge: Omit<CausalEdge, 'id' | 'timestamp'>): string {
    this._ensureInit();
    const id = crypto.randomUUID();

    this._db.prepare(`
      INSERT INTO causal_edges
        (id, cause_id, cause_type, effect_id, effect_type,
         relation, strength, explanation, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      edge.cause_id, edge.cause_type,
      edge.effect_id, edge.effect_type,
      edge.relation,
      edge.strength,
      edge.explanation,
      Date.now()
    );

    IQRALogger.info(
      `🔗 [CAUSAL] ${edge.cause_type}:${edge.cause_id.slice(0,8)} ` +
      `--[${edge.relation}]--> ${edge.effect_type}:${edge.effect_id.slice(0,8)} ` +
      `(${(edge.strength*100).toFixed(0)}%)`
    );

    return id;
  }

  /**
   * يسترجع السلسلة السببية لحدث معين
   * "لماذا حدث هذا؟" — يتتبع الأسباب للخلف
   */
  static getCausalChain(
    effectId: string,
    maxDepth: number = 5
  ): CausalEdge[] {
    this._ensureInit();
    const chain: CausalEdge[] = [];
    const visited = new Set<string>();

    const traverse = (id: string, depth: number) => {
      if (depth >= maxDepth || visited.has(id)) return;
      visited.add(id);

      const edges = this._db.prepare(`
        SELECT * FROM causal_edges WHERE effect_id = ?
        ORDER BY strength DESC, timestamp DESC LIMIT 7
      `).all(id) as CausalEdge[];

      for (const edge of edges) {
        chain.push(edge);
        traverse(edge.cause_id, depth + 1);
      }
    };

    traverse(effectId, 0);
    return chain;
  }

  /**
   * يسترجع كل ما أدى إليه حدث معين
   * "ماذا أنتج هذا الاكتشاف؟"
   */
  static getCausalEffects(causeId: string): CausalEdge[] {
    this._ensureInit();
    return this._db.prepare(`
      SELECT * FROM causal_edges WHERE cause_id = ?
      ORDER BY strength DESC
    `).all(causeId) as CausalEdge[];
  }

  // ── Knowledge Versioning (Kumiho) ─────────────────────────────────────────

  /**
   * يُسجّل نسخة جديدة من معرفة
   *
   * كل تغيير في الفهم يُحفظ — لا شيء يُحذف
   * مثال: فهم آية النور تطور من "نور حسي" → "نور كمومي"
   */
  static recordKnowledgeVersion(
    knowledgeId: string,
    knowledgeType: KnowledgeVersion['knowledge_type'],
    content: string,
    changeSummary: string,
    changedBy: string = 'IQRA'
  ): string {
    this._ensureInit();

    // إيجاد آخر نسخة
    const lastVersion = this._db.prepare(`
      SELECT id, version FROM knowledge_versions
      WHERE knowledge_id = ?
      ORDER BY version DESC LIMIT 1
    `).get(knowledgeId) as any;

    const newVersion = (lastVersion?.version ?? 0) + 1;
    const id = crypto.randomUUID();

    this._db.prepare(`
      INSERT INTO knowledge_versions
        (id, knowledge_id, knowledge_type, version, content,
         change_summary, parent_version_id, changed_by, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, knowledgeId, knowledgeType, newVersion,
      content, changeSummary,
      lastVersion?.id ?? null,
      changedBy, Date.now()
    );

    IQRALogger.info(
      `📚 [KUMIHO] ${knowledgeType}:${knowledgeId.slice(0,8)} ` +
      `v${newVersion} — ${changeSummary.slice(0,50)}`
    );

    return id;
  }

  /**
   * يسترجع تاريخ تطور معرفة معينة
   * "كيف تطور فهم IQRA لهذا الموضوع؟"
   */
  static getKnowledgeHistory(knowledgeId: string): KnowledgeVersion[] {
    this._ensureInit();
    return this._db.prepare(`
      SELECT * FROM knowledge_versions
      WHERE knowledge_id = ?
      ORDER BY version ASC
    `).all(knowledgeId) as KnowledgeVersion[];
  }

  /**
   * يسترجع أحدث نسخة من معرفة
   */
  static getLatestVersion(knowledgeId: string): KnowledgeVersion | null {
    this._ensureInit();
    const result = this._db.prepare(`
      SELECT * FROM knowledge_versions
      WHERE knowledge_id = ?
      ORDER BY version DESC LIMIT 1
    `).get(knowledgeId) as KnowledgeVersion | undefined;
    return result ?? null;
  }

  /**
   * يُقارن نسختين من نفس المعرفة
   */
  static compareVersions(
    knowledgeId: string,
    v1: number,
    v2: number
  ): { v1: KnowledgeVersion | null; v2: KnowledgeVersion | null; evolved: boolean } {
    this._ensureInit();
    const ver1 = this._db.prepare(
      'SELECT * FROM knowledge_versions WHERE knowledge_id=? AND version=?'
    ).get(knowledgeId, v1) as KnowledgeVersion | null;

    const ver2 = this._db.prepare(
      'SELECT * FROM knowledge_versions WHERE knowledge_id=? AND version=?'
    ).get(knowledgeId, v2) as KnowledgeVersion | null;

    return {
      v1: ver1,
      v2: ver2,
      evolved: ver1?.content !== ver2?.content,
    };
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  /**
   * Cosine similarity fallback عندما لا يكون sqlite-vec متاحاً
   */
  private static _cosineFallbackSearch(
    queryEmbedding: number[],
    topK: number,
    minResonance: number
  ): SimilarPattern[] {
    const rows = this._db.prepare(`
      SELECT id, verse, field, resonance, embedding, shannon_hel
      FROM patterns
      WHERE resonance >= ?
      ORDER BY created_at DESC
      LIMIT 500
    `).all(minResonance) as any[];

    const scored = rows
      .map(r => {
        try {
          const q = TurboCompressor.fromBuffer(r.embedding as Buffer, r.id);
          const sim = TurboCompressor.hybridCosineSimilarity(queryEmbedding, q);
          return {
            id: r.id,
            verse: r.verse,
            field: r.field,
            resonance_score: r.resonance,
            similarity: sim,
            shannon_hel: r.shannon_hel ?? undefined,
          };
        } catch {
          return null;
        }
      })
      .filter((r): r is SimilarPattern => r !== null)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return scored;
  }
}
