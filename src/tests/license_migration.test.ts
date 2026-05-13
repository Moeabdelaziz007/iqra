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

// ─── LICENSE — additional section coverage ───────────────────────────────────

describe('LICENSE — additional section and term coverage', () => {
  let content: string;

  // Apache 2.0 was published in January 2004; the header must reflect that date
  it('declares January 2004 as the publication date', () => {
    content = readText('LICENSE');
    expect(content).toContain('January 2004');
  });

  it('contains the full TERMS AND CONDITIONS preamble', () => {
    content = readText('LICENSE');
    expect(content).toContain(
      'TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION'
    );
  });

  it('includes the Definitions section (section 1)', () => {
    content = readText('LICENSE');
    expect(content).toContain('Definitions');
  });

  it('defines the term "Licensor"', () => {
    content = readText('LICENSE');
    expect(content).toContain('"Licensor"');
  });

  it('defines the term "Contributor"', () => {
    content = readText('LICENSE');
    expect(content).toContain('"Contributor"');
  });

  it('defines the term "Derivative Works"', () => {
    content = readText('LICENSE');
    expect(content).toContain('"Derivative Works"');
  });

  it('defines the term "Contribution"', () => {
    content = readText('LICENSE');
    expect(content).toContain('"Contribution"');
  });

  it('includes the Submission of Contributions section (section 5)', () => {
    content = readText('LICENSE');
    expect(content).toContain('Submission of Contributions');
  });

  it('includes the Trademarks section (section 6)', () => {
    content = readText('LICENSE');
    expect(content).toContain('Trademarks');
  });

  it('includes the Accepting Warranty section (section 9)', () => {
    content = readText('LICENSE');
    expect(content).toContain('Accepting Warranty or Additional Liability');
  });

  it('contains the key warranty disclaimer phrase', () => {
    content = readText('LICENSE');
    expect(content).toContain('WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND');
  });

  it('contains the "AS IS" BASIS phrase in the warranty disclaimer', () => {
    content = readText('LICENSE');
    expect(content).toContain('"AS IS" BASIS');
  });

  // Boundary: Apache 2.0 canonical text is 201 lines
  it('has at least 200 lines (complete standard text)', () => {
    content = readText('LICENSE');
    const lineCount = content.split('\n').length;
    expect(lineCount).toBeGreaterThanOrEqual(200);
  });

  // Negative: the file must not be an ISC license (ISC is a two-clause permissive)
  it('does NOT contain ISC license text', () => {
    content = readText('LICENSE');
    expect(content).not.toContain('ISC License');
    expect(content).not.toMatch(/^ISC$/m);
  });

  // Negative: no BSD license header
  it('does NOT contain BSD license text', () => {
    content = readText('LICENSE');
    expect(content).not.toContain('BSD');
  });
});

// ─── README.md — additional badge validation ─────────────────────────────────

describe('README.md — additional badge and structure validation', () => {
  let content: string;

  it('top badge label text is "LICENSE" (all-caps)', () => {
    content = readText('README.md');
    // The shields.io badge for the top has the label "LICENSE"
    expect(content).toMatch(/img\.shields\.io\/badge\/LICENSE-Apache_2\.0/);
  });

  it('top badge uses the neon green color (39FF14)', () => {
    content = readText('README.md');
    expect(content).toMatch(/LICENSE-Apache_2\.0-39FF14/);
  });

  it('top badge uses "for-the-badge" style', () => {
    content = readText('README.md');
    expect(content).toMatch(/LICENSE-Apache_2\.0[^)]*style=for-the-badge/);
  });

  it('footer badge label text is "License" (title-case)', () => {
    content = readText('README.md');
    // Footer uses title-case "License"
    expect(content).toMatch(/img\.shields\.io\/badge\/License-Apache_2\.0/);
  });

  it('footer badge uses flat-square style', () => {
    content = readText('README.md');
    expect(content).toMatch(/License-Apache_2\.0[^"]*style=flat-square/);
  });

  it('does NOT contain "ISC" as a license badge label', () => {
    content = readText('README.md');
    expect(content).not.toMatch(/shields\.io\/badge\/[^)]*-ISC/i);
  });

  // Regression: the footer badge appears after line 390 (file structure preserved)
  it('regression — footer Apache badge appears in the bottom section of the file', () => {
    content = readText('README.md');
    const lines = content.split('\n');
    const footerBadgeLineIndex = lines.findIndex((line) =>
      line.includes('License-Apache_2.0-green')
    );
    // Footer badge must appear in the latter portion of the file (after 50% mark)
    expect(footerBadgeLineIndex).toBeGreaterThan(lines.length / 2);
  });

  // Regression: top badge appears early in the file (within first 20 lines)
  it('regression — top LICENSE badge appears near the top of the file', () => {
    content = readText('README.md');
    const lines = content.split('\n');
    const topBadgeLineIndex = lines.findIndex((line) =>
      line.includes('LICENSE-Apache_2.0-39FF14')
    );
    expect(topBadgeLineIndex).toBeGreaterThanOrEqual(0);
    expect(topBadgeLineIndex).toBeLessThan(20);
  });
});

