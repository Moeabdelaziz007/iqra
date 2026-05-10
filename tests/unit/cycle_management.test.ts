// بسم الله الرحمن الرحيم

/**
 * 🧪 Cycle Management Unit Tests
 * النية: التحقق من منطق إدارة الدورات لمنع الحلقات اللانهائية
 * المرجع: "وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ" — الأنبياء: 30
 *
 * Tests for: initCycles(), incrementCycle(), wouldExceedMaxCycles()
 * Source: lib/iqra/01-core/mission-context.ts (P0 Fix: cycle counter)
 */

import { describe, it, expect } from 'vitest';
import {
  initCycles,
  incrementCycle,
  wouldExceedMaxCycles,
  type CycleMetadata,
} from '#core/mission-context';

// ══════════════════════════════════════════════════════════════
// initCycles() — تهيئة البيانات الوصفية للدورات
// ══════════════════════════════════════════════════════════════

describe('initCycles() — Initialize Cycle Metadata', () => {
  it('should return count=0 on initialization', () => {
    const cycles = initCycles();
    expect(cycles.count).toBe(0);
  });

  it('should set default maxCycles to 3', () => {
    const cycles = initCycles();
    expect(cycles.maxCycles).toBe(3);
  });

  it('should return empty history on initialization', () => {
    const cycles = initCycles();
    expect(cycles.history).toEqual([]);
    expect(Array.isArray(cycles.history)).toBe(true);
  });

  it('should return a new object each time (no shared state)', () => {
    const cycles1 = initCycles();
    const cycles2 = initCycles();
    cycles1.history.push('test-transition');
    expect(cycles2.history).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════
// incrementCycle() — زيادة العداد والتحقق من الحد الأقصى
// ══════════════════════════════════════════════════════════════

describe('incrementCycle() — Increment Cycle Count', () => {
  it('should increment count from 0 to 1', () => {
    const initial = initCycles();
    const result = incrementCycle(initial, 'Planner->Researcher');
    expect(result.count).toBe(1);
  });

  it('should add the worker transition to history', () => {
    const initial = initCycles();
    const result = incrementCycle(initial, 'Planner->Researcher');
    expect(result.history).toContain('Planner->Researcher');
    expect(result.history.length).toBe(1);
  });

  it('should accumulate history across multiple increments', () => {
    let cycles = initCycles();
    cycles = incrementCycle(cycles, 'Planner->Researcher');
    cycles = incrementCycle(cycles, 'Researcher->Builder');
    cycles = incrementCycle(cycles, 'Builder->Validator');

    expect(cycles.count).toBe(3);
    expect(cycles.history).toEqual([
      'Planner->Researcher',
      'Researcher->Builder',
      'Builder->Validator',
    ]);
  });

  it('should preserve maxCycles when incrementing', () => {
    const initial = initCycles();
    const result = incrementCycle(initial, 'Worker->Worker');
    expect(result.maxCycles).toBe(3);
  });

  it('should NOT mutate the original cycles object', () => {
    const initial = initCycles();
    incrementCycle(initial, 'Planner->Researcher');
    // original should remain unchanged
    expect(initial.count).toBe(0);
    expect(initial.history).toEqual([]);
  });

  it('should allow exactly maxCycles increments without throwing', () => {
    let cycles = initCycles(); // maxCycles = 3
    expect(() => {
      cycles = incrementCycle(cycles, 'transition-1');
      cycles = incrementCycle(cycles, 'transition-2');
      cycles = incrementCycle(cycles, 'transition-3');
    }).not.toThrow();
    expect(cycles.count).toBe(3);
  });

  it('should throw MAX_CYCLES_REACHED when exceeding maxCycles', () => {
    let cycles = initCycles(); // maxCycles = 3
    cycles = incrementCycle(cycles, 'transition-1');
    cycles = incrementCycle(cycles, 'transition-2');
    cycles = incrementCycle(cycles, 'transition-3');
    // 4th increment should throw
    expect(() => {
      incrementCycle(cycles, 'transition-4');
    }).toThrow('MAX_CYCLES_REACHED');
  });

  it('should include maxCycles in the MAX_CYCLES_REACHED error message', () => {
    let cycles = initCycles(); // maxCycles = 3
    cycles = incrementCycle(cycles, 't1');
    cycles = incrementCycle(cycles, 't2');
    cycles = incrementCycle(cycles, 't3');
    expect(() => {
      incrementCycle(cycles, 't4');
    }).toThrow(/maximum allowed cycles \(3\)/);
  });

  it('should include the attempted transition in the error message', () => {
    let cycles = initCycles();
    cycles = incrementCycle(cycles, 't1');
    cycles = incrementCycle(cycles, 't2');
    cycles = incrementCycle(cycles, 't3');
    expect(() => {
      incrementCycle(cycles, 'ForbiddenTransition');
    }).toThrow('ForbiddenTransition');
  });

  it('should include transition history in the error message', () => {
    let cycles = initCycles();
    cycles = incrementCycle(cycles, 'A->B');
    cycles = incrementCycle(cycles, 'B->C');
    cycles = incrementCycle(cycles, 'C->A');
    expect(() => {
      incrementCycle(cycles, 'A->B-again');
    }).toThrow('A->B');
  });

  // Boundary: undefined input defaults to fresh CycleMetadata
  it('should handle undefined cycles by defaulting to initCycles()', () => {
    const result = incrementCycle(undefined, 'first-transition');
    expect(result.count).toBe(1);
    expect(result.maxCycles).toBe(3);
    expect(result.history).toEqual(['first-transition']);
  });

  it('should throw after exactly maxCycles when starting from undefined', () => {
    let cycles = incrementCycle(undefined, 't1');
    cycles = incrementCycle(cycles, 't2');
    cycles = incrementCycle(cycles, 't3');
    expect(() => {
      incrementCycle(cycles, 't4');
    }).toThrow('MAX_CYCLES_REACHED');
  });

  // Custom maxCycles scenarios
  it('should respect custom maxCycles when provided directly', () => {
    const customCycles: CycleMetadata = {
      count: 0,
      maxCycles: 1,
      history: [],
    };
    const afterFirst = incrementCycle(customCycles, 'only-one');
    expect(afterFirst.count).toBe(1);
    // Second increment should throw because maxCycles=1
    expect(() => {
      incrementCycle(afterFirst, 'second-attempt');
    }).toThrow('MAX_CYCLES_REACHED');
  });

  it('should include "infinite loop" warning in error message', () => {
    let cycles = initCycles();
    cycles = incrementCycle(cycles, 't1');
    cycles = incrementCycle(cycles, 't2');
    cycles = incrementCycle(cycles, 't3');
    expect(() => {
      incrementCycle(cycles, 't4');
    }).toThrow(/infinite loop/);
  });
});

// ══════════════════════════════════════════════════════════════
// wouldExceedMaxCycles() — التحقق غير المُلقي للاستثناءات
// ══════════════════════════════════════════════════════════════

describe('wouldExceedMaxCycles() — Non-throwing Cycle Check', () => {
  it('should return false when count is 0 (well below max)', () => {
    const cycles = initCycles(); // count=0, max=3
    expect(wouldExceedMaxCycles(cycles)).toBe(false);
  });

  it('should return false when count is below maxCycles', () => {
    let cycles = initCycles();
    cycles = incrementCycle(cycles, 't1');
    cycles = incrementCycle(cycles, 't2');
    // count=2, max=3
    expect(wouldExceedMaxCycles(cycles)).toBe(false);
  });

  it('should return true when count equals maxCycles', () => {
    let cycles = initCycles();
    cycles = incrementCycle(cycles, 't1');
    cycles = incrementCycle(cycles, 't2');
    cycles = incrementCycle(cycles, 't3');
    // count=3, max=3 → at limit
    expect(wouldExceedMaxCycles(cycles)).toBe(true);
  });

  it('should return false when count is 0 and maxCycles is 1', () => {
    const cycles: CycleMetadata = { count: 0, maxCycles: 1, history: [] };
    expect(wouldExceedMaxCycles(cycles)).toBe(false);
  });

  it('should return true when count equals maxCycles=1', () => {
    const cycles: CycleMetadata = { count: 1, maxCycles: 1, history: [] };
    expect(wouldExceedMaxCycles(cycles)).toBe(true);
  });

  it('should handle undefined cycles by defaulting (count=0, max=3) → false', () => {
    expect(wouldExceedMaxCycles(undefined)).toBe(false);
  });

  it('should NOT throw even when cycles would be exceeded', () => {
    const atLimit: CycleMetadata = { count: 10, maxCycles: 3, history: [] };
    expect(() => wouldExceedMaxCycles(atLimit)).not.toThrow();
    expect(wouldExceedMaxCycles(atLimit)).toBe(true);
  });

  it('should return boolean type', () => {
    const result = wouldExceedMaxCycles(initCycles());
    expect(typeof result).toBe('boolean');
  });
});

// ══════════════════════════════════════════════════════════════
// Integration: wouldExceedMaxCycles + incrementCycle interplay
// ══════════════════════════════════════════════════════════════

describe('Cycle Management — Integration & Regression', () => {
  it('wouldExceedMaxCycles should be true exactly when incrementCycle would throw', () => {
    let cycles = initCycles();
    cycles = incrementCycle(cycles, 't1');
    cycles = incrementCycle(cycles, 't2');
    cycles = incrementCycle(cycles, 't3');

    // At this point, wouldExceedMaxCycles should predict the throw
    expect(wouldExceedMaxCycles(cycles)).toBe(true);
    expect(() => incrementCycle(cycles, 't4')).toThrow('MAX_CYCLES_REACHED');
  });

  it('should allow guard pattern: check before increment', () => {
    let cycles = initCycles();

    const safeIncrement = (c: CycleMetadata, transition: string): CycleMetadata | null => {
      if (wouldExceedMaxCycles(c)) return null;
      return incrementCycle(c, transition);
    };

    cycles = safeIncrement(cycles, 't1') ?? cycles;
    cycles = safeIncrement(cycles, 't2') ?? cycles;
    cycles = safeIncrement(cycles, 't3') ?? cycles;
    // 4th should return null via guard
    const result = safeIncrement(cycles, 't4');
    expect(result).toBeNull();
    // Original cycles unchanged at count=3
    expect(cycles.count).toBe(3);
  });

  it('history should reflect only successful transitions', () => {
    let cycles = initCycles();
    cycles = incrementCycle(cycles, 'A->B');
    cycles = incrementCycle(cycles, 'B->C');
    cycles = incrementCycle(cycles, 'C->D');

    // At max — no more allowed
    expect(cycles.history.length).toBe(3);
    expect(cycles.history).toEqual(['A->B', 'B->C', 'C->D']);
  });
});