import fs from 'fs';
import path from 'path';
import { RewardEntry } from '../rewards/types';

/**
 * 🌙 IQRA Reward Ledger — سجل الثواب
 * 
 * An append-only ledger for recording discoveries and rewards.
 * Uses JSONL (JSON Lines) format for atomicity and simplicity.
 */

export class RewardLedger {
  private static LEDGER_PATH = path.join(process.cwd(), 'ledger/rewards.jsonl');

  /**
   * Append a new reward entry to the ledger.
   */
  static async append(entry: RewardEntry): Promise<void> {
    this.validateEntry(entry);
    
    const line = JSON.stringify({
      ...entry,
      ledger_id: `rew_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      recorded_at: new Date().toISOString()
    }) + '\n';

    try {
      // Ensure directory exists
      const dir = path.dirname(this.LEDGER_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Append line atomically
      fs.appendFileSync(this.LEDGER_PATH, line, 'utf-8');
    } catch (err) {
      console.error('❌ [LEDGER] Failed to append entry:', err);
      throw new Error('Ledger write failed.');
    }
  }

  /**
   * Read all entries from the ledger.
   */
  static async getAll(): Promise<RewardEntry[]> {
    if (!fs.existsSync(this.LEDGER_PATH)) return [];

    try {
      const content = fs.readFileSync(this.LEDGER_PATH, 'utf-8');
      return content
        .trim()
        .split('\n')
        .map(line => JSON.parse(line));
    } catch (err) {
      console.error('❌ [LEDGER] Failed to read ledger:', err);
      return [];
    }
  }

  private static validateEntry(entry: RewardEntry): void {
    if (!entry.mission_id || !entry.worker_id) {
      throw new Error('Invalid ledger entry: missing IDs.');
    }
    if (entry.total_reward < 0) {
      throw new Error('Invalid ledger entry: negative reward.');
    }
  }
}
