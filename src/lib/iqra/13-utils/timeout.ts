// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * ⏱️ Timeout Utilities — أدوات المهلة
 *
 * "وَإِن يَمْسَسْكَ اللَّهُ بِضُرٍّ فَلَا كَاشِفَ لَهُ إِلَّا هُوَ" — الأنعام: 17
 *
 * ══════════════════════════════════════════════════════════════
 * IQRA Timeout Constants — زمن للصبر، زمن للعمل، زمن للإنجاز
 * ══════════════════════════════════════════════════════════════
 */

/**
 * مهلة قصيرة — للعمليات الحرجة السريعة
 */
export const IQRA_TIMEOUTS = {
  /** 5 seconds — للتحققات البسيطة */
  QUICK: 5000,
  /** 15 seconds — للاستدعاءات القصيرة */
  SHORT: 15000,
  /** 30 seconds — للعمليات المتوسطة */
  MEDIUM: 30000,
  /** 60 seconds — للعمليات الطويلة */
  LONG: 60000,
  /** 5 minutes — للمهام الضخمة */
  EXTENDED: 300000,
  /** 9 seconds — نبض Tesla الأول */
  PULSE_MICRO: 9000,
  /** 27 seconds — نبض Tesla الثاني */
  PULSE_WARM: 27000,
  /** 81 seconds — نبض Tesla الثالث */
  PULSE_DEEP: 81000,
  /** 10 seconds — Redis operations */
  REDIS: 10000,
  /** 15 seconds — Network requests */
  NETWORK: 15000,
  /** 30 seconds — LLM calls */
  LLM: 30000,
} as const;

/**
 * ينفذ دالة مع مهلة زمنية
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  context?: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`TIMEOUT: Operation exceeded ${timeoutMs}ms${context ? ` [${context}]` : ''}`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise])
    .finally(() => {
      clearTimeout(timeoutId); // 🔧 FIX: Prevent memory leak
    }) as Promise<T>;
}

/**
 * ينتظر لمدة معينة
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * يُنشئ مهلة قابلة للإلغاء
 */
export function createTimeout(timeoutMs: number, onTimeout: () => void): { cancel: () => void } {
  const timer = setTimeout(onTimeout, timeoutMs);
  return {
    cancel: () => clearTimeout(timer),
  };
}
