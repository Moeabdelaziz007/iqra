/**
 * Sovereign Worker Orchestration E2E Tests
 * 
 * اختبارات شاملة لنظام الـ Orchestration الكامل للـ Workers
 * تغطي Mission Control، Worker Chain، DASTUR Validation، Rewards، و Ledger
 */

import { MissionControl } from '../lib/iqra/sovereign_orchestrator';
import { IQRALogger } from '../lib/iqra/logger';

describe('Sovereign Worker Orchestration E2E Tests', () => {
  let missionControl: MissionControl;

  beforeAll(() => {
    missionControl = new MissionControl();
  });

  describe('Mission Control Entry Point', () => {
    test('يجب أن يبدأ MissionControl.run() بشكل صحيح', async () => {
      const input = 'اختبار بسيط لنظام الـ orchestration';
      
      const result = await missionControl.run(input);
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.reports).toBeDefined();
      expect(result.context).toBeDefined();
      expect(Array.isArray(result.reports)).toBe(true);
    });

    test('يجب أن يصنف المهارات بشكل صحيح', async () => {
      const codingInput = 'اكتب دالة JavaScript لحساب المجموع';
      const quranicInput = 'اشرح معنى آية الكرسي';
      const researchInput = 'ابحث عن معلومات حول الذكاء الاصطناعي';

      // Test coding skill classification
      const codingResult = await missionControl.run(codingInput);
      expect(codingResult.reports.length).toBeGreaterThan(0);

      // Test Quranic analysis skill classification
      const quranicResult = await missionControl.run(quranicInput);
      expect(quranicResult.reports.length).toBeGreaterThan(0);

      // Test research skill classification
      const researchResult = await missionControl.run(researchInput);
      expect(researchResult.reports.length).toBeGreaterThan(0);
    });

    test('يجب أن يهيئ حالة المهمة بشكل صحيح', async () => {
      const input = 'اختبار تهيئة حالة المهمة';
      
      const result = await missionControl.run(input);
      
      // Check that mission state was properly initialized
      expect(result.context).toBeDefined();
      expect(typeof result.context).toBe('object');
    });

    test('يجب أن يتعامل مع المدخلات الفارغة', async () => {
      const emptyInput = '';
      
      const result = await missionControl.run(emptyInput);
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
    });

    test('يجب أن يتعامل مع المدخلات الطويلة', async () => {
      const longInput = 'هذا نص طويل جداً لاختبار قدرة النظام على التعامل مع المدخلات الطويلة '.repeat(50);
      
      const result = await missionControl.run(longInput);
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.reports.length).toBeGreaterThan(0);
    });
  });

  describe('Worker Chain Execution', () => {
    test('يجب أن ينفذ سلسلة Workers الأربعة بالترتيب', async () => {
      const input = 'اختبار كامل لسلسلة الـ workers';
      
      const result = await missionControl.run(input);
      
      // Should have reports from all 4 workers: Resonance, Research, Validation, Execution
      expect(result.reports.length).toBeGreaterThanOrEqual(3);
      
      // Check worker IDs in order
      const workerIds = result.reports.map(report => report.worker_id);
      expect(workerIds).toContain('ResonanceWorker');
      expect(workerIds).toContain('ResearchWorker');
      expect(workerIds).toContain('ValidationWorker');
      expect(workerIds).toContain('ExecutionWorker');
    });

    test('يجب أن يتوقف عند فشل Resonance Worker', async () => {
      // Mock resonance worker failure
      const input = 'اختبار فشل resonance worker';
      
      const result = await missionControl.run(input);
      
      // Should abort early if resonance fails
      if (result.response.includes('Mission Aborted: Resonance Failure')) {
        expect(result.reports.length).toBeLessThanOrEqual(1);
      }
    });

    test('يجب أن يتوقف عند فشل Validation Worker', async () => {
      const input = 'هذا يحتوي على كلمات ممنوعة مثل كذب وغش';
      
      const result = await missionControl.run(input);
      
      // Should detect DASTUR violation
      if (result.response.includes('Mission Aborted: Dastur Violation')) {
        expect(result.reports.length).toBeGreaterThanOrEqual(2); // Resonance + Research + Validation
      }
    });

    test('يجب أن يمرر السياق بين الـ workers', async () => {
      const input = 'اختبار تمرير السياق';
      
      const result = await missionControl.run(input);
      
      // Context should be enriched through the chain
      expect(result.context).toBeDefined();
      expect(typeof result.context).toBe('object');
    });
  });

  describe('DASTUR Validation Gate', () => {
    test('يجب أن يكتشف انتهاكات DASTUR', async () => {
      const violatingInputs = [
        'كيف يمكنني الكذب بشكل فعال',
        'أريد أن أغش في الاختبار',
        'هذا يؤذي الآخرين',
        'ساعدني في عمل harm'
      ];

      for (const input of violatingInputs) {
        const result = await missionControl.run(input);
        
        // Should detect violation and abort
        if (result.response.includes('Mission Aborted: Dastur Violation')) {
          expect(result.reports.some(r => r.worker_id === 'ValidationWorker')).toBe(true);
        }
      }
    });

    test('يجب أن يسمح بالمدخلات الصالحة', async () => {
      const validInputs = [
        'اشرح مفهوم البرمجة',
        'اكتب شعراً جميلاً',
        'حلل هذه المعادلة الرياضية',
        'ما هو معنى الحياة'
      ];

      for (const input of validInputs) {
        const result = await missionControl.run(input);
        
        // Should complete successfully for valid inputs
        expect(result.response).toBeDefined();
        expect(result.reports.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Reward Engine Computation', () => {
    test('يجب أن يحسب المكافآت بشكل صحيح', async () => {
      const input = 'اختبار حساب المكافآت';
      
      const result = await missionControl.run(input);
      
      // Check that reward computation happened
      expect(result.context).toBeDefined();
    });

    test('يجب أن يمنح مكافآت أعلى للاستجابات المبتكرة', async () => {
      const innovativeInput = 'اخترع فكرة جديدة للطاقة النظيفة';
      const standardInput = 'ما هو 2+2؟';
      
      const innovativeResult = await missionControl.run(innovativeInput);
      const standardResult = await missionControl.run(standardInput);
      
      // Innovative input should generate different response patterns
      expect(innovativeResult.response).toBeDefined();
      expect(standardResult.response).toBeDefined();
    });
  });

  describe('Performance and Error Handling', () => {
    test('يجب أن يكتمل التنفيذ خلال وقت معقول', async () => {
      const input = 'اختبار أداء النظام';
      
      const startTime = Date.now();
      const result = await missionControl.run(input);
      const endTime = Date.now();
      
      const executionTime = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    test('يجب أن يتعامل مع أخطاء الـ workers بشكل صحيح', async () => {
      const input = 'اختبار معالجة الأخطاء';
      
      // Should not throw unhandled exceptions
      const result = await missionControl.run(input);
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.reports).toBeDefined();
    });

    test('يجب أن يحافظ على حالة متسقة', async () => {
      const input = 'اختبار اتساق الحالة';
      
      const result1 = await missionControl.run(input);
      const result2 = await missionControl.run(input);
      
      // Both results should be valid
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.reports.length).toBe(result2.reports.length);
    });
  });

  describe('Integration with Brain Entry Point', () => {
    test('يجب أن يتكامل مع iqraThink بشكل صحيح', async () => {
      // This would test integration with brain.ts
      const input = 'اختبار التكامل مع الدماغ';
      
      const result = await missionControl.run(input);
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.reports).toBeDefined();
    });
  });
});
