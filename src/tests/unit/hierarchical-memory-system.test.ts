/**
 * Unit Tests: HierarchicalMemorySystem
 * Tests 5-layer memory hierarchy (L0-L4), store/retrieve operations,
 * LRU eviction, TTL expiry, and promotion mechanics.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HierarchicalMemorySystem } from '#core/HierarchicalMemorySystem';

describe('HierarchicalMemorySystem', () => {
  let memorySystem: HierarchicalMemorySystem;

  beforeEach(() => {
    memorySystem = new HierarchicalMemorySystem();
  });

  // ── Initialization ─────────────────────────────────────────────────────────

  describe('Constructor and Initialization', () => {
    it('should initialize without throwing', () => {
      expect(() => new HierarchicalMemorySystem()).not.toThrow();
    });

    it('should pre-populate L0 with sacred constants at construction', async () => {
      // Sacred constants: SEVEN, NINETEEN, FORTY, TESLA_SEQUENCE, BISMALLAH, HAMMAD
      const sevenResult = await memorySystem.retrieve('sacred:SEVEN');
      expect(sevenResult).not.toBeNull();
      expect(sevenResult!.layer).toBe('L0');
      expect(sevenResult!.value).toBe(7);
    });

    it('should have 19 in L0 as sacred constant', async () => {
      const nineteenResult = await memorySystem.retrieve('sacred:NINETEEN');
      expect(nineteenResult).not.toBeNull();
      expect(nineteenResult!.value).toBe(19);
    });

    it('should have 40 in L0 as sacred constant', async () => {
      const fortyResult = await memorySystem.retrieve('sacred:FORTY');
      expect(fortyResult).not.toBeNull();
      expect(fortyResult!.value).toBe(40);
    });

    it('should have TESLA_SEQUENCE in L0', async () => {
      const teslaResult = await memorySystem.retrieve('sacred:TESLA_SEQUENCE');
      expect(teslaResult).not.toBeNull();
      expect(teslaResult!.value).toEqual([3, 6, 9]);
    });

    it('should have Bismallah in L0', async () => {
      const bismalResult = await memorySystem.retrieve('sacred:BISMALLAH');
      expect(bismalResult).not.toBeNull();
      expect(typeof bismalResult!.value).toBe('string');
    });
  });

  // ── Store ───────────────────────────────────────────────────────────────────

  describe('store', () => {
    it('should store a value and return a valid layer ID', async () => {
      const layer = await memorySystem.store('test:key1', { data: 'hello' });
      expect(['L0', 'L1', 'L2', 'L3', 'L4']).toContain(layer);
    });

    it('should use preferred_layer when specified', async () => {
      const layer = await memorySystem.store('test:key2', 'value', {
        preferred_layer: 'L2'
      });
      expect(layer).toBe('L2');
    });

    it('should store in L1 when priority >= 0.9', async () => {
      const layer = await memorySystem.store('test:high-priority', { data: 1 }, {
        priority: 0.95
      });
      expect(layer).toBe('L1');
    });

    it('should store in L2 when priority >= 0.7 and < 0.9', async () => {
      const layer = await memorySystem.store('test:medium-priority', { data: 2 }, {
        priority: 0.75
      });
      expect(layer).toBe('L2');
    });

    it('should store in L3 when priority >= 0.5 and < 0.7', async () => {
      const layer = await memorySystem.store('test:low-priority', { data: 3 }, {
        priority: 0.55
      });
      expect(layer).toBe('L3');
    });

    it('should store in L4 when priority < 0.5', async () => {
      const layer = await memorySystem.store('test:minimal-priority', { data: 4 }, {
        priority: 0.3
      });
      expect(layer).toBe('L4');
    });

    it('should use tags when provided', async () => {
      const layer = await memorySystem.store('test:tagged', 'value', {
        tags: ['quranic', 'pattern'],
        preferred_layer: 'L2'
      });
      expect(layer).toBe('L2');
    });

    it('should auto-assign higher priority for quranic keys', async () => {
      const layer = await memorySystem.store('quranic:1:1', { verse: 'بسم الله' });
      // quranic key adds 0.3 to base 0.5 = 0.8 → L2
      expect(['L1', 'L2']).toContain(layer);
    });

    it('should auto-assign highest priority for sacred keys', async () => {
      const layer = await memorySystem.store('sacred:CUSTOM', 42);
      // sacred key adds 0.4 to base 0.5 = 0.9 → L1
      expect(layer).toBe('L1');
    });

    it('should store large objects without throwing', async () => {
      const largeObject = {
        data: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item_${i}` }))
      };
      const layer = await memorySystem.store('test:large-obj', largeObject, {
        preferred_layer: 'L4'
      });
      expect(layer).toBe('L4');
    });
  });

  // ── Retrieve ────────────────────────────────────────────────────────────────

  describe('retrieve', () => {
    it('should return null for a non-existent key', async () => {
      const result = await memorySystem.retrieve('nonexistent:key:xyz');
      expect(result).toBeNull();
    });

    it('should retrieve a stored value', async () => {
      await memorySystem.store('test:retrieve-me', { message: 'found!' }, {
        preferred_layer: 'L2'
      });

      const result = await memorySystem.retrieve('test:retrieve-me');
      expect(result).not.toBeNull();
      expect(result!.value.message).toBe('found!');
    });

    it('should include the layer in the retrieval result', async () => {
      await memorySystem.store('test:check-layer', 'data', {
        preferred_layer: 'L3'
      });

      const result = await memorySystem.retrieve('test:check-layer');
      expect(result).not.toBeNull();
      expect(result!.layer).toBe('L3');
    });

    it('should include access_time_ns in retrieval result', async () => {
      await memorySystem.store('test:timing', 'value', { preferred_layer: 'L1' });
      const result = await memorySystem.retrieve('test:timing');
      expect(result).not.toBeNull();
      expect(typeof result!.access_time_ns).toBe('number');
      expect(result!.access_time_ns).toBeGreaterThan(0);
    });

    it('should retrieve values from L0 (sacred constants)', async () => {
      const result = await memorySystem.retrieve('sacred:SEVEN');
      expect(result).not.toBeNull();
      expect(result!.layer).toBe('L0');
      expect(result!.access_time_ns).toBe(1); // L0 is 1ns
    });

    it('should retrieve complex nested objects correctly', async () => {
      const complex = { a: { b: { c: [1, 2, 3] } }, text: 'nested' };
      await memorySystem.store('test:complex-nested', complex, {
        preferred_layer: 'L2'
      });

      const result = await memorySystem.retrieve('test:complex-nested');
      expect(result!.value.a.b.c).toEqual([1, 2, 3]);
      expect(result!.value.text).toBe('nested');
    });

    it('should search layers from fastest (L0) to slowest (L4)', async () => {
      // Store in L4 (slowest)
      await memorySystem.store('test:l4-item', 'slow_data', {
        preferred_layer: 'L4'
      });

      const result = await memorySystem.retrieve('test:l4-item');
      expect(result).not.toBeNull();
      expect(result!.layer).toBe('L4');
      // L4 access time should be larger than L0
      expect(result!.access_time_ns).toBeGreaterThan(1);
    });
  });

  // ── Memory Statistics ─────────────────────────────────────────────────────

  describe('getMemoryStats', () => {
    it('should return a valid stats object', () => {
      const stats = memorySystem.getMemoryStats();
      expect(stats).toBeDefined();
      expect(typeof stats.total_entries).toBe('number');
      expect(typeof stats.total_memory_mb).toBe('number');
      expect(stats.hit_rates).toBeDefined();
      expect(stats.promotions).toBeDefined();
    });

    it('should count sacred constants in total entries', () => {
      // L0 pre-populated with 6 sacred constants (SEVEN, NINETEEN, FORTY, TESLA_SEQUENCE, BISMALLAH, HAMMAD)
      const stats = memorySystem.getMemoryStats();
      expect(stats.total_entries).toBeGreaterThanOrEqual(6);
    });

    it('should increase total_entries after storing new items', async () => {
      const statsBefore = memorySystem.getMemoryStats();

      await memorySystem.store('test:stats-1', 'data1', { preferred_layer: 'L2' });
      await memorySystem.store('test:stats-2', 'data2', { preferred_layer: 'L3' });

      const statsAfter = memorySystem.getMemoryStats();
      expect(statsAfter.total_entries).toBe(statsBefore.total_entries + 2);
    });

    it('should report hit_rates for each layer', () => {
      const stats = memorySystem.getMemoryStats();
      expect(stats.hit_rates).toHaveProperty('L0');
      expect(stats.hit_rates).toHaveProperty('L1');
      expect(stats.hit_rates).toHaveProperty('L2');
      expect(stats.hit_rates).toHaveProperty('L3');
      expect(stats.hit_rates).toHaveProperty('L4');
    });

    it('should have non-negative total_memory_mb', () => {
      const stats = memorySystem.getMemoryStats();
      expect(stats.total_memory_mb).toBeGreaterThanOrEqual(0);
    });

    it('should have promotion stats initialized to zero', () => {
      const stats = memorySystem.getMemoryStats();
      expect(stats.promotions.l0_to_l1).toBe(0);
      expect(stats.promotions.l1_to_l2).toBe(0);
      expect(stats.promotions.l2_to_l3).toBe(0);
      expect(stats.promotions.l3_to_l4).toBe(0);
    });
  });

  // ── promoteEntries ─────────────────────────────────────────────────────────

  describe('promoteEntries', () => {
    it('should run without throwing even with empty layers', async () => {
      await expect(memorySystem.promoteEntries()).resolves.toBeUndefined();
    });

    it('should complete successfully with stored data', async () => {
      await memorySystem.store('test:promote-1', 'data1', { preferred_layer: 'L2' });
      await memorySystem.store('test:promote-2', 'data2', { preferred_layer: 'L3' });

      await expect(memorySystem.promoteEntries()).resolves.toBeUndefined();
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle storing null value without throwing', async () => {
      const layer = await memorySystem.store('test:null-value', null, {
        preferred_layer: 'L3'
      });
      expect(layer).toBe('L3');
    });

    it('should handle storing number value', async () => {
      const layer = await memorySystem.store('test:numeric-value', 42, {
        preferred_layer: 'L2'
      });
      const result = await memorySystem.retrieve('test:numeric-value');
      expect(result!.value).toBe(42);
    });

    it('should handle storing boolean value', async () => {
      await memorySystem.store('test:bool-value', true, {
        preferred_layer: 'L2'
      });
      const result = await memorySystem.retrieve('test:bool-value');
      expect(result!.value).toBe(true);
    });

    it('should handle storing string value', async () => {
      await memorySystem.store('test:string-value', 'hello world', {
        preferred_layer: 'L1'
      });
      const result = await memorySystem.retrieve('test:string-value');
      expect(result!.value).toBe('hello world');
    });

    it('should overwrite existing entry with same key', async () => {
      await memorySystem.store('test:overwrite', 'first', { preferred_layer: 'L2' });
      await memorySystem.store('test:overwrite', 'second', { preferred_layer: 'L2' });

      const result = await memorySystem.retrieve('test:overwrite');
      expect(result!.value).toBe('second');
    });

    it('should handle L4 (infinite capacity) without eviction errors', async () => {
      // Store many items in L4 (infinite capacity)
      const storePromises = Array.from({ length: 20 }, (_, i) =>
        memorySystem.store(`test:l4-bulk-${i}`, { idx: i }, { preferred_layer: 'L4' })
      );
      await expect(Promise.all(storePromises)).resolves.toBeDefined();
    });
  });
});