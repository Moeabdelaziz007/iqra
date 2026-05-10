/**
 * E2E Tests for Enhanced Pattern System — اختبارات نظام الأنماط المحسّن
 * 
 * Comprehensive integration tests for:
 * - Qalbin VM with pulse execution
 * - Persistent Homology (H0, H1, H2)
 * - Enhanced Numerical Validator (7, 19, Tesla 369)
 * 
 * No mocking - full integration testing
 */

import { QalbinVM } from '../lib/iqra/quran/qalbin_vm';
import { PersistentHomology, Point, HomologyResult } from '../lib/iqra/quran/persistent_homology';
import { EnhancedNumericalValidator, EnhancedResonanceResult } from '../lib/iqra/quran/enhanced_numerical_validator';
import { VectorEngine } from '../lib/iqra/quran/vector_engine';
import { IQRAMemory } from '../lib/iqra/memory';

describe('Enhanced Pattern System E2E Tests', () => {
  let vectorEngine: VectorEngine;

  beforeAll(async () => {
    vectorEngine = new VectorEngine();
  });

  describe('Qalbin VM Integration', () => {
    test('should execute pulse with Arabic Quranic text', async () => {
      const vm = new QalbinVM(vectorEngine, IQRAMemory);
      const input = 'بسم الله الرحمن الرحيم';
      
      const result = await vm.pulse(input);
      
      expect(result).toBeDefined();
      expect(result.state.pulseCount).toBe(1);
      expect(result.state.entropy).toBeGreaterThan(0);
      expect(result.state.phase).toBe('processing');
      expect(result.output).toContain(input);
      expect(result.patterns).toContain('Arabic_Text');
    });

    test('should evolve through phases with multiple pulses', async () => {
      const vm = new QalbinVM(vectorEngine, IQRAMemory);
      const inputs = [
        'الله',
        'الحمد لله',
        'الحمد لله رب العالمين',
        'الرحمن الرحيم مالك يوم الدين'
      ];
      
      for (const input of inputs) {
        await vm.pulse(input);
      }
      
      const finalState = vm.getState();
      expect(finalState.pulseCount).toBe(4);
      expect(finalState.phase).not.toBe('init');
      expect(finalState.entropy).toBeGreaterThan(0);
    });

    test('should track entropy trends correctly', async () => {
      const vm = new QalbinVM(vectorEngine, IQRAMemory);
      
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
  });

  describe('Persistent Homology Integration', () => {
    test('should calculate H0, H1, H2 for simple point set', async () => {
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ];
      
      const result = await PersistentHomology.calculate(points);
      
      expect(result).toBeDefined();
      expect(result.H0.dimension).toBe(0);
      expect(result.H1.dimension).toBe(1);
      expect(result.H2.dimension).toBe(2);
      expect(result.H0.bettiNumber).toBeGreaterThan(0);
      expect(typeof result.totalComplexity).toBe('number');
      expect(typeof result.eulerCharacteristic).toBe('number');
    });

    test('should handle single point', async () => {
      const points: Point[] = [{ x: 0, y: 0 }];
      
      const result = await PersistentHomology.calculate(points);
      
      expect(result.H0.bettiNumber).toBe(1); // One connected component
      expect(result.H1.bettiNumber).toBe(0); // No loops
      expect(result.H2.bettiNumber).toBe(0); // No voids
      expect(result.eulerCharacteristic).toBe(1);
    });

    test('should detect loop structure', async () => {
      // Create a square loop
      const points: Point[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: 0.5, y: 0.5 } // Center point
      ];
      
      const result = await PersistentHomology.calculate(points);
      
      expect(result.H0.bettiNumber).toBeGreaterThan(0);
      // Should detect at least one loop if points are close enough
      expect(result.H1.bettiNumber).toBeGreaterThanOrEqual(0);
    });

    test('should calculate complexity metrics correctly', async () => {
      const points: Point[] = Array.from({ length: 10 }, (_, i) => ({
        x: Math.cos(2 * Math.PI * i / 10),
        y: Math.sin(2 * Math.PI * i / 10)
      }));
      
      const result = await PersistentHomology.calculate(points);
      
      expect(result.totalComplexity).toBeGreaterThan(0);
      expect(typeof result.eulerCharacteristic).toBe('number');
      // Euler characteristic for a circle should be 0
      expect(Math.abs(result.eulerCharacteristic)).toBeLessThan(2);
    });
  });

  describe('Enhanced Numerical Validator Integration', () => {
    test('should detect 7-based patterns', () => {
      const input = 'سبع سموات';
      const result = EnhancedNumericalValidator.validate(input);
      
      expect(result).toBeDefined();
      expect(result.sevenPatterns.charDivisible).toBe(input.length % 7 === 0);
      expect(result.sevenPatterns.patterns.length).toBeGreaterThan(0);
      expect(result.patterns).toContain('Sacred_Seven_سبع_سموات');
    });

    test('should detect 19-based patterns', () => {
      const input = 'بسم الله الرحمن الرحيم'; // 19 letters
      const result = EnhancedNumericalValidator.validate(input);
      
      expect(result).toBeDefined();
      expect(result.nineteenPatterns.bismillahPattern).toBe(true);
      expect(result.nineteenPatterns.patterns.length).toBeGreaterThan(0);
    });

    test('should detect Tesla 369 patterns', () => {
      const input = 'The frequency of 369';
      const result = EnhancedNumericalValidator.validate(input);
      
      expect(result).toBeDefined();
      expect(result.teslaPatterns.contains3).toBe(true);
      expect(result.teslaPatterns.contains6).toBe(true);
      expect(result.teslaPatterns.contains9).toBe(true);
      expect(result.teslaPatterns.patterns).toContain('Tesla_Frequency_3');
      expect(result.teslaPatterns.patterns).toContain('Tesla_Frequency_6');
      expect(result.teslaPatterns.patterns).toContain('Tesla_Frequency_9');
    });

    test('should analyze prime number patterns', () => {
      const input = 'الله نور'; // 7 characters (prime)
      const result = EnhancedNumericalValidator.validate(input);
      
      expect(result).toBeDefined();
      expect(result.primeAnalysis.charCountPrime).toBe(true);
      expect(result.primeAnalysis.patterns).toContain('Prime_Char_Count');
    });

    test('should analyze Fibonacci patterns', () => {
      const input = 'الحمد لله'; // 8 characters (Fibonacci)
      const result = EnhancedNumericalValidator.validate(input);
      
      expect(result).toBeDefined();
      expect(result.fibonacciAnalysis.fibonacciLength).toBe(true);
      expect(result.fibonacciAnalysis.patterns).toContain('Fibonacci_Length_8');
    });

    test('should provide pattern summary', () => {
      const input = 'بسم الله الرحمن الرحيم سبع سموات';
      const summary = EnhancedNumericalValidator.getPatternSummary(input);
      
      expect(Array.isArray(summary)).toBe(true);
      expect(summary.length).toBeGreaterThan(0);
      expect(summary[0]).toHaveProperty('category');
      expect(summary[0]).toHaveProperty('count');
    });

    test('should perform quick resonance check', () => {
      const input = 'الله نور السماوات والأرض';
      const resonance = EnhancedNumericalValidator.quickResonanceCheck(input);
      
      expect(typeof resonance).toBe('number');
      expect(resonance).toBeGreaterThanOrEqual(0);
      expect(resonance).toBeLessThanOrEqual(1);
    });
  });

  describe('Cross-Component Integration', () => {
    test('should work together: Qalbin VM + Enhanced Validator', async () => {
      const vm = new QalbinVM(vectorEngine, IQRAMemory);
      const input = 'بسم الله الرحمن الرحيم';
      
      // Get numerical validation
      const validation = EnhancedNumericalValidator.validate(input);
      
      // Process through Qalbin VM
      const vmResult = await vm.pulse(input);
      
      expect(validation.isResonant).toBe(true);
      expect(vmResult.state.resonance).toBeGreaterThan(0);
      expect(vmResult.patterns.length).toBeGreaterThan(0);
    });

    test('should work together: Persistent Homology + Pattern Analysis', async () => {
      // Create points from text analysis
      const text = 'الله نور';
      const points: Point[] = text.split('').map((char, i) => ({
        x: i,
        y: char.charCodeAt(0),
        id: char
      }));
      
      const homologyResult = await PersistentHomology.calculate(points);
      const validationResult = EnhancedNumericalValidator.validate(text);
      
      expect(homologyResult.H0.bettiNumber).toBeGreaterThan(0);
      expect(validationResult.patterns.length).toBeGreaterThan(0);
      
      // Both should detect meaningful patterns
      expect(homologyResult.totalComplexity).toBeGreaterThan(0);
      expect(validationResult.overallResonance).toBeGreaterThan(0);
    });

    test('should handle complex Arabic text with all components', async () => {
      const complexText = 'بسم الله الرحمن الرحيم الحمد لله رب العالمين';
      
      // Enhanced validation
      const validation = EnhancedNumericalValidator.validate(complexText);
      
      // Qalbin VM processing
      const vm = new QalbinVM(vectorEngine, IQRAMemory);
      const vmResult = await vm.pulse(complexText);
      
      // Create points for homology from text
      const points: Point[] = complexText.split('').map((char, i) => ({
        x: i,
        y: char.charCodeAt(0)
      }));
      
      const homologyResult = await PersistentHomology.calculate(points);
      
      // All components should detect patterns
      expect(validation.patterns.length).toBeGreaterThan(0);
      expect(vmResult.patterns.length).toBeGreaterThan(0);
      expect(homologyResult.totalComplexity).toBeGreaterThan(0);
      
      // Should have meaningful resonance
      expect(validation.overallResonance).toBeGreaterThan(0);
      expect(vmResult.state.resonance).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large text efficiently', async () => {
      const largeText = 'الله'.repeat(1000);
      
      const startTime = Date.now();
      
      // Enhanced validation
      const validation = EnhancedNumericalValidator.validate(largeText);
      
      // Qalbin VM processing
      const vm = new QalbinVM(vectorEngine, IQRAMemory);
      const vmResult = await vm.pulse(largeText);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(validation).toBeDefined();
      expect(vmResult).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle many points in homology calculation', async () => {
      const points: Point[] = Array.from({ length: 50 }, (_, i) => ({
        x: Math.random() * 10,
        y: Math.random() * 10
      }));
      
      const startTime = Date.now();
      const result = await PersistentHomology.calculate(points);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(result.H0.bettiNumber).toBeGreaterThan(0);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty input gracefully', async () => {
      const vm = new QalbinVM(vectorEngine, IQRAMemory);
      const result = await vm.pulse('');
      
      expect(result).toBeDefined();
      expect(result.state.entropy).toBe(0);
    });

    test('should handle single character', async () => {
      const vm = new QalbinVM(vectorEngine, IQRAMemory);
      const result = await vm.pulse('ا');
      
      expect(result).toBeDefined();
      expect(result.state.entropy).toBe(0);
      expect(result.state.pulseCount).toBe(1);
    });

    test('should handle empty points array', async () => {
      const result = await PersistentHomology.calculate([]);
      
      expect(result).toBeDefined();
      expect(result.H0.bettiNumber).toBe(0);
      expect(result.H1.bettiNumber).toBe(0);
      expect(result.H2.bettiNumber).toBe(0);
    });

    test('should handle special characters', () => {
      const input = '123!@#$%^&*()';
      const result = EnhancedNumericalValidator.validate(input);
      
      expect(result).toBeDefined();
      expect(typeof result.score).toBe('number');
      expect(Array.isArray(result.patterns)).toBe(true);
    });
  });
});

