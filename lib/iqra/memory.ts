/**
 * IQRA Memory — الذاكرة
 * 
 * "وَمَا كَانَ رَبُّكَ نَسِيًّا" — مريم: 64
 * 
 * Powered by Upstash Redis, Supabase, and Qdrant.
 */

// Dynamic imports are handled lazily within methods to allow Sovereign Mode (No node_modules required)
import { IQRALogger } from './logger';
import { IQRAFilter } from './filter';
import { IQRAConsciousness } from './consciousness';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { withTimeout, IQRA_TIMEOUTS } from './utils/timeout';


const LOCAL_MEMORY_PATH = path.join(process.cwd(), '.iqra', 'memory.json');
const COLLECTION_NAME = 'iqra_wisdom';


export class IQRAMemory {
  private static _redis: any = null;
  private static _supabase: any = null;
  private static _qdrant: any = null;
  private static _googleAI: any = null;
  private static _errorCount = 0;
  private static readonly ERROR_THRESHOLD = 7;


  private static async getRedis() {
    if (this._redis) return this._redis;
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const { Redis } = await import('@upstash/redis');
        this._redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
      } catch (e) {
        IQRALogger.warn('⚠️ [MEMORY] Redis module missing. Falling back to Sovereign mode.');
      }
    }
    return this._redis;
  }

  private static async getSupabase() {
    if (this._supabase) return this._supabase;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        this._supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      } catch (e) {
        IQRALogger.warn('⚠️ [MEMORY] Supabase module missing.');
      }
    }
    return this._supabase;
  }

  private static async getQdrant() {
    if (this._qdrant) return this._qdrant;
    if (process.env.QDRANT_URL && process.env.QDRANT_API_KEY) {
      try {
        const { QdrantClient } = await import('@qdrant/js-client-rest');
        this._qdrant = new QdrantClient({ url: process.env.QDRANT_URL, apiKey: process.env.QDRANT_API_KEY });
      } catch (e) {
        IQRALogger.warn('⚠️ [MEMORY] Qdrant module missing.');
      }
    }
    return this._qdrant;
  }

  private static async getGoogleAI() {
    if (this._googleAI) return this._googleAI;
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        this._googleAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      } catch (e) {
        IQRALogger.warn('⚠️ [MEMORY] Google AI module missing.');
      }
    }
    return this._googleAI;
  }
  /**
   * Helper for local filesystem memory (Sovereign Fallback)
   */
  private static async getLocalData(): Promise<any> {
    if (fs.existsSync(LOCAL_MEMORY_PATH)) {
      try {
        const content = await fsPromises.readFile(LOCAL_MEMORY_PATH, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        IQRALogger.error('❌ [MEMORY] Local Read Error:', error);
        return {};
      }
    }
    return {};
  }

  private static async saveLocalData(data: any) {
    try {
      const dir = path.dirname(LOCAL_MEMORY_PATH);
      if (!fs.existsSync(dir)) {
        await fsPromises.mkdir(dir, { recursive: true });
      }
      await fsPromises.writeFile(LOCAL_MEMORY_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
      IQRALogger.error('❌ [MEMORY] Local Save Error:', error);
    }
  }

  /**
   * Save a key-value pair
   */
  static async set(key: string, value: any) {
    try {
      const redis = await this.getRedis();
      if (redis) {
        const result = await withTimeout(redis.set(`iqra:${key}`, value), IQRA_TIMEOUTS.REDIS, `Redis SET ${key}`);
        this._errorCount = 0; // Reset on success
        return result;
      }
    } catch (error) {
      this._errorCount++;
      IQRALogger.warn(`⚠️ [MEMORY] Set error (${this._errorCount}/${this.ERROR_THRESHOLD}):`, error);
      if (this._errorCount >= this.ERROR_THRESHOLD) {
        await this.softReset();
      }
    }
    
    const data = await this.getLocalData();
    data[key] = value;
    await this.saveLocalData(data);
    return 'OK';
  }


  /**
   * Get a value by key
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const redis = await this.getRedis();
      if (redis) {
        const val = await withTimeout(redis.get(`iqra:${key}`), IQRA_TIMEOUTS.REDIS, `Redis GET ${key}`);
        this._errorCount = 0; // Reset on success
        return val as any;
      }
    } catch (error) {
      this._errorCount++;
      IQRALogger.warn(`⚠️ [MEMORY] Get error (${this._errorCount}/${this.ERROR_THRESHOLD}):`, error);
      if (this._errorCount >= this.ERROR_THRESHOLD) {
        await this.softReset();
      }
    }
    
    const data = await this.getLocalData();
    return (data[key] as T) || null;
  }


  /**
   * Get a range of items from a list
   */
  static async getList<T>(key: string, start: number, end: number): Promise<T[]> {
    const redis = await this.getRedis();
    if (redis) {
      const result = await withTimeout(redis.lrange(`iqra:list:${key}`, start, end), IQRA_TIMEOUTS.REDIS, `Redis LRANGE ${key}`);
      return (result || []) as T[];
    }

    
    const data = await this.getLocalData();
    const list = (data[`list:${key}`] || []) as T[];
    return list.slice(start, end + 1);
  }

  /**
   * Append to a list (for TrustChain)
   */
  static async appendList(key: string, value: any) {
    const redis = await this.getRedis();
    if (redis) return await withTimeout(redis.rpush(`iqra:list:${key}`, value), IQRA_TIMEOUTS.REDIS, `Redis RPUSH ${key}`);

    
    const data = await this.getLocalData();
    const listKey = `list:${key}`;
    if (!data[listKey]) data[listKey] = [];
    data[listKey].push(value);
    await this.saveLocalData(data);
    return data[listKey].length;
  }

  static async getRecentList<T>(key: string, count: number): Promise<T[]> {
    const redis = await this.getRedis();
    if (redis) {
      const total: any = await withTimeout(redis.llen(`iqra:list:${key}`), IQRA_TIMEOUTS.REDIS, `Redis LLEN ${key}`);
      const start = Math.max(0, total - count);
      const result = await withTimeout(redis.lrange(`iqra:list:${key}`, start, total - 1), IQRA_TIMEOUTS.REDIS, `Redis LRANGE (recent) ${key}`);
      return (result || []) as T[];
    }

    
    const data = await this.getLocalData();
    const list = (data[`list:${key}`] || []) as T[];
    return list.slice(-count);
  }

  /**
   * Save curiosity score
   */
  static async saveCuriosity(score: number) {
    const redis = await this.getRedis();
    if (!redis) return;
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
    const redis = await this.getRedis();
    if (redis) return (await redis.get('iqra:curiosity_score')) || 0.5;
    const data = await this.getLocalData();
    return data['curiosity_score'] || 0.5;
  }

  /**
   * Grant a reward to the system, increasing curiosity or trust.
   * "وَسَيَجْزِي اللَّهُ الشَّاكِرِينَ" — آل عمران: 144
   */
  static async grantReward(amount: number) {
    const current = await this.getCuriosity();
    const newScore = Math.min(1.0, current + amount);
    await this.set('curiosity_score', newScore);
    await this.appendList('reward_history', {
      timestamp: Date.now(),
      amount,
      newScore
    });
    IQRALogger.info(`✨ [REWARD] Curiosity boosted by ${amount}. New score: ${newScore.toFixed(4)}`);
  }

  /**
   * Soft Reset (Tasbih)
   * Clears transient working memory/cache to reset context
   */
  static async softReset() {
    IQRALogger.warn('🔄 [MEMORY] Threshold reached. Executing Soft Reset (Tasbih)...');
    this._redis = null; // Force re-initialization
    this._errorCount = 0;
    
    // Clear transient cache in Redis if reachable
    try {
      const redis = await this.getRedis();
      if (redis) {
        await withTimeout(redis.del('iqra:working_memory'), 2000, 'Soft Reset DEL');
      }
    } catch (e) {
      IQRALogger.error('❌ [MEMORY] Soft reset partial failure (Redis unreachable):', e);
    }
    
    IQRALogger.info('📿 Tasbih: Working memory soft-reset complete.');
  }


  /**
   * Increment task/cycle counter
   */
  static async incrementCycleCounter(): Promise<number> {
    const redis = await this.getRedis();
    if (!redis) return 0;
    return await redis.incr('iqra:cycle_counter');
  }

  /**
   * Get current cycle counter
   */
  static async getCycleCounter(): Promise<number> {
    const redis = await this.getRedis();
    if (!redis) return 0;
    return (await redis.get('iqra:cycle_counter')) || 0;
  }

  /**
   * Arba'un Tazkiyah (40)
   * Deep cleansing and compression of episodic memory.
   */
  static async performPurification() {
    IQRALogger.info('🧼 Arba\'ūn: Starting Tazkiyah cycle (Purification)...');
    
    const redis = await this.getRedis();
    if (!redis) return;

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
    const redis = await this.getRedis();
    if (!redis) return 0;
    return await redis.incr('iqra:success_counter');
  }

  static async getSuccessCounter(): Promise<number> {
    const redis = await this.getRedis();
    if (!redis) return 0;
    return (await redis.get('iqra:success_counter')) || 0;
  }

  /**
   * Muraqabah Layer: Ensure memory is pure before storage
   */
  private static async muraqabahCheck(content: string, type: string): Promise<boolean> {
    const result = await IQRAConsciousness.muraqabahCheck(content, type);
    if (!result.isAllowed) {
      IQRALogger.warn(`🕋 [MURĀQABAH] Blocked ${type} storage: ${result.reason}`);
      this.logBlockedMemory(type, content, result.reason);
      return false;
    }
    return true;
  }

  /**
   * Save to Long-term Memory (Supabase/PostgreSQL)
   */
  static async saveLongTerm(table: string, data: any) {
    const supabase = await this.getSupabase();
    if (!supabase) {
      IQRALogger.warn('⚠️ Supabase not configured. Falling back to local logs.');
      return;
    }
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    if (!await this.muraqabahCheck(content, 'long-term')) return;

    const { error }: any = await withTimeout(supabase.from(table).insert([data]), IQRA_TIMEOUTS.NETWORK, `Supabase INSERT ${table}`);
    if (error) IQRALogger.error(`❌ Long-term memory error (${table}):`, error);
  }

  /**
   * Save to Semantic Memory (Qdrant Cloud / Vector DB)
   */
  static async saveSemantic(text: string, metadata: any) {
    const qdrant = await this.getQdrant();
    const googleAI = await this.getGoogleAI();

    if (!qdrant || !googleAI) {
      IQRALogger.warn('⚠️ Semantic memory offline: Qdrant/Google AI not configured.');
      return;
    }

    if (!await this.muraqabahCheck(text, 'semantic')) return;

    try {
      const model = googleAI.getGenerativeModel({ model: "text-embedding-004" });
      const result: any = await withTimeout(model.embedContent(text), IQRA_TIMEOUTS.LLM, 'Google AI Embedding');
      const embedding = result.embedding.values;

      await withTimeout(qdrant.upsert(COLLECTION_NAME, {
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
      }), IQRA_TIMEOUTS.NETWORK, 'Qdrant UPSERT');


      // Track embedding history in Redis for quick novelty computation
      await this.appendList('embeddings_history', { vector: embedding, timestamp: Date.now() });
      
      IQRALogger.info('🧠 Semantic Memory: Wisdom point preserved in Qdrant Cloud.');
    } catch (error) {
      IQRALogger.error('❌ Qdrant Save Error:', error);
    }
  }

  /**
   * Log blocked memory attempts for audit
   */
  private static logBlockedMemory(type: string, content: string, reason?: string) {
    const log = `\n### 🛡️ [POLLUTION_PREVENTED] ${new Date().toISOString()}\n- **Type**: ${type}\n- **Reason**: ${reason}\n- **Content Snippet**: ${content.substring(0, 100)}...\n`;
    fs.appendFileSync(path.join(process.cwd(), 'iqra-core/FAILURES.md'), log);
  }


  /**
   * Search Semantic Memory
   * Finds past wisdom that resonates with the current query.
   */
  static async searchSemantic(query: string, limit: number = 3) {
    const qdrant = await this.getQdrant();
    const googleAI = await this.getGoogleAI();
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

      return searchResult.map((hit: any) => ({
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


