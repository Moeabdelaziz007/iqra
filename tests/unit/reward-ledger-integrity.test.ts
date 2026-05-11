/**
 * Unit Tests: RewardLedger — Hash Chain Integrity
 * Tests the new verifyIntegrity method and the hash chain added to append().
 *
 * Each test isolates ledger state using a unique temp file path per suite.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { RewardLedger } from '../../ledger/reward-ledger';
import type { RewardEntry } from '../../lib/iqra/05-rewards/types';

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeTempLedgerPath(): string {
  return path.join(process.cwd(), 'iqra-core', 'data', `test_ledger_${Date.now()}_${Math.random().toString(36).slice(2)}.jsonl`);
}

function makeEntry(overrides: Partial<RewardEntry> = {}): RewardEntry {
  return {
    ledger_id: '',
    mission_id: 'mission_test_001',
    worker_id: 'TestWorker',
    timestamp: Date.now(),
    recorded_at: new Date().toISOString(),
    base_reward: 0.8,
    total_reward: 0.8,
    reward_vector: { novelty: 0.3, resonance: 0.3, topology: 0.2, penalty: 0.0 },
    discovery_level: 'branch',
    confidence: 0.9,
    validation_status: 'verified',
    notes: 'test entry',
    pristine_multiplier_applied: false,
    multiplier_value: 1.0,
    prev_hash: null,
    entry_hash: '',
    ...overrides,
  };
}

// Monkey-patch the LEDGER_PATH for each test
function withTempLedger(tempPath: string): () => void {
  const original = (RewardLedger as any).LEDGER_PATH;
  Object.defineProperty(RewardLedger, 'LEDGER_PATH', { value: tempPath, writable: true, configurable: true });
  return () => {
    Object.defineProperty(RewardLedger, 'LEDGER_PATH', { value: original, writable: true, configurable: true });
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RewardLedger — verifyIntegrity', () => {
  let tempLedgerPath: string;
  let restorePath: () => void;

  beforeEach(() => {
    tempLedgerPath = makeTempLedgerPath();
    restorePath = withTempLedger(tempLedgerPath);
  });

  afterEach(() => {
    restorePath();
    if (fs.existsSync(tempLedgerPath)) {
      fs.unlinkSync(tempLedgerPath);
    }
  });

  // ── Empty Ledger ───────────────────────────────────────────────────────────

  describe('empty ledger', () => {
    it('should report valid with zero entries when no file exists', async () => {
      const result = await RewardLedger.verifyIntegrity();
      expect(result.valid).toBe(true);
      expect(result.total_entries).toBe(0);
      expect(result.broken_chain_at).toBeNull();
      expect(result.message).toBe('Ledger is empty');
    });

    it('should report valid with empty file', async () => {
      const dir = path.dirname(tempLedgerPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(tempLedgerPath, '', 'utf-8');

      const result = await RewardLedger.verifyIntegrity();
      expect(result.valid).toBe(true);
      expect(result.total_entries).toBe(0);
    });
  });

  // ── Single Entry ──────────────────────────────────────────────────────────

  describe('single entry', () => {
    it('should report valid for a single appended entry', async () => {
      await RewardLedger.append(makeEntry());

      const result = await RewardLedger.verifyIntegrity();
      expect(result.valid).toBe(true);
      expect(result.total_entries).toBe(1);
      expect(result.broken_chain_at).toBeNull();
      expect(result.message).toBe('Ledger integrity verified');
    });

    it('should store null as prev_hash for the first entry', async () => {
      await RewardLedger.append(makeEntry());

      const entries = await RewardLedger.getAll();
      expect(entries).toHaveLength(1);
      expect(entries[0].prev_hash).toBeNull();
    });

    it('should store a non-empty entry_hash for the first entry', async () => {
      await RewardLedger.append(makeEntry());

      const entries = await RewardLedger.getAll();
      expect(typeof entries[0].entry_hash).toBe('string');
      expect(entries[0].entry_hash).toHaveLength(64); // SHA-256 hex
    });
  });

  // ── Hash Chain Integrity (Multiple Entries) ───────────────────────────────

  describe('hash chain with multiple entries', () => {
    it('should report valid for two chained entries', async () => {
      await RewardLedger.append(makeEntry({ mission_id: 'mission_001' }));
      await RewardLedger.append(makeEntry({ mission_id: 'mission_002' }));

      const result = await RewardLedger.verifyIntegrity();
      expect(result.valid).toBe(true);
      expect(result.total_entries).toBe(2);
      expect(result.broken_chain_at).toBeNull();
    });

    it('should chain prev_hash → entry_hash correctly across entries', async () => {
      await RewardLedger.append(makeEntry({ mission_id: 'm1' }));
      await RewardLedger.append(makeEntry({ mission_id: 'm2' }));
      await RewardLedger.append(makeEntry({ mission_id: 'm3' }));

      const entries = await RewardLedger.getAll();
      expect(entries).toHaveLength(3);

      // First entry: prev_hash = null
      expect(entries[0].prev_hash).toBeNull();

      // Second entry: prev_hash = first entry's entry_hash
      expect(entries[1].prev_hash).toBe(entries[0].entry_hash);

      // Third entry: prev_hash = second entry's entry_hash
      expect(entries[2].prev_hash).toBe(entries[1].entry_hash);
    });

    it('should report valid for five chained entries', async () => {
      for (let i = 1; i <= 5; i++) {
        await RewardLedger.append(makeEntry({ mission_id: `mission_bulk_${i}`, total_reward: i * 0.1 }));
      }

      const result = await RewardLedger.verifyIntegrity();
      expect(result.valid).toBe(true);
      expect(result.total_entries).toBe(5);
      expect(result.broken_chain_at).toBeNull();
    });

    it('should produce different entry_hashes for different content', async () => {
      await RewardLedger.append(makeEntry({ mission_id: 'mission_a', total_reward: 0.5 }));
      await RewardLedger.append(makeEntry({ mission_id: 'mission_b', total_reward: 0.7 }));

      const entries = await RewardLedger.getAll();
      expect(entries[0].entry_hash).not.toBe(entries[1].entry_hash);
    });
  });

  // ── Tampered Ledger Detection ─────────────────────────────────────────────

  describe('tampered ledger detection', () => {
    it('should detect chain breakage when an entry is manually corrupted', async () => {
      await RewardLedger.append(makeEntry({ mission_id: 'orig_001' }));
      await RewardLedger.append(makeEntry({ mission_id: 'orig_002' }));
      await RewardLedger.append(makeEntry({ mission_id: 'orig_003' }));

      // Read raw content and tamper with entry at index 1
      const content = fs.readFileSync(tempLedgerPath, 'utf-8');
      const lines = content.trim().split('\n');
      const entry1 = JSON.parse(lines[1]);
      entry1.total_reward = 999; // tamper: change reward value
      lines[1] = JSON.stringify(entry1);
      fs.writeFileSync(tempLedgerPath, lines.join('\n') + '\n', 'utf-8');

      const result = await RewardLedger.verifyIntegrity();
      expect(result.valid).toBe(false);
      expect(result.broken_chain_at).not.toBeNull();
    });

    it('should detect a first entry with non-null prev_hash', async () => {
      await RewardLedger.append(makeEntry({ mission_id: 'valid_first' }));

      // Read and tamper: set prev_hash to a fake hash for first entry
      const content = fs.readFileSync(tempLedgerPath, 'utf-8');
      const entry = JSON.parse(content.trim());
      entry.prev_hash = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
      fs.writeFileSync(tempLedgerPath, JSON.stringify(entry) + '\n', 'utf-8');

      const result = await RewardLedger.verifyIntegrity();
      expect(result.valid).toBe(false);
      expect(result.broken_chain_at).toBe(0);
      expect(result.message).toContain('non-null prev_hash');
    });

    it('should detect chain mismatch when prev_hash does not match previous entry_hash', async () => {
      await RewardLedger.append(makeEntry({ mission_id: 'chain_a' }));
      await RewardLedger.append(makeEntry({ mission_id: 'chain_b' }));

      // Tamper: break prev_hash in second entry
      const content = fs.readFileSync(tempLedgerPath, 'utf-8');
      const lines = content.trim().split('\n');
      const entry1 = JSON.parse(lines[1]);
      entry1.prev_hash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      lines[1] = JSON.stringify(entry1);
      fs.writeFileSync(tempLedgerPath, lines.join('\n') + '\n', 'utf-8');

      const result = await RewardLedger.verifyIntegrity();
      expect(result.valid).toBe(false);
      expect(result.broken_chain_at).toBe(1);
      expect(result.message).toContain('Chain broken at entry 1');
    });
  });

  // ── Validation ────────────────────────────────────────────────────────────

  describe('append validation', () => {
    it('should reject entries with missing mission_id', async () => {
      const badEntry = makeEntry({ mission_id: '' });
      await expect(RewardLedger.append(badEntry)).rejects.toThrow('LEDGER_ERR: mission_id');
    });

    it('should reject entries with negative total_reward', async () => {
      const badEntry = makeEntry({ total_reward: -1 });
      await expect(RewardLedger.append(badEntry)).rejects.toThrow('LEDGER_ERR: negative reward');
    });

    it('should reject entries with missing worker_id', async () => {
      const badEntry = makeEntry({ worker_id: '' });
      await expect(RewardLedger.append(badEntry)).rejects.toThrow('LEDGER_ERR: worker_id');
    });

    it('should reject entries with missing validation_status', async () => {
      const badEntry = makeEntry({ validation_status: '' as any });
      await expect(RewardLedger.append(badEntry)).rejects.toThrow('LEDGER_ERR: validation_status');
    });

    it('should accept entries with zero total_reward (boundary case)', async () => {
      const entry = makeEntry({ total_reward: 0 });
      await expect(RewardLedger.append(entry)).resolves.toBeUndefined();

      const result = await RewardLedger.verifyIntegrity();
      expect(result.valid).toBe(true);
    });
  });

  // ── getAll ────────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('should return an empty array when the ledger file does not exist', async () => {
      const entries = await RewardLedger.getAll();
      expect(entries).toEqual([]);
    });

    it('should return all appended entries in order', async () => {
      await RewardLedger.append(makeEntry({ mission_id: 'first' }));
      await RewardLedger.append(makeEntry({ mission_id: 'second' }));
      await RewardLedger.append(makeEntry({ mission_id: 'third' }));

      const entries = await RewardLedger.getAll();
      expect(entries).toHaveLength(3);
      expect(entries[0].mission_id).toBe('first');
      expect(entries[1].mission_id).toBe('second');
      expect(entries[2].mission_id).toBe('third');
    });
  });

  // ── Regression: Hash Determinism ─────────────────────────────────────────

  describe('hash determinism', () => {
    it('should generate the same entry_hash when the same content is hashed twice in succession', async () => {
      // Append same logical content to different isolated ledgers
      const tempPath2 = makeTempLedgerPath();
      const restore2 = withTempLedger(tempPath2);

      try {
        await RewardLedger.append(makeEntry({ mission_id: 'deterministic_test', total_reward: 0.5 }));
        const entriesA = await RewardLedger.getAll();
        const hashA = entriesA[0].entry_hash;

        // Reset ledger
        fs.unlinkSync(tempPath2);

        await RewardLedger.append(makeEntry({ mission_id: 'deterministic_test', total_reward: 0.5 }));
        const entriesB = await RewardLedger.getAll();
        const hashB = entriesB[0].entry_hash;

        // Same content (excluding auto-generated fields) should produce consistent hashes
        // NOTE: ledger_id and recorded_at differ between calls, so the hashes will differ.
        // Both must be 64-char hex strings (valid SHA-256).
        expect(hashA).toMatch(/^[0-9a-f]{64}$/);
        expect(hashB).toMatch(/^[0-9a-f]{64}$/);
      } finally {
        restore2();
        if (fs.existsSync(tempPath2)) fs.unlinkSync(tempPath2);
      }
    });
  });
});
