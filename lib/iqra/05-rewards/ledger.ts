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
import { IQRALogger } from '#infra/logger';
import { appendToTrustChain } from '#security/security';
import type {
  RewardEntry, PathKey, RewardSummary, DiscoveryLevel,
} from './types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PATHS_PATH    = path.join(process.cwd(), '.iqra', 'path_registry.json');

// ── RewardLedger ──────────────────────────────────────────────────────────────

export class RewardLedger {
  /**
   * Absolute path of the JSONL ledger file. Public so tests can
   * redirect it to a temp file via `Object.defineProperty`.
   */
  static LEDGER_PATH: string = path.join(
    process.cwd(),
    'iqra-core',
    'data',
    'reward_ledger.jsonl',
  );

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
   * Read the previous entry's `entry_hash` synchronously, or return
   * `null` when the ledger is empty / unreadable / malformed. Used by
   * `record()` (the sync production path) and by `append()` (async)
   * so both code paths emit hash-chain-valid entries that pass
   * `verifyIntegrity`.
   */
  private static _readLastEntryHashSync(): string | null {
    if (!fs.existsSync(this.LEDGER_PATH)) return null;
    let content: string;
    try {
      content = fs.readFileSync(this.LEDGER_PATH, 'utf-8');
    } catch {
      return null;
    }
    // Walk backwards over non-empty lines until one parses; this
    // tolerates trailing newlines and skips a single corrupt final
    // line without throwing.
    const lines = content.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      try {
        const parsed = JSON.parse(line) as RewardEntry;
        return parsed.entry_hash ?? null;
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * يُسجّل مكافأة جديدة في JSONL
   *
   * Populates `prev_hash` (last entry's `entry_hash`, or `null` on the
   * first ever entry) and `entry_hash` (SHA-256 of the canonical
   * payload with `prev_hash` included), so entries written via the
   * production `RewardEngine.grant` path are chain-valid and pass
   * `verifyIntegrity()` end-to-end.
   */
  static record(entry: Omit<RewardEntry, 'ledger_id' | 'recorded_at'>): string {
    const ledgerId = `rew_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const prevHash = this._readLastEntryHashSync();
    const full: RewardEntry = {
      ...entry,
      ledger_id: ledgerId,
      recorded_at: new Date().toISOString(),
      prev_hash: prevHash,
    };
    full.entry_hash = this._hashEntry(full);

    // كتابة في JSONL (append-only)
    try {
      const dir = path.dirname(this.LEDGER_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(this.LEDGER_PATH, JSON.stringify(full) + '\n', 'utf-8');
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
      if (!fs.existsSync(this.LEDGER_PATH)) return [];
      const lines = fs.readFileSync(this.LEDGER_PATH, 'utf-8')
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
      if (!fs.existsSync(this.LEDGER_PATH)) {
        return {
          total_entries: 0, total_reward: 0, avg_reward: 0,
          pristine_paths: 0, repeated_paths: 0,
          by_level: { seed: 0, branch: 0, tree: 0, resonance: 0, revelation: 0 },
        };
      }

      const lines = fs.readFileSync(this.LEDGER_PATH, 'utf-8')
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

  // ── Hash Chain API (PR #23 stabilization) ─────────────────────────────────
  //
  // The hash chain links each appended entry to its predecessor via a
  // SHA-256 of (prev_hash + canonical payload). It allows offline
  // tamper detection without needing the original computation. The
  // append() / getAll() / verifyIntegrity() trio is what the tests
  // under tests/unit/reward-ledger-integrity.test.ts exercise.

  /**
   * Validate a candidate entry the same way the legacy `_validateEntry`
   * in `ledger/reward-ledger.ts` does, so error messages stay consistent
   * across both code paths. Throws on any violation.
   */
  private static _validateForAppend(entry: RewardEntry): void {
    if (!entry.mission_id || typeof entry.mission_id !== 'string') {
      throw new Error('LEDGER_ERR: mission_id is required and must be a string');
    }
    if (!entry.worker_id || typeof entry.worker_id !== 'string') {
      throw new Error('LEDGER_ERR: worker_id is required and must be a string');
    }
    if (typeof entry.total_reward !== 'number' || Number.isNaN(entry.total_reward)) {
      throw new Error('LEDGER_ERR: total_reward must be a valid number');
    }
    if (entry.total_reward < 0) {
      throw new Error(`LEDGER_ERR: negative reward rejected (${entry.total_reward})`);
    }
    if (!entry.validation_status) {
      throw new Error('LEDGER_ERR: validation_status is required');
    }
  }

  /**
   * Compute the deterministic content hash for an entry. The hash
   * input is the canonical JSON serialisation of the entry with
   * `entry_hash` stripped (we are computing it) but `prev_hash`
   * included, so any tamper of either field breaks the chain.
   */
  private static _hashEntry(entry: RewardEntry): string {
    const { entry_hash: _omit, ...payload } = entry;
    const keys = Object.keys(payload).sort();
    const canonical = JSON.stringify(payload, keys);
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Append a single entry to the ledger, linking it to the previous
   * entry's hash. The entry is mutated to populate `prev_hash` and
   * `entry_hash` before being written, and the same shape is what
   * subsequent reads return.
   */
  static async append(entry: RewardEntry): Promise<void> {
    this._validateForAppend(entry);

    const existing = await this.getAll();
    const last = existing.length > 0 ? existing[existing.length - 1] : null;
    entry.prev_hash = last ? (last.entry_hash ?? null) : null;
    if (!entry.ledger_id) {
      entry.ledger_id = `rew_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    }
    if (!entry.recorded_at) {
      entry.recorded_at = new Date().toISOString();
    }
    entry.entry_hash = this._hashEntry(entry);

    const dir = path.dirname(this.LEDGER_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    try {
      fs.appendFileSync(this.LEDGER_PATH, JSON.stringify(entry) + '\n', 'utf-8');
    } catch (err) {
      throw new Error(`LEDGER_ERR: write failed: ${(err as Error).message}`);
    }
  }

  /**
   * Read every entry from the ledger in insertion order. Returns an
   * empty array when the file does not exist; corrupt lines are
   * silently skipped so a single bad write does not poison reads.
   */
  static async getAll(): Promise<RewardEntry[]> {
    if (!fs.existsSync(this.LEDGER_PATH)) return [];
    let content: string;
    try {
      content = fs.readFileSync(this.LEDGER_PATH, 'utf-8');
    } catch {
      return [];
    }
    const out: RewardEntry[] = [];
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        out.push(JSON.parse(line) as RewardEntry);
      } catch {
        // Skip malformed lines rather than throwing; verifyIntegrity
        // is the canonical check for ledger health.
      }
    }
    return out;
  }

