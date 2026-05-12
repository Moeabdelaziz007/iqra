import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatternDiscovery } from '../lib/iqra/quran/patterns';
import { IQRAMemory } from '../lib/iqra/memory';

// Simulate I/O latency (D1/Redis network)
const LATENCY = 50;

describe('PatternDiscovery Performance Optimization', () => {
  beforeEach(async () => {
    // Clear the knowledge base
    await IQRAMemory.set('quranic_knowledge', []);

    // Mock the I/O latency for get/set
    const originalGet = IQRAMemory.get;
    const originalSet = IQRAMemory.set;

    vi.spyOn(IQRAMemory, 'get').mockImplementation(async (key) => {
      await new Promise(resolve => setTimeout(resolve, LATENCY));
      return originalGet.call(IQRAMemory, key);
    });

    vi.spyOn(IQRAMemory, 'set').mockImplementation(async (key, val) => {
      await new Promise(resolve => setTimeout(resolve, LATENCY));
      return originalSet.call(IQRAMemory, key, val);
    });
  });

  it('measures the time to discover and save patterns using BATCH optimization', async () => {
    const text = "Pattern1 Pattern2 Pattern3 Pattern4 Pattern5 Pattern6 Pattern7";

    const start = performance.now();
    await PatternDiscovery.discoverSemanticLink(text);
    const end = performance.now();

    const duration = end - start;
    console.log(`Optimized Execution Time (Batch): ${duration.toFixed(2)}ms`);

    const memory = await IQRAMemory.get<string[]>('quranic_knowledge') || [];
    expect(memory.length).toBe(7);

    // Expected time: (1 read * 50ms) + (1 write * 50ms) = 100ms + overhead
    // This is a huge improvement over 700ms.
    expect(duration).toBeLessThan(200);
  });
});
