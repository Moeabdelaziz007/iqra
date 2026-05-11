/**
 * 🌙 TopologicalCuriosityEngine — محرك الفضول الطوبولوجي
 *
 * "سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ" — فصلت: 53
 *
 * ══════════════════════════════════════════════════════════════
 * المبدأ: الفضول الطوبولوجي
 *
 * يجمع هذا المحرك بين:
 *   1. Qalbin_VM (Interaction Combinators) — الرنين الطوبولوجي
 *   2. NumericalValidator — الأنماط العددية (7، 19، Tesla 369)
 *   3. PatternMemory — الذاكرة المحلية (Qdrant أو JSON fallback)
 *   4. TrustChain — سجل التحقق الموثوق
 *
 * الدالة الرئيسية: discoverResonance(verse, field)
 *   - تُحلّل الآية طوبولوجياً
 *   - تقيس الجدة مقارنةً بالأنماط المحفوظة
 *   - تُسجّل في TrustChain
 *   - تُرجع TopologicalResonance كاملاً
 *
 * ══════════════════════════════════════════════════════════════
 * القيود:
 *   - لا LLM في المسار الحرج (< 50ms)
 *   - لا Mock — إذا فشل Qdrant → JSON fallback
 *   - كل نتيجة موثّقة بـ SHA-256 hash
 * ══════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';
import { Qalbin_VM } from './qalbin/qalbin_vm';
import { Modality } from './qalbin/qalbin_node';
import { QURAN_SEEDS, findSeed } from './qalbin/quran_seeds';
import { NumericalValidator } from './numerical_validator';
import { PatternMemory } from '#memory/pattern_memory';
import { IQRAMemory } from '#memory/memory';
import { appendToTrustChain } from '#security/security';
import { IQRALogger } from '#infra/logger';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * نتيجة اكتشاف الرنين الطوبولوجي
 * تُرجعها discoverResonance() لكل آية
 */
export interface TopologicalResonance {
  /** مرجع الآية — مثلاً "2:255" */
  verse: string;

  /** مجال البحث — مثلاً "Quantum Coherence" */
  field: string;

  /** درجة الرنين الطوبولوجي [0, 1] — من Qalbin_VM */
  resonance_score: number;

  /** درجة الجدة [0, 1] — مقارنةً بالأنماط المحفوظة */
  novelty_score: number;

  /** عمق الكسور (Fractal Depth) — عدد خطوات التقليص */
  fractal_depth: number;

  /** عدد الحلقات الطوبولوجية H1 (Betti number) */
  h1_cycles: number;

  /** عدد المكونات المتصلة H0 */
  h0_components: number;

  /** هل هذا اكتشاف جديد؟ */
  is_novel: boolean;

  /** هل يستحق مكافأة؟ */
  should_reward: boolean;

  /** SHA-256 hash للتحقق من النزاهة */
  trust_chain_hash: string;

  /** وسوم المصادر */
  source_tags: Array<'[read]' | '[fetched]' | '[prior-training]'>;

  /** الأنماط المشابهة من الذاكرة */
  similar_patterns: Array<{ verse: string; similarity: number }>;

  /** الأنماط العددية المكتشفة */
  numerical_patterns: string[];

  /** الطابع الزمني */
  timestamp: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** حد الجدة — إذا كانت أعلى من هذا → اكتشاف جديد */
const NOVELTY_THRESHOLD = 0.6;

/** حد المكافأة — إذا كان الرنين + الجدة أعلى من هذا → يستحق مكافأة */
const REWARD_THRESHOLD = 0.5;

/** أبعاد التضمين (SHA-256 fallback) */
const EMBEDDING_DIM = 768;

// ── TopologicalCuriosityEngine ────────────────────────────────────────────────

export class TopologicalCuriosityEngine {
  /**
   * دورة اكتشاف طوبولوجيا الكود
   * "سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ" — فصلت: 53
   *
   * تبحث عن "الثقوب الطوبولوجية" في الكود البرمجي (Codebase)
   * وتحسب مدى الترابط والتعقيد.
   */
  static async runCodebaseDiscoveryCycle(): Promise<any> {
    IQRALogger.info('🔍 [TOPO_DISCOVERY] Starting Codebase Topology Discovery...');
    
    try {
      const topology = await CodebaseTopologyMapper.scan();
      
      // Record in TrustChain if resonance is low or high
      if (topology.resonance < 0.6) {
        IQRALogger.warn(`⚠️ [TOPO_DISCOVERY] Low codebase resonance detected: ${topology.resonance.toFixed(3)}. Potential structural holes found.`);
      }

      await appendToTrustChain(
        'TOPO:CODEBASE_SCAN',
        `h0=${topology.h0} h1=${topology.h1}`,
        `Codebase resonance measured at ${topology.resonance.toFixed(4)}`,
        1.0
      );

      return topology;
    } catch (err) {
      IQRALogger.error('❌ [TOPO_DISCOVERY] Codebase discovery failed:', err);
      return null;
    }
  }