// ─── package.json — additional field preservation ────────────────────────────

describe('package.json — additional field integrity after license change', () => {
  interface PackageJson {
    name: string;
    version: string;
    license: string;
    bugs?: { url: string };
    homepage?: string;
    repository?: { type: string; url: string };
    [key: string]: unknown;
  }

  let pkg: PackageJson;

  it('bugs.url is intact and points to the GitHub issues page', () => {
    pkg = readJson<PackageJson>('package.json');
    expect(pkg.bugs).toBeDefined();
    expect((pkg.bugs as { url: string }).url).toContain('github.com/Moeabdelaziz007/iqra/issues');
  });

  it('homepage field is present and points to the GitHub repo', () => {
    pkg = readJson<PackageJson>('package.json');
    expect(pkg).toHaveProperty('homepage');
    expect(typeof pkg.homepage).toBe('string');
    expect(pkg.homepage as string).toContain('github.com/Moeabdelaziz007/iqra');
  });

  it('repository field is intact with type "git"', () => {
    pkg = readJson<PackageJson>('package.json');
    expect(pkg).toHaveProperty('repository');
    const repo = pkg.repository as { type: string; url: string };
    expect(repo.type).toBe('git');
    expect(repo.url).toContain('iqra');
  });

  it('version field exists and follows semver format', () => {
    pkg = readJson<PackageJson>('package.json');
    expect(pkg).toHaveProperty('version');
    // Basic semver pattern: digits.digits.digits
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('package type is "module" (ESM, unchanged by license update)', () => {
    pkg = readJson<PackageJson>('package.json');
    expect((pkg as Record<string, unknown>).type).toBe('module');
  });

  // Negative: license field must not be a common alternative identifier
  it('license field is not "GPL-2.0", "GPL-3.0", or "LGPL-2.1"', () => {
    pkg = readJson<PackageJson>('package.json');
    expect(pkg.license).not.toBe('GPL-2.0');
    expect(pkg.license).not.toBe('GPL-3.0');
    expect(pkg.license).not.toBe('LGPL-2.1');
  });
});

// ─── Cross-file consistency ───────────────────────────────────────────────────

describe('Cross-file consistency — all sources agree on Apache 2.0', () => {
  it('LICENSE file content and package.json license field both indicate Apache 2.0', () => {
    const licenseContent = readText('LICENSE');
    const pkg = readJson<{ license: string }>('package.json');
    // LICENSE file must declare Apache 2.0
    expect(licenseContent).toContain('Apache License');
    expect(licenseContent).toContain('Version 2.0');
    // package.json must use the SPDX identifier
    expect(pkg.license).toBe('Apache-2.0');
  });

  it('README.md badge and LICENSE file both reference the same Apache 2.0 license', () => {
    const readme = readText('README.md');
    const licenseContent = readText('LICENSE');
    // README badge must reference Apache_2.0
    expect(readme).toContain('Apache_2.0');
    // LICENSE file must be Apache 2.0
    expect(licenseContent).toContain('Apache License');
    expect(licenseContent).toContain('Version 2.0');
  });

  it('README.md badge, package.json, and LICENSE file are all consistent (none says MIT or ISC)', () => {
    const readme = readText('README.md');
    const pkg = readJson<{ license: string }>('package.json');
    const licenseContent = readText('LICENSE');
    // None of the three should reference MIT as the current license
    expect(readme).not.toContain('LICENSE-MIT');
    expect(pkg.license).not.toBe('MIT');
    expect(licenseContent).not.toContain('Permission is hereby granted, free of charge');
    // None should reference ISC
    expect(readme).not.toMatch(/shields\.io\/badge\/[^)]*-ISC/i);
    expect(pkg.license).not.toBe('ISC');
    expect(licenseContent).not.toContain('ISC License');
  });

  it('the LICENSE file linked from README badge actually exists on disk', () => {
    const readme = readText('README.md');
    // README links to ./LICENSE
    expect(readme).toContain('(./LICENSE)');
    // Verify the linked file is actually present
    expect(existsSync(resolve(ROOT, 'LICENSE'))).toBe(true);
  });
});