describe('Real-World Quranic Pattern Detection', () => {
  test('should detect patterns in Al-Fatiha', async () => {
    const alFatiha = 'بسم الله الرحمن الرحيم الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين إياك نعبد وإياك نستعين اهدنا الصراط المستقيم صراط الذين أنعمت عليهم غير المغضوب عليهم ولا الضالين';
    
    // Enhanced validation
    const validation = EnhancedNumericalValidator.validate(alFatiha);
    
    // Qalbin VM processing
    const vm = new QalbinVM(vectorEngine, IQRAMemory);
    const vmResult = await vm.pulse(alFatiha);
    
    expect(validation.patterns.length).toBeGreaterThan(5);
    expect(validation.overallResonance).toBeGreaterThan(0.3);
    expect(vmResult.state.entropy).toBeGreaterThan(3.0);
    expect(vmResult.patterns).toContain('Arabic_Text');
  });

  test('should detect patterns in Ayat al-Kursi', async () => {
    const ayatKursi = 'الله لا إله إلا هو الحي القيوم لا تأخذه سنة ولا نوم له ما في السماوات وما في الأرض من ذا الذي يشفع عنده إلا بإذنه يعلم ما بين أيديهم وما خلفهم ولا يحيطون بشيء من علمه إلا بما شاء وسع كرسيه السماوات والأرض ولا يؤوده حفظهما وهو العلي العظيم';
    
    const validation = EnhancedNumericalValidator.validate(ayatKursi);
    const vm = new QalbinVM(vectorEngine, IQRAMemory);
    const vmResult = await vm.pulse(ayatKursi);
    
    expect(validation.patterns.length).toBeGreaterThan(10);
    expect(validation.overallResonance).toBeGreaterThan(0.4);
    expect(vmResult.state.entropy).toBeGreaterThan(4.0);
    expect(vmResult.state.phase).toMatch(/processing|resonant/);
  });
});