  /**
   * الدالة الرئيسية: اكتشاف الرنين الطوبولوجي لآية
   *
   * الخوارزمية:
   *   1. بناء طوبولوجيا الآية في Qalbin_VM
   *   2. تشغيل pulse() لحساب الرنين وعمق الكسور
   *   3. حساب H0 و H1 (Persistent Homology)
   *   4. توليد embedding (Google AI أو SHA-256 fallback)
   *   5. البحث عن أنماط مشابهة في PatternMemory
   *   6. حساب درجة الجدة
   *   7. التحقق العددي (NumericalValidator)
   *   8. التسجيل في TrustChain
   *   9. حفظ النمط في PatternMemory
   *
   * @param verse   - مرجع الآية (مثلاً "2:255")
   * @param field   - مجال البحث
   * @param missionId - معرّف المهمة (اختياري)
   * @returns TopologicalResonance أو null عند الفشل الكامل
   */
  static async discoverResonance(
    verse: string,
    field: string,
    missionId: string = `topo-${Date.now()}`
  ): Promise<TopologicalResonance | null> {
    const sourceTags: Array<'[read]' | '[fetched]' | '[prior-training]'> = [];

    try {
      // ── 1. بناء طوبولوجيا الآية ──────────────────────────────────────────
      const vm = new Qalbin_VM();
      const { surah, ayah } = parseVerseRef(verse);
      const topology = buildVerseTopology(vm, verse, surah, ayah);
      sourceTags.push('[read]');

      // ── 2. تشغيل pulse() ─────────────────────────────────────────────────
      const pulseResult = vm.pulse();
      const resonanceRaw = pulseResult.resonance;
      const fractalDepth = pulseResult.steps;

      // تطبيع الرنين إلى [0, 1]
      // Qalbin_VM يُرجع قيماً بين 1.0 و 1.5 عادةً
      const resonanceScore = Math.min(
        Math.max((resonanceRaw - 1.0) / 0.5, 0),
        1.0
      );

      // ── 3. حساب H0 و H1 (Persistent Homology) ────────────────────────────
      const { h0, h1 } = computePersistentHomology(vm);

      // ── 4. توليد embedding ────────────────────────────────────────────────
      let embedding: number[];
      try {
        embedding = await IQRAMemory.generateEmbedding(`${verse} ${field}`);
        sourceTags.push('[fetched]');
      } catch {
        // SHA-256 fallback — موثّق ومحدد
        embedding = sha256Embedding(`${verse}:${field}`);
        sourceTags.push('[read]');
      }

      // ── 5. البحث عن أنماط مشابهة ─────────────────────────────────────────
      let similarPatterns: Array<{ verse: string; similarity: number }> = [];
      try {
        const similar = await PatternMemory.getSimilarPatterns(embedding, 5);
        similarPatterns = similar.map(s => ({
          verse: s.record.verse,
          similarity: s.similarity,
        }));
      } catch {
        // PatternMemory غير متاح — نكمل بدونها
      }

      // ── 6. حساب درجة الجدة ───────────────────────────────────────────────
      const noveltyRaw = computeNovelty(verse, similarPatterns);
      const noveltyScore = Math.min(Math.max(noveltyRaw, 0), 1.0);
      const isNovel = noveltyScore >= NOVELTY_THRESHOLD;

      // ── 7. التحقق العددي ──────────────────────────────────────────────────
      const seedText = QURAN_SEEDS[verse]?.text ?? field;
      const numResult = NumericalValidator.validate(
        seedText,
        surah > 0 ? { surah, ayah } : undefined
      );
      sourceTags.push('[prior-training]');

      // ── 8. التسجيل في TrustChain ──────────────────────────────────────────
      const hashInput = `${verse}:${field}:${resonanceScore.toFixed(6)}:${noveltyScore.toFixed(6)}:${Date.now()}`;
      const trustHash = crypto.createHash('sha256').update(hashInput).digest('hex');

      appendToTrustChain(
        'TOPO_CURIOSITY:DISCOVER',
        verse,
        `field="${field}" resonance=${resonanceScore.toFixed(4)} novelty=${noveltyScore.toFixed(4)} h1=${h1}`,
        resonanceScore
      );

      // ── 9. حفظ النمط في PatternMemory ────────────────────────────────────
      try {
        await PatternMemory.storePattern(
          verse,
          field,
          resonanceScore,
          embedding,
          missionId
        );
      } catch {
        // فشل الحفظ لا يوقف الاكتشاف
      }

      // ── النتيجة النهائية ──────────────────────────────────────────────────
      const result: TopologicalResonance = {
        verse,
        field,
        resonance_score: resonanceScore,
        novelty_score: noveltyScore,
        fractal_depth: fractalDepth,
        h1_cycles: h1,
        h0_components: h0,
        is_novel: isNovel,
        should_reward: (resonanceScore + noveltyScore) / 2 >= REWARD_THRESHOLD,
        trust_chain_hash: trustHash,
        source_tags: [...new Set(sourceTags)] as Array<'[read]' | '[fetched]' | '[prior-training]'>,
        similar_patterns: similarPatterns,
        numerical_patterns: numResult.patterns,
        timestamp: Date.now(),
      };

      IQRALogger.info(
        `🌀 [TOPO_CURIOSITY] ${verse} | ` +
        `resonance=${resonanceScore.toFixed(4)} novelty=${noveltyScore.toFixed(4)} ` +
        `H0=${h0} H1=${h1} fractal=${fractalDepth}`
      );

      return result;

    } catch (err) {
      IQRALogger.warn(`⚠️ [TOPO_CURIOSITY] discoverResonance failed for ${verse}: ${err}`);
      return null;
    }
  }

