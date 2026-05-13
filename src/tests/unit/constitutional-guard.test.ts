// بسم الله الرحمن الرحيم

/**
 * 🧪 ConstitutionalGuard Unit Tests — اختبارات الحارس الدستوري
 *
 * "وَنَضَعُ الْمَوَازِينَ الْقِسْطَ لِيَوْمِ الْقِيَامَةِ" — الأنبياء: 47
 *
 * Tests for runtime/constitutional-guard.ts:
 * 1. auditResult() — forbidden pattern detection and alignment scoring
 * 2. isHaram() — constitutional prohibition checks
 * 3. validateInput() — delegation to DamirConscience
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConstitutionalGuard } from '../../../runtime/constitutional-guard';

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('ConstitutionalGuard — الحارس الدستوري', () => {
  let guard: ConstitutionalGuard;

  beforeEach(() => {
    guard = new ConstitutionalGuard();
  });

  // ── auditResult() ──────────────────────────────────────────────────────────

  describe('auditResult() — تدقيق النتيجة للتوافق الدستوري', () => {
    it('returns alignmentScore 1.0 for a clean response with no forbidden patterns', async () => {
      const result = await guard.auditResult('The analysis of the Quranic verse reveals mathematical patterns.');
      expect(result.alignmentScore).toBe(1.0);
      expect(result.feedback).toBe('Result aligned with constitutional constraints.');
    });

    it('returns alignmentScore 0.2 when response contains "I am sorry"', async () => {
      const result = await guard.auditResult('I am sorry, I cannot help with that.');
      expect(result.alignmentScore).toBe(0.2);
      expect(result.feedback).toContain('Constitutional violation');
      expect(result.feedback).toContain('I am sorry');
    });

    it('returns alignmentScore 0.2 when response contains "as an AI"', async () => {
      const result = await guard.auditResult('As an AI, I do not have feelings.');
      expect(result.alignmentScore).toBe(0.2);
      expect(result.feedback).toContain('Constitutional violation');
      expect(result.feedback).toContain('as an AI');
    });

    it('returns alignmentScore 0.2 when response contains "hallucination"', async () => {
      const result = await guard.auditResult('This response may contain hallucination due to lack of data.');
      expect(result.alignmentScore).toBe(0.2);
      expect(result.feedback).toContain('Constitutional violation');
      expect(result.feedback).toContain('hallucination');
    });

    it('reports all found forbidden patterns in the feedback', async () => {
      const result = await guard.auditResult('I am sorry, as an AI I cannot confirm without hallucination.');
      expect(result.alignmentScore).toBe(0.2);
      expect(result.feedback).toContain('I am sorry');
      expect(result.feedback).toContain('as an AI');
      expect(result.feedback).toContain('hallucination');
    });

    it('returns alignmentScore 1.0 for an empty response (no forbidden patterns)', async () => {
      const result = await guard.auditResult('');
      expect(result.alignmentScore).toBe(1.0);
    });

    it('is case-sensitive: does not flag "I AM SORRY" (uppercase)', async () => {
      // Forbidden patterns are checked with exact string match, no case folding
      const result = await guard.auditResult('I AM SORRY for the inconvenience.');
      expect(result.alignmentScore).toBe(1.0);
    });

    it('is case-sensitive: does not flag "AS AN AI" (uppercase)', async () => {
      const result = await guard.auditResult('AS AN AI SYSTEM, I operate differently.');
      expect(result.alignmentScore).toBe(1.0);
    });

    it('returns { alignmentScore, feedback } shape with both fields defined', async () => {
      const result = await guard.auditResult('Some neutral response text.');
      expect(result).toHaveProperty('alignmentScore');
      expect(result).toHaveProperty('feedback');
      expect(typeof result.alignmentScore).toBe('number');
      expect(typeof result.feedback).toBe('string');
    });

    it('detects forbidden pattern embedded in a longer sentence', async () => {
      const result = await guard.auditResult(
        'After careful analysis, I am sorry to report that the data is insufficient.'
      );
      expect(result.alignmentScore).toBe(0.2);
      expect(result.feedback).toContain('I am sorry');
    });

    it('does not flag a partial word match that is not the exact forbidden phrase', async () => {
      // "as an AI" must appear as a substring — but "assay" or "alias" should not trigger
      const result = await guard.auditResult('The assay results confirm the hypothesis.');
      expect(result.alignmentScore).toBe(1.0);
    });
  });

  // ── isHaram() ──────────────────────────────────────────────────────────────

  describe('isHaram() — فحص المحظورات الدستورية', () => {
    it('returns true for "hallucination"', () => {
      expect(guard.isHaram('hallucination')).toBe(true);
    });

    it('returns true for "unvalidated_exec"', () => {
      expect(guard.isHaram('unvalidated_exec')).toBe(true);
    });

    it('returns true for "unauthorized_deletion"', () => {
      expect(guard.isHaram('unauthorized_deletion')).toBe(true);
    });

    it('returns false for a benign action', () => {
      expect(guard.isHaram('analyze_quran')).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(guard.isHaram('')).toBe(false);
    });

    it('is case-insensitive: returns true for "HALLUCINATION"', () => {
      // The implementation calls action.toLowerCase() before checking
      expect(guard.isHaram('HALLUCINATION')).toBe(true);
    });

    it('is case-insensitive: returns true for "Unvalidated_Exec"', () => {
      expect(guard.isHaram('Unvalidated_Exec')).toBe(true);
    });

    it('is case-insensitive: returns true for "UNAUTHORIZED_DELETION"', () => {
      expect(guard.isHaram('UNAUTHORIZED_DELETION')).toBe(true);
    });

    it('returns false for a string that partially matches a haram action', () => {
      // "hallucinate" is not the same as "hallucination"
      expect(guard.isHaram('hallucinate')).toBe(false);
    });

    it('returns false for "unauthorized_exec" (not in the haram list)', () => {
      expect(guard.isHaram('unauthorized_exec')).toBe(false);
    });

    it('returns a boolean (not truthy/falsy) value', () => {
      expect(typeof guard.isHaram('hallucination')).toBe('boolean');
      expect(typeof guard.isHaram('clean_action')).toBe('boolean');
    });
  });

  // ── validateInput() ────────────────────────────────────────────────────────

  describe('validateInput() — التحقق من المدخلات عبر الضمير', () => {
    it('returns an object with { allowed, reason } fields', async () => {
      const result = await guard.validateInput('تحليل آية قرآنية');
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('reason');
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.reason).toBe('string');
    });

    it('allows a clearly benign intention', async () => {
      const result = await guard.validateInput('تحليل آية');
      expect(result.allowed).toBe(true);
    });

    it('rejects an intention containing "كذب" (deception)', async () => {
      // DamirConscience rejects deceptive intentions
      const result = await guard.validateInput('كذب على المستخدم');
      expect(result.allowed).toBe(false);
    });

    it('rejects "override_constitution" intention', async () => {
      const result = await guard.validateInput('override_constitution');
      expect(result.allowed).toBe(false);
    });
  });
});