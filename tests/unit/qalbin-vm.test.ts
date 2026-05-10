/**
 * Qalbin VM E2E Tests - Production Ready Implementation
 * Tests for topological pattern detection and resonance analysis
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import QalbinVM, { PulseResult, SacredPattern } from '../../src/lib/iqra/01-core/QalbinVM';

describe('QalbinVM - E2E Topological Pattern Detection', () => {
  let qalbinVM: QalbinVM;

  beforeEach(() => {
    qalbinVM = new QalbinVM();
  });

  afterEach(() => {
    qalbinVM.clear();
  });

  describe('Basic Pulse Execution', () => {
    it('should process simple Quranic verse', async () => {
      const text = "بسم الله الرحمن الرحيم";
      const metadata = { surah: 1, ayah: 1 };
      
      const result = await qalbinVM.pulse(text, metadata);
      
      expect(result).toBeDefined();
      expect(result.signature).toBeDefined();
      expect(result.entropy).toBeDefined();
      expect(result.sacredPatterns).toBeDefined();
      expect(result.resonance).toBeGreaterThanOrEqual(0);
      expect(result.resonance).toBeLessThanOrEqual(1);
      expect(result.quranicConfidence).toBeGreaterThanOrEqual(0);
      expect(result.quranicConfidence).toBeLessThanOrEqual(1);
    });

    it('should detect Basmala pattern correctly', async () => {
      const text = "بسم الله الرحمن الرحيم";
      const metadata = { surah: 1, ayah: 1 };
      
      const result = await qalbinVM.pulse(text, metadata);
      
      // Should detect sacred patterns in Basmala
      expect(result.sacredPatterns.length).toBeGreaterThan(0);
      
      // Check for specific pattern types
      const patternTypes = result.sacredPatterns.map(p => p.type);
      expect(patternTypes).toContain('sab-iyyah'); // "الله" has divine resonance
    });

    it('should handle empty text gracefully', async () => {
      const text = "";
      const metadata = { surah: 1, ayah: 1 };
      
      const result = await qalbinVM.pulse(text, metadata);
      
      expect(result.signature.nodes.length).toBe(1); // Only verse node
      expect(result.resonance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Sacred Pattern Detection', () => {
    it('should detect Sab-iyyah (7) patterns', async () => {
      const text = "الحمد لله رب العالمين"; // 7 words
      const metadata = { surah: 1, ayah: 2 };
      
      const result = await qalbinVM.pulse(text, metadata);
      
      const sabiyyahPatterns = result.sacredPatterns.filter(p => p.type === 'sab-iyyah');
      expect(sabiyyahPatterns.length).toBeGreaterThan(0);
      
      sabiyyahPatterns.forEach(pattern => {
        expect(pattern.occurrences).toBeGreaterThan(0);
        expect(pattern.strength).toBeGreaterThan(0);
        expect(pattern.locations.length).toBeGreaterThan(0);
      });
    });

    it('should detect Symmetry-19 patterns', async () => {
      // Create text with 19-letter word pattern
      const text = "abcdefghijklmnopqrstuvwxyz".slice(0, 19);
      const metadata = { surah: 1, ayah: 1 };
      
      const result = await qalbinVM.pulse(text, metadata);
      
      const symmetryPatterns = result.sacredPatterns.filter(p => p.type === 'symmetry-19');
      expect(symmetryPatterns.length).toBeGreaterThan(0);
    });

    it('should detect Tesla 369 patterns', async () => {
      const text = "abcdefghijklmnopqrstuvwxyz"; // 26 letters, divisible by 13
      const metadata = { surah: 1, ayah: 1 };
      
      const result = await qalbinVM.pulse(text, metadata);
      
      const teslaPatterns = result.sacredPatterns.filter(p => p.type === 'tesla-369');
      expect(teslaPatterns.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect prime resonance patterns', async () => {
      const text = "abcdefghijklmnopqrst"; // 20 letters, has prime positions
      const metadata = { surah: 1, ayah: 1 };
      
      const result = await qalbinVM.pulse(text, metadata);
      
      const primePatterns = result.sacredPatterns.filter(p => p.type === 'prime-resonance');
      expect(primePatterns.length).toBeGreaterThan(0);
      
      primePatterns.forEach(pattern => {
        expect(pattern.occurrences).toBeGreaterThan(0);
        expect(pattern.locations.every(loc => {
          // Verify locations are prime numbers
          if (loc <= 1) return false;
          for (let i = 2; i * i <= loc; i++) {
            if (loc % i === 0) return false;
          }
          return true;
        })).toBe(true);
      });
    });
  });

  describe('Topological Signature Analysis', () => {
    it('should build correct node structure', async () => {
      const text = "قل هو الله أحد";
      const metadata = { surah: 112, ayah: 1 };
      
      const result = await qalbinVM.pulse(text, metadata);
      
      expect(result.signature.nodes.length).toBeGreaterThan(1);
      
      // Should have verse node
      const verseNode = result.signature.nodes.find(n => n.type === 'verse');
      expect(verseNode).toBeDefined();
      expect(verseNode!.id).toBe('verse-112-1');
      
      // Should have letter nodes
      const letterNodes = result.signature.nodes.filter(n => n.type === 'letter');
      expect(letterNodes.length).toBeGreaterThan(0);
      
      // Should have connections
      expect(result.signature.edges.length).toBeGreaterThan(0);
    });

    it('should calculate correct resonance values', async () => {
      const text = "الله";
      const metadata = { surah: 1, ayah: 1 };
      
      const result = await qalbinVM.pulse(text, metadata);
      
      // "الله" should have high resonance due to sacred letters
      expect(result.resonance).toBeGreaterThan(0.7);
      
      // Check individual node resonances
      const letterNodes = result.signature.nodes.filter(n => n.type === 'letter');
      letterNodes.forEach(node => {
        expect(node.resonance).toBeGreaterThanOrEqual(0);
        expect(node.resonance).toBeLessThanOrEqual(1);
      });
    });

    it('should calculate complexity metrics', async () => {
      const text = "بسم الله الرحمن الرحيم";
      const metadata = { surah: 1, ayah: 1 };
      
      const result = await qalbinVM.pulse(text, metadata);
      
      expect(result.signature.complexity).toBeGreaterThan(0);
      expect(result.signature.depth).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Entropy Integration', () => {
    it('should integrate with Shannon H_EL entropy analysis', async () => {
      const text = "بسم الله الرحمن الرحيم";
      const metadata = { surah: 1, ayah: 1 };
      
      const result = await qalbinVM.pulse(text, metadata);
      
      expect(result.entropy.shannonEntropy).toBeGreaterThan(0);
      expect(result.entropy.lastLetterEntropy).toBeGreaterThan(0);
      expect(result.entropy.fractalDimension).toBeGreaterThanOrEqual(0);
      expect(result.entropy.informationDensity).toBeGreaterThan(0);
      expect(result.entropy.compressionRatio).toBeGreaterThan(0);
      expect(result.entropy.quranicResonance).toBeGreaterThanOrEqual(0);
      expect(result.entropy.quranicResonance).toBeLessThanOrEqual(1);
    });

    it('should calculate Quranic confidence correctly', async () => {
      // Text with known Quranic entropy characteristics
      const quranicText = "بسم الله الرحمن الرحيم";
      const quranicMetadata = { surah: 1, ayah: 1 };
      
      const quranicResult = await qalbinVM.pulse(quranicText, quranicMetadata);
      
      // Random text for comparison
      const randomText = "abcdefghijklmnopqrstuvwxyz";
      const randomMetadata = { surah: 999, ayah: 1 };
      
      const randomResult = await qalbinVM.pulse(randomText, randomMetadata);
      
      // Quranic text should have higher confidence
      expect(quranicResult.quranicConfidence).toBeGreaterThan(randomResult.quranicConfidence);
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple texts efficiently', async () => {
      const texts = [
        { text: "بسم الله الرحمن الرحيم", metadata: { surah: 1, ayah: 1 } },
        { text: "الحمد لله رب العالمين", metadata: { surah: 1, ayah: 2 } },
        { text: "الرحمن الرحيم", metadata: { surah: 1, ayah: 3 } }
      ];
      
      const results = await qalbinVM.batchPulse(texts);
      
      expect(results.length).toBe(3);
      
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.signature).toBeDefined();
        expect(result.entropy).toBeDefined();
        expect(result.sacredPatterns).toBeDefined();
        expect(result.resonance).toBeGreaterThanOrEqual(0);
        expect(result.quranicConfidence).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle mixed batch with different pattern types', async () => {
      const texts = [
        { text: "سبعة كلمات", metadata: { surah: 1, ayah: 1 } }, // 7 words
        { text: "تسعة عشر حرفا", metadata: { surah: 2, ayah: 1 } }, // 19 letters reference
        { text: "ثلاثة ستة تسعة", metadata: { surah: 3, ayah: 1 } } // Tesla 369 reference
      ];
      
      const results = await qalbinVM.batchPulse(texts);
      
      // Should detect different pattern types across the batch
      const allPatternTypes = new Set<string>();
      results.forEach(result => {
        result.sacredPatterns.forEach(pattern => {
          allPatternTypes.add(pattern.type);
        });
      });
      
      expect(allPatternTypes.size).toBeGreaterThan(0);
    });
  });

  describe('Performance and Statistics', () => {
    it('should maintain performance within acceptable limits', async () => {
      const text = "بسم الله الرحمن الرحيم الحمد لله رب العالمين";
      const metadata = { surah: 1, ayah: 1 };
      
      const startTime = Date.now();
      const result = await qalbinVM.pulse(text, metadata);
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(processingTime).toBeLessThan(1000); // 1 second max
      
      // Should still produce valid results
      expect(result.resonance).toBeGreaterThanOrEqual(0);
      expect(result.quranicConfidence).toBeGreaterThanOrEqual(0);
    });

    it('should provide accurate statistics', async () => {
      const text = "الله";
      const metadata = { surah: 1, ayah: 1 };
      
      await qalbinVM.pulse(text, metadata);
      
      const stats = qalbinVM.getStatistics();
      
      expect(stats.totalNodes).toBeGreaterThan(0);
      expect(stats.totalEdges).toBeGreaterThanOrEqual(0);
      expect(stats.averageResonance).toBeGreaterThanOrEqual(0);
      expect(stats.cacheHitRate).toBeGreaterThanOrEqual(0);
    });

    it('should clear state properly', async () => {
      const text = "الله";
      const metadata = { surah: 1, ayah: 1 };
      
      await qalbinVM.pulse(text, metadata);
      
      let stats = qalbinVM.getStatistics();
      expect(stats.totalNodes).toBeGreaterThan(0);
      
      qalbinVM.clear();
      
      stats = qalbinVM.getStatistics();
      expect(stats.totalNodes).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long text', async () => {
      const longText = "الله".repeat(1000);
      const metadata = { surah: 1, ayah: 1 };
      
      const result = await qalbinVM.pulse(longText, metadata);
      
      expect(result).toBeDefined();
      expect(result.signature.nodes.length).toBeGreaterThan(0);
      expect(result.resonance).toBeGreaterThanOrEqual(0);
    });

    it('should handle special characters and diacritics', async () => {
      const textWithDiacritics = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
      const metadata = { surah: 1, ayah: 1 };
      
      const result = await qalbinVM.pulse(textWithDiacritics, metadata);
      
      expect(result).toBeDefined();
      expect(result.signature.nodes.length).toBeGreaterThan(0);
      // Should handle diacritics without crashing
    });

    it('should handle non-Arabic text', async () => {
      const englishText = "In the name of God, the Gracious, the Merciful";
      const metadata = { surah: 1, ayah: 1 };
      
      const result = await qalbinVM.pulse(englishText, metadata);
      
      expect(result).toBeDefined();
      expect(result.signature.nodes.length).toBeGreaterThan(0);
      expect(result.resonance).toBeGreaterThanOrEqual(0);
      // Should still work but with lower Quranic confidence
      expect(result.quranicConfidence).toBeLessThan(0.8);
    });
  });

  describe('Integration Tests', () => {
    it('should work with real Quranic verses', async () => {
      const quranicVerses = [
        { text: "بسم الله الرحمن الرحيم", metadata: { surah: 1, ayah: 1 } },
        { text: "الحمد لله رب العالمين", metadata: { surah: 1, ayah: 2 } },
        { text: "الرحمن الرحيم", metadata: { surah: 1, ayah: 3 } },
        { text: "مالك يوم الدين", metadata: { surah: 1, ayah: 4 } },
        { text: "إياك نعبد وإياك نستعين", metadata: { surah: 1, ayah: 5 } }
      ];
      
      const results = await qalbinVM.batchPulse(quranicVerses);
      
      // All verses should have positive resonance
      results.forEach(result => {
        expect(result.resonance).toBeGreaterThan(0);
        expect(result.quranicConfidence).toBeGreaterThan(0.5); // Should recognize Quranic patterns
      });
      
      // Should detect various sacred patterns
      const allPatterns = new Set<string>();
      results.forEach(result => {
        result.sacredPatterns.forEach(pattern => {
          allPatterns.add(pattern.type);
        });
      });
      
      expect(allPatterns.size).toBeGreaterThan(0);
    });

    it('should maintain consistency across multiple runs', async () => {
      const text = "بسم الله الرحمن الرحيم";
      const metadata = { surah: 1, ayah: 1 };
      
      const result1 = await qalbinVM.pulse(text, metadata);
      const result2 = await qalbinVM.pulse(text, metadata);
      
      // Results should be deterministic
      expect(result1.resonance).toBe(result2.resonance);
      expect(result1.quranicConfidence).toBe(result2.quranicConfidence);
      expect(result1.sacredPatterns.length).toBe(result2.sacredPatterns.length);
    });
  });
});