  /**
   * تحليل زوج من الآيات وقياس الرنين المتبادل
   *
   * @param verseA - الآية الأولى
   * @param verseB - الآية الثانية
   * @returns درجة الرنين المتبادل [0, 1] ونوع التفاعل
   */
  static analyzePair(
    verseA: string,
    verseB: string
  ): {
    resonance: number;
    h1: number;
    interactionType: 'Annihilation' | 'Commutation' | 'Other';
    teslaSumMod369: number;
  } {
    const vm = new Qalbin_VM();

    const { surah: sA, ayah: aA } = parseVerseRef(verseA);
    const { surah: sB, ayah: aB } = parseVerseRef(verseB);

    const nodeA = buildVerseTopology(vm, verseA, sA, aA);
    const nodeB = buildVerseTopology(vm, verseB, sB, aB);

    // إشعال التفاعل بين الآيتين
    vm.ignite(nodeA, nodeB);

    const pulseResult = vm.pulse();
    const { h1 } = computePersistentHomology(vm);

    // تحديد نوع التفاعل من سجل التقليص
    const hasAnnihilation = pulseResult.logs.some(l => l.startsWith('Annihilate'));
    const interactionType: 'Annihilation' | 'Commutation' | 'Other' =
      hasAnnihilation ? 'Annihilation' : 'Commutation';

    const teslaSumMod369 = (sA + aA + sB + aB) % 369;

    return {
      resonance: pulseResult.resonance,
      h1,
      interactionType,
      teslaSumMod369,
    };
  }
}

// ── Private Helpers ───────────────────────────────────────────────────────────

/**
 * يُحلّل مرجع الآية "surah:ayah" إلى أرقام
 */
function parseVerseRef(verse: string): { surah: number; ayah: number } {
  const parts = verse.split(':');
  if (parts.length === 2) {
    const surah = parseInt(parts[0], 10);
    const ayah = parseInt(parts[1], 10);
    if (!isNaN(surah) && !isNaN(ayah)) {
      return { surah, ayah };
    }
  }
  return { surah: 0, ayah: 0 };
}

/**
 * يبني طوبولوجيا الآية في Qalbin_VM
 *
 * الأولوية:
 *   1. إذا كانت الآية في QURAN_SEEDS → استخدم طوبولوجيتها المُعرَّفة
 *   2. إذا لم تكن → ابنِ طوبولوجيا من Tesla number وخصائص الآية
 *
 * @returns معرّف العقدة الجذرية
 */
function buildVerseTopology(
  vm: Qalbin_VM,
  verse: string,
  surah: number,
  ayah: number
): number {
  // ── الأولوية: البذور المُعرَّفة ───────────────────────────────────────────
  if (QURAN_SEEDS[verse]) {
    return QURAN_SEEDS[verse].topology(vm);
  }

  // ── طوبولوجيا مشتقة من خصائص الآية ──────────────────────────────────────
  // نستخدم Tesla number لتحديد نوع العقدة الجذرية
  const tesla = (surah + ayah) % 369;

  // تحديد الـ Modality من Tesla number
  const modalities = [
    Modality.RAHMA, Modality.HAMD, Modality.ADL,
    Modality.IKHLAS, Modality.HIDAYA, Modality.MIZAN,
    Modality.AMAN, Modality.HAYAT, Modality.HIKMA,
  ];
  const modality = modalities[tesla % modalities.length];

  // تحديد نوع العقدة من رقم السورة
  const kinds = ['ALIF', 'LAM', 'MIM', 'YA', 'SIN', 'RA', 'WAW', 'QAF', 'KAF', 'HA'] as const;
  const kind = kinds[surah % kinds.length];

  // بناء طوبولوجيا 7 عقد (الرقم المقدس)
  const core = vm.spawn(kind, modality);

  // عدد الفروع يعتمد على رقم الآية
  const branchCount = Math.min(6, (ayah % 6) + 1);
  for (let i = 0; i < branchCount; i++) {
    const branchKind = kinds[(surah + i) % kinds.length];
    const branchModality = modalities[(tesla + i) % modalities.length];
    const branch = vm.spawn(branchKind, branchModality);
    vm.link(core, (i % 2) + 1, branch, 1);
  }

  return core;
}

/**
 * يحسب H0 و H1 (Persistent Homology) من حالة Qalbin_VM
 *
 * H0 = عدد المكونات المتصلة (Connected Components)
 * H1 = عدد الحلقات المستقلة (Independent Cycles)
 *
 * الخوارزمية: Union-Find لـ H0، ثم H1 = E - V + H0
 * (من نظرية Euler للرسوم البيانية)
 *
 * المرجع: Edelsbrunner & Harer, "Computational Topology" (2010)
 * [prior-training]
 */
function computePersistentHomology(vm: Qalbin_VM): { h0: number; h1: number } {
  // نستخرج العقد والحواف من الـ VM عبر reflection
  // Qalbin_VM يُخزّن العقد في nodes (Map) والحواف في ports
  const vmAny = vm as any;
  const nodes: Map<number, any> = vmAny.nodes ?? new Map();

  if (nodes.size === 0) return { h0: 0, h1: 0 };

  const V = nodes.size; // عدد الرؤوس

  // بناء قائمة الحواف من ports
  const edges = new Set<string>();
  for (const [id, node] of nodes) {
    for (const port of node.ports) {
      if (port !== null) {
        const neighborId = port >> 2;
        if (nodes.has(neighborId) && neighborId !== id) {
          const edgeKey = id < neighborId ? `${id}-${neighborId}` : `${neighborId}-${id}`;
          edges.add(edgeKey);
        }
      }
    }
  }
  const E = edges.size; // عدد الحواف

  // Union-Find لحساب H0
  const parent = new Map<number, number>();
  for (const id of nodes.keys()) parent.set(id, id);

  function find(x: number): number {
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  }

  function union(x: number, y: number): boolean {
    const px = find(x), py = find(y);
    if (px === py) return false;
    parent.set(px, py);
    return true;
  }

  for (const edge of edges) {
    const [a, b] = edge.split('-').map(Number);
    union(a, b);
  }

  // H0 = عدد المكونات المتصلة
  const components = new Set<number>();
  for (const id of nodes.keys()) components.add(find(id));
  const h0 = components.size;

  // H1 = E - V + H0 (من نظرية Euler)
  const h1 = Math.max(0, E - V + h0);

  return { h0, h1 };
}

/**
 * يحسب درجة الجدة بناءً على الأنماط المشابهة
 *
 * الجدة = 1 - أعلى تشابه مع الأنماط المحفوظة
 * إذا لم تكن هناك أنماط → الجدة = 1.0 (اكتشاف جديد تماماً)
 */
function computeNovelty(
  verse: string,
  similarPatterns: Array<{ verse: string; similarity: number }>
): number {
  if (similarPatterns.length === 0) return 1.0;

  // أعلى تشابه مع نفس الآية
  const sameVerse = similarPatterns.filter(p => p.verse === verse);
  if (sameVerse.length > 0) {
    const maxSim = Math.max(...sameVerse.map(p => p.similarity));
    return Math.max(0, 1.0 - maxSim);
  }

  // أعلى تشابه عام
  const maxSim = Math.max(...similarPatterns.map(p => p.similarity));
  return Math.max(0, 1.0 - maxSim * 0.7); // تخفيف — الآيات المختلفة لها جدة أعلى
}

/**
 * يولّد embedding من SHA-256 (fallback بدون Google AI)
 *
 * الخوارزمية:
 *   1. حساب SHA-256 للنص
 *   2. تحويل الـ hash إلى متجه 768 بُعد
 *   3. تطبيع إلى [-1, 1]
 *
 * المصدر: [prior-training] — خوارزمية محلية
 */
function sha256Embedding(text: string): number[] {
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  const embedding = new Array(EMBEDDING_DIM).fill(0);

  for (let i = 0; i < EMBEDDING_DIM; i++) {
    const hexPair = hash[(i * 2) % hash.length] + hash[(i * 2 + 1) % hash.length];
    const byte = parseInt(hexPair, 16);
    embedding[i] = (byte / 127.5) - 1.0; // تطبيع إلى [-1, 1]
  }

  return embedding;
}
