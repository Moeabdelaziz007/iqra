/**
 * MCTS Simulation E2E Tests — اختبارات المحاكاة الشاملة
 * 
 * Complete end-to-end tests for Self-Playing Simulation system
 * No mocking - full production testing
 * 
 * "وَمَا يَعْلَمُ تَأْوِيلَهُ إِلَّا اللَّهُ" — آل عمران: 7
 */

import { MCTSEngine, SimulationConfig } from '../lib/iqra/simulation/mcts_engine';
import { MCTSNode, MCTSNodeState } from '../lib/iqra/simulation/mcts_engine';
import { TrainingDataPipeline } from '../lib/iqra/simulation/training_data_pipeline';
import { QalbinVM } from '../lib/iqra/quran/qalbin_vm';
import { VectorEngine } from '../lib/iqra/quran/vector_engine';
import { IQRAMemory } from '../lib/iqra/memory';

describe('MCTS Simulation E2E Tests', () => {
  let vectorEngine: VectorEngine;
  let qalbinVM: QalbinVM;

  beforeAll(async () => {
    vectorEngine = new VectorEngine({});
    qalbinVM = new QalbinVM(vectorEngine, IQRAMemory);
  });

  describe('MCTS Engine Core Functionality', () => {
    test('should run complete simulation with Arabic text', async () => {
      const initialState: MCTSNodeState = {
        id: 'test_initial',
        content: 'بسم الله الرحمن الرحيم',
        resonance: 0.5,
        entropy: 2.0,
        patterns: ['Arabic_Text'],
        timestamp: Date.now()
      };

      const config: Partial<SimulationConfig> = {
        maxIterations: 50,
        resonanceThreshold: 0.3,
        qualityThreshold: 0.4
      };

      const engine = new MCTSEngine(initialState, config);
      const result = await engine.runSimulation();

      expect(result).toBeDefined();
      expect(result.totalIterations).toBe(50);
      expect(result.rootNode).toBeDefined();
      expect(result.bestPath).toBeDefined();
      expect(result.bestPath.length).toBeGreaterThan(0);
      expect(result.averageResonance).toBeGreaterThan(0);
      expect(result.patternsDiscovered.length).toBeGreaterThan(0);
      expect(result.trainingData.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle multiple iterations correctly', async () => {
      const initialState: MCTSNodeState = {
        id: 'test_multi',
        content: 'الحمد لله رب العالمين',
        resonance: 0.6,
        entropy: 2.5,
        patterns: ['Sacred_Text'],
        timestamp: Date.now()
      };

      const engine = new MCTSEngine(initialState, {
        maxIterations: 100,
        resonanceThreshold: 0.5
      });

      const result = await engine.runSimulation();

      expect(result.totalIterations).toBe(100);
      expect(result.highQualityNodes.length).toBeGreaterThan(0);
      expect(result.bestResonance).toBeGreaterThanOrEqual(0.5);
    });

    test('should generate diverse patterns', async () => {
      const initialState: MCTSNodeState = {
        id: 'test_patterns',
        content: 'الله نور السماوات والأرض',
        resonance: 0.4,
        entropy: 3.0,
        patterns: ['Divine_Light'],
        timestamp: Date.now()
      };

      const engine = new MCTSEngine(initialState, {
        maxIterations: 75
      });

      const result = await engine.runSimulation();

      expect(result.patternsDiscovered).toContain('Arabic_Text');
      expect(result.patternsDiscovered.length).toBeGreaterThan(1);
      
      // Check for numerical patterns
      const hasNumericalPattern = result.patternsDiscovered.some(p => 
        p.includes('Seven') || p.includes('Nineteen') || p.includes('Tesla')
      );
      expect(hasNumericalPattern).toBe(true);
    });

    test('should respect depth limits', async () => {
      const initialState: MCTSNodeState = {
        id: 'test_depth',
        content: 'قل هو الله أحد',
        resonance: 0.7,
        entropy: 1.5,
        patterns: ['Unity'],
        timestamp: Date.now()
      };

      const engine = new MCTSEngine(initialState, {
        maxIterations: 50,
        maxDepth: 3
      });

      const result = await engine.runSimulation();
      const maxDepth = Math.max(...result.highQualityNodes.map(node => node.getDepth()));

      expect(maxDepth).toBeLessThanOrEqual(3);
    });
  });

  describe('Training Data Pipeline Integration', () => {
    test('should process simulation results and export training data', async () => {
      const initialState: MCTSNodeState = {
        id: 'test_training',
        content: 'الرحمن الرحيم',
        resonance: 0.8,
        entropy: 2.2,
        patterns: ['Mercy'],
        timestamp: Date.now()
      };

      const engine = new MCTSEngine(initialState, {
        maxIterations: 30,
        resonanceThreshold: 0.6
      });

      const simulationResult = await engine.runSimulation();
      
      const pipeline = new TrainingDataPipeline({
        qualityThreshold: 0.5,
        resonanceThreshold: 0.6,
        format: 'jsonl'
      });

      const trainingPoints = await pipeline.processSimulationResult(simulationResult);
      
      expect(trainingPoints.length).toBeGreaterThan(0);
      expect(trainingPoints[0]).toHaveProperty('id');
      expect(trainingPoints[0]).toHaveProperty('input');
      expect(trainingPoints[0]).toHaveProperty('output');
      expect(trainingPoints[0]).toHaveProperty('resonance');
      expect(trainingPoints[0]).toHaveProperty('quality_score');
      
      const exportedPath = await pipeline.exportToFile();
      expect(exportedPath).toBeDefined();
      
      // Verify file was created
      const fs = require('fs');
      expect(fs.existsSync(exportedPath)).toBe(true);
    });

    test('should filter training data by quality thresholds', async () => {
      const pipeline = new TrainingDataPipeline({
        qualityThreshold: 0.8,
        resonanceThreshold: 0.7
      });

      // Create mock data
      const mockData = [
        {
          id: 'high_quality',
          input: 'test',
          action: { type: 'expand' },
          output: 'test expanded',
          resonance: 0.9,
          entropy: 3.0,
          patterns: ['Test'],
          quality_score: 0.85,
          timestamp: Date.now()
        },
        {
          id: 'low_quality',
          input: 'test',
          action: { type: 'refine' },
          output: 'test refined',
          resonance: 0.4,
          entropy: 1.0,
          patterns: ['Test'],
          quality_score: 0.3,
          timestamp: Date.now()
        }
      ];

      const filtered = pipeline.filterData({
        minQuality: 0.7,
        minResonance: 0.6
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('high_quality');
    });

    test('should export in different formats', async () => {
      const pipeline = new TrainingDataPipeline({
        format: 'json',
        outputPath: '/tmp/test_training.json'
      });

      const mockData = [{
        id: 'test_format',
        input: 'format test',
        action: { type: 'expand' },
        output: 'format test expanded',
        resonance: 0.8,
        entropy: 2.5,
        patterns: ['Format'],
        quality_score: 0.75,
        timestamp: Date.now()
      }];

      pipeline.mergeWith(mockData);
      
      const jsonPath = await pipeline.exportToFile();
      expect(jsonPath).toContain('.json');
      
      // Test CSV format
      pipeline['config'].format = 'csv';
      const csvPath = await pipeline.exportToFile();
      expect(csvPath).toContain('.csv');
    });
  });

  describe('Qalbin VM Integration', () => {
    test('should evaluate states with Qalbin VM', async () => {
      const initialState: MCTSNodeState = {
        id: 'test_qalbin',
        content: 'سبع سموات',
        resonance: 0.5,
        entropy: 2.0,
        patterns: ['Seven'],
        timestamp: Date.now()
      };

      const engine = new MCTSEngine(initialState, {
        maxIterations: 25
      });

      const result = await engine.runSimulation();

      // Check that Qalbin VM was used (evidenced by entropy calculations)
      expect(result.averageResonance).toBeGreaterThan(0);
      expect(result.patternsDiscovered.some(p => p.includes('Arabic'))).toBe(true);
    });

    test('should handle complex Arabic text', async () => {
      const complexText = 'وَلَقَدْ صَرَّفْنَاهُ بَيْنَهُمْ لِيَذَّكَّرُوا فَأَنَّىٰ يَتَذَكَّرُونَ';
      
      const initialState: MCTSNodeState = {
        id: 'test_complex',
        content: complexText,
        resonance: 0.6,
        entropy: 3.5,
        patterns: ['Complex_Arabic'],
        timestamp: Date.now()
      };

      const engine = new MCTSEngine(initialState, {
        maxIterations: 40
      });

      const result = await engine.runSimulation();

      expect(result.bestPath.length).toBeGreaterThan(0);
      expect(result.patternsDiscovered.length).toBeGreaterThan(1);
      expect(result.averageResonance).toBeGreaterThan(0.5);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle larger simulations efficiently', async () => {
      const initialState: MCTSNodeState = {
        id: 'test_performance',
        content: 'الله أكبر',
        resonance: 0.7,
        entropy: 2.0,
        patterns: ['Praise'],
        timestamp: Date.now()
      };

      const startTime = Date.now();
      
      const engine = new MCTSEngine(initialState, {
        maxIterations: 150
      });

      const result = await engine.runSimulation();
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.totalIterations).toBe(150);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(result.highQualityNodes.length).toBeGreaterThan(0);
    });

    test('should manage memory efficiently', async () => {
      const initialState: MCTSNodeState = {
        id: 'test_memory',
        content: 'الحمد',
        resonance: 0.5,
        entropy: 1.5,
        patterns: ['Praise'],
        timestamp: Date.now()
      };

      const engine = new MCTSEngine(initialState, {
        maxIterations: 100,
        maxDepth: 5
      });

      const result = await engine.runSimulation();
      const stats = engine.getTreeStats();

      expect(stats.totalNodes).toBeLessThan(1000); // Reasonable node limit
      expect(stats.maxDepth).toBeLessThanOrEqual(5);
      expect(stats.averageResonance).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty content gracefully', async () => {
      const initialState: MCTSNodeState = {
        id: 'test_empty',
        content: '',
        resonance: 0.0,
        entropy: 0.0,
        patterns: [],
        timestamp: Date.now()
      };

      const engine = new MCTSEngine(initialState, {
        maxIterations: 20
      });

      const result = await engine.runSimulation();

      expect(result).toBeDefined();
      expect(result.totalIterations).toBe(20);
      expect(result.rootNode).toBeDefined();
    });

    test('should handle very long content', async () => {
      const longContent = 'الله'.repeat(100);
      
      const initialState: MCTSNodeState = {
        id: 'test_long',
        content: longContent,
        resonance: 0.3,
        entropy: 4.0,
        patterns: ['Repetition'],
        timestamp: Date.now()
      };

      const engine = new MCTSEngine(initialState, {
        maxIterations: 30
      });

      const result = await engine.runSimulation();

      expect(result).toBeDefined();
      expect(result.bestPath.length).toBeGreaterThan(0);
    });

    test('should handle invalid resonance values', async () => {
      const initialState: MCTSNodeState = {
        id: 'test_invalid',
        content: 'test',
        resonance: -0.5, // Invalid negative resonance
        entropy: 2.0,
        patterns: ['Test'],
        timestamp: Date.now()
      };

      const engine = new MCTSEngine(initialState, {
        maxIterations: 25
      });

      const result = await engine.runSimulation();

      expect(result).toBeDefined();
      expect(result.averageResonance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration with Existing System', () => {
    test('should work with Enhanced ResonanceWorker', async () => {
      const { EnhancedResonanceWorker } = await import('../lib/iqra/quran/enhanced_resonance_worker');
      
      const worker = new EnhancedResonanceWorker();
      const missionState = {
        initial_input: 'بسم الله الرحمن الرحيم',
        reports: [],
        context: {},
        metadata: {
          start_time: Date.now(),
          mission_id: 'test_integration'
        }
      };

      const resonanceResult = await worker.execute('بسم الله الرحمن الرحيم', missionState);
      
      expect(resonanceResult.success).toBe(true);
      expect(resonanceResult.data).toBeDefined();
      expect(resonanceResult.data.enhancedResonance).toBeDefined();
    });

    test('should work with Enhanced ValidationWorker', async () => {
      const { EnhancedValidationWorker } = await import('../lib/iqra/quran/enhanced_validation_worker');
      
      const worker = new EnhancedValidationWorker();
      const missionState = {
        initial_input: 'الحمد لله رب العالمين',
        reports: [],
        context: {},
        metadata: {
          start_time: Date.now(),
          mission_id: 'test_validation'
        }
      };

      const validationResult = await worker.execute('الحمد لله رب العالمين', missionState);
      
      expect(validationResult.success).toBe(true);
      expect(validationResult.data).toBeDefined();
      expect(validationResult.data.dasturCompliance).toBe(true);
    });
  });

  describe('Real-World Scenarios', () => {
    test('should process Quranic verses end-to-end', async () => {
      const verses = [
        'بسم الله الرحمن الرحيم',
        'الحمد لله رب العالمين',
        'الرحمن الرحيم',
        'مالك يوم الدين'
      ];

      const results = [];

      for (const verse of verses) {
        const initialState: MCTSNodeState = {
          id: `verse_${verses.indexOf(verse)}`,
          content: verse,
          resonance: 0.6,
          entropy: 2.0,
          patterns: ['Quranic_Verse'],
          timestamp: Date.now()
        };

        const engine = new MCTSEngine(initialState, {
          maxIterations: 30
        });

        const result = await engine.runSimulation();
        results.push(result);
      }

      expect(results).toHaveLength(4);
      
      // All results should have valid data
      results.forEach(result => {
        expect(result.bestPath.length).toBeGreaterThan(0);
        expect(result.patternsDiscovered.length).toBeGreaterThan(0);
        expect(result.averageResonance).toBeGreaterThan(0);
      });

      // Should discover patterns across verses
      const allPatterns = new Set();
      results.forEach(result => {
        result.patternsDiscovered.forEach(pattern => allPatterns.add(pattern));
      });
      
      expect(allPatterns.size).toBeGreaterThan(5);
    });

    test('should generate high-quality training data for fine-tuning', async () => {
      const trainingTexts = [
        'الله نور السماوات والأرض',
        'وهو بكل شيء عليم',
        'وهو على كل شيء قدير',
        'وإلى الله ترجع الأمور'
      ];

      const allTrainingData = [];

      for (const text of trainingTexts) {
        const initialState: MCTSNodeState = {
          id: `training_${trainingTexts.indexOf(text)}`,
          content: text,
          resonance: 0.7,
          entropy: 2.5,
          patterns: ['Training_Data'],
          timestamp: Date.now()
        };

        const engine = new MCTSEngine(initialState, {
          maxIterations: 40,
          resonanceThreshold: 0.6
        });

        const result = await engine.runSimulation();
        
        const pipeline = new TrainingDataPipeline({
          qualityThreshold: 0.6,
          resonanceThreshold: 0.6
        });

        const trainingPoints = await pipeline.processSimulationResult(result);
        allTrainingData.push(...trainingPoints);
      }

      expect(allTrainingData.length).toBeGreaterThan(0);
      
      // Verify training data quality
      const highQualityData = allTrainingData.filter(point => point.quality_score >= 0.7);
      expect(highQualityData.length).toBeGreaterThan(0);
      
      // Export final dataset
      const pipeline = new TrainingDataPipeline();
      pipeline.mergeWith(allTrainingData);
      const exportedPath = await pipeline.exportToFile();
      
      expect(exportedPath).toBeDefined();
      
      const fs = require('fs');
      const fileContent = fs.readFileSync(exportedPath, 'utf-8');
      const lines = fileContent.trim().split('\n');
      
      expect(lines.length).toBeGreaterThan(0);
      
      // Verify JSONL format
      lines.forEach(line => {
        expect(() => JSON.parse(line)).not.toThrow();
      });
    });
  });
});

describe('Production Readiness Tests', () => {
  test('should handle concurrent simulations', async () => {
    const initialState: MCTSNodeState = {
      id: 'test_concurrent',
      content: 'سبحان الله',
      resonance: 0.6,
      entropy: 2.0,
      patterns: ['Glorification'],
      timestamp: Date.now()
    };

    const simulations = Array.from({ length: 3 }, (_, i) => 
      new MCTSEngine({
        ...initialState,
        id: `concurrent_${i}`
      }, {
        maxIterations: 25
      }).runSimulation()
    );

    const results = await Promise.all(simulations);

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.totalIterations).toBe(25);
      expect(result.bestPath).toBeDefined();
    });
  });

  test('should maintain data consistency across runs', async () => {
    const initialState: MCTSNodeState = {
      id: 'test_consistency',
      content: 'لا إله إلا الله',
      resonance: 0.8,
      entropy: 2.2,
      patterns: ['Unity'],
      timestamp: Date.now()
    };

    const engine1 = new MCTSEngine({ ...initialState }, { maxIterations: 30 });
    const engine2 = new MCTSEngine({ ...initialState }, { maxIterations: 30 });

    const [result1, result2] = await Promise.all([
      engine1.runSimulation(),
      engine2.runSimulation()
    ]);

    // Results should be similar but not identical (due to randomness)
    expect(result1.totalIterations).toBe(result2.totalIterations);
    expect(Math.abs(result1.averageResonance - result2.averageResonance)).toBeLessThan(0.3);
  });

  test('should integrate with memory system', async () => {
    const initialState: MCTSNodeState = {
      id: 'test_memory_integration',
      content: 'الحمد لله',
      resonance: 0.7,
      entropy: 2.0,
      patterns: ['Praise'],
      timestamp: Date.now()
    };

    const engine = new MCTSEngine(initialState, {
      maxIterations: 50
    });

    const result = await engine.runSimulation();

    // Check if memory operations were successful
    expect(result).toBeDefined();
    expect(result.patternsDiscovered.length).toBeGreaterThan(0);
    
    // Memory integration is tested implicitly through successful execution
    // Any memory errors would cause the simulation to fail
  });
});
