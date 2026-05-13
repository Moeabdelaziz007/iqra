/**
 * Unit Tests: personas.ts — simplified Persona interface (PR refactor)
 *
 * Covers:
 *  - PERSONA_REGISTRY has exactly the 5 expected personas
 *  - Each persona conforms to the simplified Persona interface
 *    (no uuid, no aixInstructions, no aixTags, no aixCapabilities)
 *  - Required fields are present on every entry
 *  - DID format follows "did:web:axiomid.app:<suffix>"
 *  - getPersona() returns the matching persona by namespaced id
 *  - getPersona() falls back to iqra-core for unknown ids
 *  - getPersonaSystemPrompt() returns personalityOverride when set,
 *    otherwise falls back to IQRA_PERSONALITY
 */

import { describe, it, expect } from 'vitest';
import {
  PERSONA_REGISTRY,
  getPersona,
  getPersonaSystemPrompt,
  type Persona,
} from '#utils/personas';

// ── PERSONA_REGISTRY structure ────────────────────────────────────────────────

describe('PERSONA_REGISTRY — shape and completeness', () => {
  const EXPECTED_KEYS = [
    'iqra-core',
    'iqra-researcher',
    'iqra-storyteller',
    'iqra-protector',
    'iqra-auditor',
  ] as const;

  it('contains exactly 5 personas', () => {
    expect(Object.keys(PERSONA_REGISTRY)).toHaveLength(5);
  });

  it('contains exactly the expected namespaced keys', () => {
    const keys = Object.keys(PERSONA_REGISTRY).sort();
    expect(keys).toEqual([...EXPECTED_KEYS].sort());
  });

  it('every persona has a non-empty id field', () => {
    for (const persona of Object.values(PERSONA_REGISTRY)) {
      expect(persona.id).toBeTruthy();
      expect(typeof persona.id).toBe('string');
    }
  });

  it('every persona id matches its registry key', () => {
    for (const [key, persona] of Object.entries(PERSONA_REGISTRY)) {
      expect(persona.id).toBe(key);
    }
  });

  it('every persona has a non-empty name', () => {
    for (const persona of Object.values(PERSONA_REGISTRY)) {
      expect(persona.name).toBeTruthy();
    }
  });

  it('every persona has a non-empty role', () => {
    for (const persona of Object.values(PERSONA_REGISTRY)) {
      expect(persona.role).toBeTruthy();
    }
  });

  it('every persona has a non-empty description', () => {
    for (const persona of Object.values(PERSONA_REGISTRY)) {
      expect(persona.description).toBeTruthy();
    }
  });

  it('every persona has a non-empty specialization array', () => {
    for (const persona of Object.values(PERSONA_REGISTRY)) {
      expect(Array.isArray(persona.specialization)).toBe(true);
      expect(persona.specialization.length).toBeGreaterThan(0);
    }
  });

  it('every persona DID follows the did:web:axiomid.app:<suffix> format', () => {
    const DID_RE = /^did:web:axiomid\.app:[a-z]+$/;
    for (const persona of Object.values(PERSONA_REGISTRY)) {
      expect(persona.did).toMatch(DID_RE);
    }
  });

  it('DID suffix matches the persona id segment (without iqra- prefix)', () => {
    for (const persona of Object.values(PERSONA_REGISTRY)) {
      const bareId = persona.id.replace(/^iqra-/, '');
      expect(persona.did).toBe(`did:web:axiomid.app:${bareId}`);
    }
  });
});

// ── Simplified interface: removed fields must not exist ───────────────────────

describe('PERSONA_REGISTRY — removed AIX fields are absent', () => {
  it('no persona has a uuid field', () => {
    for (const persona of Object.values(PERSONA_REGISTRY)) {
      expect((persona as any).uuid).toBeUndefined();
    }
  });

  it('no persona has an aixInstructions field', () => {
    for (const persona of Object.values(PERSONA_REGISTRY)) {
      expect((persona as any).aixInstructions).toBeUndefined();
    }
  });

  it('no persona has an aixTags field', () => {
    for (const persona of Object.values(PERSONA_REGISTRY)) {
      expect((persona as any).aixTags).toBeUndefined();
    }
  });

  it('no persona has an aixCapabilities field', () => {
    for (const persona of Object.values(PERSONA_REGISTRY)) {
      expect((persona as any).aixCapabilities).toBeUndefined();
    }
  });
});

// ── Per-persona spot checks ───────────────────────────────────────────────────

describe('iqra-core persona', () => {
  const core = PERSONA_REGISTRY['iqra-core'];

  it('has role "The Core Intelligence"', () => {
    expect(core.role).toBe('The Core Intelligence');
  });

  it('has DID did:web:axiomid.app:core', () => {
    expect(core.did).toBe('did:web:axiomid.app:core');
  });

  it('does not have a personalityOverride (uses default)', () => {
    expect(core.personalityOverride).toBeUndefined();
  });

  it('specialization includes Quranic Patterns', () => {
    expect(core.specialization).toContain('Quranic Patterns');
  });
});

