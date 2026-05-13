/**
 * Regression test: the sync `record()` path produces hash-chain
 * entries that are interoperable with the async `append()` path
 * and pass `verifyIntegrity()` end-to-end.
 *
 * Catches the bug surfaced in PR #27 review: production callers
 * (RewardEngine.grant) go through record(), not append(), so any
 * gap in hash population there silently breaks the chain.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { RewardLedger } from '#rewards/ledger';
import type { RewardEntry } from '#rewards/types';

function tempPath(): string {
  return path.join(process.cwd(), 'iqra-core', 'data', `chain_${Date.now()}_${Math.random().toString(36).slice(2)}.jsonl`);
}

function bareRecordEntry() {
  return {
    mission_id: 'm', worker_id: 'W', timestamp: Date.now(),
    base_reward: 0.5, total_reward: 0.5,
    reward_vector: { novelty: 0.2, resonance: 0.2, topology: 0.1, penalty: 0 },
    discovery_level: 'branch' as const,
    confidence: 0.9, validation_status: 'verified' as const,
    notes: '', pristine_multiplier_applied: false, multiplier_value: 1.0,
  };
}

function fullAppendEntry(over: Partial<RewardEntry> = {}): RewardEntry {
  return {
    ledger_id: '', recorded_at: new Date().toISOString(),
    prev_hash: null, entry_hash: '',
    ...bareRecordEntry(),
    ...over,
  } as RewardEntry;
}

describe('RewardLedger — sync record() participates in the hash chain', () => {
  let tp: string;
  let restore: () => void;

  beforeEach(() => {
    tp = tempPath();
    const original = RewardLedger.LEDGER_PATH;
    RewardLedger.LEDGER_PATH = tp;
    restore = () => { RewardLedger.LEDGER_PATH = original; };
  });

  afterEach(() => {
    restore();
    if (fs.existsSync(tp)) fs.unlinkSync(tp);
  });

  it('first record() writes prev_hash=null and a valid entry_hash', async () => {
    RewardLedger.record(bareRecordEntry());
    const all = await RewardLedger.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].prev_hash).toBeNull();
    expect(all[0].entry_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('successive record() calls chain prev_hash to the previous entry_hash', async () => {
    RewardLedger.record(bareRecordEntry());
    RewardLedger.record(bareRecordEntry());
    RewardLedger.record(bareRecordEntry());
    const all = await RewardLedger.getAll();
    expect(all).toHaveLength(3);
    expect(all[0].prev_hash).toBeNull();
    expect(all[1].prev_hash).toBe(all[0].entry_hash);
    expect(all[2].prev_hash).toBe(all[1].entry_hash);
  });

  it('verifyIntegrity() reports valid for a pure record()-only ledger', async () => {
    RewardLedger.record(bareRecordEntry());
    RewardLedger.record(bareRecordEntry());
    const result = await RewardLedger.verifyIntegrity();
    expect(result.valid).toBe(true);
    expect(result.total_entries).toBe(2);
    expect(result.broken_chain_at).toBeNull();
  });

  it('record() and append() can interleave without breaking the chain', async () => {
    RewardLedger.record(bareRecordEntry());
    await RewardLedger.append(fullAppendEntry({ mission_id: 'a' }));
    RewardLedger.record(bareRecordEntry());
    const result = await RewardLedger.verifyIntegrity();
    expect(result.valid).toBe(true);
    expect(result.total_entries).toBe(3);
  });
});
