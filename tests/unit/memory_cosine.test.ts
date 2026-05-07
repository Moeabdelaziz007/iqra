import { describe, it, expect } from 'vitest';
import { IQRAMemory } from '../../lib/iqra/memory.ts';

describe('IQRAMemory.cosineSimilarity', () => {
  it('returns 1.0 for identical vectors', () => {
    const v = [1, 0, 0, 1];
    expect(IQRAMemory.cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  it('returns 0.0 for orthogonal vectors', () => {
    expect(IQRAMemory.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0, 5);
  });

  it('returns 0.0 for zero vectors', () => {
    expect(IQRAMemory.cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  it('returns 0 for mismatched lengths', () => {
    expect(IQRAMemory.cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
  });

  it('returns value between 0 and 1 for normal vectors', () => {
    const v1 = [0.5, 0.3, 0.8];
    const v2 = [0.2, 0.9, 0.4];
    const sim = IQRAMemory.cosineSimilarity(v1, v2);
    expect(sim).toBeGreaterThanOrEqual(0);
    expect(sim).toBeLessThanOrEqual(1);
  });

  it('is symmetric: sim(a,b) === sim(b,a)', () => {
    const v1 = [1, 2, 3, 4];
    const v2 = [4, 3, 2, 1];
    expect(IQRAMemory.cosineSimilarity(v1, v2)).toBeCloseTo(
      IQRAMemory.cosineSimilarity(v2, v1), 10
    );
  });
});

describe('IQRAMemory.generateEmbedding (SHA-256 fallback)', () => {
  it('returns 768-dim array when Google AI offline', async () => {
    // بدون GOOGLE_GENERATIVE_AI_API_KEY → SHA-256 fallback
    const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    // Reset cached client
    (IQRAMemory as any)._googleAI = null;

    const embedding = await IQRAMemory.generateEmbedding('بسم الله الرحمن الرحيم');
    expect(embedding).toHaveLength(768);
    expect(embedding.every(v => v >= -1 && v <= 1)).toBe(true);

    // Restore
    if (originalKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
    (IQRAMemory as any)._googleAI = null;
  });

  it('is deterministic for same input', async () => {
    (IQRAMemory as any)._googleAI = null;
    const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const e1 = await IQRAMemory.generateEmbedding('test input');
    const e2 = await IQRAMemory.generateEmbedding('test input');
    expect(e1).toEqual(e2);

    if (originalKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
    (IQRAMemory as any)._googleAI = null;
  });

  it('produces different embeddings for different inputs', async () => {
    (IQRAMemory as any)._googleAI = null;
    const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const e1 = await IQRAMemory.generateEmbedding('الفاتحة');
    const e2 = await IQRAMemory.generateEmbedding('البقرة');
    const sim = IQRAMemory.cosineSimilarity(e1, e2);
    // SHA-256 fallback يُنتج متجهات مختلفة لنصوص مختلفة
    expect(sim).toBeLessThan(1.0);

    if (originalKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
    (IQRAMemory as any)._googleAI = null;
  });
});

describe('IQRAMemory.computeNovelty', () => {
  it('returns 1.0 when no history exists', async () => {
    // Mock getRecentList to return empty
    const original = IQRAMemory.getRecentList;
    (IQRAMemory as any).getRecentList = async () => [];

    const embedding = new Array(768).fill(0.1);
    const novelty = await IQRAMemory.computeNovelty(embedding, 10);
    expect(novelty).toBe(1.0);

    (IQRAMemory as any).getRecentList = original;
  });
});
