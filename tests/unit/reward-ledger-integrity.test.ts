/**
 * Tests for RewardLedger integrity features added in this PR:
 * - _computeEntryHash (private, tested indirectly)
 * - verifyIntegrity() — hash chain verification
 * - prev_hash chain in append()
 *
 * Strategy: vi.spyOn(RewardLedger, 'getAll') to feed controlled entry sets
 * without touching the real ledger file on disk.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash } from 'crypto';
import { RewardLedger } from '../../ledger/reward-ledger';
import type { RewardEntry } from '#rewards/types';

// ── Helper: build a minimal valid RewardEntry ────────────────────────────────

function makeEntry(overrides: Partial<RewardEntry> = {}): RewardEntry {
  return {
    ledger_id: `rew_${Date.now()}_test`,
    mission_id: 'test_mission_001',
    worker_id: 'test_worker',
    timestamp: Date.now(),
    recorded_at: new Date().toISOString(),
    base_reward: 0.5,
    total_reward: 1.0,
    reward_vector: {
      novelty: 0.2,
      resonance: 0.3,
      topology: 0.1,
      penalty: 0.0,
    },
    discovery_level: 'seed',
    confidence: 0.8,
    validation_status: 'verified',
    notes: 'Test entry',
    pristine_multiplier_applied: false,
    multiplier_value: 1.0,
    prev_hash: null,
    entry_hash: '',
    ...overrides,
  };
}

/**
 * Compute the same SHA-256 hash that RewardLedger uses internally.
 * Mirrors: _computeEntryHash(entry) = SHA-256(JSON.stringify sorted keys)
 * Input: entry without prev_hash and entry_hash fields set meaningfully
 */
