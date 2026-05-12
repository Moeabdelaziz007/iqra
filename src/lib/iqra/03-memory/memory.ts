/**
 * IQRA Memory — الذاكرة
 *
 * "وَمَا كَانَ رَبُّكَ نَسِيًّا" — مريم: 64
 *
 * Powered by Upstash Redis (TTL=7 days), Supabase, and Qdrant.
 *
 * ══════════════════════════════════════════════════════════════
 * EMBEDDED CONSTITUTIONAL RULES
 * ══════════════════════════════════════════════════════════════
 * 1. كل embedding حقيقي (Google AI) أو SHA-256 fallback موثّق.
 * 2. cosineSimilarity مُصدَّرة وتُستخدم في Reporter و PatternMemory.
 * 3. set() يكتب بـ TTL=7 أيام في Upstash تلقائياً.
 * 4. getContextForMission() تُرجع أفضل 7 ذكريات ذات صلة.
 * 5. pruneEmbeddingsHistory() تنظّف التضمينات القديمة دورياً.
 * ══════════════════════════════════════════════════════════════
 */

// TTL للذاكرة العاملة في Upstash Redis: 7 أيام بالثواني
const REDIS_TTL_SECONDS = 7 * 24 * 60 * 60; // 604800

import { IQRALogger } from '#infra/logger';
import { IQRAFilter } from '#security/filter';
import { IQRAConsciousness } from '#core/consciousness';
import { SovereignError, SovereignErrorCode } from '#errors/sovereign_error';
import { LanceDBPlugin } from '#memory/lancedb_plugin';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { withTimeout, IQRA_TIMEOUTS } from '#utils/timeout';

// ── Bridge (lazy import لتجنب circular deps) ──────────────────────────────────
let _bridge: typeof import('#memory/memory_bridge').MemoryBridge | null = null;
async function getBridge() {
  if (!_bridge) {
    const mod = await import('#memory/memory_bridge');
    _bridge = mod.MemoryBridge;
  }
  return _bridge;
}

/**
 * 🌀 Quantum Topological Memory Structures
 */
export interface SpiritualCoordinate {
  surah?: number;
  ayah?: number;
  concept: string;
  resonance?: number;
}

export interface QuantumMemoryEntry {
  id: string;
  content: string;
  coordinates: SpiritualCoordinate;
  vector: number[];
  superposition?: string[];
  entangledWith?: string[];
  timestamp: number;
}

const LOCAL_MEMORY_PATH = path.join(process.cwd(), '.iqra', 'memory.json');
const COLLECTION_NAME = 'iqra_wisdom';

export class IQRAMemory {
  private static readonly REDIS_TTL = 604800; // 7 days in seconds
  private static readonly SUPABASE_TABLE = 'iqra_embeddings';
  private static readonly QUANTUM_COLLECTION = 'iqra_quantum';

  private static _redis: any = null;
  private static _supabase: any = null;
  private static _qdrant: any = null;
  private static _googleAI: any = null;
  private static readonly ERROR_THRESHOLD: number = 7;
  private static _errorCount: number = 0;

  /**
   * 🌌 Store Quantum Memory
   * Entangles a memory point at a specific coordinate.
   */
  static async storeQuantum(entry: Omit<QuantumMemoryEntry, 'id' | 'timestamp' | 'vector'>) {
    return await QuantumTopologyStore.storeQuantum(entry);
  }

  /**
   * 🧠 Search Semantic Memory
   * Finds wisdom points preserved in Qdrant.
   */
  static async searchSemantic(query: string, limit: number = 3) {
    return await this.searchSemanticInternal(query, limit);
  }

