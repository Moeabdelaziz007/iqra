/**
 * IQRA Timeout Utility — التقوى في التوقيت
 * 
 * "وَكَانَ أَمْرُ اللَّهِ قَدَرًا مَّقْدُورًا" — الأحزاب: 38
 */

export class TimeoutError extends Error {
  constructor(message: string = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a promise with a timeout.
 * If the promise does not resolve within the ms limit, it rejects with a TimeoutError.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  operationName: string = 'Operation'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(`${operationName} timed out after ${ms}ms`));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result as T;
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Standard timeouts for IQRA services
 */
export const IQRA_TIMEOUTS = {
  REDIS: 5000,
  LLM: 10000,
  FILE_IO: 2000,
  NETWORK: 7000
};
