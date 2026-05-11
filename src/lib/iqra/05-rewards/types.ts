// بسم الله الرحمن الرحيم

/**
 * 🏆 Reward Types — أنواع المكافآت
 *
 * "وَفِي ذَٰلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ" — المطففين: 26
 */

// ── PathKey ───────────────────────────────────────────────────────────────────

/**
 * مفتاح المسار — يُعرّف تسلسل الوكلاء ونتائجهم بشكل فريد
 *
 * الصيغة: "WorkerA:PASS:0→WorkerB:PASS:0→WorkerC:FAIL:1"
 * مثال:   "ResonanceWorker:PASS:0→ResearchWorker:PASS:0→ValidationWorker:PASS:0→ExecutionWorker:PASS:0"
 *
 * المسار البكر (Pristine Path):
 *   مسار لم يُسلك من قبل في تاريخ النظام.
 *   يحصل على مضاعف 2.0× في المكافأة.
 */
export type PathKey = string;

/** مقطع واحد في المسار */
export interface PathSegment {
  worker_id: string;
  status: 'PASS' | 'FAIL';
  exit_code: number;
}

// ── RewardEntry ───────────────────────────────────────────────────────────────

/** مستوى الاكتشاف */
export type DiscoveryLevel =
  | 'seed'       // بداية — لا رنين
  | 'branch'     // رنين منخفض
  | 'tree'       // رنين متوسط
  | 'resonance'  // رنين عالٍ
  | 'revelation'; // رنين استثنائي

/** متجه المكافأة المُفصَّل */
export interface RewardVector {
  novelty: number;      // جدة الاكتشاف (0.0–0.5)
  resonance: number;    // الرنين الطوبولوجي (0.0–0.5)
  topology: number;     // الكثافة العقدية (0.0–0.3)
  fractal?: number;     // العمق الفركتالي (0.0–0.2)
  lid?: number;         // LID score (0.0–0.2)
  penalty: number;      // عقوبة الأخطاء (سالب)
}

/** سجل مكافأة واحد */
export interface RewardEntry {
  ledger_id: string;
  mission_id: string;
  worker_id: string;
  timestamp: number;
  recorded_at: string;

  /** المكافأة الإجمالية قبل المضاعف */
  base_reward: number;

  /** المكافأة النهائية بعد تطبيق المضاعفات */
  total_reward: number;

  /** متجه المكافأة المُفصَّل */
  reward_vector: RewardVector;

  /** مستوى الاكتشاف */
  discovery_level: DiscoveryLevel;

  /** درجة الثقة */
  confidence: number;

  /** حالة التحقق */
  validation_status: 'pending' | 'verified' | 'rejected';

  /** ملاحظات */
  notes: string;

  // ── Pristine Path ──────────────────────────────────────────────────

  /** مفتاح المسار الذي أنتج هذه المكافأة */
  path_key?: PathKey;

  /** هل طُبّق مضاعف المسار البكر؟ */
  pristine_multiplier_applied: boolean;

  /** قيمة المضاعف المُطبَّق (1.0 = عادي، 2.0 = بكر) */
  multiplier_value: number;

  // ── PR #12 Extensions ─────────────────────────────────────────────────────

  /** مضاعف المسار (1-3) */
  path_multiplier?: number;

  /** درجة التشوه (0-1) */
  anomaly_score?: number;

  /** هل تم اكتشاف شذوذ؟ */
  anomaly_detected?: boolean;
}

// ── PristinePathResult ────────────────────────────────────────────────────────

/** نتيجة فحص المسار البكر */
export interface PristinePathResult {
  is_pristine: boolean;
  multiplier: number;
  path_key: PathKey;
  /** عدد مرات استخدام هذا المسار سابقاً */
  previous_uses: number;
}

// ── RewardSummary ─────────────────────────────────────────────────────────────

/** ملخص المكافآت */
export interface RewardSummary {
  total_entries: number;
  total_reward: number;
  avg_reward: number;
  pristine_paths: number;
  repeated_paths: number;
  by_level: Record<DiscoveryLevel, number>;
  top_path_key?: PathKey;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** مضاعف المسار البكر — من DASTŪR: الرقم 2 (التضعيف) */
export const PRISTINE_MULTIPLIER = 2.0;

/** مضاعف المسار المكرر */
export const REPEATED_MULTIPLIER = 1.0;

/** مضاعف المسار المتكرر كثيراً (> 7 مرات) */
export const STALE_MULTIPLIER = 0.7;

/** عتبة التكرار للتخفيض */
export const STALE_THRESHOLD = 7;
