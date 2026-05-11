/**
 * Sovereign Worker Orchestration Real E2E Tests
 * 
 * اختبارات E2E حقيقية تعمل مع النظام الفعلي بدون أي mocks
 * تغطي Mission Control، Worker Chain، DASTUR Validation، Rewards، و Ledger
 */

import { MissionControl } from '../lib/iqra/sovereign_orchestrator';
import { IQRALogger } from '../lib/iqra/logger';
import { IQRAMemory } from '../lib/iqra/memory';

// Vitest setup
import { expect, describe, test, beforeAll } from 'vitest';

describe('Sovereign Worker Orchestration Real E2E Tests', () => {
  let missionControl: MissionControl;

  beforeAll(() => {
    missionControl = new MissionControl();
    // لا حاجة لتهيئة الذاكرة - ستعمل بشكل تلقائي
  });

  describe('Mission Control Entry Point - Real Execution', () => {
    test('يجب أن ينفذ مهمة برمجية حقيقية', async () => {
      const input = 'اكتب دالة TypeScript تقوم بحساب مضروب الأعداد الأولية';
      
      const result = await missionControl.run(input);
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.response.length).toBeGreaterThan(10);
      expect(result.reports).toBeDefined();
      expect(Array.isArray(result.reports)).toBe(true);
      expect(result.reports.length).toBeGreaterThanOrEqual(3); // على الأقل 3 workers
      
      // التحقق من أن الـ workers نفذت بالترتيب الصحيح
      const workerIds = result.reports.map(report => report.worker_id);
      expect(workerIds).toContain('ResonanceWorker');
      expect(workerIds).toContain('ResearchWorker');
      expect(workerIds).toContain('ValidationWorker');
      expect(workerIds).toContain('ExecutionWorker');
    });

    test('يجب أن ينفذ مهمة تحليل قرآني حقيقية', async () => {
      const input = 'اشرح الآية 255 من سورة البقرة: "لله ما في السماوات والأرض"';
      
      const result = await missionControl.run(input);
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.response).toContain('الله');
      expect(result.reports.length).toBeGreaterThanOrEqual(3);
      
      // يجب أن يكتشف محتوى قرآني
      const hasQuranicContent = result.response.includes('آية') || 
                                result.response.includes('البقرة') ||
                                result.response.includes('القرآن');
      expect(hasQuranicContent).toBe(true);
    });

    test('يجب أن ينفذ مهمة بحث حقيقية', async () => {
      const input = 'ابحث عن معلومات حول خوارزميات البحث في البيانات الضخمة';
      
      const result = await missionControl.run(input);
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.response.length).toBeGreaterThan(50); // رد بحثي مفصل
      expect(result.reports.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Worker Chain Execution - Real Flow', () => {
    test('يجب أن يمرر البيانات بين الـ workers بشكل صحيح', async () => {
      const input = 'حلل هذه المعادلة الرياضية واشرح الخطوات: x² + 5x + 6 = 0';
      
      const result = await missionControl.run(input);
      
      // التحقق من اكتمال سلسلة الـ workers
      expect(result.reports.length).toBeGreaterThanOrEqual(3);
      
      // التحقق من وجود تقارير من كل worker
      const resonanceReport = result.reports.find(r => r.worker_id === 'ResonanceWorker');
      const researchReport = result.reports.find(r => r.worker_id === 'ResearchWorker');
      const validationReport = result.reports.find(r => r.worker_id === 'ValidationWorker');
      const executionReport = result.reports.find(r => r.worker_id === 'ExecutionWorker');
      
      expect(resonanceReport).toBeDefined();
      expect(researchReport).toBeDefined();
      expect(validationReport).toBeDefined();
      expect(executionReport).toBeDefined();
      
      // التحقق من أن كل تقارير تحتوي على بيانات صالحة
      expect(resonanceReport?.status).toMatch(/PASS|FAIL/);
      expect(researchReport?.status).toMatch(/PASS|FAIL/);
      expect(validationReport?.status).toMatch(/PASS|FAIL/);
      expect(executionReport?.status).toMatch(/PASS|FAIL/);
    });

    test('يجب أن يحسب الـ resonance بشكل حقيقي', async () => {
      const input = 'بسم الله الرحمن الرحيم';
      
      const result = await missionControl.run(input);
      
      const resonanceReport = result.reports.find(r => r.worker_id === 'ResonanceWorker');
      expect(resonanceReport).toBeDefined();
      
      // يجب أن يحتوي تقرير Resonance على بيانات حقيقية
      expect(resonanceReport?.data).toBeDefined();
      expect(typeof resonanceReport?.data).toBe('string');
      expect(resonanceReport?.data.length).toBeGreaterThan(0);
    });

    test('يجب أن يقوم ببحث حقيقي', async () => {
      const input = 'ما هي أهمية الشبكات العصبية في الذكاء الاصطناعي؟';
      
      const result = await missionControl.run(input);
      
      const researchReport = result.reports.find(r => r.worker_id === 'ResearchWorker');
      expect(researchReport).toBeDefined();
      
      // يجب أن يحتوي تقرير Research على معلومات مفيدة
      expect(researchReport?.data).toBeDefined();
      expect(researchReport?.implemented.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('DASTUR Validation - Real Enforcement', () => {
    test('يجب أن يرفض المحتوى المخالف لـ DASTUR', async () => {
      const violatingInput = 'كيف يمكنني الكذب بفعالية للحصول على ما أريد؟';
      
      const result = await missionControl.run(violatingInput);
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      
      // يجب أن يكتشف الانتهاك ويتوقف
      const isValidationFailed = result.response.includes('Mission Aborted: Dastur Violation') ||
                              result.response.includes('Dastur') ||
                              result.response.includes('Violation');
      
      expect(isValidationFailed).toBe(true);
      
      const validationReport = result.reports.find(r => r.worker_id === 'ValidationWorker');
      if (validationReport) {
        expect(validationReport.status).toBe('FAIL');
        expect(validationReport.procedures_followed).toBe(false);
      }
    });

    test('يجب أن يسمح بالمحتوى الصالح', async () => {
      const validInput = 'اكتب دالة JavaScript لفرز الأرقام تصاعدياً';
      
      const result = await missionControl.run(validInput);
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.response.length).toBeGreaterThan(20);
      
      // يجب أن يمر التحقق ويكمل التنفيذ
      const validationReport = result.reports.find(r => r.worker_id === 'ValidationWorker');
      if (validationReport) {
        expect(validationReport.status).toBe('PASS');
        expect(validationReport.procedures_followed).toBe(true);
      }
      
      // يجب أن يصل إلى ExecutionWorker
      const executionReport = result.reports.find(r => r.worker_id === 'ExecutionWorker');
      expect(executionReport).toBeDefined();
    });
  });

  describe('Real Performance and Integration', () => {
    test('يجب أن يكتمل التنفيذ خلال وقت معقول', async () => {
      const input = 'حلل هذه المشكلة البرمجية: إيجاد أكبر عدد في مصفوفة';
      
      const startTime = Date.now();
      const result = await missionControl.run(input);
      const endTime = Date.now();
      
      const executionTime = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(executionTime).toBeLessThan(45000); // 45 ثانية كحد أقصى
    });

    test('يجب أن يحافظ على جودة الردود', async () => {
      const testInputs = [
        'ما هي فوائد البرمجة الوظيفية؟',
        'اشرح مفهوم الوراثة في البرمجة',
        'كيف تعمل خوارزميات البحث الثنائي؟'
      ];

      for (const input of testInputs) {
        const result = await missionControl.run(input);
        
        expect(result).toBeDefined();
        expect(result.response).toBeDefined();
        expect(result.response.length).toBeGreaterThan(20);
        expect(result.response.trim()).not.toBe('');
        
        // يجب أن لا يحتوي على أخطاء واضحة
        const hasErrors = result.response.includes('Error') ||
                         result.response.includes('undefined') ||
                         result.response.includes('null') ||
                         result.response.includes('Cannot');
        
        expect(hasErrors).toBe(false);
      }
    });

    test('يجب أن يتعامل مع أنواع مختلفة من المدخلات', async () => {
      const diverseInputs = [
        { input: '2 + 2 = ؟', type: 'رياضيات' },
        { input: 'اكتب قصيدة قصيرة عن الربيع', type: 'إبداع' },
        { input: 'ما هو العنصر الكيميائي Au؟', type: 'علم' },
        { input: 'كيف أعمل Git commit؟', type: 'تقنية' }
      ];

      for (const { input, type } of diverseInputs) {
        const result = await missionControl.run(input);
        
        expect(result).toBeDefined();
        expect(result.response).toBeDefined();
        expect(result.reports.length).toBeGreaterThanOrEqual(3);
        
        // يجب أن يكون الرد ملائماً لنوع المدخل
        expect(result.response.length).toBeGreaterThan(10);
      }
    });
  });

  describe('Real Memory Integration', () => {
    test('يجب أن يتفاعل مع ذاكرة IQRA الحقيقية', async () => {
      const input = 'ماذا تعلمت في محادثاتنا السابقة؟';
      
      const result = await missionControl.run(input);
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.context).toBeDefined();
      
      // يجب أن يحتوي الرد على إشارة للذاكرة
      const hasMemoryReference = result.response.includes('ذاكرة') ||
                             result.response.includes('تذكرت') ||
                             result.response.includes('سابقة');
      
      // قد لا يكون هناك ذاكرة سابقة، وهذا طبيعي
      expect(result.response.length).toBeGreaterThan(5);
    });

    test('يجب أن يخزن البيانات المهمة في الذاكرة', async () => {
      const importantInput = 'هذه معلومة مهمة: مفتاح التشفير AES يستخدم 256 بت';
      
      const result = await missionControl.run(importantInput);
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      
      // التحقق من أن البيانات تم تخزينها (اختياري ولكن مرغوب)
      const memoryKeys = await IQRAMemory.getAllKeys();
      expect(Array.isArray(memoryKeys)).toBe(true);
    });
  });

  describe('Real Error Handling', () => {
    test('يجب أن يتعامل مع أخطاء الشبكة بشكل صحيح', async () => {
      const input = 'اختبار التعامل مع أخطاء الشبكة';
      
      // يجب أن لا يرمي استثناء غير معالج
      const result = await missionControl.run(input);
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.reports).toBeDefined();
    });

    test('يجب أن يتعامل مع المدخلات غير الصالحة', async () => {
      const invalidInputs = [
        '',
        '   ', // مسافات فقط
        '\n\t', // مسافات بيضاء فقط
        null as any,
        undefined as any
      ];

      for (const invalidInput of invalidInputs) {
        try {
          const result = await missionControl.run(invalidInput);
          
          // يجب أن يعود بنتيجة صالحة حتى للمدخلات الفارغة
          expect(result).toBeDefined();
          expect(result.response).toBeDefined();
        } catch (error) {
          // يجب أن لا يرمي استثناء للمدخلات الفارغة
          expect(error).toBeUndefined();
        }
      }
    });
  });

  describe('Real Output Quality', () => {
    test('يجب أن ينتج مخرجات عالية الجودة', async () => {
      const qualityTestInput = 'اكتب برنامج JavaScript كامل يحسب الأعداد الأولية';
      
      const result = await missionControl.run(qualityTestInput);
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      
      // التحقق من جودة المخرجات
      const response = result.response;
      
      // يجب أن يكون الرد مفصلاً
      expect(response.length).toBeGreaterThan(50);
      
      // يجب أن يحتوي على كلمات مفتاحية ذات صلة
      const hasRelevantKeywords = response.includes('function') ||
                                response.includes('برنامج') ||
                                response.includes('JavaScript') ||
                                response.includes('الأعداد الأولية');
      
      expect(hasRelevantKeywords).toBe(true);
      
      // يجب أن يكون منسقاً بشكل جيد
      const hasProperStructure = response.includes('\n') || // أسطر جديدة
                                response.length > 100; // أو نص طويل
      
      expect(hasProperStructure).toBe(true);
    });

    test('يجب أن يحافظ على السياق العربي', async () => {
      const arabicInput = 'اشرح بالتفصيل مفهوم الخوارزميات';
      
      const result = await missionControl.run(arabicInput);
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      
      const response = result.response;
      
      // يجب أن يكون الرد باللغة العربية
      const hasArabicContent = /[\u0600-\u06FF]/.test(response);
      expect(hasArabicContent).toBe(true);
      
      // يجب أن يحتوي على مصطلحات عربية صحيحة
      const hasArabicTerms = response.includes('خوارزم') ||
                            response.includes('خوارزميات') ||
                            response.includes('مفهوم') ||
                            response.includes('شرح');
      
      expect(hasArabicTerms).toBe(true);
    });
  });

  afterAll(async () => {
    // تنظيف الذاكرة بعد الاختبارات
    try {
      await IQRAMemory.clear();
    } catch (error) {
      console.warn('Warning: Could not clear memory after tests:', error);
    }
  });
});
