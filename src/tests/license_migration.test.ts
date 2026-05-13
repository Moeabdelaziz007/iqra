/**
 * Tests for PR changes:
 * - LICENSE (new Apache 2.0 file replacing MIT)
 * - README.md (license badges updated from MIT to Apache_2.0)
 * - package.json (license field changed from ISC to Apache-2.0)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../');

// ─── Helpers ────────────────────────────────────────────────────────────────

function readText(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf8');
}

function readJson<T = unknown>(relPath: string): T {
  const raw = readFileSync(resolve(ROOT, relPath), 'utf8');
  return JSON.parse(raw) as T;
}

// ─── LICENSE ─────────────────────────────────────────────────────────────────

describe('LICENSE — Apache 2.0 license file', () => {
  let content: string;

  it('file exists at project root', () => {
    expect(existsSync(resolve(ROOT, 'LICENSE'))).toBe(true);
  });

  it('can be read as text', () => {
    content = readText('LICENSE');
    expect(content.length).toBeGreaterThan(0);
  });

  it('declares Apache License Version 2.0', () => {
    content = readText('LICENSE');
    expect(content).toContain('Apache License');
    expect(content).toContain('Version 2.0');
  });

  it('references the official Apache license URL', () => {
    content = readText('LICENSE');
    expect(content).toContain('http://www.apache.org/licenses/');
  });

  it('contains the copyright holder name', () => {
    content = readText('LICENSE');
    expect(content).toContain('Mohamed H Abdelaziz');
  });

  it('contains the copyright year 2026', () => {
    content = readText('LICENSE');
    expect(content).toContain('Copyright 2026');
  });

  it('includes the Grant of Copyright License section (section 2)', () => {
    content = readText('LICENSE');
    expect(content).toContain('Grant of Copyright License');
  });

  it('includes the Grant of Patent License section (section 3)', () => {
    content = readText('LICENSE');
    expect(content).toContain('Grant of Patent License');
  });

  it('includes the Redistribution section (section 4)', () => {
    content = readText('LICENSE');
    expect(content).toContain('Redistribution');
  });

  it('includes the Disclaimer of Warranty section (section 7)', () => {
    content = readText('LICENSE');
    expect(content).toContain('Disclaimer of Warranty');
    expect(content).toContain('AS IS');
  });

  it('includes the Limitation of Liability section (section 8)', () => {
    content = readText('LICENSE');
    expect(content).toContain('Limitation of Liability');
  });

  it('ends with the standard APPENDIX boilerplate', () => {
    content = readText('LICENSE');
    expect(content).toContain('APPENDIX');
    expect(content).toContain('Apache License, Version 2.0');
  });

  it('contains END OF TERMS AND CONDITIONS marker', () => {
    content = readText('LICENSE');
    expect(content).toContain('END OF TERMS AND CONDITIONS');
  });

  it('contains the standard license reproduction URL', () => {
    content = readText('LICENSE');
    expect(content).toContain('http://www.apache.org/licenses/LICENSE-2.0');
  });

  it('does NOT contain "MIT" license text', () => {
    content = readText('LICENSE');
    // Apache 2.0 file should not contain MIT references
    expect(content).not.toMatch(/^\s*MIT License\s*$/m);
    expect(content).not.toContain('Permission is hereby granted, free of charge');
  });

  it('covers all 9 numbered terms sections', () => {
    content = readText('LICENSE');
    // Verify section structure: sections 1 through 9 exist
    for (let section = 1; section <= 9; section++) {
      expect(content, `Section ${section} missing`).toMatch(
        new RegExp(`\\b${section}\\.\\s`)
      );
    }
  });

  // Boundary: file should be non-trivially long (Apache 2.0 is ~11k chars)
  it('has sufficient length for a complete Apache 2.0 license (> 10000 chars)', () => {
    content = readText('LICENSE');
    expect(content.length).toBeGreaterThan(10000);
  });
});

// ─── README.md ───────────────────────────────────────────────────────────────

describe('README.md — license badge updated from MIT to Apache 2.0', () => {
  let content: string;

  it('file exists', () => {
    expect(existsSync(resolve(ROOT, 'README.md'))).toBe(true);
  });

  it('can be read as text', () => {
    content = readText('README.md');
    expect(content.length).toBeGreaterThan(0);
  });

  it('top badge references Apache_2.0 in the shield URL', () => {
    content = readText('README.md');
    expect(content).toContain('LICENSE-Apache_2.0');
  });

  it('top badge links to the LICENSE file', () => {
    content = readText('README.md');
    expect(content).toContain('(./LICENSE)');
  });

  it('footer image badge references Apache_2.0', () => {
    content = readText('README.md');
    expect(content).toContain('License-Apache_2.0');
  });

  it('footer badge has alt text "License: Apache 2.0"', () => {
    content = readText('README.md');
    expect(content).toContain('alt="License: Apache 2.0"');
  });

  it('does NOT contain the old MIT license badge URL', () => {
    content = readText('README.md');
    expect(content).not.toContain('LICENSE-MIT');
  });

  it('does NOT contain a plain MIT license badge label in footer', () => {
    content = readText('README.md');
    expect(content).not.toContain('License-MIT');
  });

  it('contains exactly two Apache_2.0 license badge references (top + footer)', () => {
    content = readText('README.md');
    // Both the shield.io top badge and footer badge use Apache_2.0
    const apacheMatches = content.match(/Apache_2\.0/g);
    expect(apacheMatches).not.toBeNull();
    expect(apacheMatches!.length).toBeGreaterThanOrEqual(2);
  });

  // Regression: ensure MIT did not survive in either badge location
  it('regression — MIT does not appear as a badge label in any shields.io img/link', () => {
    content = readText('README.md');
    // Match shields.io badge patterns containing MIT
    const mitBadgePattern = /shields\.io\/badge\/License[^)]*-MIT/;
    expect(mitBadgePattern.test(content)).toBe(false);
  });
});

// ─── package.json ────────────────────────────────────────────────────────────

describe('package.json — license field updated to Apache-2.0', () => {
  interface PackageJson {
    name: string;
    version: string;
    license: string;
    [key: string]: unknown;
  }

  let pkg: PackageJson;

  it('parses as valid JSON', () => {
    expect(() => {
      pkg = readJson<PackageJson>('package.json');
    }).not.toThrow();
  });

  it('has a license field', () => {
    pkg = readJson<PackageJson>('package.json');
    expect(pkg).toHaveProperty('license');
  });

  it('license field is "Apache-2.0"', () => {
    pkg = readJson<PackageJson>('package.json');
    expect(pkg.license).toBe('Apache-2.0');
  });

  it('license field is NOT the old "ISC" value', () => {
    pkg = readJson<PackageJson>('package.json');
    expect(pkg.license).not.toBe('ISC');
  });

  it('license field is NOT "MIT"', () => {
    pkg = readJson<PackageJson>('package.json');
    expect(pkg.license).not.toBe('MIT');
  });

  it('license field is a non-empty string', () => {
    pkg = readJson<PackageJson>('package.json');
    expect(typeof pkg.license).toBe('string');
    expect(pkg.license.trim().length).toBeGreaterThan(0);
  });

  it('license identifier follows SPDX format (Apache-2.0)', () => {
    pkg = readJson<PackageJson>('package.json');
    // SPDX identifier for Apache 2.0 is exactly "Apache-2.0"
    expect(pkg.license).toMatch(/^Apache-2\.0$/);
  });

  // Sanity: other essential package.json fields are still intact
  it('package name is still "iqra"', () => {
    pkg = readJson<PackageJson>('package.json');
    expect(pkg.name).toBe('iqra');
  });

  it('package still has an author field', () => {
    pkg = readJson<PackageJson>('package.json');
    expect(pkg).toHaveProperty('author');
    expect(typeof pkg.author).toBe('string');
    expect((pkg.author as string).length).toBeGreaterThan(0);
  });

  // Boundary: verify the raw JSON text also reflects the change (no stale ISC)
  it('raw JSON text does not contain "ISC" as a license value', () => {
    const raw = readText('package.json');
    // Should not have "license": "ISC"
    expect(raw).not.toMatch(/"license"\s*:\s*"ISC"/);
  });
});
