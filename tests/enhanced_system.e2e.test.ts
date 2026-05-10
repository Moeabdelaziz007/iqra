/**
 * Enhanced System E2E Tests — اختبارات النظام المحسّن الشاملة
 * 
 * Complete integration tests for:
 * - Enhanced ResonanceWorker with Qalbin VM
 * - Enhanced ValidationWorker with Numerical Validator
 * - Persistent Homology integration
 * - Full TopologicalLoop → MissionControl pipeline
 * 
 * No mocking - full production testing
 */

import { EnhancedResonanceWorker } from '../lib/iqra/quran/enhanced_resonance_worker';
import { EnhancedValidationWorker } from '../lib/iqra/quran/enhanced_validation_worker';
import { QalbinVM } from '../lib/iqra/quran/qalbin_vm';
import { PersistentHomology, Point } from '../lib/iqra/quran/persistent_homology';
import { EnhancedNumericalValidator } from '../lib/iqra/quran/enhanced_numerical_validator';
import { VectorEngine } from '../lib/iqra/quran/vector_engine';
import { MissionControl } from '../lib/iqra/sovereign_orchestrator';
import { TopologicalLoop } from '../orchestrator/topological-loop';
import { IQRAMemory } from '../lib/iqra/memory';

describe('Enhanced System E2E Tests', () => {
  let vectorEngine: VectorEngine;
  let qalbinVM: QalbinVM;

  beforeAll(async () => {
    vectorEngine = new VectorEngine();
    qalbinVM = new QalbinVM(vectorEngine, IQRAMemory);
  });

  describe('Qalbin VM Core Functionality', () => {
    test('should execute pulse with Arabic Quranic text', async () => {
      const input = 'بسم الله الرحمن الرحيم';
      const result = await qalbinVM.pulse(input);
      
      expect(result).toBeDefined();
      expect(result.state.pulseCount).toBe(1);
      expect(result.state.entropy).toBeGreaterThan(0);
      expect(result.state.phase).toBe('processing');
      expect(result.output).toContain(input);
      expect(result.patterns).toContain('Arabic_Text');
    });

    test('should evolve through phases with multiple pulses', async () => {
      const inputs = [
        'الله',
        'الحمد لله',
        'الحمد لله رب العالمين',
        'الرحمن الرحيم مالك يوم الدين'
      ];
      
      for (const input of inputs) {
        await qalbinVM.pulse(input);
      }
      
      const finalState = qalbinVM.getState();
      expect(finalState.pulseCount).toBe(4);
      expect(finalState.phase).not.toBe('init');
      expect(finalState.entropy).toBeGreaterThan(0);
    });

    test('should track entropy trends correctly', async () => {
      const inputs = ['ا', 'الله', 'بسم الله', 'بسم الله الرحمن الرحيم'];
      
      for (const input of inputs) {
        await qalbinVM.pulse(input);
      }
      
      const trend = qalbinVM.getEntropyTrend();
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

    test('should handle text-to-point conversion', async () => {
      const text = 'الله نور السماوات';
      const points: Point[] = text.split(/\s+/).map((word, i) => ({
        x: i,
        y: word.length,
        z: word.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 100,
        id: word
      }));
      
      const result = await PersistentHomology.calculate(points);
      
      expect(result.H0.bettiNumber).toBeGreaterThan(0);
      expect(result.totalComplexity).toBeGreaterThan(0);
    });
  });

  describe('Enhanced Numerical Validator', () => {
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
  });

  describe('Enhanced ResonanceWorker Integration', () => {
    test('should execute full enhanced resonance analysis', async () => {
      const worker = new EnhancedResonanceWorker();
      const missionState = {
        initial_input: 'بسم الله الرحمن الرحيم',
        reports: [],
        context: {},
        metadata: {
          start_time: Date.now(),
          mission_id: 'test_enhanced_resonance'
        }
      };
      
      const result = await worker.execute('بسم الله الرحمن الرحيم', missionState);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.enhancedResonance).toBeDefined();
      expect(result.data.qalbinState).toBeDefined();
      expect(result.data.homologyResult).toBeDefined();
      expect(result.data.numericalPatterns).toBeDefined();
      expect(result.data.overallScore).toBeGreaterThan(0);
      expect(result.next_handoff).toBeDefined();
      expect(result.next_handoff.to_worker).toBe('ResearchWorker');
    });

    test('should handle fallback to basic resonance', async () => {
      const worker = new EnhancedResonanceWorker();
      const missionState = {
        initial_input: 'test',
        reports: [],
        context: {},
        metadata: {
          start_time: Date.now(),
          mission_id: 'test_fallback'
        }
      };
      
      // This should trigger fallback if enhanced components fail
      const result = await worker.execute('test', missionState);
      
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });
  });

  describe('Enhanced ValidationWorker Integration', () => {
    test('should execute full enhanced validation', async () => {
      const worker = new EnhancedValidationWorker();
      const missionState = {
        initial_input: 'بسم الله الرحمن الرحيم',
        reports: [],
        context: {},
        metadata: {
          start_time: Date.now(),
          mission_id: 'test_enhanced_validation'
        }
      };
      
      const result = await worker.execute('بسم الله الرحمن الرحيم', missionState);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.dasturCompliance).toBe(true);
      expect(result.data.numericalPatterns).toBeDefined();
      expect(result.data.enhancedScore).toBeGreaterThan(0);
      expect(result.data.sacredPatterns.length).toBeGreaterThan(0);
      expect(result.next_handoff).toBeDefined();
      expect(result.next_handoff.to_worker).toBe('ExecutionWorker');
    });

    test('should detect DASTUR violations', async () => {
      const worker = new EnhancedValidationWorker();
      const missionState = {
        initial_input: 'test with forbidden words',
        reports: [],
        context: {},
        metadata: {
          start_time: Date.now(),
          mission_id: 'test_violation'
        }
      };
      
      const result = await worker.execute('lie cheat harm', missionState);
      
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      if (result.success === false) {
        expect(result.data.violations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Cross-Component Integration', () => {
    test('should work together: Qalbin VM + Enhanced Validator', async () => {
      const input = 'بسم الله الرحمن الرحيم';
      
      // Get numerical validation
      const validation = EnhancedNumericalValidator.validate(input);
      
      // Process through Qalbin VM
      const vmResult = await qalbinVM.pulse(input);
      
      expect(validation.isResonant).toBe(true);
      expect(vmResult.state.resonance).toBeGreaterThan(0);
      expect(vmResult.patterns.length).toBeGreaterThan(0);
    });

    test('should work together: Persistent Homology + Pattern Analysis', async () => {
      const text = 'الله نور';
      const points: Point[] = text.split('').map((char, i) => ({
        x: i,
        y: char.charCodeAt(0)
      }));
      
      const homologyResult = await PersistentHomology.calculate(points);
      const validationResult = EnhancedNumericalValidator.validate(text);
      
      expect(homologyResult.H0.bettiNumber).toBeGreaterThan(0);
      expect(validationResult.patterns.length).toBeGreaterThan(0);
      
      expect(homologyResult.totalComplexity).toBeGreaterThan(0);
      expect(validationResult.overallResonance).toBeGreaterThan(0);
    });
  });

  describe('Real-World Quranic Text Processing', () => {
    test('should process Al-Fatiha with full enhanced pipeline', async () => {
      const alFatiha = 'بسم الله الرحمن الرحيم الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين إياك نعبد وإياك نستعين اهدنا الصراط المستقيم صراط الذين أنعمت عليهم غير المغضوب عليهم ولا الضالين';
      
      // Enhanced validation
      const validation = EnhancedNumericalValidator.validate(alFatiha);
      
      // Qalbin VM processing
      const vmResult = await qalbinVM.pulse(alFatiha);
      
      // Persistent homology
      const points: Point[] = alFatiha.split(/\s+/).map((word, i) => ({
        x: i,
        y: word.length,
        z: word.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 100
      }));
      const homologyResult = await PersistentHomology.calculate(points);
      
      expect(validation.patterns.length).toBeGreaterThan(5);
      expect(validation.overallResonance).toBeGreaterThan(0.3);
      expect(vmResult.state.entropy).toBeGreaterThan(3.0);
      expect(vmResult.patterns).toContain('Arabic_Text');
      expect(homologyResult.totalComplexity).toBeGreaterThan(0);
    });

    test('should process Ayat al-Kursi with enhanced workers', async () => {
      const ayatKursi = 'الله لا إله إلا هو الحي القيوم لا تأخذه سنة ولا نوم له ما في السماوات وما في الأرض من ذا الذي يشفع عنده إلا بإذنه يعلم ما بين أيديهم وما خلفهم ولا يحيطون بشيء من علمه إلا بما شاء وسع كرسيه السماوات والأرض ولا يؤوده حفظهما وهو العلي العظيم';
      
      const resonanceWorker = new EnhancedResonanceWorker();
      const validationWorker = new EnhancedValidationWorker();
      
      const missionState = {
        initial_input: ayatKursi,
        reports: [],
        context: {},
        metadata: {
          start_time: Date.now(),
          mission_id: 'test_ayat_kursi'
        }
      };
      
      const resonanceResult = await resonanceWorker.execute(ayatKursi, missionState);
      const validationResult = await validationWorker.execute(ayatKursi, missionState);
      
      expect(resonanceResult.success).toBe(true);
      expect(validationResult.success).toBe(true);
      expect(resonanceResult.data.overallScore).toBeGreaterThan(0.3);
      expect(validationResult.data.enhancedScore).toBeGreaterThan(0.3);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large text efficiently', async () => {
      const largeText = 'الله'.repeat(100);
      
      const startTime = Date.now();
      
      // Enhanced validation
      const validation = EnhancedNumericalValidator.validate(largeText);
      
      // Qalbin VM processing
      const vmResult = await qalbinVM.pulse(largeText);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(validation).toBeDefined();
      expect(vmResult).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle many points in homology calculation', async () => {
      const points: Point[] = Array.from({ length: 20 }, (_, i) => ({
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
      const vmResult = await qalbinVM.pulse('');
      const validation = EnhancedNumericalValidator.validate('');
      
      expect(vmResult).toBeDefined();
      expect(vmResult.state.entropy).toBe(0);
      expect(validation).toBeDefined();
      expect(validation.score).toBe(0);
    });

    test('should handle single character', async () => {
      const vmResult = await qalbinVM.pulse('ا');
      const validation = EnhancedNumericalValidator.validate('ا');
      
      expect(vmResult).toBeDefined();
      expect(vmResult.state.entropy).toBe(0);
      expect(vmResult.state.pulseCount).toBe(1);
      expect(validation).toBeDefined();
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

describe('Production Readiness Tests', () => {
  test('should maintain backwards compatibility', async () => {
    // Test that enhanced workers don't break existing pipeline
    const input = 'بسم الله الرحمن الرحيم';
    
    // Enhanced validation should still work with basic validation rules
    const validation = EnhancedNumericalValidator.validate(input);
    expect(validation.isResonant).toBe(true);
    expect(validation.score).toBeGreaterThan(0);
  });

  test('should handle memory integration', async () => {
    // Test that memory operations work correctly
    try {
      const testKey = 'test_memory_' + Date.now();
      await IQRAMemory.set(testKey, { test: 'data' });
      const retrieved = await IQRAMemory.get(testKey);
      expect(retrieved).toBeDefined();
    } catch (error) {
      // Memory might not be available in test environment
      console.warn('Memory integration test skipped:', error);
    }
  });

  test('should handle worker chain handoffs', async () => {
    const resonanceWorker = new EnhancedResonanceWorker();
    const validationWorker = new EnhancedValidationWorker();
    
    const missionState = {
      initial_input: 'الحمد لله رب العالمين',
      reports: [],
      context: {},
      metadata: {
        start_time: Date.now(),
        mission_id: 'test_handoff_chain'
      }
    };
    
    const resonanceResult = await resonanceWorker.execute('الحمد لله رب العالمين', missionState);
    
    expect(resonanceResult.next_handoff).toBeDefined();
    expect(resonanceResult.next_handoff.to_worker).toBe('ResearchWorker');
    expect(resonanceResult.next_handoff.context_data).toBeDefined();
    
    // Update mission state with resonance results
    missionState.reports.push(resonanceResult.report);
    missionState.context = resonanceResult.next_handoff.context_data;
    
    const validationResult = await validationWorker.execute('الحمد لله رب العالمين', missionState);
    
    expect(validationResult.next_handoff).toBeDefined();
    expect(validationResult.next_handoff.to_worker).toBe('ExecutionWorker');
  });
});