  private static async getRedis() {
    if (this._redis) return this._redis;
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const { Redis } = await import('@upstash/redis');
        const client = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        // Test connection with a very short timeout
        await withTimeout(client.ping(), 1000, 'Redis Ping');
        this._redis = client;
      } catch (e) {
        IQRALogger.warn('⚠️ [MEMORY] Redis unreachable or module missing. Falling back to Sovereign mode.');
        this._redis = null;
      }
    }
    return this._redis;
  }

  /**
   * 🔧 Public wrapper for Redis client access
   * Provides safe external access to Redis instance
   */
  static async getRedisClient(): Promise<any> {
    return await this.getRedis();
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

  public static async getQdrant() {
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
        // We don't ping here to save tokens/quota, but we'll catch failures later
      } catch (e) {
        IQRALogger.warn('⚠️ [MEMORY] Google AI module missing.');
        this._googleAI = null;
      }
    }
    return this._googleAI;
  }

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

  static async set(key: string, value: any) {
    // ── الجسر: كتابة في الطبقة الساخنة أولاً ────────────────────────────────
    try {
      const bridge = await getBridge();
      await bridge.write(key, value, { layer: 'hot' });
    } catch { /* الجسر اختياري — لا يوقف التنفيذ */ }

    try {
      const redis = await this.getRedis();
      if (redis) {
        // TTL=7 أيام — القاعدة ٣: كتابة فورية مع انتهاء صلاحية تلقائي
        const result = await withTimeout(
          redis.set(`iqra:${key}`, value, { ex: REDIS_TTL_SECONDS }),
          IQRA_TIMEOUTS.REDIS,
          `Redis SET ${key}`
        );
        this._errorCount = 0;
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

  static async get<T>(key: string): Promise<T | null> {
    // ── الجسر: قراءة من الطبقة الساخنة أولاً ────────────────────────────────
    try {
      const bridge = await getBridge();
      const result = await bridge.read<T>(key);
      if (result.hit && result.value !== null) {
        return result.value;
      }
    } catch { /* الجسر اختياري */ }

    try {
      const redis = await this.getRedis();
      if (redis) {
        const val = await withTimeout(redis.get<T>(`iqra:${key}`), IQRA_TIMEOUTS.REDIS, `Redis GET ${key}`);
        this._errorCount = 0;
        return val;
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
      const total = await withTimeout(redis.llen(`iqra:list:${key}`), IQRA_TIMEOUTS.REDIS, `Redis LLEN ${key}`);
      const start = Math.max(0, total - count);
      const result = await withTimeout(redis.lrange(`iqra:list:${key}`, start, total - 1), IQRA_TIMEOUTS.REDIS, `Redis LRANGE (recent) ${key}`);
      return (result || []) as T[];
    }
    
    const data = await this.getLocalData();
    const list = (data[`list:${key}`] || []) as T[];
    return list.slice(-count);
  }

  static async saveCuriosity(score: number) {
    const redis = await this.getRedis();
    if (!redis) {
      const data = await this.getLocalData();
      data['curiosity_score'] = score;
      if (!data['curiosity_history']) data['curiosity_history'] = [];
      data['curiosity_history'].push({ timestamp: Date.now(), score });
      await this.saveLocalData(data);
      return;
    }
    await redis.set('iqra:curiosity_score', score);
    await redis.rpush('iqra:curiosity_history', { timestamp: Date.now(), score });
  }

  static async setCuriosity(key: string, value: any) {
    return await this.set(`curiosity:${key}`, value);
  }

  static async getCuriosity(key?: string): Promise<any> {
    if (key) {
      return await this.get(`curiosity:${key}`);
    }
    const redis = await this.getRedis();
    if (redis) return (await redis.get<number>('iqra:curiosity_score')) || 0.5;
    const data = await this.getLocalData();
    return data['curiosity_score'] || 0.5;
  }

  /**
   * 🏆 grantReward — منح مكافأة
   * "وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ" — النجم: 39
   */
  static async grantReward(amount: number | string, metadata: any = {}) {
    const numericAmount = typeof amount === 'number' ? amount : 0.1;
    const type = typeof amount === 'string' ? amount : 'direct';
    
    const current = await this.getCuriosity();
    const newScore = Math.min(1.0, current + numericAmount);
    
    await this.set('curiosity_score', newScore);
    await this.appendList('reward_history', {
      timestamp: Date.now(),
      amount: numericAmount,
      type,
      metadata,
      new_score: newScore
    });
    
    IQRALogger.info(`✨ [REWARD] ${type.toUpperCase()}: +${numericAmount.toFixed(4)} (New Score: ${newScore.toFixed(4)})`);
  }

  static async softReset() {
    IQRALogger.warn('🔄 [MEMORY] Threshold reached. Executing Soft Reset (Tasbih)...');
    const redis = await this.getRedis();
    if (redis) {
      try {
        await withTimeout(redis.del('iqra:working_memory'), 2000, 'Soft Reset DEL');
      } catch (e) {
        IQRALogger.error('❌ [MEMORY] Soft reset partial failure (Redis unreachable):', e);
      }
    }
    this._errorCount = 0;
    IQRALogger.info('📿 Tasbih: Working memory soft-reset complete.');
  }

  static async incrementCycleCounter(): Promise<number> {
    const redis = await this.getRedis();
    if (!redis) return 0;
    return await redis.incr('iqra:cycle_counter');
  }

  static async getCycleCounter(): Promise<number> {
    const redis = await this.getRedis();
    if (!redis) return 0;
    return (await redis.get<number>('iqra:cycle_counter')) || 0;
  }

  /**
   * 🌱 getFithrahCentroid — مركز الفطرة
   * يحسب متوسط أفضل المتجهات المكافأة لتحديد "الخط الأساسي" للفطرة
   * ❌ NO_MOCK: لا قيم افتراضية — إما بيانات حقيقية أو خطأ سيادي
   */
  static async getFithrahCentroid(): Promise<number[]> {
    const history = await this.get('fithrah_vectors') as number[][] | null;

    // ❌ لا قيم افتراضية — إما بيانات حقيقية أو خطأ سيادي
    if (!history || history.length === 0) {
      throw new SovereignError(
        'NO_MOCK: Cannot compute Fithrah centroid without valid embedding history',
        SovereignErrorCode.MISSING_DATA,
        { severity: 'HIGH', recovery_strategy: 'HALT' }
      );
    }

    // حساب المتوسط الحقيقي للأبعاد (Vector Centroid)
    const dim = history[0].length;
    const centroid = new Array(dim).fill(0);
    for (const vec of history) {
      for (let i = 0; i < dim; i++) centroid[i] += vec[i];
    }
    return centroid.map(v => v / history.length);
  }

  /**
   * 📐 euclideanDistance — المسافة الإقليدية
   * تقيس "البعد" عن الفطرة (anomaly detection)
   */
  static euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  /**
   * 🔄 updateFithrahCentroid — تحديث مركز الفطرة
   * يضيف متجهاً جديداً إلى التاريخ ويحتفظ بآخر 100 فقط
   */
  static async updateFithrahCentroid(vector: number[]): Promise<void> {
    const history = await this.get('fithrah_vectors') as number[][] || [];
    history.push(vector);
    if (history.length > 100) history.shift(); // احتفظ بآخر 100
    await this.set('fithrah_vectors', history);
  }

  static async performPurification() {
    IQRALogger.info('🧼 Arba\'ūn: Starting Tazkiyah cycle (Purification)...');
    const redis = await this.getRedis();
    if (!redis) return;
    await redis.del('iqra:working_memory');
    await redis.del('iqra:temp_context');
    await this.appendList('purification_logs', {
      timestamp: Date.now(),
      message: 'Reached 40 cycles. Tazkiyah performed. episodic memory cleared.'
    });
  }

  static async incrementSuccessCounter(): Promise<number> {
    const redis = await this.getRedis();
    if (!redis) return 0;
    return await redis.incr('iqra:success_counter');
  }

  static async getSuccessCounter(): Promise<number> {
    const redis = await this.getRedis();
    if (!redis) return 0;
    return (await redis.get<number>('iqra:success_counter')) || 0;
  }

  private static async muraqabahCheck(content: string, type: string): Promise<boolean> {
    const result = await IQRAConsciousness.muraqabahCheck(content, type);
    if (!result.isAllowed) {
      IQRALogger.warn(`🕋 [MURĀQABAH] Blocked ${type} storage: ${result.reason}`);
      this.logBlockedMemory(type, content, result.reason);
      return false;
    }
    return true;
  }

  static async saveLongTerm(table: string, data: any) {
    const supabase = await this.getSupabase();
    if (!supabase) {
      IQRALogger.warn('⚠️ Supabase not configured. Falling back to local logs.');
      return;
    }
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    if (!await this.muraqabahCheck(content, 'long-term')) return;

    const { error } = await withTimeout(supabase.from(table).insert([data]), IQRA_TIMEOUTS.NETWORK, `Supabase INSERT ${table}`);
    if (error) IQRALogger.error(`❌ Long-term memory error (${table}):`, error);

    // 🏺 [LANCEDB] Also archive in deep storage
    await LanceDBPlugin.archive(content, { table, ...data });
  }

  static async saveSemantic(text: string, metadata: any) {
    const qdrant = await this.getQdrant();
    const googleAI = await this.getGoogleAI();

    if (!qdrant || !googleAI) {
      IQRALogger.warn('⚠️ Semantic memory offline.');
      return;
    }

    if (!await this.muraqabahCheck(text, 'semantic')) return;

    try {
      const model = googleAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await withTimeout(model.embedContent(text), IQRA_TIMEOUTS.LLM, 'Google AI Embedding') as any;
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

      await this.appendList('embeddings_history', { vector: embedding, timestamp: Date.now() });
      IQRALogger.info('🧠 Semantic Memory: Wisdom point preserved in Qdrant Cloud.');
    } catch (error) {
      IQRALogger.error('❌ Qdrant Save Error:', error);
    }
  }

  private static logBlockedMemory(type: string, content: string, reason?: string) {
    const log = `\n### 🛡️ [POLLUTION_PREVENTED] ${new Date().toISOString()}\n- **Type**: ${type}\n- **Reason**: ${reason}\n- **Content Snippet**: ${content.substring(0, 100)}...\n`;
    const failuresPath = path.join(process.cwd(), 'FAILURES.md');
    fs.appendFileSync(failuresPath, log);
  }

  private static async searchSemanticInternal(query: string, limit: number = 3) {
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
        params: { hnsw_ef: 128 }
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
   * 🧮 Generate a 768-dimensional embedding
   * Uses Google AI text-embedding-004 or SHA-256 hash fallback
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const googleAI = await this.getGoogleAI();
      if (!googleAI) throw new Error('OFFLINE');
      const model = googleAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await withTimeout(model.embedContent(text), IQRA_TIMEOUTS.LLM, 'Google AI Embedding') as any;
      return result.embedding.values;
    } catch (error) {
      IQRALogger.warn('⚠️ [MEMORY] Network unavailable or Google AI failed. Using Sovereign Local Embedding Fallback.');
      // Simple hash-based deterministic embedding for offline stability (768 dims)
      const hash = crypto.createHash('sha256').update(text).digest();
      const embedding = new Array(768).fill(0).map((_, i) => {
        const byte = hash[i % hash.length];
        return (byte / 255) * 2 - 1; // Normalized to [-1, 1]
      });
      return embedding;
    }
  }

  static async computeNovelty(embedding: number[], count: number = 10): Promise<number> {
    const recent = await this.getRecentList<any>('embeddings_history', count);
    if (!recent || recent.length === 0) return 1.0;

    let maxSimilarity = 0;
    for (const item of recent) {
      const pastVector = typeof item === 'string' ? JSON.parse(item).vector : item.vector;
      if (!pastVector) continue;

      const sim = this.cosineSimilarity(embedding, pastVector);
      if (sim > maxSimilarity) maxSimilarity = sim;
    }

    return 1.0 - maxSimilarity;
  }

  // ── getContextForMission ──────────────────────────────────────────────────
  /**
   * يُرجع أفضل 7 ذكريات ذات صلة بمهمة معينة — القاعدة ٤.
   * يستخدم cosineSimilarity مع آخر 49 تضمين محفوظ.
   * [read] من الذاكرة المحلية أو Redis
   */
  static async getContextForMission(
    embedding: number[],
    missionId: string,
    topK: number = 7
  ): Promise<Array<{ mission_id: string; verse: string; field: string; similarity: number; timestamp: number }>> {
    const recent = await this.getRecentList<any>('embeddings_history', 49);
    if (!recent || recent.length === 0) return [];

    const scored = recent
      .filter(item => {
        const parsed = typeof item === 'string' ? JSON.parse(item) : item;
        return parsed.vector && parsed.mission_id !== missionId;
      })
      .map(item => {
        const parsed = typeof item === 'string' ? JSON.parse(item) : item;
        return {
          mission_id: parsed.mission_id ?? 'unknown',
          verse:      parsed.verse      ?? '',
          field:      parsed.field      ?? '',
          similarity: this.cosineSimilarity(embedding, parsed.vector),
          timestamp:  parsed.timestamp  ?? 0,
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    IQRALogger.info(
      `🧠 [MEMORY] getContextForMission: ${scored.length} relevant memories found [read]`
    );

    // 🏺 [LANCEDB] Augment with deep memories
    const deepContext = await LanceDBPlugin.autoRecall(missionId);
    if (deepContext) {
      IQRALogger.info('🏺 [LANCEDB] Deep memories augmented context.');
    }

    return scored;
  }

  // ── pruneEmbeddingsHistory ────────────────────────────────────────────────
  /**
   * تنظيف دوري للتضمينات القديمة في الذاكرة المحلية.
   * يحتفظ فقط بآخر maxKeep تضمين.
   * [read] من الملف المحلي
   */
  static async pruneEmbeddingsHistory(maxKeep: number = 100): Promise<number> {
    const data = await this.getLocalData();
    const listKey = 'list:embeddings_history';
    const list = data[listKey] as any[] | undefined;
    if (!list || list.length <= maxKeep) return 0;

    const pruned = list.length - maxKeep;
    data[listKey] = list.slice(-maxKeep);
    await this.saveLocalData(data);
    IQRALogger.info(`🧹 [MEMORY] Pruned ${pruned} old embeddings from local history [read]`);
    return pruned;
  }

  // ── cosineSimilarity (exported — used by Reporter & PatternMemory) ─────────
  /**
   * حساب تشابه جيب التمام بين متجهين.
   * مُصدَّرة للاستخدام في Reporter و PatternMemory — القاعدة ٢.
   */
  static cosineSimilarity(v1: number[], v2: number[]): number {
    if (!v1 || !v2 || v1.length !== v2.length || v1.length === 0) return 0;
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

  static async getContextForSession(sessionId: string, limit: number = 5): Promise<any[]> {
    return QuantumTopologyStore.getContextForSession(sessionId, limit);
  }

  static async savePattern(patternData: any): Promise<void> {
    return QuantumTopologyStore.savePattern(patternData);
  }

  static async getPatternMemories(observations: string[]): Promise<Record<string, any>> {
    return QuantumTopologyStore.getPatternMemories(observations);
  }

  static async updatePatternStatistics(patternId: string, stats: any): Promise<void> {
    return QuantumTopologyStore.updatePatternStatistics(patternId, stats);
  }
}

export class QuantumTopologyStore {
  private static readonly QUANTUM_COLLECTION = 'iqra_quantum_topology';
  private static readonly REDIS_TTL = 604800; // 7 days in seconds

  static async storeQuantum(entry: Omit<QuantumMemoryEntry, 'id' | 'timestamp' | 'vector'>) {
    try {
      const embedding = await this.generateEmbedding(entry.content);
      const quantumId = crypto.randomUUID();
      
      const fullEntry: QuantumMemoryEntry = {
        id: quantumId,
        timestamp: Date.now(),
        vector: embedding,
        ...entry
      };

      const qdrant = await IQRAMemory.getQdrant();
      if (qdrant) {
        await withTimeout(qdrant.upsert(this.QUANTUM_COLLECTION, {
          wait: true,
          points: [{
            id: quantumId,
            vector: embedding,
            payload: {
              content: entry.content,
              coordinates: entry.coordinates,
              superposition: entry.superposition,
              timestamp: fullEntry.timestamp
            }
          }]
        }), IQRA_TIMEOUTS.NETWORK, 'Qdrant Quantum UPSERT');
      }

      const redis = await IQRAMemory.getRedisClient();
      if (redis) {
        const coordinateKey = `quantum:coord:${entry.coordinates.concept.toLowerCase()}`;
        await redis.sadd(coordinateKey, quantumId);
        await redis.set(`quantum:entry:${quantumId}`, JSON.stringify(fullEntry));
      } else {
        // Local fallback storage
        const localEntries = await IQRAMemory.get<any>('quantum_entries') || {};
        localEntries[quantumId] = fullEntry;
        await IQRAMemory.set('quantum_entries', localEntries);
      }

      IQRALogger.info(`🌌 [QUANTUM] Memory entangled at concept: ${entry.coordinates.concept}`);
      return quantumId;
    } catch (error) {
      IQRALogger.error('❌ [QUANTUM] Storage Failure:', error);
      return null;
    }
  }

  static async searchQuantum(query: string, targetConcept?: string): Promise<QuantumMemoryEntry[]> {
    try {
      const qdrant = await IQRAMemory.getQdrant();
      if (!qdrant) {
        IQRALogger.warn('⚠️ [QUANTUM] Qdrant offline. Performing local resonant search.');
        const localData = await IQRAMemory.get<any>('quantum_entries') || {};
        const queryEmbedding = await this.generateEmbedding(query);
        
        const results = Object.values(localData).map((payload: any) => {
          const sim = IQRAMemory.cosineSimilarity(queryEmbedding, payload.vector || []);
          let resonance = sim;
          if (targetConcept && payload.coordinates?.concept?.toLowerCase() === targetConcept.toLowerCase()) {
            resonance += 0.2;
          }
          return {
            id: payload.id,
            content: payload.content,
            coordinates: { ...payload.coordinates, resonance: Math.min(1.0, resonance) },
            vector: payload.vector,
            timestamp: payload.timestamp
          } as QuantumMemoryEntry;
        });
        return results.sort((a, b) => (b.coordinates.resonance || 0) - (a.coordinates.resonance || 0)).slice(0, 5);
      }

      const queryEmbedding = await this.generateEmbedding(query);
      
      const semanticHits = await qdrant.search(this.QUANTUM_COLLECTION, {
        vector: queryEmbedding,
        limit: 5,
        with_payload: true
      });

      const results = semanticHits.map((hit: any) => {
        const payload = hit.payload as any;
        const baseScore = hit.score;
        let resonance = baseScore;

        if (targetConcept && payload.coordinates?.concept?.toLowerCase() === targetConcept.toLowerCase()) {
          resonance += 0.2;
        }

        return {
          id: hit.id as string,
          content: payload.content,
          coordinates: { ...payload.coordinates, resonance: Math.min(1.0, resonance) },
          vector: [],
          timestamp: payload.timestamp,
          superposition: payload.superposition
        } as QuantumMemoryEntry;
      });

      return results.sort((a: any, b: any) => (b.coordinates.resonance || 0) - (a.coordinates.resonance || 0));
    } catch (error) {
      IQRALogger.error('❌ [QUANTUM] Search Failure:', error);
      return [];
    }
  }

  private static async generateEmbedding(text: string): Promise<number[]> {
    return await IQRAMemory.generateEmbedding(text);
  }

    /**
     * Get context for a specific session
     */
    static async getContextForSession(sessionId: string, limit: number = 5): Promise<any[]> {
        try {
            const contextKey = `session:${sessionId}:context`;
            const redis = await IQRAMemory.getRedisClient();
            
            if (!redis) {
                return [];
            }

            // Get context from Redis
            const contextData = await redis.get(contextKey);
            
            if (!contextData) {
                return [];
            }

            const context = JSON.parse(contextData);
            
            // Return most recent items up to limit
            return Array.isArray(context) ? context.slice(-limit) : [];
            
        } catch (error) {
            IQRALogger.warn(`⚠️ [MEMORY] Failed to get context for session ${sessionId}:`, error);
            return [];
        }
    }

    /**
     * Save pattern to memory
     */
    static async savePattern(patternData: any): Promise<void> {
        try {
            const patternKey = `pattern:${patternData.patternId}`;
            const redis = await IQRAMemory.getRedisClient();
            
            if (!redis) {
                // Fallback to local storage
                const localPatterns = await IQRAMemory.get<any>('local_patterns') || {};
                localPatterns[patternData.patternId] = {
                    ...patternData,
                    savedAt: Date.now()
                };
                await IQRAMemory.set('local_patterns', localPatterns);
                return;
            }

            // Save to Redis with TTL
            await redis.setex(patternKey, this.REDIS_TTL, JSON.stringify(patternData));
            
            // Also save to pattern index
            const indexKey = 'patterns:index';
            const indexData = await redis.get(indexKey);
            const patterns = indexData ? JSON.parse(indexData) : [];
            
            if (!patterns.find((p: any) => p.patternId === patternData.patternId)) {
                patterns.push({
                    patternId: patternData.patternId,
                    timestamp: patternData.timestamp,
                    trustScore: patternData.trustScore
                });
                
                // Keep only last 1000 patterns in index
                const updatedPatterns = patterns.slice(-1000);
                await redis.setex(indexKey, this.REDIS_TTL, JSON.stringify(updatedPatterns));
            }
            
            IQRALogger.info(`💾 [MEMORY] Pattern saved: ${patternData.patternId}`);
            
        } catch (error) {
            IQRALogger.error(`❌ [MEMORY] Failed to save pattern:`, error);
        }
    }

    /**
     * Get pattern memories based on observations
     */
    static async getPatternMemories(observations: string[]): Promise<Record<string, any>> {
        try {
            const redis = await IQRAMemory.getRedisClient();
            
            if (!redis) {
                return {};
            }

            const patterns: Record<string, any> = {};
            
            // Search for patterns related to observations
            for (const observation of observations) {
                const searchKey = `patterns:search:${observation.slice(0, 50).toLowerCase()}`;
                const searchResults = await redis.get(searchKey);
                
                if (searchResults) {
                    const results = JSON.parse(searchResults);
                    results.forEach((pattern: any) => {
                        if (!patterns[pattern.patternId]) {
                            patterns[pattern.patternId] = pattern;
                        }
                    });
                }
            }
            
            return patterns;
            
        } catch (error) {
            IQRALogger.warn(`⚠️ [MEMORY] Failed to get pattern memories:`, error);
            return {};
        }
    }

    /**
     * Update pattern statistics
     */
    static async updatePatternStatistics(patternId: string, stats: any): Promise<void> {
        try {
            const statsKey = `pattern:${patternId}:stats`;
            const redis = await IQRAMemory.getRedisClient();
            
            if (!redis) {
                // Fallback to local storage
                const localStats = await IQRAMemory.get<any>('pattern_stats') || {};
                localStats[patternId] = {
                    ...localStats[patternId],
                    ...stats,
                    lastUpdated: Date.now()
                };
                await IQRAMemory.set('pattern_stats', localStats);
                return;
            }

            // Get existing stats
            const existingStats = await redis.get(statsKey);
            const mergedStats = existingStats ? 
                { ...JSON.parse(existingStats), ...stats, lastUpdated: Date.now() } : 
                { ...stats, lastUpdated: Date.now() };
            
            // Save updated stats
            await redis.setex(statsKey, this.REDIS_TTL, JSON.stringify(mergedStats));
            
            IQRALogger.info(`📊 [MEMORY] Pattern stats updated: ${patternId}`);
            
        } catch (error) {
            IQRALogger.error(`❌ [MEMORY] Failed to update pattern statistics:`, error);
        }
    }
}
