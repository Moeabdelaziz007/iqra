/**
 * Unit Tests: IQRASevenLayerArchitecture
 * Tests model registry, memory hierarchy, conscience checks,
 * cycle detection, and memory management operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  IQRASevenLayerArchitecture,
  SYSTEM_CONSTANTS,
} from '#core/IQRASevenLayerArchitecture';

describe('IQRASevenLayerArchitecture', () => {
  let architecture: IQRASevenLayerArchitecture;

  beforeEach(() => {
    architecture = new IQRASevenLayerArchitecture();
  });

  // ── SYSTEM_CONSTANTS ────────────────────────────────────────────────────────

  describe('SYSTEM_CONSTANTS', () => {
    it('should have correct model name constants', () => {
      expect(SYSTEM_CONSTANTS.MODEL_WRITER).toBe('gemma3:4b');
      expect(SYSTEM_CONSTANTS.MODEL_READER).toBe('qwen2.5:7b');
      expect(SYSTEM_CONSTANTS.MODEL_VISION).toBe('moondream:1.8b');
      expect(SYSTEM_CONSTANTS.MODEL_MEMORY).toBe('nomic-embed-text');
      expect(SYSTEM_CONSTANTS.MODEL_CONSCIENCE).toBe('internal:damir');
    });

    it('should have correct max memory limit of 8GB', () => {
      expect(SYSTEM_CONSTANTS.MAX_MODEL_MEMORY_MB).toBe(8192);
    });

    it('should have a non-empty preferred models list', () => {
      expect(SYSTEM_CONSTANTS.PREFERRED_MODELS).toBeInstanceOf(Array);
      expect(SYSTEM_CONSTANTS.PREFERRED_MODELS.length).toBeGreaterThan(0);
      expect(SYSTEM_CONSTANTS.PREFERRED_MODELS).toContain('gemma3:4b');
    });
  });

  // ── Memory Limit ──────────────────────────────────────────────────────────

  describe('checkMemoryLimit', () => {
    it('should return true when combined memory is within limit', () => {
      // 4096 + 2048 = 6144 <= 8192
      expect(architecture.checkMemoryLimit(4096, 2048)).toBe(true);
    });

    it('should return true when combined memory exactly equals limit', () => {
      // 6144 + 2048 = 8192 <= 8192
      expect(architecture.checkMemoryLimit(6144, 2048)).toBe(true);
    });

    it('should return false when combined memory exceeds limit', () => {
      // 7000 + 2048 = 9048 > 8192
      expect(architecture.checkMemoryLimit(7000, 2048)).toBe(false);
    });

    it('should return true with zero current memory', () => {
      expect(architecture.checkMemoryLimit(0, 4096)).toBe(true);
    });

    it('should return false when model alone exceeds total limit', () => {
      expect(architecture.checkMemoryLimit(0, 9000)).toBe(false);
    });
  });

  // ── Model Priority ─────────────────────────────────────────────────────────

  describe('getModelPriority', () => {
    it('should return priority 1 for writer model', () => {
      expect(architecture.getModelPriority('writer')).toBe(1);
    });

    it('should return priority 2 for reader model', () => {
      expect(architecture.getModelPriority('reader')).toBe(2);
    });

    it('should return priority 3 for vision model', () => {
      expect(architecture.getModelPriority('vision')).toBe(3);
    });

    it('should return priority 4 for topology model', () => {
      expect(architecture.getModelPriority('topology')).toBe(4);
    });

    it('should return priority 5 for memory model', () => {
      expect(architecture.getModelPriority('memory')).toBe(5);
    });

    it('should return priority 6 for conscience model', () => {
      expect(architecture.getModelPriority('conscience')).toBe(6);
    });

    it('should return priority 7 for translator model', () => {
      expect(architecture.getModelPriority('translator')).toBe(7);
    });

    it('should return 999 for unknown model name', () => {
      expect(architecture.getModelPriority('nonexistent_model')).toBe(999);
      expect(architecture.getModelPriority('')).toBe(999);
      expect(architecture.getModelPriority('GPT-4')).toBe(999);
    });
  });

  // ── Context Window Tuning ──────────────────────────────────────────────────

  describe('tuneContextWindow', () => {
    it('should return 1024 for large context window', () => {
      expect(architecture.tuneContextWindow('writer', true)).toBe(1024);
    });

    it('should return 2048 for small context window', () => {
      expect(architecture.tuneContextWindow('writer', false)).toBe(2048);
    });

    it('should return consistent values regardless of model name', () => {
      expect(architecture.tuneContextWindow('reader', true)).toBe(1024);
      expect(architecture.tuneContextWindow('reader', false)).toBe(2048);
    });
  });

  // ── Hot Layer Limits ───────────────────────────────────────────────────────

  describe('checkHotLayerLimit and isHotCacheFull', () => {
    it('should report hot layer is not full by default (mock returns 25)', () => {
      // The mock always returns 25 items, max_size is 49 → not full
      expect(architecture.checkHotLayerLimit()).toBe(true);
      expect(architecture.isHotCacheFull()).toBe(false);
    });

    it('isHotCacheFull should be inverse of checkHotLayerLimit', () => {
      const limit = architecture.checkHotLayerLimit();
      const full = architecture.isHotCacheFull();
      expect(limit).toBe(!full);
    });
  });

  // ── Promotion and Archive Cycle Detection ─────────────────────────────────

  describe('checkPromotionCycle and checkArchiveCycle', () => {
    it('should return true on initial state (counter = 0)', () => {
      // 0 % 9 === 0 → true
      expect(architecture.checkPromotionCycle()).toBe(true);
    });

    it('should return true for archive on initial state (counter = 0)', () => {
      // 0 % 27 === 0 → true
      expect(architecture.checkArchiveCycle()).toBe(true);
    });

    it('should trigger promotion on 9th tick', async () => {
      // Tick 9 times
      for (let i = 0; i < 9; i++) {
        await architecture.pulseTick('write');
      }
      // After 9 ticks, counter = 9, 9 % 9 === 0 → promotion cycle
      expect(architecture.checkPromotionCycle()).toBe(true);
    });

    it('should trigger archive on 27th tick', async () => {
      for (let i = 0; i < 27; i++) {
        await architecture.pulseTick('write');
      }
      // After 27 ticks, counter = 27, 27 % 27 === 0 → archive cycle
      expect(architecture.checkArchiveCycle()).toBe(true);
    });

    it('should not trigger promotion cycle on non-multiple ticks', async () => {
      for (let i = 0; i < 5; i++) {
        await architecture.pulseTick('write');
      }
      // Counter = 5, 5 % 9 !== 0
      expect(architecture.checkPromotionCycle()).toBe(false);
    });
  });

  // ── Tool Result Management ─────────────────────────────────────────────────

  describe('addToolResult', () => {
    it('should add a tool result message to the messages array', () => {
      const messages: any[] = [];
      const result = { tool: 'web_search', output: 'some data' };

      architecture.addToolResult(messages, result);

      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('tool');
      expect(messages[0].content).toBe(JSON.stringify(result));
    });

    it('should append to an existing messages array', () => {
      const messages: any[] = [{ role: 'user', content: 'Hello' }];
      const result = { tool: 'calculator', output: 42 };

      architecture.addToolResult(messages, result);

      expect(messages).toHaveLength(2);
      expect(messages[1].role).toBe('tool');
    });

    it('should serialize result as JSON in message content', () => {
      const messages: any[] = [];
      const result = { nested: { key: 'value' }, array: [1, 2, 3] };

      architecture.addToolResult(messages, result);

      const parsedContent = JSON.parse(messages[0].content);
      expect(parsedContent.nested.key).toBe('value');
      expect(parsedContent.array).toEqual([1, 2, 3]);
    });
  });

  // ── Conscience Check ───────────────────────────────────────────────────────

  describe('checkConscience', () => {
    it('should return boolean true for a standard action', () => {
      const verdict = architecture.checkConscience({ type: 'analyze', target: 'text' });
      expect(typeof verdict).toBe('boolean');
      expect(verdict).toBe(true); // mock always returns true
    });

    it('should return boolean false or true (without throwing)', () => {
      // The current mock implementation always returns true,
      // but the method should remain callable with any input
      expect(() => architecture.checkConscience(null)).not.toThrow();
      expect(() => architecture.checkConscience({})).not.toThrow();
      expect(() => architecture.checkConscience(undefined)).not.toThrow();
    });
  });

  // ── Layer Operations ──────────────────────────────────────────────────────

  describe('Memory layer write operations', () => {
    it('should call writeToHot without throwing', () => {
      expect(() => architecture.writeToHot('test_key', { data: 123 })).not.toThrow();
    });

    it('should call writeToWarm without throwing', async () => {
      await expect(architecture.writeToWarm('warm_key', { data: 456 })).resolves.toBeUndefined();
    });

    it('should call writeToWarm with custom TTL without throwing', async () => {
      await expect(architecture.writeToWarm('warm_key_ttl', { data: 789 }, 60000)).resolves.toBeUndefined();
    });

    it('should call writeToCold without throwing', async () => {
      await expect(architecture.writeToCold('cold_key', { data: 'cold' })).resolves.toBeUndefined();
    });
  });

  // ── Layer Retrieval ───────────────────────────────────────────────────────

  describe('Memory layer retrieval operations', () => {
    it('should return null from tryHotLayer (mock implementation)', () => {
      expect(architecture.tryHotLayer('any_key')).toBeNull();
    });

    it('should return null from fallbackToWarmLayer (mock implementation)', async () => {
      const result = await architecture.fallbackToWarmLayer('any_key');
      expect(result).toBeNull();
    });

    it('should return null from fallbackToColdLayer (mock implementation)', async () => {
      const result = await architecture.fallbackToColdLayer('any_key');
      expect(result).toBeNull();
    });
  });

  // ── Model Operations ─────────────────────────────────────────────────────

  describe('Model loading operations', () => {
    it('should load a valid model without throwing', async () => {
      await expect(architecture.loadModel('writer')).resolves.toBeUndefined();
    });

    it('should throw when loading an unknown model', async () => {
      await expect(architecture.loadModel('nonexistent_model')).rejects.toThrow('Model nonexistent_model not found');
    });

    it('should unload a model without throwing', async () => {
      await expect(architecture.unloadModel('writer')).resolves.toBeUndefined();
    });

    it('should handle immediate unload without throwing', async () => {
      await expect(architecture.immediateUnload('writer')).resolves.toBeUndefined();
    });

    it('should keep a model warm without throwing', async () => {
      await expect(architecture.keepModelWarm('writer', '5m')).resolves.toBeUndefined();
    });
  });

  // ── Execute Model ─────────────────────────────────────────────────────────

  describe('executeModel', () => {
    it('should throw when executing unknown model', async () => {
      await expect(architecture.executeModel('ghost_model', {})).rejects.toThrow('Model ghost_model not found');
    });
  });

  // ── Ensure Model Loaded ───────────────────────────────────────────────────

  describe('ensureModelLoaded', () => {
    it('should load model for known task types without throwing', async () => {
      await expect(architecture.ensureModelLoaded('write')).resolves.toBeUndefined();
      await expect(architecture.ensureModelLoaded('read')).resolves.toBeUndefined();
      await expect(architecture.ensureModelLoaded('vision')).resolves.toBeUndefined();
    });

    it('should default to writer model for unknown task type', async () => {
      await expect(architecture.ensureModelLoaded('unknownTask')).resolves.toBeUndefined();
    });
  });

  // ── Promotion/Archive Execution ───────────────────────────────────────────

  describe('Promotion and archive execution', () => {
    it('should promoteHotToWarm and return a number', async () => {
      const promoted = await architecture.promoteHotToWarm();
      expect(typeof promoted).toBe('number');
      expect(promoted).toBeGreaterThanOrEqual(0);
    });

    it('should archiveWarmToCold and return a number', async () => {
      const archived = await architecture.archiveWarmToCold();
      expect(typeof archived).toBe('number');
      expect(archived).toBeGreaterThanOrEqual(0);
    });

    it('should execute hot→warm promotion without throwing', async () => {
      await expect(architecture.executeHotToWarm()).resolves.toBeUndefined();
    });

    it('should execute warm→cold archive without throwing', async () => {
      await expect(architecture.executeWarmToCold()).resolves.toBeUndefined();
    });
  });

  // ── Ollama API ──────────────────────────────────────────────────────────

  describe('callOllamaAPI', () => {
    it('should return response with model name echoed back', async () => {
      const result = await architecture.callOllamaAPI('gemma3:4b', [], []);
      expect(result.model).toBe('gemma3:4b');
      expect(result.response).toContain('gemma3:4b');
    });
  });

  // ── Tool Call Loop ────────────────────────────────────────────────────────

  describe('executeToolCallLoop', () => {
    it('should execute tool call loop and return array of results', async () => {
      const input = { messages: [], tools: [] };
      const results = await architecture.executeToolCallLoop('gemma3:4b', input, 3);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  // ── registerModels ────────────────────────────────────────────────────────

  describe('registerModels', () => {
    it('should register models without throwing', () => {
      expect(() => architecture.registerModels()).not.toThrow();
    });
  });

  // ── evictLRU ───────────────────────────────────────────────────────────────

  describe('evictLRU', () => {
    it('should evict LRU without throwing', () => {
      expect(() => architecture.evictLRU()).not.toThrow();
    });
  });

  // ── promoteWarmToHot / promoteColdToHot ───────────────────────────────────

  describe('Layer promotion helpers', () => {
    it('should promote warm to hot without throwing', () => {
      expect(() => architecture.promoteWarmToHot('key', { data: 'value' })).not.toThrow();
    });

    it('should promote cold to hot without throwing', () => {
      expect(() => architecture.promoteColdToHot('key', { data: 'value' })).not.toThrow();
    });
  });
});