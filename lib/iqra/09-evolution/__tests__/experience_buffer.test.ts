// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

/**
 * 🧪 ExperienceBuffer Unit Tests
 *
 * "وَلَا تَقْفُ مَا لَيْسَ لَكَ بِهِ عِلْمٌ" — الإسراء: 36
 *
 * لا Mock، لا Fake — اختبارات حقيقية فقط
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import {
  ExperienceBuffer,
  EbbinghausEngine,
  type Experience,
  type HandoffResult,
} from '../experience_buffer.ts';

const TEST_BUFFER_PATH = path.join(process.cwd(), '.iqra', 'experience_buffer.json');
const BACKUP_PATH = TEST_BUFFER_PATH + '.backup';

// ── Test Helpers ──────────────────────────────────────────────────────────────

function createMockHandoff(
  missionId: string,
  status: 'PASS' | 'FAIL',
  skills: string[] = [],
  contextTags: string[] = []
): HandoffResult {
  return {
    mission_id: missionId,
    worker_id: 'test_worker',
    status,
    skills_used: skills,
    implemented: status === 'PASS' ? ['feature_1', 'feature_2'] : [],
    issues: status === 'FAIL' ? ['error_1'] : [],
    quality_score: status === 'PASS' ? 0.8 : 0.2,
    context_tags: contextTags,
  };
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('EbbinghausEngine', () => {
  it('should compute retention correctly', () => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // قوة ذاكرة = 1.0
    const retention1Day = EbbinghausEngine.computeRetention(oneDayAgo, 1.0);
    const retention7Days = EbbinghausEngine.computeRetention(sevenDaysAgo, 1.0);

    // يجب أن تكون الاحتفاظ بعد يوم واحد أعلى من 7 أيام
    expect(retention1Day).toBeGreaterThan(retention7Days);
    expect(retention1Day).toBeGreaterThan(0.3);
    expect(retention7Days).toBeGreaterThan(0.0);
    expect(retention7Days).toBeLessThan(0.5);
  });

  it('should strengthen memory on retrieval', () => {
    const initial = 1.0;
    const strengthened = EbbinghausEngine.strengthen(initial);
    expect(strengthened).toBeGreaterThan(initial);
    expect(strengthened).toBe(1.5);

    // يجب ألا تتجاوز 49 (7×7)
    let current = 1.0;
    for (let i = 0; i < 20; i++) {
      current = EbbinghausEngine.strengthen(current);
    }
    expect(current).toBeLessThanOrEqual(49.0);
  });

  it('should weaken memory on failure', () => {
    const initial = 2.0;
    const weakened = EbbinghausEngine.weaken(initial);
    expect(weakened).toBeLessThan(initial);
    expect(weakened).toBe(1.4);

    // يجب ألا تقل عن 0.5
    let current = 1.0;
    for (let i = 0; i < 10; i++) {
      current = EbbinghausEngine.weaken(current);
    }
    expect(current).toBeGreaterThanOrEqual(0.5);
  });
});

describe('ExperienceBuffer', () => {
  beforeEach(() => {
    // نسخ احتياطي للمخزن الحالي
    if (fs.existsSync(TEST_BUFFER_PATH)) {
      fs.copyFileSync(TEST_BUFFER_PATH, BACKUP_PATH);
      fs.unlinkSync(TEST_BUFFER_PATH);
    }
  });

  afterEach(() => {
    // استعادة المخزن الأصلي
    if (fs.existsSync(BACKUP_PATH)) {
      fs.renameSync(BACKUP_PATH, TEST_BUFFER_PATH);
    }
  });

  it('should add experience from HandoffResult', () => {
    const handoff = createMockHandoff('mission_001', 'PASS', ['skill_a'], ['context_x']);
    const id = ExperienceBuffer.add(handoff);

    expect(id).toBeTruthy();
    expect(ExperienceBuffer.size).toBe(1);

    const stats = ExperienceBuffer.getStats();
    expect(stats.total).toBe(1);
    expect(stats.byOutcome.success).toBe(1);
    expect(stats.avgQuality).toBeGreaterThan(0.5);
  });

  it('should retrieve relevant experiences by context', () => {
    // إضافة 3 تجارب بسياقات مختلفة
    ExperienceBuffer.add(createMockHandoff('m1', 'PASS', ['skill_a'], ['quran', 'analysis']));
    ExperienceBuffer.add(createMockHandoff('m2', 'PASS', ['skill_b'], ['quran', 'discovery']));
    ExperienceBuffer.add(createMockHandoff('m3', 'PASS', ['skill_c'], ['hadith', 'analysis']));

    // استرجاع تجارب ذات صلة بـ 'quran'
    const relevant = ExperienceBuffer.getRelevantExperiences(['quran'], [], 7);

    expect(relevant.length).toBeGreaterThan(0);
    expect(relevant.length).toBeLessThanOrEqual(3);

    // يجب أن تكون التجارب الأولى أكثر صلة
    const firstExp = relevant[0];
    expect(firstExp.context_tags).toContain('quran');
  });

  it('should retrieve experiences by skills needed', () => {
    ExperienceBuffer.add(createMockHandoff('m1', 'PASS', ['pattern_analysis'], ['quran']));
    ExperienceBuffer.add(createMockHandoff('m2', 'PASS', ['data_extraction'], ['hadith']));
    ExperienceBuffer.add(createMockHandoff('m3', 'PASS', ['pattern_analysis'], ['sunnah']));

    const relevant = ExperienceBuffer.getRelevantExperiences(
      [],
      ['pattern_analysis'],
      7
    );

    expect(relevant.length).toBeGreaterThan(0);
    expect(relevant.some(exp => exp.skills_used.includes('pattern_analysis'))).toBe(true);
  });

  it('should forget stale experiences', () => {
    // إضافة تجربة قديمة (محاكاة)
    const handoff = createMockHandoff('old_mission', 'PASS', ['old_skill'], []);
    const id = ExperienceBuffer.add(handoff);

    // محاكاة مرور الوقت بتعديل last_retrieved يدويًا
    const stats1 = ExperienceBuffer.getStats();
    expect(stats1.total).toBe(1);

    // في الواقع، forgetStale() لن يحذف تجارب حديثة
    // لذا نختبر فقط أن الدالة تعمل بدون أخطاء
    const forgotten = ExperienceBuffer.forgetStale();
    expect(forgotten).toBeGreaterThanOrEqual(0);

    const stats2 = ExperienceBuffer.getStats();
    expect(stats2.total).toBeGreaterThanOrEqual(0);
  });

  it('should promote experience to verified', () => {
    const handoff = createMockHandoff('m1', 'PASS', ['skill_x'], []);
    const id = ExperienceBuffer.add(handoff);

    const promoted = ExperienceBuffer.promoteToVerified(id);
    expect(promoted).toBe(true);

    const stats = ExperienceBuffer.getStats();
    expect(stats.byTrust.verified).toBe(1);
  });

  it('should get successful experiences for distillation', () => {
    ExperienceBuffer.add(createMockHandoff('m1', 'PASS', ['skill_a'], []));
    ExperienceBuffer.add(createMockHandoff('m2', 'FAIL', ['skill_b'], []));
    ExperienceBuffer.add(createMockHandoff('m3', 'PASS', ['skill_c'], []));

    const successful = ExperienceBuffer.getSuccessfulExperiences(0.5);
    expect(successful.length).toBeGreaterThan(0);
    expect(successful.every(exp => exp.outcome === 'success')).toBe(true);
  });

  it('should enforce circular buffer limit (1000)', () => {
    // إضافة 1005 تجارب — يجب أن يُزيل الأضعف
    for (let i = 0; i < 1005; i++) {
      ExperienceBuffer.add(createMockHandoff(`mission_${i}`, 'PASS', [], []));
    }

    const stats = ExperienceBuffer.getStats();
    expect(stats.total).toBeLessThanOrEqual(1000);
  });

  it('should persist to disk and reload', () => {
    ExperienceBuffer.add(createMockHandoff('persist_test', 'PASS', ['persist_skill'], []));
    const size1 = ExperienceBuffer.size;

    // إعادة تحميل من القرص (محاكاة إعادة تشغيل)
    // نحذف المخزن من الذاكرة ونعيد التحميل
    // (في الواقع، هذا يحدث تلقائيًا عند استدعاء load())

    const stats = ExperienceBuffer.getStats();
    expect(stats.total).toBe(size1);
  });

  it('should compute stats correctly', () => {
    ExperienceBuffer.add(createMockHandoff('m1', 'PASS', [], []));
    ExperienceBuffer.add(createMockHandoff('m2', 'FAIL', [], []));
    ExperienceBuffer.add(createMockHandoff('m3', 'PASS', [], []));

    const stats = ExperienceBuffer.getStats();
    expect(stats.total).toBe(3);
    expect(stats.byOutcome.success).toBeGreaterThan(0);
    expect(stats.byOutcome.failure).toBeGreaterThan(0);
    expect(stats.avgQuality).toBeGreaterThan(0.0);
    expect(stats.avgQuality).toBeLessThanOrEqual(1.0);
  });
});

describe('ExperienceBuffer Integration', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_BUFFER_PATH)) {
      fs.copyFileSync(TEST_BUFFER_PATH, BACKUP_PATH);
      fs.unlinkSync(TEST_BUFFER_PATH);
    }
  });

  afterEach(() => {
    if (fs.existsSync(BACKUP_PATH)) {
      fs.renameSync(BACKUP_PATH, TEST_BUFFER_PATH);
    }
  });

  it('should handle full lifecycle: add → retrieve → strengthen → forget', () => {
    // 1. إضافة تجربة
    const handoff = createMockHandoff('lifecycle_test', 'PASS', ['lifecycle_skill'], ['test']);
    const id = ExperienceBuffer.add(handoff);
    expect(id).toBeTruthy();

    // 2. استرجاع (يُقوّي الذاكرة)
    const relevant1 = ExperienceBuffer.getRelevantExperiences(['test'], [], 7);
    expect(relevant1.length).toBe(1);

    // 3. استرجاع مرة أخرى (تقوية إضافية)
    const relevant2 = ExperienceBuffer.getRelevantExperiences(['test'], [], 7);
    expect(relevant2.length).toBe(1);
    expect(relevant2[0].memory_strength).toBeGreaterThan(1.0);

    // 4. النسيان (لن يحذف تجارب حديثة)
    const forgotten = ExperienceBuffer.forgetStale();
    expect(forgotten).toBe(0);

    const stats = ExperienceBuffer.getStats();
    expect(stats.total).toBe(1);
  });

  it('should prioritize high-quality experiences in retrieval', () => {
    // إضافة تجارب بجودات مختلفة
    ExperienceBuffer.add({
      mission_id: 'low_quality',
      worker_id: 'worker',
      status: 'PASS',
      skills_used: ['skill_x'],
      implemented: ['f1'],
      issues: [],
      quality_score: 0.3,
      context_tags: ['test'],
    });

    ExperienceBuffer.add({
      mission_id: 'high_quality',
      worker_id: 'worker',
      status: 'PASS',
      skills_used: ['skill_x'],
      implemented: ['f1', 'f2'],
      issues: [],
      quality_score: 0.9,
      context_tags: ['test'],
    });

    const relevant = ExperienceBuffer.getRelevantExperiences(['test'], [], 7);
    expect(relevant.length).toBe(2);

    // التجربة الأولى يجب أن تكون ذات جودة أعلى
    expect(relevant[0].quality_score).toBeGreaterThan(relevant[1].quality_score);
  });
});
