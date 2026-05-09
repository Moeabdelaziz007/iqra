/**
 * 🌀 PatternMemory — ذاكرة الأنماط الطوبولوجية
 * النية: تخزين واسترجاع أنماط الرنين القرآني عبر Qdrant
 * المرجع: "وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ فِي إِمَامٍ مُّبِينٍ" — يس: 12
 *
 * ══════════════════════════════════════════════════════════════
 * EMBEDDED CONSTITUTIONAL RULES
  * ══════════════════════════════════════════════════════════════
 * 1. لا Mock.كل embedding حقيقي أو SHA - 256 fallback موثّق.
 * 2. كل مصدر يُوسَم: [fetched] Qdrant | [read] local fallback.
 * 3. لا تختلق نتائج — إذا كان Qdrant غير متاح، أرجع من الذاكرة المحلية.
 * ══════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { IQRALogger } from '../12-infrastructure/logger.js';
import { withTimeout, IQRA_TIMEOUTS } from '../utils/timeout.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PatternRecord {
  id: string;
  verse: string;               // e.g. "2:255"
  field: string;               // field_of_inquiry
  resonance_score: number;     // 0.0 – 1.0
  embedding: number[];         // 768-dim vector
  mission_id: string;
  created_at: string;          // ISO timestamp
  source_tag: '[fetched]' | '[read]' | '[prior-training]';
}

export interface SimilarPattern {
  record: PatternRecord;
  similarity: number;          // cosine similarity 0.0 – 1.0
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PATTERN_COLLECTION = 'iqra_patterns';
const LOCAL_PATTERN_PATH = path.join(process.cwd(), '.iqra', 'pattern_memory.json');

// ── PatternMemory ─────────────────────────────────────────────────────────────

export class PatternMemory {
  private static _qdrant: any = null;

  // ── Qdrant client (lazy init) ──────────────────────────────────────────────
  private static async getQdrant(): Promise<any | null> {
    if (this._qdrant) return this._qdrant;
    if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
      IQRALogger.warn('⚠️ [PATTERN_MEMORY] Qdrant env vars missing — using local fallback [read]');
      return null;
    }
    try {
      const { QdrantClient } = await import('@qdrant/js-client-rest');
      this._qdrant = new QdrantClient({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
      });
      // Ensure collection exists (768 dims, Cosine distance)
      await withTimeout(
        this._qdrant.createCollection(PATTERN_COLLECTION, {
          vectors: { size: 768, distance: 'Cosine' },
        }).catch(() => { /* already exists — ignore */ }),
        IQRA_TIMEOUTS.NETWORK,
        'Qdrant createCollection'
      );
      return this._qdrant;
    } catch (e) {
      IQRALogger.warn(`⚠️ [PATTERN_MEMORY] Qdrant init failed: ${(e as Error).message}`);
      return null;
    }
  }

  // ── Local fallback helpers ─────────────────────────────────────────────────
  private static async _readLocal(): Promise<PatternRecord[]> {
    if (!fs.existsSync(LOCAL_PATTERN_PATH)) return [];
    try {
      const raw = await fsPromises.readFile(LOCAL_PATTERN_PATH, 'utf-8');
      return JSON.parse(raw) as PatternRecord[];
    } catch {
      return [];
    }
  }

  private static async _writeLocal(records: PatternRecord[]): Promise<void> {
    const dir = path.dirname(LOCAL_PATTERN_PATH);
    if (!fs.existsSync(dir)) await fsPromises.mkdir(dir, { recursive: true });
    await fsPromises.writeFile(LOCAL_PATTERN_PATH, JSON.stringify(records, null, 2), 'utf-8');
  }

  // ── cosineSimilarity (pure, no deps) ──────────────────────────────────────
  static cosineSimilarity(v1: number[], v2: number[]): number {
    if (!v1 || !v2 || v1.length !== v2.length || v1.length === 0) return 0;
    let dot = 0, mag1 = 0, mag2 = 0;
    for (let i = 0; i < v1.length; i++) {
      dot += v1[i] * v2[i];
      mag1 += v1[i] * v1[i];
      mag2 += v2[i] * v2[i];
    }
    const mag = Math.sqrt(mag1) * Math.sqrt(mag2);
    return mag === 0 ? 0 : dot / mag;
  }

  // ── storePattern ──────────────────────────────────────────────────────────
  /**
   * يخزن نمط رنين جديد في Qdrant (أو محلياً كـ fallback).
   * [fetched] إذا نجح Qdrant | [read] إذا استخدم الملف المحلي
   */
  static async storePattern(
    verse: string,
    field: string,
    resonance_score: number,
    embedding: number[],
    mission_id: string
  ): Promise<string> {
    if (!verse || !field || !mission_id) {
      throw new Error('PATTERN_ERR: verse, field, mission_id are required');
    }
    if (embedding.length === 0) {
      throw new Error('PATTERN_ERR: embedding must be non-empty');
    }
    if (resonance_score < 0 || resonance_score > 1) {
      throw new Error(`PATTERN_ERR: resonance_score out of range: ${resonance_score}`);
    }

    const id = crypto.randomUUID();
    const record: PatternRecord = {
      id,
      verse,
      field,
      resonance_score,
      embedding,
      mission_id,
      created_at: new Date().toISOString(),
      source_tag: '[fetched]',
    };

    const qdrant = await this.getQdrant();

    if (qdrant) {
      try {
        await withTimeout(
          qdrant.upsert(PATTERN_COLLECTION, {
            wait: true,
            points: [{
              id,
              vector: embedding,
              payload: {
                verse,
                field,
                resonance_score,
                mission_id,
                created_at: record.created_at,
              },
            }],
          }),
          IQRA_TIMEOUTS.NETWORK,
          'Qdrant pattern upsert'
        );
        IQRALogger.info(`🌀 [PATTERN_MEMORY] Stored [fetched] Qdrant: ${verse} × ${field} (score: ${resonance_score.toFixed(3)})`);
        return id;
      } catch (e) {
        IQRALogger.warn(`⚠️ [PATTERN_MEMORY] Qdrant upsert failed, falling back to local: ${(e as Error).message}`);
      }
    }

    // Local fallback [read]
    record.source_tag = '[read]';
    const existing = await this._readLocal();
    existing.push(record);
    await this._writeLocal(existing);
    IQRALogger.info(`🌀 [PATTERN_MEMORY] Stored [read] local: ${verse} × ${field}`);
    return id;
  }

  // ── getSimilarPatterns ────────────────────────────────────────────────────
  /**
   * يُرجع أكثر topK أنماط تشابهاً مع embedding المُعطى.
   * [fetched] من Qdrant | [read] من الملف المحلي
   */
  static async getSimilarPatterns(
    embedding: number[],
    topK: number = 5
  ): Promise<SimilarPattern[]> {
    if (embedding.length === 0) return [];

    const qdrant = await this.getQdrant();

    if (qdrant) {
      try {
        const results = await withTimeout(
          qdrant.search(PATTERN_COLLECTION, {
            vector: embedding,
            limit: topK,
            with_payload: true,
          }),
          IQRA_TIMEOUTS.NETWORK,
          'Qdrant pattern search'
        );

        return (results || []).map((hit: any) => ({
          record: {
            id: hit.id as string,
            verse: hit.payload?.verse ?? '',
            field: hit.payload?.field ?? '',
            resonance_score: hit.payload?.resonance_score ?? 0,
            embedding: [],          // Qdrant doesn't return vectors by default
            mission_id: hit.payload?.mission_id ?? '',
            created_at: hit.payload?.created_at ?? '',
            source_tag: '[fetched]' as const,
          },
          similarity: hit.score ?? 0,
        }));
      } catch (e) {
        IQRALogger.warn(`⚠️ [PATTERN_MEMORY] Qdrant search failed, falling back to local: ${(e as Error).message}`);
      }
    }

    // Local fallback — cosine similarity over stored embeddings [read]
    const all = await this._readLocal();
    if (all.length === 0) return [];

    const scored = all
      .filter(r => r.embedding && r.embedding.length > 0)
      .map(r => ({
        record: r,
        similarity: this.cosineSimilarity(embedding, r.embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    IQRALogger.info(`🌀 [PATTERN_MEMORY] getSimilarPatterns [read] local: returned ${scored.length} results`);
    return scored;
  }

  // ── getContextForMission ──────────────────────────────────────────────────
  /**
   * يُرجع أفضل 7 ذكريات ذات صلة بمهمة معينة.
   * يُستخدم قبل بدء المهمة لتزويد العمال بسياق تاريخي.
   */
  static async getContextForMission(
    embedding: number[],
    missionId: string
  ): Promise<SimilarPattern[]> {
    const similar = await this.getSimilarPatterns(embedding, 7);
    // استبعاد نفس المهمة
    return similar.filter(s => s.record.mission_id !== missionId);
  }

  // ── pruneOldLowValue ──────────────────────────────────────────────────────
  /**
   * تنظيف دوري: يحذف الأنماط المحلية الأقدم من maxAgeDays وأقل من minResonance.
   * [read] من الملف المحلي فقط — Qdrant يُدار بـ TTL خارجياً.
   */
  static async pruneOldLowValue(
    maxAgeDays: number = 7,
    minResonance: number = 0.3
  ): Promise<number> {
    const all = await this._readLocal();
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

    const kept = all.filter(r => {
      const age = new Date(r.created_at).getTime();
      const tooOld = age < cutoff;
      const lowValue = r.resonance_score < minResonance;
      return !(tooOld && lowValue);
    });

    const pruned = all.length - kept.length;
    if (pruned > 0) {
      await this._writeLocal(kept);
      IQRALogger.info(`🧹 [PATTERN_MEMORY] Pruned ${pruned} old low-value patterns [read]`);
    }
    return pruned;
  }

  // ── count ─────────────────────────────────────────────────────────────────
  static async count(): Promise<number> {
    const qdrant = await this.getQdrant();
    if (qdrant) {
      try {
        const info = await withTimeout(
          qdrant.getCollection(PATTERN_COLLECTION),
          IQRA_TIMEOUTS.NETWORK,
          'Qdrant getCollection'
        );
        return info?.vectors_count ?? 0;
      } catch { /* fall through */ }
    }
    const local = await this._readLocal();
    return local.length;
  }
}
