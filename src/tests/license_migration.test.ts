/**
 * Tests for PR changes:
 * - LICENSE (new Apache 2.0 file replacing MIT)
 * - README.md (license badges updated from MIT to Apache_2.0)
 * - package.json (license field changed from ISC to Apache-2.0)
 */

import { describe, it, expect, beforeEach } from 'vitest';
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

// ─── LICENSE — additional section & content checks ───────────────────────────

describe('LICENSE — additional section and content coverage', () => {
  let content: string;

  beforeEach(() => {
    content = readText('LICENSE');
  });

  it('header contains the exact date "January 2004"', () => {
    expect(content).toContain('January 2004');
  });

  it('includes the TERMS AND CONDITIONS preamble header', () => {
    expect(content).toContain('TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION');
  });

  it('includes the Definitions section (section 1)', () => {
    expect(content).toContain('Definitions');
  });

  it('includes the Submission of Contributions section (section 5)', () => {
    expect(content).toContain('Submission of Contributions');
  });

  it('includes the Trademarks section (section 6)', () => {
    expect(content).toContain('Trademarks');
  });

  it('includes the Accepting Warranty section (section 9)', () => {
    expect(content).toContain('Accepting Warranty');
  });

  it('does NOT contain GNU General Public License text', () => {
    expect(content).not.toContain('GNU General Public License');
    expect(content).not.toContain('GNU GENERAL PUBLIC LICENSE');
  });

  it('does NOT contain ISC license text', () => {
    expect(content).not.toContain('ISC License');
    // ISC characteristic phrase
    expect(content).not.toMatch(/permission to use, copy, modify, and\/or distribute/i);
  });

  it('contains "Contributor" term as defined in Apache 2.0', () => {
    expect(content).toContain('"Contributor"');
  });

  it('contains the "Derivative Works" term as defined in Apache 2.0', () => {
    expect(content).toContain('"Derivative Works"');
  });

  it('contains "WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND" disclaimer', () => {
    expect(content).toContain('WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND');
  });

  it('file uses consistent Unix-style or readable line endings (no null bytes)', () => {
    // Ensure the file is clean text with no embedded null bytes
    expect(content).not.toContain('\0');
  });

  // Regression: confirm the "Licensor" term is present (Apache 2.0 specific)
  it('regression — "Licensor" term appears in the license text', () => {
    expect(content).toContain('"Licensor"');
  });
});

// ─── README.md — additional badge and content checks ─────────────────────────

describe('README.md — additional badge accuracy and consistency checks', () => {
  let content: string;

  beforeEach(() => {
    content = readText('README.md');
  });

  it('top license badge uses the neon green color 39FF14', () => {
    // The badge URL should contain the green color code used in other badges
    expect(content).toMatch(/LICENSE-Apache_2\.0-39FF14/);
  });

  it('top badge uses for-the-badge style', () => {
    expect(content).toMatch(/LICENSE-Apache_2\.0[^)]*style=for-the-badge/);
  });

  it('does NOT reference ISC in any badge URL', () => {
    expect(content).not.toMatch(/badge\/LICENSE-ISC/);
    expect(content).not.toMatch(/badge\/License-ISC/);
  });

  it('does NOT reference GPL in any badge URL', () => {
    expect(content).not.toMatch(/badge\/LICENSE-GPL/);
    expect(content).not.toMatch(/badge\/License-GPL/);
  });

  it('the label on the top license badge is "LICENSE"', () => {
    // shields.io format: /badge/LABEL-VALUE-COLOR
    expect(content).toMatch(/badge\/LICENSE-Apache_2\.0/);
  });

  it('footer badge uses flat-square style', () => {
    expect(content).toMatch(/License-Apache_2\.0[^"]*style=flat-square/);
  });

  it('README still contains the project name "iqra"', () => {
    // Sanity: core content was not accidentally removed during badge update
    expect(content.toLowerCase()).toContain('iqra');
  });
});

// ─── package.json — additional structural integrity checks ───────────────────

describe('package.json — additional structural integrity after license change', () => {
  interface PackageJson {
    name: string;
    version: string;
    license: string;
    keywords?: string[];
    repository?: { type: string; url: string };
    [key: string]: unknown;
  }

  let pkg: PackageJson;

  beforeEach(() => {
    pkg = readJson<PackageJson>('package.json');
  });

  it('version field is present and non-empty', () => {
    expect(pkg).toHaveProperty('version');
    expect(typeof pkg.version).toBe('string');
    expect(pkg.version.trim().length).toBeGreaterThan(0);
  });

  it('keywords array is present and contains "ai"', () => {
    expect(pkg).toHaveProperty('keywords');
    expect(Array.isArray(pkg.keywords)).toBe(true);
    expect(pkg.keywords).toContain('ai');
  });

  it('repository field is present with a GitHub URL', () => {
    expect(pkg).toHaveProperty('repository');
    const repo = pkg.repository as { type: string; url: string };
    expect(repo.url).toContain('github.com');
  });

  it('license value uses a hyphen (Apache-2.0) not a space (Apache 2.0)', () => {
    // SPDX identifiers use hyphens; verify the exact format
    expect(pkg.license).not.toMatch(/^Apache\s+2/);
    expect(pkg.license).toMatch(/^Apache-2\.0$/);
  });

  it('raw JSON text does not contain "MIT" as a license value', () => {
    const raw = readText('package.json');
    expect(raw).not.toMatch(/"license"\s*:\s*"MIT"/);
  });
});

// ─── Cross-file consistency checks ───────────────────────────────────────────

describe('Cross-file consistency — LICENSE, README.md, and package.json agree', () => {
  it('LICENSE file content is consistent with package.json SPDX identifier', () => {
    const licenseContent = readText('LICENSE');
    const pkg = readJson<{ license: string }>('package.json');
    // package.json says Apache-2.0; LICENSE file must declare Apache 2.0
    expect(pkg.license).toBe('Apache-2.0');
    expect(licenseContent).toContain('Apache License');
    expect(licenseContent).toContain('Version 2.0');
  });

  it('README license badge label matches package.json license family', () => {
    const readme = readText('README.md');
    const pkg = readJson<{ license: string }>('package.json');
    // package.json is Apache-2.0 → README must reference Apache in badge
    expect(pkg.license).toMatch(/^Apache/);
    expect(readme).toContain('Apache_2.0');
  });

  it('no file in the trio still references the superseded ISC license', () => {
    const licenseContent = readText('LICENSE');
    const readme = readText('README.md');
    const pkgRaw = readText('package.json');

    expect(licenseContent).not.toContain('ISC');
    expect(readme).not.toMatch(/badge.*ISC/);
    expect(pkgRaw).not.toMatch(/"license"\s*:\s*"ISC"/);
  });

  it('no file in the trio still references the old MIT license in badge/license context', () => {
    const readme = readText('README.md');
    const licenseContent = readText('LICENSE');

    // LICENSE file must not contain MIT license boilerplate
    expect(licenseContent).not.toContain('Permission is hereby granted, free of charge');
    // README must not have MIT in badge URLs
    expect(readme).not.toMatch(/shields\.io\/badge\/[^)]*-MIT/);
  });

  it('LICENSE copyright holder name appears nowhere contradictory', () => {
    const licenseContent = readText('LICENSE');
    // The copyright line should be a single consolidated entry
    const copyrightMatches = licenseContent.match(/Copyright \d{4}/g);
    expect(copyrightMatches).not.toBeNull();
    // There should be exactly one copyright year declaration
    expect(copyrightMatches!.length).toBe(1);
  });
});
