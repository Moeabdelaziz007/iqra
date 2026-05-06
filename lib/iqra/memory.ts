/**
 * IQRA Memory — الذاكرة
 * 
 * "وَمَا كَانَ رَبُّكَ نَسِيًّا" — مريم: 64
 * 
 * Powered by Upstash Redis.
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export class IQRAMemory {
  /**
   * Save a key-value pair
   */
  static async set(key: string, value: any) {
    return await redis.set(`iqra:${key}`, value);
  }

  /**
   * Get a value by key
   */
  static async get<T>(key: string): Promise<T | null> {
    return await redis.get<T>(`iqra:${key}`);
  }

  /**
   * Get a range of items from a list
   * Used by sovereign meta-loop for self-review and discovery
   */
  static async getList<T>(key: string, start: number, end: number): Promise<T[]> {
    const result = await redis.lrange(`iqra:list:${key}`, start, end);
    return (result || []) as T[];
  }

  /**
   * Append to a list (for TrustChain)
   */
  static async appendList(key: string, value: any) {
    return await redis.rpush(`iqra:list:${key}`, value);
  }

  static async getRecentList<T>(key: string, count: number): Promise<T[]> {
    const total = await redis.llen(`iqra:list:${key}`);
    const start = Math.max(0, total - count);
    const result = await redis.lrange(`iqra:list:${key}`, start, total - 1);
    return (result || []) as T[];
  }

  /**
   * Save curiosity score
   */
  static async saveCuriosity(score: number) {
    await redis.set('iqra:curiosity_score', score);
    await redis.rpush('iqra:curiosity_history', {
      timestamp: Date.now(),
      score
    });
  }

  /**
   * Get current curiosity score
   */
  static async getCuriosity(): Promise<number> {
    return (await redis.get<number>('iqra:curiosity_score')) || 0.5;
  }

  /**
   * Soft Reset (Tasbih)
   * Clears transient working memory/cache to reset context
   */
  static async softReset() {
    // In a stateless worker, this could clear local cache or specific temporary keys
    await redis.del('iqra:working_memory');
    console.log('📿 Tasbih: Working memory soft-reset complete.');
  }

  /**
   * Increment task/cycle counter
   */
  static async incrementCycleCounter(): Promise<number> {
    return await redis.incr('iqra:cycle_counter');
  }

  /**
   * Get current cycle counter
   */
  static async getCycleCounter(): Promise<number> {
    return (await redis.get<number>('iqra:cycle_counter')) || 0;
  }

  /**
   * Arba'un Purification (40)
   * Deep cleansing of temporary contexts every 40 cycles.
   */
  static async performPurification() {
    console.log('🧼 Arba\'ūn: Starting purification cycle...');
    await redis.del('iqra:working_memory');
    await redis.del('iqra:temp_context');
    // Save a reflection about the purification
    await this.appendList('purification_logs', {
      timestamp: Date.now(),
      message: 'Reached 40 cycles. Purification performed to restore Fitrah.'
    });
  }
}
