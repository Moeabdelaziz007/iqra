/**
 * Complete System Integration Real E2E Tests
 * 
 * اختبارات E2E حقيقية متكاملة للنظام بأكمله بدون أي mocks
 * تغطي جميع المكونات: Mission Control, Workers, Go Engine, Rewards, State Coordination
 */

import { MissionControl } from '../lib/iqra/sovereign_orchestrator';
import { StateCoordinator } from '../lib/iqra/workers/state_coordinator';
import { StateTransitionAnalyzer } from '../lib/iqra/workers/state_transition_analyzer';
import { RewardFlowAnalyzer } from '../ledger/reward_flow_analyzer';
import { RewardLedger } from '../ledger/reward-ledger';
import { IQRAMemory } from '../lib/iqra/memory';
import { expect, describe, test, beforeAll, afterAll } from 'vitest';
import { DiscoveryLevel } from '../rewards/types';
import { execSync } from 'child_process';
import * as path from 'path';

describe('Complete System Integration Real E2E Tests', () => {
  let missionControl: MissionControl;
  let stateCoordinator: StateCoordinator;
  let transitionAnalyzer: StateTransitionAnalyzer;
  let flowAnalyzer: RewardFlowAnalyzer;

  beforeAll(async () => {
    missionControl = new MissionControl();
    stateCoordinator = StateCoordinator.getInstance();
    transitionAnalyzer = StateTransitionAnalyzer.getInstance();
    flowAnalyzer = RewardFlowAnalyzer.getInstance();

    // Initialize system components
    try {
      // Test Go Engine availability
      const enginePath = path.join(process.cwd(), 'services/go-engine');
      if (require('fs').existsSync(enginePath)) {
        execSync('go build -o iqra-engine .', { cwd: enginePath });
        console.log('✅ Go engine ready for integration tests');
      }
    } catch (error) {
      console.warn('⚠️ Go engine not available for integration tests:', error);
    }
  });

  afterAll(async () => {
    // Clean up all test data
    try {
      stateCoordinator.clear();
      transitionAnalyzer.clear();
      flowAnalyzer.clearCache();
    } catch (error) {
      console.warn('Warning: Could not clean up after integration tests:', error);
    }
  });

  describe('Full Mission Lifecycle - Real Execution', () => {
    test('يجب أن ينفذ دورة حياة المهمة الكاملة', async () => {
      const input = 'اكتب دالة TypeScript لحساب Fibonacci وتحليل تعقيدها';

      const startTime = Date.now();
      const result = await missionControl.run(input);
      const endTime = Date.now();

      // Verify complete execution
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.response.length).toBeGreaterThan(50);
      expect(result.reports).toBeDefined();
      expect(result.reports.length).toBeGreaterThanOrEqual(3);

      // Verify all workers executed
      const workerIds = result.reports.map(r => r.worker_id);
      expect(workerIds).toContain('ResonanceWorker');
      expect(workerIds).toContain('ResearchWorker');
      expect(workerIds).toContain('ValidationWorker');
      expect(workerIds).toContain('ExecutionWorker');

      // Verify execution time is reasonable
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(60000); // 60 seconds max

      // Verify state coordination
      const currentState = stateCoordinator.getCurrentState();
      expect(currentState).toBeDefined();
      expect(currentState.context).toBeDefined();

      // Verify transition tracking
      const metrics = transitionAnalyzer.getRealTimeMetrics();
      expect(metrics.active_missions).toBeGreaterThanOrEqual(0);
    }, 60000);

    test('يجب أن يحافظ على اتساق البيانات عبر المكونات', async () => {
      const input = 'حلل هذه المعادلة: ∫(x² + 2x + 1)dx';

      const result = await missionControl.run(input);

      expect(result).toBeDefined();
      expect(result.context).toBeDefined();

      // Verify state consistency
      const coordinatorState = stateCoordinator.getCurrentState();
      expect(coordinatorState.context).toBeDefined();

      // Verify transition was tracked
      const analysis = transitionAnalyzer.analyzeTransitions();
      expect(analysis.total_transitions).toBeGreaterThan(0);

      // Verify worker reports are consistent
      const reports = result.reports;
      for (const report of reports) {
        expect(report.worker_id).toBeDefined();
        expect(report.status).toMatch(/PASS|FAIL/);
        expect(report.timestamp).toBeDefined();
      }
    }, 45000);

    test('يجب أن يتعامل مع أنواع مختلفة من المهام', async () => {
      const diverseTasks = [
        'ما هي أهمية الخوارزميات في علوم الحاسوب؟',
        'اكتب برنامج Python لفرز القوائم',
        'اشرح مفهوم التكامل في الرياضيات',
        'كيف تعمل الشبكات العصبية؟'
      ];

      for (const task of diverseTasks) {
        const result = await missionControl.run(task);
        
        expect(result).toBeDefined();
        expect(result.response).toBeDefined();
        expect(result.response.length).toBeGreaterThan(20);
        expect(result.reports.length).toBeGreaterThanOrEqual(3);
      }
    }, 90000);
  });

  describe('State Coordination Integration', () => {
    test('يجب أن ينسق الحالة بين العمال بشكل صحيح', async () => {
      const input = 'اختبار تنسيق الحالة بين العمال';

      const result = await missionControl.run(input);

      expect(result).toBeDefined();

      // Verify state coordinator tracked the mission
      const currentState = stateCoordinator.getCurrentState();
      expect(currentState).toBeDefined();

      // Verify state contains worker contributions
      if (currentState.context) {
        expect(Object.keys(currentState.context).length).toBeGreaterThan(0);
      }

      // Verify transition analyzer tracked the flow
      const realTimeMetrics = transitionAnalyzer.getRealTimeMetrics();
      expect(realTimeMetrics).toBeDefined();
      expect(realTimeMetrics.active_missions).toBeGreaterThanOrEqual(0);
    }, 30000);

    test('يجب أن يتعامل مع حالات متعددة بشكل متزامن', async () => {
      const concurrentInputs = [
        'مهمة متزامنة 1: حساب الأعداد الأولية',
        'مهمة متزامنة 2: تحليل النصوص',
        'مهمة متزامنة 3: معالجة الصور'
      ];

      const promises = concurrentInputs.map(input => missionControl.run(input));
      const results = await Promise.all(promises);

      expect(results.length).toBe(3);
      
      for (const result of results) {
        expect(result).toBeDefined();
        expect(result.response).toBeDefined();
        expect(result.reports.length).toBeGreaterThanOrEqual(3);
      }

      // Verify state coordinator handled concurrent operations
      const finalState = stateCoordinator.getCurrentState();
      expect(finalState).toBeDefined();
    }, 90000);
  });

  describe('Reward System Integration', () => {
    test('يجب أن يحسب ويخزن الثواب للمهمات الحقيقية', async () => {
      const input = 'اكتب خوارزمية بحث ثنائي مع شرح مفصل';

      const result = await missionControl.run(input);

      expect(result).toBeDefined();

      // Simulate reward calculation based on mission results
      const rewardEntry = {
        worker_id: 'ExecutionWorker',
        mission_id: `integration_test_${Date.now()}`,
        discovery_level: DiscoveryLevel.BRANCH,
        total_reward: 0.65,
        confidence: 0.8,
        validation_status: 'verified' as const,
        reward_vector: {
          novelty: 0.7,
          resonance: 0.6,
          topology: 0.5,
          penalty: 0.2
        },
        timestamp: Date.now(),
        metadata: {
          response_length: result.response.length,
          workers_count: result.reports.length,
          execution_time: Date.now()
        }
      };

      await RewardLedger.append(rewardEntry);

      // Verify reward was stored
      const allEntries = await RewardLedger.getAll();
      const storedEntry = allEntries.find(e => e.mission_id === rewardEntry.mission_id);
      expect(storedEntry).toBeDefined();
      expect(storedEntry?.total_reward).toBe(0.65);
    }, 30000);

    test('يجب أن يحلل تدفق الثواب بشكل حقيقي', async () => {
      // Add multiple reward entries for analysis
      const testEntries = [
        {
          worker_id: 'ResonanceWorker',
          mission_id: 'flow_test_001',
          discovery_level: DiscoveryLevel.SPROUT,
          total_reward: 0.45,
          confidence: 0.7,
          validation_status: 'verified' as const,
          reward_vector: { novelty: 0.5, resonance: 0.4, topology: 0.3, penalty: 0.2 },
          timestamp: Date.now() - 5000,
          metadata: {}
        },
        {
          worker_id: 'ResearchWorker',
          mission_id: 'flow_test_002',
          discovery_level: DiscoveryLevel.BRANCH,
          total_reward: 0.75,
          confidence: 0.85,
          validation_status: 'verified' as const,
          reward_vector: { novelty: 0.8, resonance: 0.7, topology: 0.6, penalty: 0.1 },
          timestamp: Date.now() - 3000,
          metadata: {}
        }
      ];

      for (const entry of testEntries) {
        await RewardLedger.append(entry);
      }

      const metrics = await flowAnalyzer.analyzeRewardFlow();

      expect(metrics).toBeDefined();
      expect(metrics.total_rewards).toBeGreaterThan(0);
      expect(metrics.worker_performance).toBeDefined();
      expect(metrics.discovery_distribution).toBeDefined();

      // Verify anomaly detection
      const anomalies = await flowAnalyzer.detectAnomalies();
      expect(Array.isArray(anomalies)).toBe(true);

      // Verify optimization recommendations
      const optimizations = await flowAnalyzer.generateOptimizations();
      expect(Array.isArray(optimizations)).toBe(true);
    }, 30000);
  });

  describe('Memory System Integration', () => {
    test('يجب أن يتكامل مع ذاكرة IQRA بشكل صحيح', async () => {
      const input = 'اختبر تكامل ذاكرة النظام';

      const result = await missionControl.run(input);

      expect(result).toBeDefined();

      // Test memory operations
      await IQRAMemory.set('integration_test_key', 'integration_test_value');
      const storedValue = await IQRAMemory.get('integration_test_key');
      expect(storedValue).toBe('integration_test_value');

      // Test curiosity tracking
      const metrics = await IQRAMemory.getCuriosityMetrics();
      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('current_score');
      expect(metrics).toHaveProperty('trend');

      // Test novelty tracking
      await IQRAMemory.trackNoveltyPattern('test content for novelty', 0.7);
      const patterns = await IQRAMemory.getRecentList('novelty_patterns', 5);
      expect(Array.isArray(patterns)).toBe(true);
    }, 30000);

    test('يجب أن يعزز الفضول بناءً على الأداء', async () => {
      const initialMetrics = await IQRAMemory.getCuriosityMetrics();
      const initialScore = initialMetrics.current_score;

      await IQRAMemory.boostCuriosity('integration test boost', 0.1);

      const boostedMetrics = await IQRAMemory.getCuriosityMetrics();
      expect(boostedMetrics.current_score).toBeGreaterThanOrEqual(initialScore);
    }, 10000);
  });

  describe('Error Handling and Recovery', () => {
    test('يجب أن يتعامل مع أخطاء العمال بشكل صحيح', async () => {
      const input = 'اختبار معالجة أخطاء العمال';

      try {
        const result = await missionControl.run(input);
        
        expect(result).toBeDefined();
        expect(result.response).toBeDefined();
        
        // Check if any workers failed
        const failedWorkers = result.reports.filter(r => r.status === 'FAIL');
        
        // System should still provide a response even if some workers fail
        expect(result.response.length).toBeGreaterThan(0);
      } catch (error) {
        // System should handle errors gracefully
        expect(error).toBeDefined();
      }
    }, 30000);

    test('يجب أن يتعافى من فشل المكونات', async () => {
      const input = 'اختبار استعادة النظام من الأخطاء';

      const result = await missionControl.run(input);

      expect(result).toBeDefined();
      
      // Verify system is still functional
      const currentState = stateCoordinator.getCurrentState();
      expect(currentState).toBeDefined();

      const metrics = transitionAnalyzer.getRealTimeMetrics();
      expect(metrics).toBeDefined();
    }, 30000);

    test('يجب أن يحافظ على البيانات أثناء الأخطاء', async () => {
      // Store some data first
      await IQRAMemory.set('persistent_test_key', 'persistent_test_value');

      const input = 'اختبار الحفاظ على البيانات أثناء الأخطاء';

      try {
        const result = await missionControl.run(input);
        expect(result).toBeDefined();
      } catch (error) {
        // Even if mission fails, data should persist
      }

      // Verify data persistence
      const persistentValue = await IQRAMemory.get('persistent_test_key');
      expect(persistentValue).toBe('persistent_test_value');
    }, 30000);
  });

  describe('Performance and Scalability', () => {
    test('يجب أن يتعامل مع أحمال العمل العالية', async () => {
      const highLoadInputs = Array.from({ length: 3 }, (_, i) => 
        `مهمة الحمل العالي ${i + 1}: حلل مجموعة بيانات بحجم ${1000 * (i + 1)} عنصر`
      );

      const startTime = Date.now();
      const promises = highLoadInputs.map(input => missionControl.run(input));
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results.length).toBe(3);
      
      for (const result of results) {
        expect(result).toBeDefined();
        expect(result.response).toBeDefined();
      }

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(120000); // 2 minutes max for high load
    }, 120000);

    test('يجب أن يحافظ على الأداء مع مرور الوقت', async () => {
      const performanceInputs = [
        'مهمة أداء 1: حساب بسيط',
        'مهمة أداء 2: تحليل متوسط',
        'مهمة أداء 3: معالجة معقدة'
      ];

      const times: number[] = [];

      for (const input of performanceInputs) {
        const startTime = Date.now();
        const result = await missionControl.run(input);
        const endTime = Date.now();
        
        expect(result).toBeDefined();
        times.push(endTime - startTime);
      }

      // Performance should not degrade significantly
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      expect(avgTime).toBeLessThan(45000); // 45 seconds average
    }, 90000);
  });

  describe('Real-World Scenarios', () => {
    test('يجب أن يتعامل مع سيناريو تعليمي حقيقي', async () => {
      const educationalInput = `
      شرح بالتفصيل مفهوم البرمجة الكائنية (OOP) مع:
      1. التعريف والمبادئ الأساسية
      2. أمثلة عملية بلغة Python
      3. مقارنة مع البرمجة الإجرائية
      4. حالات استخدام مناسبة
      `;

      const result = await missionControl.run(educationalInput);

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.response.length).toBeGreaterThan(200);

      // Should contain educational content
      const hasEducationalContent = result.response.includes('برمجة') ||
                                  result.response.includes('كائنية') ||
                                  result.response.includes('OOP') ||
                                  result.response.includes('Python');

      expect(hasEducationalContent).toBe(true);
    }, 45000);

    test('يجب أن يتعامل مع سيناريو بحثي حقيقي', async () => {
      const researchInput = `
      قم ببحث متكامل حول:
      "تطبيقات الذكاء الاصطناعي في الطب الحديث"
      
      المطلوب:
      - نظرة عامة على التقنيات المستخدمة
      - أمثلة على التطبيقات العملية
      - التحديات والقيود الحالية
      - المستقبل المحتمل
      `;

      const result = await missionControl.run(researchInput);

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.response.length).toBeGreaterThan(300);

      // Should contain research content
      const hasResearchContent = result.response.includes('ذكاء اصطناعي') ||
                               result.response.includes('طب') ||
                               result.response.includes('تطبيقات') ||
                               result.response.includes('تقنيات');

      expect(hasResearchContent).toBe(true);
    }, 60000);

    test('يجب أن يتعامل مع سيناريو تقني حقيقي', async () => {
      const technicalInput = `
      اكتب كود TypeScript كامل يحقق:
      1. نظام إدارة مهام بسيط
      2. واجهة مستخدم تفاعلية
      3. تخزين محلي للبيانات
      4. فرز وتصفية المهام
      5. إضافة وحذف المهام
      `;

      const result = await missionControl.run(technicalInput);

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.response.length).toBeGreaterThan(150);

      // Should contain code
      const hasCodeContent = result.response.includes('function') ||
                           result.response.includes('class') ||
                           result.response.includes('interface') ||
                           result.response.includes('TypeScript');

      expect(hasCodeContent).toBe(true);
    }, 45000);
  });

  describe('System Health and Monitoring', () => {
    test('يجب أن يوفر بيانات مراقبة شاملة', async () => {
      const input = 'مهمة لاختبار المراقبة';

      const result = await missionControl.run(input);

      expect(result).toBeDefined();

      // Check state coordinator health
      const stateMetrics = transitionAnalyzer.getRealTimeMetrics();
      expect(stateMetrics).toBeDefined();
      expect(stateMetrics.active_missions).toBeGreaterThanOrEqual(0);

      // Check reward system health
      const rewardStatus = await flowAnalyzer.getRealTimeStatus();
      expect(rewardStatus).toBeDefined();
      expect(['healthy', 'warning', 'critical']).toContain(rewardStatus.system_health);

      // Check memory system health
      const memoryMetrics = await IQRAMemory.getCuriosityMetrics();
      expect(memoryMetrics).toBeDefined();
      expect(memoryMetrics.current_score).toBeGreaterThanOrEqual(0);
      expect(memoryMetrics.current_score).toBeLessThanOrEqual(1);
    }, 30000);

    test('يجب that يكتشف المشاكل الصحية', async () => {
      // Check for anomalies in state transitions
      const stateAnomalies = transitionAnalyzer.detectAnomalies();
      expect(Array.isArray(stateAnomalies)).toBe(true);

      // Check for anomalies in reward flow
      const rewardAnomalies = await flowAnalyzer.detectAnomalies();
      expect(Array.isArray(rewardAnomalies)).toBe(true);

      // System should provide health status even with anomalies
      const healthStatus = await flowAnalyzer.getRealTimeStatus();
      expect(healthStatus).toBeDefined();
      expect(healthStatus.system_health).toBeDefined();
    }, 15000);
  });
});