  /**
   * Verify the hash chain end-to-end. Returns a structured result:
   *   - `valid`: true when every entry's `prev_hash` matches the
   *     previous entry's `entry_hash` and every `entry_hash` recomputes
   *     correctly.
   *   - `total_entries`: number of entries inspected.
   *   - `broken_chain_at`: 0-indexed position of the first broken
   *     entry, or null on success.
   *   - `message`: short human-readable summary.
   */
  static async verifyIntegrity(): Promise<{
    valid: boolean;
    total_entries: number;
    broken_chain_at: number | null;
    message: string;
  }> {
    const entries = await this.getAll();
    if (entries.length === 0) {
      return {
        valid: true,
        total_entries: 0,
        broken_chain_at: null,
        message: 'Ledger is empty',
      };
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedPrev = i === 0 ? null : (entries[i - 1].entry_hash ?? null);
      const actualPrev = entry.prev_hash ?? null;

      if (i === 0 && actualPrev !== null) {
        return {
          valid: false,
          total_entries: entries.length,
          broken_chain_at: 0,
          message: 'First entry must have non-null prev_hash set to null',
        };
      }
      if (i > 0 && actualPrev !== expectedPrev) {
        return {
          valid: false,
          total_entries: entries.length,
          broken_chain_at: i,
          message: `Chain broken at entry ${i}: prev_hash does not match previous entry_hash`,
        };
      }

      const storedHash = entry.entry_hash ?? '';
      const recomputed = this._hashEntry(entry);
      if (storedHash !== recomputed) {
        return {
          valid: false,
          total_entries: entries.length,
          broken_chain_at: i,
          message: `Chain broken at entry ${i}: entry_hash does not match content`,
        };
      }
    }

    return {
      valid: true,
      total_entries: entries.length,
      broken_chain_at: null,
      message: 'Ledger integrity verified',
    };
  }
}
