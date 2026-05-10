/**
 * 🌙 IQRA Reward Ledger — سجل الثواب
 * النية: تسجيل كل مكافأة مُتحقق منها في سجل واحد موحد
 * المرجع: "وَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ" — الزلزلة: 7
 *
 * ══════════════════════════════════════════════════════════════
 * SINGLE SOURCE OF TRUTH — مصدر حقيقة واحد
 * ══════════════════════════════════════════════════════════════
 * السجل الوحيد: iqra-core/data/reward_ledger.jsonl
 * كلا المسارين (mission-runner و topological-loop) يكتبان هنا.
 * ledger/rewards.jsonl القديم محذوف — لا تستخدمه.
 * ══════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { RewardEntry, RewardVector } from '../lib/iqra/05-rewards/types';

export class RewardLedger {
  /**
   * المسار الوحيد الموحد — لا يتغير.
   * [read] من iqra-core/data/reward_ledger.jsonl
   */
  static readonly LEDGER_PATH = path.join(
    process.cwd(),
    'iqra-core',
    'data',
    'reward_ledger.jsonl'
  );

  // ── Append ──────────────────────────────────────────────────────────────────
  /**
   * يُضيف مدخلة جديدة إلى السجل.
   * يرفض أي مدخلة بدون mission_id أو بمكافأة سالبة.
   */
  static async append(entry: RewardEntry): Promise<void> {
    this._validateEntry(entry);

    const line =
      JSON.stringify({
        ...entry,
        ledger_id: `rew_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        recorded_at: new Date().toISOString(),
      }) + '\n';

    const dir = path.dirname(this.LEDGER_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      fs.appendFileSync(this.LEDGER_PATH, line, 'utf-8');
    } catch (err) {
      console.error('❌ [LEDGER] Failed to append entry:', err);
      throw new Error(`Ledger write failed: ${(err as Error).message}`);
    }
  }

  // ── Read All ─────────────────────────────────────────────────────────────────
  static async getAll(): Promise<RewardEntry[]> {
    if (!fs.existsSync(this.LEDGER_PATH)) return [];

    try {
      const content = fs.readFileSync(this.LEDGER_PATH, 'utf-8');
      return content
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line) as RewardEntry);
    } catch (err) {
      console.error('❌ [LEDGER] Failed to read ledger:', err);
      return [];
    }
  }

  // ── Read Recent ──────────────────────────────────────────────────────────────
  /**
   * يُرجع آخر N مدخلة من السجل.
   */
  static async getRecent(count: number): Promise<RewardEntry[]> {
    const all = await this.getAll();
    return all.slice(-count);
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  static async getStats(): Promise<{
    total_entries: number;
    total_reward: number;
    avg_reward: number;
    max_reward: number;
  }> {
    const all = await this.getAll();
    if (all.length === 0) {
      return { total_entries: 0, total_reward: 0, avg_reward: 0, max_reward: 0 };
    }
    const rewards = all.map(e => e.total_reward);
    const total = rewards.reduce((a, b) => a + b, 0);
    return {
      total_entries: all.length,
      total_reward: total,
      avg_reward: total / all.length,
      max_reward: Math.max(...rewards),
    };
  }

  // ── Validate ─────────────────────────────────────────────────────────────────
  private static _validateEntry(entry: RewardEntry): void {
    if (!entry.mission_id || typeof entry.mission_id !== 'string') {
      throw new Error('LEDGER_ERR: mission_id is required and must be a string');
    }
    if (!entry.worker_id || typeof entry.worker_id !== 'string') {
      throw new Error('LEDGER_ERR: worker_id is required and must be a string');
    }
    if (typeof entry.total_reward !== 'number' || isNaN(entry.total_reward)) {
      throw new Error('LEDGER_ERR: total_reward must be a valid number');
    }
    if (entry.total_reward < 0) {
      throw new Error(`LEDGER_ERR: negative reward rejected (${entry.total_reward})`);
    }
    if (!entry.validation_status) {
      throw new Error('LEDGER_ERR: validation_status is required');
    }
  }
}
