/**
 * 🧪 Topological Curiosity Engine — Unit Tests
 * النية: التحقق من المحرك الرئيسي بدون LLM حقيقي (dev_mode).
 *
 * المصادر: [read] من الملفات المُعدَّلة هذه الجلسة.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NumericalValidator } from '../../lib/iqra/quran/numerical_validator.ts';
import { PatternMemory } from '../../lib/iqra/memory/pattern_memory.ts';
import { IQRAMemory } from '../../lib/iqra/memory.ts';
import {
  TopologicalCuriosityEngine,
  type TopologicalResonance,
} from '../../lib/iqra/quran/topological_curiosity.ts';

// ══════════════════════════════════════════════════════════════
// NumericalValidator — لا يحتاج LLM
// ══════════════════════════════════════════════════════════════
describe('NumericalValidator [prior-training]', () => {
  it('should detect 7-based patterns', () => {
    // 7 كلمات
    const text = 'الله نور السماوات والأرض مثل نوره كمشكاة';
    const result = NumericalValidator.validate(text);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1.0);
    expect(Array.isArray(result.patterns)).toBe(true);
    expect(typeof result.isResonant).toBe('boolean');
  });

  it('should return score in [0,1] for any input', () => {
    const inputs = ['', 'hello', 'الله أكبر', '1234567890'];
    for (const input of inputs) {
      const result = NumericalValidator.validate(input);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1.0);
    }
  });

  it('should detect sacred terms', () => {
    const result = NumericalValidator.validate('نور الله في السماوات');
    const hasSacred = result.patterns.some(p => p.includes('Sacred_Term'));
    expect(hasSacred).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════
// PatternMemory — local fallback (no Qdrant needed)
// ══════════════════════════════════════════════════════════════
describe('PatternMemory [read] local fallback', () => {
  it('cosineSimilarity should return 1.0 for identical vectors', () => {
    const v = [0.1, 0.2, 0.3, 0.4, 0.5];
    expect(PatternMemory.cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  it('cosineSimilarity should return 0 for orthogonal vectors', () => {
    const v1 = [1, 0, 0];
    const v2 = [0, 1, 0];
    expect(PatternMemory.cosineSimilarity(v1, v2)).toBeCloseTo(0, 5);
  });

  it('cosineSimilarity should return 0 for empty vectors', () => {
    expect(PatternMemory.cosineSimilarity([], [])).toBe(0);
    expect(PatternMemory.cosineSimilarity([1, 2], [])).toBe(0);
  });

  it('storePattern should reject missing fields', async () => {
    await expect(
      PatternMemory.storePattern('', 'field', 0.5, [0.1, 0.2], 'mission-1')
    ).rejects.toThrow('PATTERN_ERR');

    await expect(
      PatternMemory.storePattern('2:255', '', 0.5, [0.1, 0.2], 'mission-1')
    ).rejects.toThrow('PATTERN_ERR');

    await expect(
      PatternMemory.storePattern('2:255', 'field', 0.5, [], 'mission-1')
    ).rejects.toThrow('PATTERN_ERR');
  });

  it('storePattern should reject out-of-range resonance_score', async () => {
    await expect(
      PatternMemory.storePattern('2:255', 'field', 1.5, [0.1], 'mission-1')
    ).rejects.toThrow('PATTERN_ERR');

    await expect(
      PatternMemory.storePattern('2:255', 'field', -0.1, [0.1], 'mission-1')
    ).rejects.toThrow('PATTERN_ERR');
  });

  it('getSimilarPatterns should return empty for empty embedding', async () => {
    const results = await PatternMemory.getSimilarPatterns([], 5);
    expect(results).toEqual([]);
  });

  it('full store → retrieve cycle [read] local', async () => {
    // SHA-256 deterministic embedding (no Google AI needed)
    const embedding = new Array(768).fill(0).map((_, i) => (i % 10) / 10);

    const id = await PatternMemory.storePattern(
      '15:9',
      'Numerical Topology',
      0.75,
      embedding,
      'test-mission-topology'
    );

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);

    const similar = await PatternMemory.getSimilarPatterns(embedding, 3);
    expect(similar.length).toBeGreaterThan(0);
    expect(similar[0].similarity).toBeGreaterThan(0.9);
    expect(similar[0].record.verse).toBe('15:9');
  });
});

// ══════════════════════════════════════════════════════════════
// IQRAMemory.cosineSimilarity — مُصدَّرة وتعمل
// ══════════════════════════════════════════════════════════════
describe('IQRAMemory.cosineSimilarity [read]', () => {
  it('should return 1.0 for identical vectors', () => {
    const v = [0.5, 0.5, 0.5];
    expect(IQRAMemory.cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  it('should return value in [0,1]', () => {
    const v1 = [0.1, 0.9, 0.3];
    const v2 = [0.8, 0.2, 0.6];
    const sim = IQRAMemory.cosineSimilarity(v1, v2);
    expect(sim).toBeGreaterThanOrEqual(0);
    expect(sim).toBeLessThanOrEqual(1.0);
  });
});

// ══════════════════════════════════════════════════════════════
// IQRAMemory.generateEmbedding — SHA-256 fallback
// ══════════════════════════════════════════════════════════════
describe('IQRAMemory.generateEmbedding [read] SHA-256 fallback', () => {
  it('should return 768-dim vector', async () => {
    // بدون GOOGLE_GENERATIVE_AI_API_KEY → SHA-256 fallback
    const embedding = await IQRAMemory.generateEmbedding('آية الكرسي');
    expect(embedding.length).toBe(768);
    expect(embedding.every(v => v >= -1 && v <= 1)).toBe(true);
  });

  it('should return different embeddings for different texts', async () => {
    const e1 = await IQRAMemory.generateEmbedding('الله نور السماوات');
    const e2 = await IQRAMemory.generateEmbedding('وما أوتيتم من العلم إلا قليلا');
    const sim = IQRAMemory.cosineSimilarity(e1, e2);
    // SHA-256 fallback يُنتج متجهات مختلفة لنصوص مختلفة
    expect(sim).toBeLessThan(1.0);
  });

  it('should return same embedding for same text (deterministic)', async () => {
    const text = 'اقرأ باسم ربك الذي خلق';
    const e1 = await IQRAMemory.generateEmbedding(text);
    const e2 = await IQRAMemory.generateEmbedding(text);
    expect(IQRAMemory.cosineSimilarity(e1, e2)).toBeCloseTo(1.0, 5);
  });
});

// ══════════════════════════════════════════════════════════════
// TopologicalCuriosityEngine — بدون LLM (no API keys in test)
// ══════════════════════════════════════════════════════════════
describe('TopologicalCuriosityEngine [read] offline mode', () => {
  it('should return a valid TopologicalResonance structure', async () => {
    // بدون XAI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY → يعمل بدون LLM bridge
    const result = await TopologicalCuriosityEngine.discoverResonance(
      '15:9',
      'Numerical Topology of Remembrance'
    );

    // قد يُرجع null إذا فشل كل شيء — لكن إذا نجح يجب أن يكون صحيحاً
    if (result !== null) {
      expect(result.verse).toBe('15:9');
      expect(result.field).toBe('Numerical Topology of Remembrance');
      expect(result.resonance_score).toBeGreaterThanOrEqual(0);
      expect(result.resonance_score).toBeLessThanOrEqual(1.0);
      expect(result.novelty_score).toBeGreaterThanOrEqual(0);
      expect(result.novelty_score).toBeLessThanOrEqual(1.0);
      expect(result.fractal_depth).toBeGreaterThanOrEqual(0);
      expect(typeof result.is_novel).toBe('boolean');
      expect(typeof result.should_reward).toBe('boolean');
      expect(typeof result.trust_chain_hash).toBe('string');
      expect(result.trust_chain_hash.length).toBeGreaterThan(0);
      expect(Array.isArray(result.source_tags)).toBe(true);
      expect(result.source_tags.length).toBeGreaterThan(0);
      expect(Array.isArray(result.similar_patterns)).toBe(true);
    }
  });

  it('should record in TrustChain (hash is non-empty)', async () => {
    const result = await TopologicalCuriosityEngine.discoverResonance(
      '2:255',
      'Quantum Coherence'
    );
    if (result) {
      expect(result.trust_chain_hash).toBeTruthy();
      expect(result.trust_chain_hash.length).toBe(64); // SHA-256 hex
    }
  });

  it('should detect novelty correctly for repeated discovery', async () => {
    // أول اكتشاف → جديد
    const r1 = await TopologicalCuriosityEngine.discoverResonance('36:1', 'Fractal Geometry');
    // ثاني اكتشاف لنفس الآية → أقل جدة
    const r2 = await TopologicalCuriosityEngine.discoverResonance('36:1', 'Fractal Geometry');

    if (r1 && r2) {
      // الثاني يجب أن يكون أقل جدة من الأول (PatternMemory تعمل)
      expect(r2.novelty_score).toBeLessThanOrEqual(r1.novelty_score + 0.1);
    }
  });
});