describe('iqra-researcher persona', () => {
  const researcher = PERSONA_REGISTRY['iqra-researcher'];

  it('has DID did:web:axiomid.app:researcher', () => {
    expect(researcher.did).toBe('did:web:axiomid.app:researcher');
  });

  it('has a personalityOverride containing "Researcher Profile"', () => {
    expect(researcher.personalityOverride).toBeDefined();
    expect(researcher.personalityOverride).toContain('Researcher Profile');
  });

  it('specialization includes Scientific Miracles', () => {
    expect(researcher.specialization).toContain('Scientific Miracles');
  });
});

describe('iqra-storyteller persona', () => {
  const storyteller = PERSONA_REGISTRY['iqra-storyteller'];

  it('has DID did:web:axiomid.app:storyteller', () => {
    expect(storyteller.did).toBe('did:web:axiomid.app:storyteller');
  });

  it('has a personalityOverride containing "Storyteller Profile"', () => {
    expect(storyteller.personalityOverride).toBeDefined();
    expect(storyteller.personalityOverride).toContain('Storyteller Profile');
  });
});

describe('iqra-protector persona', () => {
  const protector = PERSONA_REGISTRY['iqra-protector'];

  it('has DID did:web:axiomid.app:protector', () => {
    expect(protector.did).toBe('did:web:axiomid.app:protector');
  });

  it('has a personalityOverride containing "Protector Profile"', () => {
    expect(protector.personalityOverride).toBeDefined();
    expect(protector.personalityOverride).toContain('Protector Profile');
  });
});

describe('iqra-auditor persona', () => {
  const auditor = PERSONA_REGISTRY['iqra-auditor'];

  it('has DID did:web:axiomid.app:auditor', () => {
    expect(auditor.did).toBe('did:web:axiomid.app:auditor');
  });

  it('has a personalityOverride containing "Auditor Profile"', () => {
    expect(auditor.personalityOverride).toBeDefined();
    expect(auditor.personalityOverride).toContain('Auditor Profile');
  });
});

// ── getPersona() ──────────────────────────────────────────────────────────────

describe('getPersona()', () => {
  it('returns iqra-core by namespaced id', () => {
    const persona = getPersona('iqra-core');
    expect(persona.id).toBe('iqra-core');
  });

  it('returns iqra-researcher by namespaced id', () => {
    const persona = getPersona('iqra-researcher');
    expect(persona.id).toBe('iqra-researcher');
  });

  it('returns iqra-storyteller by namespaced id', () => {
    const persona = getPersona('iqra-storyteller');
    expect(persona.id).toBe('iqra-storyteller');
  });

  it('returns iqra-protector by namespaced id', () => {
    const persona = getPersona('iqra-protector');
    expect(persona.id).toBe('iqra-protector');
  });

  it('returns iqra-auditor by namespaced id', () => {
    const persona = getPersona('iqra-auditor');
    expect(persona.id).toBe('iqra-auditor');
  });

  it('falls back to iqra-core for an unknown id', () => {
    const persona = getPersona('does-not-exist');
    expect(persona.id).toBe('iqra-core');
  });

  it('falls back to iqra-core for empty string', () => {
    const persona = getPersona('');
    expect(persona.id).toBe('iqra-core');
  });

  it('returns a full Persona object (not null/undefined)', () => {
    const persona = getPersona('iqra-core');
    expect(persona).toBeDefined();
    expect(persona).not.toBeNull();
    // Confirm key fields are present
    expect(persona.id).toBeTruthy();
    expect(persona.role).toBeTruthy();
    expect(persona.did).toBeTruthy();
  });

  // Regression: bare id ("core" without the "iqra-" prefix) is NOT resolved
  // by the simplified getPersona() — it only does a direct lookup then falls
  // back to core. This is intentional per the PR simplification.
  it('falls back to iqra-core for bare id "core" (no namespace resolution)', () => {
    const persona = getPersona('core');
    // bare "core" is not a key in PERSONA_REGISTRY, so we fall back to iqra-core
    expect(persona.id).toBe('iqra-core');
  });
});

// ── getPersonaSystemPrompt() ──────────────────────────────────────────────────

describe('getPersonaSystemPrompt()', () => {
  it('returns personalityOverride for researcher (has override)', () => {
    const prompt = getPersonaSystemPrompt('iqra-researcher');
    expect(prompt).toContain('Researcher Profile');
  });

  it('returns personalityOverride for storyteller (has override)', () => {
    const prompt = getPersonaSystemPrompt('iqra-storyteller');
    expect(prompt).toContain('Storyteller Profile');
  });

  it('returns a non-empty string for iqra-core (falls back to IQRA_PERSONALITY)', () => {
    const prompt = getPersonaSystemPrompt('iqra-core');
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for unknown id (falls back to core, then IQRA_PERSONALITY)', () => {
    const prompt = getPersonaSystemPrompt('unknown-persona');
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });
});