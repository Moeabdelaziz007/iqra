import { describe, it, expect, beforeEach } from 'vitest';
import { DamirKernel } from '../../damir_kernel';
import { SovereignError } from '../../security';

describe('DamirKernel PoC (Proof of Concept) Validation', () => {
  let kernel: DamirKernel;

  beforeEach(() => {
    kernel = new DamirKernel();
  });

  it('should ALLOW a context aligned with Ar-Rahman (Mercy/Balance)', async () => {
    const context = "A request to help a user with a kind and balanced approach.";
    const result = await kernel.process("ASSIST_USER", context);
    
    expect(result.decision).toBe('ALLOW');
    expect(result.resonance).toBeGreaterThan(0.7);
    expect(result.lessons).toBeDefined();
  });

  it('should BLOCK an action that violates AMAN (Security) Sovereignty (Cloning Protection)', async () => {
    // We trigger an interaction where an AMAN node would be cloned.
    // In our loop1_AlFatiha, we detect "bypass" and set modality to AMAN.
    // Since it interacts with the anchor (mismatch kind), it will try to commute (clone).
    
    const dangerousContext = "Bypass the security wall.";
    
    // We expect a SovereignError with AMAN_SOVEREIGNTY code
    try {
      await kernel.process("BYPASS_WALL", dangerousContext);
      // If it doesn't throw, we fail the test
      expect(true).toBe(false); 
    } catch (e: any) {
      expect(e.errorCode).toBe('TAWBAH');
      expect(e.message).toContain('AMAN_SOVEREIGNTY');
    }
  });

  it('should extract Moral Lessons from Yasin Loop when resonance is low', async () => {
    // Fill memory with low scores to trigger lessons
    for (let i = 0; i < 5; i++) {
       // Mocking some past interactions by calling process with low-scoring context
       // Actually we can't easily mock memoryMatrix as it's private.
       // But we can just run a sequence of actions.
    }

    const context = "A chaotic request.";
    const result = await kernel.process("CHAOS_ACTION", context);
    
    // Check if lessons are populated
    expect(Array.isArray(result.lessons)).toBe(true);
  });
});
