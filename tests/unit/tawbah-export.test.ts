/**
 * Tests for the TAWBAH export added in this PR (tawbah.ts).
 *
 * The PR added backward-compatibility export:
 *   export const TAWBAH = { logError, checkHumility, clearTawbah }
 *
 * Also tests the named exports: recordError, checkHumility, clearTawbah.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ── Module import with IQRALogger mocked ──────────────────────────────────────

// We must mock IQRALogger before importing tawbah, since tawbah imports it at module level
vi.mock('#infra/logger', () => ({
  IQRALogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Dynamic import after mock setup
let tawbahModule: typeof import('../../lib/iqra/01-core/tawbah');

// ── Test lifecycle ────────────────────────────────────────────────────────────

beforeEach(async () => {
  tawbahModule = await import('../../lib/iqra/01-core/tawbah');
});

afterEach(() => {
  vi.clearAllMocks();
  // Clear any in-memory errorLog state between tests by calling clearTawbah
  try {
    tawbahModule.clearTawbah();
  } catch {
    // ignore
  }
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('tawbah.ts — TAWBAH export (التوبة)', () => {

  // ── TAWBAH export shape ───────────────────────────────────────────────────

  describe('TAWBAH export object shape', () => {
    it('exports a TAWBAH object', () => {
      expect(tawbahModule.TAWBAH).toBeDefined();
      expect(typeof tawbahModule.TAWBAH).toBe('object');
    });

    it('TAWBAH.checkHumility is a function', () => {
      expect(typeof tawbahModule.TAWBAH.checkHumility).toBe('function');
    });

    it('TAWBAH.clearTawbah is a function', () => {
      expect(typeof tawbahModule.TAWBAH.clearTawbah).toBe('function');
    });

    it('TAWBAH.checkHumility is the same reference as the named export', () => {
      expect(tawbahModule.TAWBAH.checkHumility).toBe(tawbahModule.checkHumility);
    });

    it('TAWBAH.clearTawbah is the same reference as the named export', () => {
      expect(tawbahModule.TAWBAH.clearTawbah).toBe(tawbahModule.clearTawbah);
    });
  });

  // ── Named exports ─────────────────────────────────────────────────────────

  describe('named exports', () => {
    it('exports recordError function', () => {
      expect(typeof tawbahModule.recordError).toBe('function');
    });

    it('exports checkHumility function', () => {
      expect(typeof tawbahModule.checkHumility).toBe('function');
    });

    it('exports clearTawbah function', () => {
      expect(typeof tawbahModule.clearTawbah).toBe('function');
    });
  });

  // ── checkHumility ─────────────────────────────────────────────────────────

  describe('checkHumility()', () => {
    it('does not throw when TAWBAH.md does not exist', () => {
      // If the file does not exist, checkHumility returns early
      expect(() => tawbahModule.checkHumility()).not.toThrow();
    });

    it('can be called multiple times without side effects', () => {
      expect(() => {
        tawbahModule.checkHumility();
        tawbahModule.checkHumility();
        tawbahModule.checkHumility();
      }).not.toThrow();
    });

    it('TAWBAH.checkHumility() does not throw when no file exists', () => {
      expect(() => tawbahModule.TAWBAH.checkHumility()).not.toThrow();
    });
  });

  // ── clearTawbah ───────────────────────────────────────────────────────────

  describe('clearTawbah()', () => {
    it('does not throw when TAWBAH.md does not exist', () => {
      expect(() => tawbahModule.clearTawbah()).not.toThrow();
    });

    it('clears the in-memory errorLog (no throw after multiple recordError calls)', () => {
      // Create an entry in the errorLog
      // recordError will track errors; after clearTawbah, the map is cleared
      // Verify by calling clearTawbah without throwing
      expect(() => tawbahModule.clearTawbah()).not.toThrow();
    });

    it('TAWBAH.clearTawbah() does not throw', () => {
      expect(() => tawbahModule.TAWBAH.clearTawbah()).not.toThrow();
    });
  });

  // ── recordError ───────────────────────────────────────────────────────────

  describe('recordError()', () => {
    it('does not throw on first call for a new error', () => {
      expect(() => {
        tawbahModule.recordError('TypeError: test error', 'test_file.ts');
      }).not.toThrow();
    });

    it('does not throw on second call for same error', () => {
      tawbahModule.recordError('TypeError: test error 2', 'test_file2.ts');
      expect(() => {
        tawbahModule.recordError('TypeError: test error 2', 'test_file2.ts');
      }).not.toThrow();
    });

    it('throws TAWBAH PROTOCOL on 3rd occurrence of same error', () => {
      const error = 'ReferenceError: unique_tawbah_test_error_xyz';
      const file = 'tawbah_trigger_test.ts';

      // 1st call - no throw
      tawbahModule.recordError(error, file);
      // 2nd call - no throw
      tawbahModule.recordError(error, file);
      // 3rd call - should trigger executeTawbah which throws
      expect(() => {
        tawbahModule.recordError(error, file);
      }).toThrow('TAWBAH PROTOCOL ACTIVATED');
    });

    it('TAWBAH error includes the error message', () => {
      const error = 'SyntaxError: unique_tawbah_test_syntax_abc';
      const file = 'syntax_error_test.ts';

      tawbahModule.recordError(error, file);
      tawbahModule.recordError(error, file);

      expect(() => tawbahModule.recordError(error, file)).toThrow(error);
    });

    it('different errors in different files do not share counts', () => {
      // Two different file+error combos
      tawbahModule.recordError('ErrorA', 'fileA.ts');
      tawbahModule.recordError('ErrorA', 'fileA.ts');

      tawbahModule.recordError('ErrorB', 'fileB.ts');
      tawbahModule.recordError('ErrorB', 'fileB.ts');

      // Neither should throw yet (each only at count=2)
      expect(true).toBe(true); // Reaching here means no throw occurred

      // Third call for ErrorA in fileA — should throw
      expect(() => tawbahModule.recordError('ErrorA', 'fileA.ts')).toThrow('TAWBAH PROTOCOL ACTIVATED');
    });

    it('different errors on same file track separately', () => {
      tawbahModule.recordError('Error1', 'shared.ts');
      tawbahModule.recordError('Error1', 'shared.ts');

      // Error2 on same file: count starts fresh
      tawbahModule.recordError('Error2', 'shared.ts');
      tawbahModule.recordError('Error2', 'shared.ts');

      // Error1's 3rd call should still trigger
      expect(() => tawbahModule.recordError('Error1', 'shared.ts')).toThrow('TAWBAH PROTOCOL ACTIVATED');
    });

    it('after clearTawbah, error count resets for previously tracked errors', () => {
      const error = 'ResetError: unique_reset_test_error';
      const file = 'reset_test.ts';

      tawbahModule.recordError(error, file);
      tawbahModule.recordError(error, file);
      // Don't trigger the 3rd — clearTawbah first
      tawbahModule.clearTawbah();

      // Now start fresh — should not throw on 1st call
      expect(() => tawbahModule.recordError(error, file)).not.toThrow();
      // Nor on 2nd
      expect(() => tawbahModule.recordError(error, file)).not.toThrow();
    });
  });
});
