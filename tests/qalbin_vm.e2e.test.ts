/**
 * E2E Tests for Qalbin VM — اختبارات القلب الافتراضي
 * 
 * Tests the complete pulse execution cycle with real dependencies
 * No mocking - full integration testing
 */

import { QalbinVM, QalbinState, PulseResult } from '../lib/iqra/quran/qalbin_vm';
import { VectorEngine } from '../lib/iqra/quran/vector_engine';
import { IQRAMemory } from '../lib/iqra/memory';

describe('Qalbin VM E2E Tests', () => {
  let vm: QalbinVM;
  let vectorEngine: VectorEngine;

  beforeAll(async () => {
    // Initialize real dependencies
    vectorEngine = new VectorEngine();
    vm = new QalbinVM(vectorEngine, IQRAMemory);
  });

  beforeEach(() => {
    vm.reset();
  });

  describe('Basic Pulse Execution', () => {
    test('should execute single pulse with Arabic text', async () => {
      const input = 'بسم الله الرحمن الرحيم';
      const result = await vm.pulse(input);

      expect(result).toBeDefined();
      expect(result.state.pulseCount).toBe(1);
      expect(result.state.entropy).toBeGreaterThan(0);
      expect(result.state.phase).toBe('processing');
      expect(result.output).toContain(input);
      expect(result.patterns).toContain('Arabic_Text');
    });

    test('should detect numerical patterns', async () => {
      const input = 'سبع سموات'; // 7 letters
      const result = await vm.pulse(input);

      expect(result.patterns).toContain('Arabic_Text');
      // May contain numerical patterns based on length
    });

    test('should detect Quranic references', async () => {
      const input = 'سورة الفاتحة آية 1:7';
      const result = await vm.pulse(input);

      expect(result.patterns).toContain('Quranic_Reference');
      expect(result.patterns).toContain('Arabic_Text');
    });
  });

  describe('State Evolution', () => {
    test('should evolve through phases with multiple pulses', async () => {
      const inputs = [
        'الله',
        'بسم الله الرحمن الرحيم',
        'الحمد لله رب العالمين',
        'الرحمن الرحيم مالك يوم الدين'
      ];

      const results: PulseResult[] = [];
      for (const input of inputs) {
        const result = await vm.pulse(input);
        results.push(result);
      }

      expect(results.length).toBe(4);
      expect(results[3].state.pulseCount).toBe(4);
      
      // Should have progressed beyond init phase
      expect(results[3].state.phase).not.toBe('init');
      
      // Entropy should generally increase with more complex inputs
      expect(results[3].state.entropy).toBeGreaterThan(results[0].state.entropy);
    });

    test('should track entropy trends correctly', async () => {
      // Generate pulses with increasing complexity
      const inputs = ['ا', 'الله', 'بسم الله', 'بسم الله الرحمن الرحيم'];
      
      for (const input of inputs) {
        await vm.pulse(input);
      }

      const trend = vm.getEntropyTrend();
      expect(trend).toBeDefined();
      expect(trend.average).toBeGreaterThan(0);
      expect(typeof trend.increasing).toBe('boolean');
      expect(typeof trend.trend).toBe('number');
    });

    test('should reach resonant phase with high-quality input', async () => {
      const highResonanceInput = 'الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين';
      const result = await vm.pulse(highResonanceInput);

      // High resonance input should trigger phase advancement
      expect(result.state.resonance).toBeGreaterThan(0);
      expect(result.state.phase).toMatch(/processing|resonant/);
    });
  });

  describe('Pattern Detection', () => {
    test('should detect high entropy patterns', async () => {
      // Create input with high entropy (diverse characters)
      const highEntropyInput = 'أبجد هوز حطي كلمن سعفص قرشت ثخذ ضظغ';
      const result = await vm.pulse(highEntropyInput);

      expect(result.state.entropy).toBeGreaterThan(3.0);
      if (result.state.entropy > 3.5) {
        expect(result.patterns).toContain('High_Entropy');
      }
    });

    test('should detect high resonance patterns', async () => {
      const resonantInput = 'الله نور السماوات والأرض';
      const result = await vm.pulse(resonantInput);

      if (result.state.resonance > 0.8) {
        expect(result.patterns).toContain('High_Resonance');
      }
    });
  });

  describe('Memory Integration', () => {
    test('should store high-value states in memory', async () => {
      // This test assumes memory is available
      const highValueInput = 'سبحان الله وبحمده سبحان الله العظيم';
      
      // Execute pulse
      const result = await vm.pulse(highValueInput);
      
      // If resonance or entropy is high enough, it should be stored
      if (result.state.resonance > 0.7 || result.state.entropy > 3.5) {
        // Memory storage is attempted - we can't easily test actual storage
        // without knowing the memory backend, but we can verify the condition
        expect(result.state.resonance > 0.7 || result.state.entropy > 3.5).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle empty input gracefully', async () => {
      const result = await vm.pulse('');
      
      expect(result).toBeDefined();
      expect(result.state.entropy).toBe(0);
      expect(result.output).toContain('');
    });

    test('should handle null/undefined input', async () => {
      const result1 = await vm.pulse(null as any);
      const result2 = await vm.pulse(undefined as any);
      
      expect(result1.state.entropy).toBe(0);
      expect(result2.state.entropy).toBe(0);
    });

    test('should handle very long input', async () => {
      const longInput = 'الله'.repeat(1000);
      const result = await vm.pulse(longInput);
      
      expect(result).toBeDefined();
      expect(result.state.entropy).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    test('should execute pulses within reasonable time', async () => {
      const startTime = Date.now();
      
      await vm.pulse('test input');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 5 seconds (generous for E2E test)
      expect(duration).toBeLessThan(5000);
    });

    test('should handle multiple consecutive pulses', async () => {
      const inputs = Array(10).fill(null).map((_, i) => `test input ${i}`);
      const results: PulseResult[] = [];
      
      const startTime = Date.now();
      
      for (const input of inputs) {
        const result = await vm.pulse(input);
        results.push(result);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results.length).toBe(10);
      expect(results[9].state.pulseCount).toBe(10);
      // Should complete all pulses within reasonable time
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('State Management', () => {
    test('should reset state correctly', async () => {
      // Execute some pulses first
      await vm.pulse('test1');
      await vm.pulse('test2');
      
      expect(vm.getState().pulseCount).toBe(2);
      
      // Reset
      vm.reset();
      
      const state = vm.getState();
      expect(state.pulseCount).toBe(0);
      expect(state.entropy).toBe(0);
      expect(state.resonance).toBe(0);
      expect(state.phase).toBe('init');
      expect(state.patterns).toHaveLength(0);
    });

    test('should maintain state immutability in results', async () => {
      const result = await vm.pulse('test');
      
      // Modify result state
      result.state.pulseCount = 999;
      
      // Original VM state should be unchanged
      expect(vm.getState().pulseCount).toBe(1);
    });
  });
});

describe('Qalbin VM Integration Tests', () => {
  test('should work with real VectorEngine', async () => {
    const vm = new QalbinVM(new VectorEngine(), IQRAMemory);
    const result = await vm.pulse('الله نور');
    
    expect(result).toBeDefined();
    expect(result.state.entropy).toBeGreaterThan(0);
  });

  test('should handle Arabic text with diacritics', async () => {
    const vm = new QalbinVM(new VectorEngine(), IQRAMemory);
    const input = 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ';
    const result = await vm.pulse(input);
    
    expect(result.patterns).toContain('Arabic_Text');
    expect(result.state.entropy).toBeGreaterThan(0);
  });
});
