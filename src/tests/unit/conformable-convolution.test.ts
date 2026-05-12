/**
 * Unit Tests: ConformableConvolution
 * Tests the FeTA 2024 research-inspired topological convolution:
 * cubical complex construction, posterior generation, kernel adaptation,
 * consistency scoring, and metrics computation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConformableConvolution,
  ConformableConvolutionResult,
} from '#core/ConformableConvolution';
import type { TopologicalSignature, QalbinNode } from '#core/QalbinVM';
import type { ShannonEntropyResult } from '#core/ShannonHELEntropy';

// ── Test Fixtures ─────────────────────────────────────────────────────────────

function makeNode(id: string, resonance: number, depth = 1): QalbinNode {
  return {
    id,
    value: id,
    type: 'letter',
    connections: [],
    resonance,
    depth,
  };
}

function makeSignature(nodeCount = 4, resonance = 0.75): TopologicalSignature {
  const nodes: QalbinNode[] = [];

  // Verse node
  nodes.push({
    id: 'verse-1-1',
    value: 'test',
    type: 'verse',
    connections: [],
    resonance: resonance,
    depth: 0,
  });

  for (let i = 0; i < nodeCount - 1; i++) {
    nodes.push(makeNode(`letter-1-1-${i}`, resonance - i * 0.05));
  }

  const edges = nodes.slice(1).map(n => ({
    from: 'verse-1-1',
    to: n.id,
    weight: 1.0,
  }));

  // Update connections
  for (const edge of edges) {
    const fromNode = nodes.find(n => n.id === edge.from)!;
    const toNode = nodes.find(n => n.id === edge.to)!;
    fromNode.connections.push(toNode.id);
    toNode.connections.push(fromNode.id);
  }

  return {
    nodes,
    edges,
    resonance,
    depth: 1,
    complexity: nodes.length * Math.log2(nodes.length + 1),
  };
}

function makeEntropy(quranicResonance = 0.9): ShannonEntropyResult {
  return {
    shannonEntropy: 3.2,
    lastLetterEntropy: 2.1,
    fractalDimension: 1.5,
    informationDensity: 0.8,
    compressionRatio: 0.6,
    quranicResonance,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ConformableConvolution', () => {
  let convolution: ConformableConvolution;

  beforeEach(() => {
    convolution = new ConformableConvolution();
  });

  // ── Constructor ──────────────────────────────────────────────────────────

  describe('Constructor', () => {
    it('should instantiate with default kernel size 3', () => {
      expect(() => new ConformableConvolution()).not.toThrow();
    });

    it('should instantiate with custom kernel size', () => {
      expect(() => new ConformableConvolution(5)).not.toThrow();
    });
  });

  // ── applyConformableConvolution – Result Structure ────────────────────────

  describe('applyConformableConvolution – result structure', () => {
    it('should return all required fields in result', async () => {
      const signature = makeSignature(4);
      const entropy = makeEntropy();

      const result: ConformableConvolutionResult =
        await convolution.applyConformableConvolution(signature, entropy);

      expect(result).toBeDefined();
      expect(result.feature_map).toBeDefined();
      expect(result.posterior).toBeDefined();
      expect(result.kernel).toBeDefined();
      expect(typeof result.consistency_score).toBe('number');
      expect(result.metrics).toBeDefined();
    });

    it('should have non-empty feature_map', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(9),
        makeEntropy()
      );

      expect(result.feature_map.length).toBeGreaterThan(0);
      expect(result.feature_map[0].length).toBeGreaterThan(0);
    });

    it('should return feature_map as a 2D array of numbers', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(9),
        makeEntropy()
      );

      for (const row of result.feature_map) {
        for (const val of row) {
          expect(typeof val).toBe('number');
        }
      }
    });
  });

  // ── Consistency Score ─────────────────────────────────────────────────────

  describe('consistency_score', () => {
    it('should return consistency_score in [0, 1] range', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(4),
        makeEntropy()
      );

      expect(result.consistency_score).toBeGreaterThanOrEqual(0);
      expect(result.consistency_score).toBeLessThanOrEqual(1);
    });

    it('should return a numeric consistency_score for a single-node signature', async () => {
      const single = makeSignature(1, 0.8);
      const result = await convolution.applyConformableConvolution(single, makeEntropy());

      expect(typeof result.consistency_score).toBe('number');
    });
  });

  // ── Metrics ───────────────────────────────────────────────────────────────

  describe('metrics', () => {
    it('should have non-negative convergence_iterations', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(9),
        makeEntropy()
      );

      expect(result.metrics.convergence_iterations).toBeGreaterThanOrEqual(0);
    });

    it('should have non-negative topological_loss', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(4),
        makeEntropy()
      );

      expect(result.metrics.topological_loss).toBeGreaterThanOrEqual(0);
    });

    it('should have non-negative final_resonance', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(4),
        makeEntropy(0.95)
      );

      expect(result.metrics.final_resonance).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Kernel Structure ──────────────────────────────────────────────────────

  describe('kernel', () => {
    it('should return kernel with correct size field', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(4),
        makeEntropy()
      );

      expect(result.kernel.size).toBeGreaterThan(0);
    });

    it('should return square kernel weights matrix', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(9),
        makeEntropy()
      );

      const { kernel } = result;
      expect(kernel.weights.length).toBe(kernel.size);
      kernel.weights.forEach(row => {
        expect(row.length).toBe(kernel.size);
      });
    });

    it('should return offsets matrix of correct size', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(9),
        makeEntropy()
      );

      const { kernel } = result;
      expect(kernel.offsets.length).toBe(kernel.size);
      kernel.offsets.forEach(row => {
        expect(row.length).toBe(kernel.size);
      });
    });

    it('should return topological_weights matrix of correct size', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(9),
        makeEntropy()
      );

      const { kernel } = result;
      expect(kernel.topological_weights.length).toBe(kernel.size);
      kernel.topological_weights.forEach(row => {
        expect(row.length).toBe(kernel.size);
      });
    });
  });

  // ── Posterior Structure ───────────────────────────────────────────────────

  describe('posterior', () => {
    it('should contain a significance_map', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(9),
        makeEntropy()
      );

      expect(result.posterior.significance_map).toBeDefined();
      expect(result.posterior.significance_map instanceof Map).toBe(true);
    });

    it('should contain a barcode array', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(9),
        makeEntropy()
      );

      expect(Array.isArray(result.posterior.barcode)).toBe(true);
    });

    it('should contain euler_characteristic array', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(9),
        makeEntropy()
      );

      expect(Array.isArray(result.posterior.euler_characteristic)).toBe(true);
    });

    it('should generate euler_characteristic with 10 filtration steps', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(9),
        makeEntropy()
      );

      // FILTRATION_STEPS = 10
      expect(result.posterior.euler_characteristic).toHaveLength(10);
    });

    it('should have barcode entries with required fields', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(9),
        makeEntropy()
      );

      for (const entry of result.posterior.barcode) {
        expect(typeof entry.dimension).toBe('number');
        expect(typeof entry.birth).toBe('number');
        expect(typeof entry.death).toBe('number');
        expect(typeof entry.persistence).toBe('number');
        expect(entry.persistence).toBeCloseTo(entry.death - entry.birth, 10);
      }
    });
  });

  // ── Adaptive Kernel Offsets ───────────────────────────────────────────────

  describe('adaptive kernel offsets', () => {
    it('should produce non-zero offsets given non-zero significance', async () => {
      // Use a signature with high resonance to trigger non-trivial significance values
      const signature = makeSignature(9, 0.9);
      const result = await convolution.applyConformableConvolution(signature, makeEntropy(0.95));

      // At least some offsets should be non-zero (topological significance > 0 for a rich signature)
      const allOffsets = result.kernel.offsets.flat();
      const hasNonZero = allOffsets.some(o => o !== 0);
      expect(hasNonZero).toBe(true);
    });

    it('should produce topological_weights >= 1.0', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(9, 0.9),
        makeEntropy()
      );

      const allWeights = result.kernel.topological_weights.flat();
      allWeights.forEach(w => {
        expect(w).toBeGreaterThanOrEqual(1.0);
      });
    });
  });

  // ── Different Kernel Sizes ─────────────────────────────────────────────────

  describe('different kernel sizes', () => {
    it('should work with kernel size 1', async () => {
      const cc = new ConformableConvolution(1);
      const result = await cc.applyConformableConvolution(makeSignature(4), makeEntropy());

      expect(result.kernel.size).toBe(1);
      expect(result.feature_map.length).toBeGreaterThan(0);
    });

    it('should work with kernel size 5', async () => {
      const cc = new ConformableConvolution(5);
      const result = await cc.applyConformableConvolution(makeSignature(9), makeEntropy());

      expect(result.kernel.size).toBe(5);
      expect(result.feature_map.length).toBeGreaterThan(0);
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle empty node list (only verse node)', async () => {
      const emptySignature: TopologicalSignature = {
        nodes: [
          {
            id: 'verse-0-0',
            value: '',
            type: 'verse',
            connections: [],
            resonance: 0,
            depth: 0,
          },
        ],
        edges: [],
        resonance: 0,
        depth: 0,
        complexity: 0,
      };
      const result = await convolution.applyConformableConvolution(emptySignature, makeEntropy(0));

      expect(result).toBeDefined();
      expect(result.consistency_score).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero quranicResonance in entropy', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(4),
        makeEntropy(0)
      );

      expect(result.metrics.final_resonance).toBeGreaterThanOrEqual(0);
    });

    it('should handle maximum quranicResonance (1.0)', async () => {
      const result = await convolution.applyConformableConvolution(
        makeSignature(4),
        makeEntropy(1.0)
      );

      expect(result.metrics.final_resonance).toBeGreaterThanOrEqual(0);
      expect(result.metrics.final_resonance).toBeLessThanOrEqual(1.0);
    });

    it('should handle large signature (100 nodes) without throwing', async () => {
      const largeSignature = makeSignature(100, 0.7);
      await expect(
        convolution.applyConformableConvolution(largeSignature, makeEntropy())
      ).resolves.toBeDefined();
    });
  });

  // ── Consistency Across Calls ──────────────────────────────────────────────

  describe('consistency across calls', () => {
    it('should return consistent structure on repeated calls with same input', async () => {
      const signature = makeSignature(9, 0.8);
      const entropy = makeEntropy(0.85);

      const result1 = await convolution.applyConformableConvolution(signature, entropy);
      const result2 = await convolution.applyConformableConvolution(signature, entropy);

      // Feature map dimensions should be identical
      expect(result1.feature_map.length).toBe(result2.feature_map.length);
      expect(result1.feature_map[0].length).toBe(result2.feature_map[0].length);

      // Posterior barcode length should be consistent
      expect(result1.posterior.barcode.length).toBe(result2.posterior.barcode.length);

      // Euler characteristic length should be 10 (FILTRATION_STEPS)
      expect(result1.posterior.euler_characteristic.length).toBe(
        result2.posterior.euler_characteristic.length
      );
    });
  });
});