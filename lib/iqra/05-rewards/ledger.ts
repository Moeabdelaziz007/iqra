// بسم الله الرحمن الرحيم

/**
 * 📒 RewardLedger — سجل المكافآت
 *
 * "وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ فِي إِمَامٍ مُّبِينٍ" — يس: 12
 *
 * يُخزّن كل مكافأة في JSONL (append-only) + SQLite للاستعلام السريع.
 * يحتفظ بكل PathKeys المستخدمة لفحص المسار البكر.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IQRALogger } from '../12-infrastructure/logger.js';
import { appendToTrustChain } from '../security.ts';
import type {
  RewardEntry, PathKey, RewardSummary, DiscoveryLevel,
} from './types.ts';

// ── Constants ─────────────────────────────────────────────────────────────────

const LEDGER_PATH   = path.join(process.cwd(), 'iqra-core', 'data', 'reward_ledger.jsonl');
const PATHS_PATH    = path.join(process.cwd(), '.iqra', 'path_registry.json');

// ── RewardLedger ──────────────────────────────────────────────────────────────

export class RewardLedger {
  /** سجل PathKeys في الذاكرة (hot cache) */
  private static _pathRegistry: Map<PathKey, number> = new Map();
  private static _registryLoaded = false;

  // ── Path Registry ─────────────────────────────────────────────────────────

  /**
   * يُحمّل سجل المسارات من الملف
   */
  private static _loadRegistry(): void {
    if (this._registryLoaded) return;
    try {
      if (fs.existsSync(PATHS_PATH)) {
        const raw = fs.readFileSync(PATHS_PATH, 'utf-8');
        const data = JSON.parse(raw) as Record<string, number>;
        this._pathRegistry = new Map(Object.entries(data));
      }
    } catch {
      this._pathRegistry = new Map();
    }
    this._registryLoaded = true;
  }

  /**
   * يحفظ سجل المسارات
   */
  private static _saveRegistry(): void {
    try {
      const dir = path.dirname(PATHS_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const data = Object.fromEntries(this._pathRegistry);
      fs.writeFileSync(PATHS_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      IQRALogger.warn(`⚠️ [LEDGER] Failed to save path registry: ${(e as Error).message}`);
    }
  }

  /**
   * يُرجع عدد مرات استخدام مسار معين
   */
  static getPathUseCount(pathKey: PathKey): number {
    this._loadRegistry();
    return this._pathRegistry.get(pathKey) ?? 0;
  }

  /**
   * يُسجّل استخدام مسار جديد
   */
  static recordPathKey(pathKey: PathKey): void {
    this._loadRegistry();
    const current = this._pathRegistry.get(pathKey) ?? 0;
    this._pathRegistry.set(pathKey, current + 1);
    this._saveRegistry();
  }

  /**
   * يُرجع كل المسارات المسجّلة
   */
  static getAllPathKeys(): Map<PathKey, number> {
    this._loadRegistry();
    return new Map(this._pathRegistry);
  }

  /**
   * عدد المسارات الفريدة
   */
  static get uniquePathCount(): number {
    this._loadRegistry();
    return this._pathRegistry.size;
  }

  // ── Ledger Write ──────────────────────────────────────────────────────────

  /**
   * يُسجّل مكافأة جديدة في JSONL
   */
  static record(entry: Omit<RewardEntry, 'ledger_id' | 'recorded_at'>): string {
    const ledgerId = `rew_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const full: RewardEntry = {
      ...entry,
      ledger_id: ledgerId,
      recorded_at: new Date().toISOString(),
    };

    // كتابة في JSONL (append-only)
    try {
      const dir = path.dirname(LEDGER_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(LEDGER_PATH, JSON.stringify(full) + '\n', 'utf-8');
    } catch (e) {
      IQRALogger.error('❌ [LEDGER] Write failed:', e);
    }

    // تسجيل PathKey إذا وُجد
    if (entry.path_key) {
      this.recordPathKey(entry.path_key);
    }

    appendToTrustChain(
      'REWARD:RECORD',
      ledgerId,
      `mission=${entry.mission_id} total=${entry.total_reward.toFixed(3)} ` +
      `pristine=${entry.pristine_multiplier_applied} level=${entry.discovery_level}`,
      entry.confidence
    );

    IQRALogger.info(
      `🏆 [LEDGER] Recorded: ${ledgerId} | ` +
      `total=${entry.total_reward.toFixed(3)} | ` +
      `${entry.pristine_multiplier_applied ? `🌟 PRISTINE ×${entry.multiplier_value}` : `×${entry.multiplier_value}`}`
    );

    return ledgerId;
  }

  // ── Ledger Read ───────────────────────────────────────────────────────────

  /**
   * يقرأ آخر N مكافآت
   */
  static getRecent(count: number = 10): RewardEntry[] {
    try {
      if (!fs.existsSync(LEDGER_PATH)) return [];
      const lines = fs.readFileSync(LEDGER_PATH, 'utf-8')
        .split('\n')
        .filter(l => l.trim().length > 0);
      return lines
        .slice(-count)
        .map(l => JSON.parse(l) as RewardEntry)
        .reverse();
    } catch {
      return [];
    }
  }

  /**
   * يُرجع ملخص المكافآت
   */
  static getSummary(): RewardSummary {
    try {
      if (!fs.existsSync(LEDGER_PATH)) {
        return {
          total_entries: 0, total_reward: 0, avg_reward: 0,
          pristine_paths: 0, repeated_paths: 0,
          by_level: { seed: 0, branch: 0, tree: 0, resonance: 0, revelation: 0 },
        };
      }

      const lines = fs.readFileSync(LEDGER_PATH, 'utf-8')
        .split('\n').filter(l => l.trim().length > 0);

      const entries = lines.map(l => JSON.parse(l) as RewardEntry);
      const totalReward = entries.reduce((s, e) => s + e.total_reward, 0);
      const pristine = entries.filter(e => e.pristine_multiplier_applied).length;

      const byLevel: Record<DiscoveryLevel, number> = {
        seed: 0, branch: 0, tree: 0, resonance: 0, revelation: 0,
      };
      for (const e of entries) {
        byLevel[e.discovery_level] = (byLevel[e.discovery_level] ?? 0) + 1;
      }

      // أكثر مسار استخداماً
      this._loadRegistry();
      let topPath: PathKey | undefined;
      let topCount = 0;
      for (const [k, v] of this._pathRegistry) {
        if (v > topCount) { topCount = v; topPath = k; }
      }

      return {
        total_entries: entries.length,
        total_reward: totalReward,
        avg_reward: entries.length > 0 ? totalReward / entries.length : 0,
        pristine_paths: pristine,
        repeated_paths: entries.length - pristine,
        by_level: byLevel,
        top_path_key: topPath,
      };
    } catch {
      return {
        total_entries: 0, total_reward: 0, avg_reward: 0,
        pristine_paths: 0, repeated_paths: 0,
        by_level: { seed: 0, branch: 0, tree: 0, resonance: 0, revelation: 0 },
      };
    }
  }

  /**
   * إعادة ضبط سجل المسارات (للاختبارات)
   */
  static resetPathRegistry(): void {
    this._pathRegistry = new Map();
    this._registryLoaded = true;
    try {
      if (fs.existsSync(PATHS_PATH)) fs.unlinkSync(PATHS_PATH);
    } catch { /* ignore */ }
  }
}
