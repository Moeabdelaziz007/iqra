/**
 * 🌀 PatternMemory — ذاكرة الأنماط الطوبولوجية
 * المرجع: "وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ فِي إِمَامٍ مُّبِينٍ" — يس: 12
 *
 * Per ADR-0001: Qdrant removed — uses local JSONL + sqlite-vec.
 */

import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { IQRALogger } from '#infra/logger';
import { withTimeout, IQRA_TIMEOUTS } from '#utils/timeout';

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
  metadata?: Record<string, any>;
}

export interface SimilarPattern {
  record: PatternRecord;
  similarity: number;          // cosine similarity 0.0 – 1.0
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LOCAL_PATTERN_PATH = path.join(process.cwd(), '.iqra', 'pattern_memory.json');

// ── PatternMemory ─────────────────────────────────────────────────────────────

export class PatternMemory {
  // Uses local JSONL + sqlite-vec per ADR-0001. Qdrant was removed.

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
   * Stores a new pattern resonance record locally (sqlite-vec fallback to JSONL).
   * Per ADR-0001: Qdrant removed — always uses local storage.
   */
  static async storePattern(
    verse: string,
    field: string,
    resonance_score: number,
    embedding: number[],
    mission_id: string,
    id?: string,
    metadata?: Record<string, any>
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

    const finalId = id || crypto.randomUUID();
    const record: PatternRecord = {
      id: finalId,
      verse,
      field,
      resonance_score,
      embedding,
      mission_id,
      created_at: new Date().toISOString(),
      source_tag: '[read]',
      metadata
    };

    const existing = await this._readLocal();
    existing.push(record);
    await this._writeLocal(existing);
    IQRALogger.info(`🌀 [PATTERN_MEMORY] Stored [read] local: ${verse} × ${field} (score: ${resonance_score.toFixed(3)})`);
    return finalId;
  }

  // ── getSimilarPatterns ────────────────────────────────────────────────────
  /**
   * Returns topK most similar patterns using local cosine similarity.
   * Per ADR-0001: Qdrant removed — uses local JSONL + sqlite-vec.
   */
  static async getSimilarPatterns(
    embedding: number[],
    topK: number = 5
  ): Promise<SimilarPattern[]> {
    if (embedding.length === 0) return [];

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
  static async getContextForMission(
    embedding: number[],
    missionId: string
  ): Promise<SimilarPattern[]> {
    const similar = await this.getSimilarPatterns(embedding, 7);
    return similar.filter(s => s.record.mission_id !== missionId);
  }

  // ── pruneOldLowValue ──────────────────────────────────────────────────────
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
      IQRALogger.info(`🧹 [PATTERN_MEMORY] Pruned ${pruned} old low-value patterns`);
    }
    return pruned;
  }

  // ── count ─────────────────────────────────────────────────────────────────
  static async count(): Promise<number> {
    const local = await this._readLocal();
    return local.length;
  }
}
