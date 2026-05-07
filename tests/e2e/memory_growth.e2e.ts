/**
 * 🧪 Memory Growth E2E Test
 * يتحقق من: نمو السجل، اختلاف التضمينات، عمل PatternMemory
 * يستخدم dev_mode: true + provider: simulated
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';
import { runMission } from '../../lib/iqra/mission-runner.ts';
import { RewardLedger } from '../../ledger/reward-ledger.ts';
import { IQRAMemory } from '../../lib/iqra/memory.ts';
import { PatternMemory } from '../../lib/iqra/memory/pattern_memory.ts';

function writeMission(id: string, verse: string, field: string): string {
  const p = path.join(os.tmpdir(), `iqra-mem-test-${id}.yml`);
  fs.writeFileSync(p, yaml.dump({
    mission_id: id,
    objective: `Test memory growth for ${verse}`,
    verse,
    field_of_inquiry: field,
    provider: 'simulated',
    dev_mode: true,
  }), 'utf-8');
  return p;
}

describe('Memory Growth E2E', () => {
  let initialLedgerSize = 0;
  let mission1Path: string;
  let mission2Path: string;

  beforeAll(async () => {
    const all = await RewardLedger.getAll();
    initialLedgerSize = all.length;
    mission1Path = writeMission('mem-test-001', '2:255', 'Quantum Entanglement');
    mission2Path = writeMission('mem-test-002', '36:40', 'Orbital Mechanics');
  });

  it('ledger grows after two missions', async () => {
    const r1 = await runMission(mission1Path);
    const r2 = await runMission(mission2Path);

    expect(r1.status).toBe('completed');
    expect(r2.status).toBe('completed');

    const all = await RewardLedger.getAll();
    expect(all.length).toBeGreaterThan(initialLedgerSize + 1);
  }, 60_000);

  it('embeddings are different for different missions', async () => {
    // SHA-256 fallback يُنتج متجهات مختلفة لنصوص مختلفة
    (IQRAMemory as any)._googleAI = null;
    const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const e1 = await IQRAMemory.generateEmbedding('Quantum Entanglement verse 2:255');
    const e2 = await IQRAMemory.generateEmbedding('Orbital Mechanics verse 36:40');
    const sim = IQRAMemory.cosineSimilarity(e1, e2);
    expect(sim).toBeLessThan(1.0);

    if (originalKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
    (IQRAMemory as any)._googleAI = null;
  });

  it('PatternMemory stores and retrieves patterns', async () => {
    (IQRAMemory as any)._googleAI = null;
    const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const embedding = await IQRAMemory.generateEmbedding('test pattern for 2:255');
    const id = await PatternMemory.storePattern('2:255', 'Quantum', 0.8, embedding, 'mem-test-001');
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);

    const similar = await PatternMemory.getSimilarPatterns(embedding, 3);
    expect(similar.length).toBeGreaterThan(0);
    expect(similar[0].similarity).toBeGreaterThan(0.9); // نفس المتجه

    if (originalKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
    (IQRAMemory as any)._googleAI = null;
  });

  afterAll(() => {
    [mission1Path, mission2Path].forEach(p => {
      if (p && fs.existsSync(p)) fs.unlinkSync(p);
    });
  });
});
