/**
 * Tests for iqraExecute() added in sovereign.ts in this PR.
 *
 * The function is a stub for the sovereign meta-loop entry point:
 *   export async function iqraExecute(intent: string): Promise<any>
 *   Returns: { success: true, intent }
 *
 * Note: The full SovereignEngine class is complex and has heavy dependencies.
 * These tests focus solely on the iqraExecute stub added in this PR.
 */

import { describe, it, expect } from 'vitest';

// We import iqraExecute directly to avoid loading the full module (which has
// many heavy imports). If the import fails due to dependency resolution issues,
// we still want the basic behavior documented.

describe('sovereign.ts — iqraExecute()', () => {
  // Dynamic import to avoid loading heavy module dependencies at suite level
  async function getIqraExecute() {
    // Use dynamic import with vi.mock if needed; for now import directly.
    // The function itself has no side effects and returns a simple object.
    const mod = await import('../../lib/iqra/01-core/sovereign');
    return mod.iqraExecute;
  }

  it('returns an object with success=true for any intent', async () => {
    const iqraExecute = await getIqraExecute();
    const result = await iqraExecute('analyze Quran verse');
    expect(result).toHaveProperty('success', true);
  });

  it('returns the passed intent in the response', async () => {
    const iqraExecute = await getIqraExecute();
    const intent = 'research topological resonance';
    const result = await iqraExecute(intent);
    expect(result).toHaveProperty('intent', intent);
  });

  it('is an async function returning a Promise', async () => {
    const iqraExecute = await getIqraExecute();
    const returnValue = iqraExecute('test intent');
    expect(returnValue).toBeInstanceOf(Promise);
    await returnValue; // Should resolve without rejection
  });

  it('handles empty string intent', async () => {
    const iqraExecute = await getIqraExecute();
    const result = await iqraExecute('');
    expect(result.success).toBe(true);
    expect(result.intent).toBe('');
  });

  it('handles Arabic intent strings', async () => {
    const iqraExecute = await getIqraExecute();
    const intent = 'تحليل آية الكرسي';
    const result = await iqraExecute(intent);
    expect(result.success).toBe(true);
    expect(result.intent).toBe(intent);
  });

  it('handles long intent strings', async () => {
    const iqraExecute = await getIqraExecute();
    const longIntent = 'a'.repeat(1000);
    const result = await iqraExecute(longIntent);
    expect(result.success).toBe(true);
    expect(result.intent).toBe(longIntent);
  });

  it('each call produces an independent result object', async () => {
    const iqraExecute = await getIqraExecute();
    const r1 = await iqraExecute('intent1');
    const r2 = await iqraExecute('intent2');
    expect(r1.intent).toBe('intent1');
    expect(r2.intent).toBe('intent2');
    expect(r1).not.toBe(r2);
  });

  it('does not throw for special characters in intent', async () => {
    const iqraExecute = await getIqraExecute();
    const specialIntent = '!@#$%^&*() <script>alert("xss")</script>';
    await expect(iqraExecute(specialIntent)).resolves.toHaveProperty('success', true);
  });
});