 * IQRA Memory — الذاكرة
 * 
 * "وَمَا كَانَ رَبُّكَ نَسِيًّا" — مريم: 64
 * 
 * Powered by Upstash Redis, Supabase, and Qdrant.
 */

import { Redis } from '@upstash/redis';
import { createClient } from '@supabase/supabase-js';
import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IQRALogger } from './logger';
import path from 'path';
import crypto from 'crypto';


const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Initialize Supabase (Long-term structured memory)
const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

const COLLECTION_NAME = 'iqra_wisdom';
const LOCAL_MEMORY_PATH = path.join(process.cwd(), 'lib/iqra/memory_local.json');

// Initialize Qdrant (Semantic/Vector memory)
const qdrant = process.env.QDRANT_URL && process.env.QDRANT_API_KEY
  ? new QdrantClient({ url: process.env.QDRANT_URL, apiKey: process.env.QDRANT_API_KEY })
  : null;

// Initialize Google AI for Embeddings
const googleAI = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  : null;




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
    IQRALogger.info('📿 Tasbih: Working memory soft-reset complete.');
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
   * Arba'un Tazkiyah (40)
   * Deep cleansing and compression of episodic memory.
   */
  static async performPurification() {
    IQRALogger.info('🧼 Arba\'ūn: Starting Tazkiyah cycle (Purification)...');
    
    // 1. Clear working memory
    await redis.del('iqra:working_memory');
    await redis.del('iqra:temp_context');

    // 2. Compression: Summarize old failures to keep only patterns
    const failures = await this.getRecentList<any>('failure_history', 40);
    if (failures.length > 0) {
      IQRALogger.info('📦 Tazkiyah: Compressing 40 failure logs into patterns...');
    }

    await this.appendList('purification_logs', {
      timestamp: Date.now(),
      message: 'Reached 40 cycles. Tazkiyah performed. episodic memory cleared.'
    });
  }

  /**
   * Barakah Multiplier (700)
   * Tracks successful tasks and triggers a major Barakah Report.
   */
  static async incrementSuccessCounter(): Promise<number> {
    return await redis.incr('iqra:success_counter');
  }

  static async getSuccessCounter(): Promise<number> {
    return (await redis.get<number>('iqra:success_counter')) || 0;
  }

  /**
   * Save to Long-term Memory (Supabase/PostgreSQL)
   */
  static async saveLongTerm(table: string, data: any) {
    if (!supabase) {
      IQRALogger.warn('⚠️ Supabase not configured. Falling back to local logs.');
      return;
    }
    const { error } = await supabase.from(table).insert([data]);
    if (error) IQRALogger.error(`❌ Long-term memory error (${table}):`, error);
  }

  /**
   * Save to Semantic Memory (Qdrant Cloud / Vector DB)
   * "وَمَا نُنَزِّلُهُ إِلَّا بِقَدَرٍ مَّعْلُومٍ"
   */
  static async saveSemantic(text: string, metadata: any) {
    if (!qdrant || !googleAI) {
      IQRALogger.warn('⚠️ Semantic memory offline: Qdrant/Google AI not configured.');
      return;
    }

    try {
      const model = googleAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await model.embedContent(text);
      const embedding = result.embedding.values;

      await qdrant.upsert(COLLECTION_NAME, {
        wait: true,
        points: [{
          id: crypto.randomUUID(),
          vector: embedding,
          payload: { 
            content: text, 
            ...metadata, 
            iqra_version: '1.0',
            timestamp: Date.now() 
          }
        }]
      });

      // Track embedding history in Redis for quick novelty computation
      await this.appendList('embeddings_history', { vector: embedding, timestamp: Date.now() });
      
      IQRALogger.info('🧠 Semantic Memory: Wisdom point preserved in Qdrant Cloud.');
    } catch (error) {
      IQRALogger.error('❌ Qdrant Save Error:', error);
    }
  }

  /**
   * Search Semantic Memory
   * Finds past wisdom that resonates with the current query.
   */
  static async searchSemantic(query: string, limit: number = 3) {
    if (!qdrant || !googleAI) return [];

    try {
      const model = googleAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await model.embedContent(query);
      const embedding = result.embedding.values;

      const searchResult = await qdrant.search(COLLECTION_NAME, {
        vector: embedding,
        limit,
        with_payload: true,
        params: { hnsw_ef: 128 } // High precision search
      });

      return searchResult.map(hit => ({
        content: hit.payload?.content,
        score: hit.score,
        metadata: hit.payload
      }));
    } catch (error) {
      IQRALogger.error('❌ Qdrant Search Error:', error);
      return [];
    }
  }

  /**
   * Calculates "Topological Curiosity" / Novelty Reward
   * reward = 1.0 - (max similarity with recent N memories)
   */
  static async computeNovelty(embedding: number[], count: number = 10): Promise<number> {
    const recent = await this.getRecentList<any>('embeddings_history', count);
    if (!recent || recent.length === 0) return 1.0; // Total novelty if no memory

    let maxSimilarity = 0;
    for (const item of recent) {
      // Redis might return stringified JSON or object depending on how it was pushed
      const pastVector = typeof item === 'string' ? JSON.parse(item).vector : item.vector;
      if (!pastVector) continue;
      
      const sim = this.cosineSimilarity(embedding, pastVector);
      if (sim > maxSimilarity) maxSimilarity = sim;
    }

    return 1.0 - maxSimilarity;
  }

  /**
   * Simple Cosine Similarity
   */
  private static cosineSimilarity(v1: number[], v2: number[]): number {
    if (v1.length !== v2.length) return 0;
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      mag1 += v1[i] * v1[i];
      mag2 += v2[i] * v2[i];
    }
    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}


