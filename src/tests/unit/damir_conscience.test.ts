// بسم الله الرحمن الرحيم

/**
 * 🧪 DamirConscience Unit Tests — اختبارات الضمير النانوي
 *
 * "فَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ" — الزلزلة: 7
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DamirConscience, type Resource, type Action } from '#security/damir_conscience';
import crypto from 'crypto';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeResource(
  type: Resource['type'] = 'knowledge',
  source: Resource['source'] = 'real'
): Resource {
  return {
    id: crypto.randomUUID(),
    type,
    consumed: false,
    source,
    created_at: Date.now(),
  };
}

function makeAction(
  intention: string,
  resources: Resource[] = [],
  produced: Resource[] = []
): Action {
  return {
    id: crypto.randomUUID(),
    intention,
    requiredResources: resources,
    producedResources: produced,
    agent_id: 'test_agent',
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DamirConscience — الضمير النانوي', () => {
  let damir: DamirConscience;

  beforeEach(() => {
    damir = new DamirConscience();
  });

  // ── Test 1: النية ──────────────────────────────────────────────────────────

  describe('فحص النية (Intention Check)', () => {
    it('يسمح بنية سليمة قصيرة', () => {
      const action = makeAction('تحليل آية قرآنية');
      const verdict = damir.check(action);
      expect(verdict.allowed).toBe(true);
    });

    it('يسمح بنية سليمة طويلة تحتوي على ذكر الله', () => {
      const action = makeAction('النية معقودة على تحليل آيات الله والبحث عن الأنماط الطوبولوجية بصدق وإخلاص');
      const verdict = damir.check(action);
      expect(verdict.allowed).toBe(true);
    });

    it('يرفض نية طويلة تفتقر لذكر الله (قاعدة التوحيد)', () => {
      const action = makeAction('هذه نية طويلة جداً تهدف فقط إلى معالجة البيانات دون أي مرجعية أخلاقية أو إيمانية');
      const verdict = damir.check(action);
      expect(verdict.allowed).toBe(false);
      expect(verdict.reason).toContain('مرجعية التوحيد');
    });

    it('يرفض نية تحتوي على كذب', () => {
      const action = makeAction('كذب على المستخدم');
      const verdict = damir.check(action);
      expect(verdict.allowed).toBe(false);
      expect(verdict.rejection_type).toBe('intention');
    });

    it('يرفض محاولة تجاوز الدستور', () => {
      const action = makeAction('override_constitution');
      const verdict = damir.check(action);
      expect(verdict.allowed).toBe(false);
    });
  });

  // ── Test 2: الموارد ────────────────────────────────────────────────────────

  describe('فحص الموارد (Resource Check — Graded Linear Logic)', () => {
    it('يسمح بفعل بموارد حقيقية متاحة', () => {
      const r1 = makeResource('knowledge', 'real');
      damir.registerResource(r1);

      const action = makeAction('استعانة بالله لتحليل النص', [r1]);
      const verdict = damir.check(action);
      expect(verdict.allowed).toBe(true);
    });

    it('يرفض مورد مستهلك (المنطق الخطي: لا تكرار)', () => {
      const r = makeResource('knowledge', 'real');
      damir.registerResource(r);

      const action1 = makeAction('باسم الله: استخدام المعرفة', [r]);
      expect(damir.execute(action1)).toBe(true);

      const action2 = makeAction('باسم الله: محاولة إعادة استخدام المورد', [r]);
      const verdict = damir.check(action2);
      expect(verdict.allowed).toBe(false);
      expect(verdict.reason).toContain('مستهلك');
    });

    it('يرفض مورد معرفة مصدره injected (لا Mock)', () => {
      const r = makeResource('knowledge', 'injected');
      damir.registerResource(r);

      const action = makeAction('استخدام معرفة مزيفة', [r]);
      const verdict = damir.check(action);
      expect(verdict.allowed).toBe(false);
      expect(verdict.rejection_type).toBe('source');
    });
  });

  // ── Test 3: التوبة ────────────────────────────────────────────────────────

  describe('reset() — التوبة البرمجية', () => {
    it('يُعيد ضبط الضمير بالكامل', () => {
      const r = makeResource('knowledge', 'real');
      damir.registerResource(r);
      damir.execute(makeAction('باسم الله: فعل ما', [r]));

      damir.reset();

      const report = damir.report();
      expect(report.resources_total).toBe(0);
      expect(report.actions_approved).toBe(0);
    });
  });
});