function computeExpectedHash(entry: Omit<RewardEntry, 'prev_hash' | 'entry_hash'>): string {
  const content = JSON.stringify(entry, Object.keys(entry).sort());
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Build a properly chained array of entries for testing.
 * Each entry's prev_hash links to the previous entry's entry_hash.
 */
function buildChain(count: number): RewardEntry[] {
  const entries: RewardEntry[] = [];
  let prevHash: string | null = null;

  for (let i = 0; i < count; i++) {
    const base = makeEntry({
      mission_id: `mission_${i}`,
      total_reward: i + 0.5,
      prev_hash: null,
      entry_hash: '',
    });

    // Set prev_hash before computing hash
    base.prev_hash = prevHash;

    // Compute hash with prev_hash=null, entry_hash=''
    const forHash = { ...base, prev_hash: null, entry_hash: '' } as any;
    const hash = computeExpectedHash(forHash);
    base.entry_hash = hash;

    entries.push(base);
    prevHash = hash;
  }

  return entries;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RewardLedger — verifyIntegrity() (سجل الثواب)', () => {
  let getAllSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getAllSpy = vi.spyOn(RewardLedger, 'getAll');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Empty ledger ─────────────────────────────────────────────────────────

  describe('empty ledger', () => {
    it('returns valid=true for an empty ledger', async () => {
      getAllSpy.mockResolvedValue([]);

      const result = await RewardLedger.verifyIntegrity();

      expect(result.valid).toBe(true);
      expect(result.total_entries).toBe(0);
      expect(result.broken_chain_at).toBeNull();
      expect(result.message).toMatch(/empty/i);
    });
  });

  // ── Single valid entry ────────────────────────────────────────────────────

  describe('single entry', () => {
    it('verifies a single correctly-hashed entry with null prev_hash', async () => {
      const entries = buildChain(1);
      getAllSpy.mockResolvedValue(entries);

      const result = await RewardLedger.verifyIntegrity();

      expect(result.valid).toBe(true);
      expect(result.total_entries).toBe(1);
      expect(result.broken_chain_at).toBeNull();
    });

    it('fails when the first entry has non-null prev_hash', async () => {
      const entry = makeEntry({ prev_hash: 'some_hash', entry_hash: 'anything' });
      getAllSpy.mockResolvedValue([entry]);

      const result = await RewardLedger.verifyIntegrity();

      expect(result.valid).toBe(false);
      expect(result.broken_chain_at).toBe(0);
      expect(result.message).toMatch(/non-null prev_hash/i);
    });

    it('fails when the first entry has a tampered entry_hash', async () => {
      const entries = buildChain(1);
      entries[0].entry_hash = 'tampered_hash_value';
      getAllSpy.mockResolvedValue(entries);

      const result = await RewardLedger.verifyIntegrity();

      expect(result.valid).toBe(false);
      expect(result.broken_chain_at).toBe(0);
      expect(result.message).toMatch(/corrupted or tampered/i);
    });
  });

  // ── Valid chain ───────────────────────────────────────────────────────────

  describe('valid multi-entry chain', () => {
    it('verifies a 2-entry chain correctly', async () => {
      const entries = buildChain(2);
      getAllSpy.mockResolvedValue(entries);

      const result = await RewardLedger.verifyIntegrity();

      expect(result.valid).toBe(true);
      expect(result.total_entries).toBe(2);
      expect(result.broken_chain_at).toBeNull();
    });

    it('verifies a 5-entry chain correctly', async () => {
      const entries = buildChain(5);
      getAllSpy.mockResolvedValue(entries);

      const result = await RewardLedger.verifyIntegrity();

      expect(result.valid).toBe(true);
      expect(result.total_entries).toBe(5);
      expect(result.broken_chain_at).toBeNull();
    });

    it('returns message confirming integrity verified', async () => {
      const entries = buildChain(3);
      getAllSpy.mockResolvedValue(entries);

      const result = await RewardLedger.verifyIntegrity();

      expect(result.message).toMatch(/integrity verified/i);
    });
  });

  // ── Broken chain ──────────────────────────────────────────────────────────

  describe('broken chain detection', () => {
    it('detects a broken chain at index 1 when prev_hash mismatch', async () => {
      const entries = buildChain(3);
      // Corrupt entry 1's prev_hash to not match entry 0's entry_hash
      entries[1].prev_hash = 'wrong_hash_value';
      getAllSpy.mockResolvedValue(entries);

      const result = await RewardLedger.verifyIntegrity();

      expect(result.valid).toBe(false);
      expect(result.broken_chain_at).toBe(1);
      expect(result.message).toMatch(/chain broken at entry 1/i);
    });

    it('detects a broken chain at the last entry', async () => {
      const entries = buildChain(4);
      // Corrupt the last entry's entry_hash
      entries[3].entry_hash = 'corrupted';
      getAllSpy.mockResolvedValue(entries);

      const result = await RewardLedger.verifyIntegrity();

      expect(result.valid).toBe(false);
      expect(result.broken_chain_at).toBe(3);
    });

    it('reports total_entries even when chain is broken', async () => {
      const entries = buildChain(4);
      entries[2].prev_hash = 'bad_hash';
      getAllSpy.mockResolvedValue(entries);

      const result = await RewardLedger.verifyIntegrity();

      expect(result.valid).toBe(false);
      expect(result.total_entries).toBe(4);
    });

    it('detects tampered entry_hash (not matching content)', async () => {
      const entries = buildChain(3);
      // Tamper content without updating hash
      entries[2].total_reward = 999.0;
      getAllSpy.mockResolvedValue(entries);

      const result = await RewardLedger.verifyIntegrity();

      expect(result.valid).toBe(false);
      expect(result.broken_chain_at).toBe(2);
      expect(result.message).toMatch(/corrupted or tampered/i);
    });

    it('reports broken_chain_at=null when chain is valid', async () => {
      const entries = buildChain(3);
      getAllSpy.mockResolvedValue(entries);

      const result = await RewardLedger.verifyIntegrity();

      expect(result.broken_chain_at).toBeNull();
    });
  });

  // ── Validation — entry validation ─────────────────────────────────────────

  describe('_validateEntry — entry validation (indirect)', () => {
    it('throws when mission_id is missing', async () => {
      const entry = makeEntry({ mission_id: '' });
      await expect(RewardLedger.append(entry)).rejects.toThrow('mission_id is required');
    });

    it('throws when worker_id is missing', async () => {
      const entry = makeEntry({ worker_id: '' });
      await expect(RewardLedger.append(entry)).rejects.toThrow('worker_id is required');
    });

    it('throws when total_reward is negative', async () => {
      const entry = makeEntry({ total_reward: -0.5 });
      await expect(RewardLedger.append(entry)).rejects.toThrow('negative reward rejected');
    });

    it('throws when total_reward is NaN', async () => {
      const entry = makeEntry({ total_reward: NaN });
      await expect(RewardLedger.append(entry)).rejects.toThrow('total_reward must be a valid number');
    });

    it('throws when validation_status is missing', async () => {
      const entry = makeEntry({ validation_status: '' as any });
      await expect(RewardLedger.append(entry)).rejects.toThrow('validation_status is required');
    });
  });

  // ── Hash determinism ──────────────────────────────────────────────────────

  describe('hash determinism', () => {
    it('the same content always produces the same hash (deterministic)', () => {
      const entry = makeEntry({
        mission_id: 'fixed_mission',
        total_reward: 1.5,
        notes: 'determinism test',
        prev_hash: null,
        entry_hash: '',
      });

      const forHash = { ...entry, prev_hash: null, entry_hash: '' } as any;
      const hash1 = computeExpectedHash(forHash);
      const hash2 = computeExpectedHash(forHash);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
    });

    it('different content produces different hashes', () => {
      const entry1 = makeEntry({ mission_id: 'mission_A', prev_hash: null, entry_hash: '' });
      const entry2 = makeEntry({ mission_id: 'mission_B', prev_hash: null, entry_hash: '' });

      const forHash1 = { ...entry1, prev_hash: null, entry_hash: '' } as any;
      const forHash2 = { ...entry2, prev_hash: null, entry_hash: '' } as any;

      const hash1 = computeExpectedHash(forHash1);
      const hash2 = computeExpectedHash(forHash2);

      expect(hash1).not.toBe(hash2);
    });
  });
});