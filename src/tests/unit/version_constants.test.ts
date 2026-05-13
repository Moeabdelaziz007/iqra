/**
 * Unit Tests: src/lib/iqra/14-aix/version.ts
 *
 * Verifies the version constants changed in this PR:
 *   - IQRA_VERSION was bumped from "0.3.69" to "0.3.6.9"
 *   - AIX_FORMAT_VERSION remains "1.3"
 *   - AXIOM_PROTOCOL constant is present
 *   - IQRA_VERSION matches the package.json#version field
 *     (the module comment mandates these stay in lockstep)
 *
 * The version-sync check is a regression guard: if someone bumps
 * package.json but forgets to update IQRA_VERSION (or vice versa),
 * this test fails and prevents the mismatch from reaching CI.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { IQRA_VERSION, AIX_FORMAT_VERSION, AXIOM_PROTOCOL } from '#aix/version';

// ── current values ────────────────────────────────────────────────────────────

describe('version constants', () => {
  it('IQRA_VERSION equals "0.3.6.9" (updated from 0.3.69 in this PR)', () => {
    expect(IQRA_VERSION).toBe('0.3.6.9');
  });

  it('AIX_FORMAT_VERSION equals "1.3"', () => {
    expect(AIX_FORMAT_VERSION).toBe('1.3');
  });

  it('AXIOM_PROTOCOL equals "axiom-a2a-v1"', () => {
    expect(AXIOM_PROTOCOL).toBe('axiom-a2a-v1');
  });

  it('IQRA_VERSION is a non-empty string', () => {
    expect(typeof IQRA_VERSION).toBe('string');
    expect(IQRA_VERSION.length).toBeGreaterThan(0);
  });

  it('AIX_FORMAT_VERSION is a non-empty string', () => {
    expect(typeof AIX_FORMAT_VERSION).toBe('string');
    expect(AIX_FORMAT_VERSION.length).toBeGreaterThan(0);
  });
});

// ── version-sync check ────────────────────────────────────────────────────────
// The module docstring states: "The PR that bumps the package version MUST
// also bump this constant." This test enforces that invariant.

describe('version sync — IQRA_VERSION matches package.json', () => {
  it('IQRA_VERSION equals package.json#version', () => {
    const pkgPath = resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    expect(IQRA_VERSION).toBe(pkg.version);
  });
});

// ── regression: old value must not appear ─────────────────────────────────────

describe('version regression — old value "0.3.69" no longer used', () => {
  it('IQRA_VERSION is not the old value "0.3.69"', () => {
    expect(IQRA_VERSION).not.toBe('0.3.69');
  });
});
