/**
 * Tests for cycle management functions in mission-context.ts
 * Added in PR: CycleMetadata interface, initCycles, incrementCycle, wouldExceedMaxCycles
 * Purpose: Prevent infinite loops in worker handoffs
 */

import { describe, it, expect } from 'vitest';
import {
  initCycles,
  incrementCycle,
  wouldExceedMaxCycles,
  type CycleMetadata,
} from '#core/mission-context';

describe('mission-context — Cycle Management (إدارة الدورات)', () => {

  // ── initCycles ─────────────────────────────────────────────────────────────

  describe('initCycles()', () => {
    it('returns a fresh CycleMetadata with count=0', () => {
      const cycles = initCycles();
      expect(cycles.count).toBe(0);
    });

    it('sets maxCycles to default of 3', () => {
      const cycles = initCycles();
      expect(cycles.maxCycles).toBe(3);
    });

    it('starts with an empty history array', () => {
      const cycles = initCycles();
      expect(cycles.history).toEqual([]);
    });

    it('returns a new object each call (no shared state)', () => {
      const a = initCycles();
      const b = initCycles();
      a.history.push('test');
      expect(b.history).toEqual([]);
    });
  });

  // ── incrementCycle ─────────────────────────────────────────────────────────

  describe('incrementCycle()', () => {
    it('increments count from 0 to 1', () => {
      const cycles = initCycles();
      const updated = incrementCycle(cycles, 'planner→researcher');
      expect(updated.count).toBe(1);
    });

    it('appends the worker transition to history', () => {
      const cycles = initCycles();
      const updated = incrementCycle(cycles, 'planner→researcher');
      expect(updated.history).toContain('planner→researcher');
    });

    it('allows incrementing up to maxCycles (3rd cycle)', () => {
      let cycles = initCycles();
      cycles = incrementCycle(cycles, 'A→B');
      cycles = incrementCycle(cycles, 'B→C');
      cycles = incrementCycle(cycles, 'C→A');
      expect(cycles.count).toBe(3);
    });

    it('preserves previous history entries on each increment', () => {
      let cycles = initCycles();
      cycles = incrementCycle(cycles, 'step1');
      cycles = incrementCycle(cycles, 'step2');
      expect(cycles.history).toEqual(['step1', 'step2']);
    });

    it('does not mutate the original cycles object', () => {
      const original = initCycles();
      const originalCount = original.count;
      incrementCycle(original, 'A→B');
      expect(original.count).toBe(originalCount);
      expect(original.history).toHaveLength(0);
    });

    it('throws MAX_CYCLES_REACHED when count exceeds maxCycles', () => {
      let cycles = initCycles(); // maxCycles = 3
      cycles = incrementCycle(cycles, 'step1');
      cycles = incrementCycle(cycles, 'step2');
      cycles = incrementCycle(cycles, 'step3');
      // count is now 3 == maxCycles; next call would make it 4 > 3
      expect(() => incrementCycle(cycles, 'step4')).toThrowError(
        'MAX_CYCLES_REACHED'
      );
    });

    it('throws with transition info and history in the error message', () => {
      let cycles = initCycles();
      cycles = incrementCycle(cycles, 'planner→researcher');
      cycles = incrementCycle(cycles, 'researcher→builder');
      cycles = incrementCycle(cycles, 'builder→validator');

      expect(() => incrementCycle(cycles, 'validator→planner')).toThrowError(
        /validator→planner/
      );
    });

    it('throws with history included in the error message', () => {
      let cycles = initCycles();
      cycles = incrementCycle(cycles, 'A→B');
      cycles = incrementCycle(cycles, 'B→C');
      cycles = incrementCycle(cycles, 'C→A');

      try {
        incrementCycle(cycles, 'A→B');
        expect.fail('Expected an error to be thrown');
      } catch (e: any) {
        expect(e.message).toContain('A→B');
        expect(e.message).toContain('B→C');
      }
    });

    it('accepts undefined cycles and initializes defaults (uses initCycles internally)', () => {
      const updated = incrementCycle(undefined, 'A→B');
      expect(updated.count).toBe(1);
      expect(updated.history).toContain('A→B');
    });

    it('increments correctly when given custom maxCycles via existing object', () => {
      const cycles: CycleMetadata = { count: 0, maxCycles: 5, history: [] };
      let c = incrementCycle(cycles, 'step1');
      c = incrementCycle(c, 'step2');
      c = incrementCycle(c, 'step3');
      c = incrementCycle(c, 'step4');
      c = incrementCycle(c, 'step5');
      expect(c.count).toBe(5);
      // step 6 should throw
      expect(() => incrementCycle(c, 'step6')).toThrowError('MAX_CYCLES_REACHED');
    });
  });

  // ── wouldExceedMaxCycles ───────────────────────────────────────────────────

  describe('wouldExceedMaxCycles()', () => {
    it('returns false when count is 0 (no cycles used)', () => {
      const cycles = initCycles();
      expect(wouldExceedMaxCycles(cycles)).toBe(false);
    });

    it('returns false when count is below maxCycles', () => {
      const cycles: CycleMetadata = { count: 1, maxCycles: 3, history: [] };
      expect(wouldExceedMaxCycles(cycles)).toBe(false);
    });

    it('returns true when count equals maxCycles (next would exceed)', () => {
      const cycles: CycleMetadata = { count: 3, maxCycles: 3, history: [] };
      expect(wouldExceedMaxCycles(cycles)).toBe(true);
    });

    it('returns true when count exceeds maxCycles', () => {
      const cycles: CycleMetadata = { count: 5, maxCycles: 3, history: [] };
      expect(wouldExceedMaxCycles(cycles)).toBe(true);
    });

    it('returns false for undefined (treats as fresh initCycles)', () => {
      expect(wouldExceedMaxCycles(undefined)).toBe(false);
    });

    it('returns false on count=2, maxCycles=3 (one cycle remains)', () => {
      const cycles: CycleMetadata = { count: 2, maxCycles: 3, history: [] };
      expect(wouldExceedMaxCycles(cycles)).toBe(false);
    });

    it('does not throw — non-throwing version', () => {
      const cycles: CycleMetadata = { count: 100, maxCycles: 1, history: [] };
      expect(() => wouldExceedMaxCycles(cycles)).not.toThrow();
    });
  });

  // ── Integration: Combined cycle logic ─────────────────────────────────────

  describe('Integration — combined cycle behavior', () => {
    it('wouldExceedMaxCycles correctly predicts incrementCycle throw', () => {
      let cycles = initCycles();
      cycles = incrementCycle(cycles, 'A→B');
      cycles = incrementCycle(cycles, 'B→C');
      cycles = incrementCycle(cycles, 'C→A');

      // At this point count == maxCycles (3), would exceed
      expect(wouldExceedMaxCycles(cycles)).toBe(true);

      // And incrementCycle should indeed throw
      expect(() => incrementCycle(cycles, 'A→B')).toThrow();
    });

    it('wouldExceedMaxCycles is false just before limit', () => {
      let cycles = initCycles();
      cycles = incrementCycle(cycles, 'A→B');
      cycles = incrementCycle(cycles, 'B→C');

      // count=2, maxCycles=3 — one more allowed
      expect(wouldExceedMaxCycles(cycles)).toBe(false);

      // Should not throw on 3rd increment
      expect(() => incrementCycle(cycles, 'C→A')).not.toThrow();
    });

    it('history faithfully records worker transitions in order', () => {
      const transitions = ['planner', 'researcher', 'builder'];
      let cycles = initCycles();
      for (const t of transitions) {
        cycles = incrementCycle(cycles, t);
      }
      expect(cycles.history).toEqual(transitions);
    });
  });
});