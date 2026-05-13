/**
 * Tests for PR: feat(stack) — adopt Echo369 doctrine + v2 assets + aix.* metadata block
 *
 * Covers all files changed in this PR:
 *  1. package.json          — new "aix" metadata block
 *  2. .iqra/cycle.txt       — cycle counter decremented from 15 → 14
 *  3. README.md             — v2 asset references, new stack layers, removed "Built by" section
 *  4. assets/aix-footer-quote-v2.svg   — new SVG asset
 *  5. assets/aix-stack-diagram-v2.svg  — new SVG asset
 *  6. assets/aix-stack-header-v2.svg   — new SVG asset
 *  7. assets/axi-mascot.svg            — new SVG asset
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// src/tests/unit/ → src/tests/ → src/ → root
const ROOT = path.resolve(__dirname, '../../..');

function readText(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

function readJson<T>(relPath: string): T {
  return JSON.parse(readText(relPath)) as T;
}

// ── package.json — "aix" metadata block ──────────────────────────────────────

interface AixBlock {
  stackVersion: string;
  stackCodename: string;
  spec: string;
  layer: string;
  layerName: string;
  authority: string;
}

interface PackageJson {
  name: string;
  version: string;
  aix: AixBlock;
  [key: string]: unknown;
}

describe('package.json — "aix" metadata block (added in this PR)', () => {
  let pkg: PackageJson;

  beforeEach(() => {
    pkg = readJson<PackageJson>('package.json');
  });

  it('has a top-level "aix" key', () => {
    expect(pkg).toHaveProperty('aix');
    expect(typeof pkg.aix).toBe('object');
    expect(pkg.aix).not.toBeNull();
  });

  it('aix.stackVersion is "0.369.0"', () => {
    expect(pkg.aix.stackVersion).toBe('0.369.0');
  });

  it('aix.stackCodename is "Echo369"', () => {
    expect(pkg.aix.stackCodename).toBe('Echo369');
  });

  it('aix.spec is "AIX/1.0"', () => {
    expect(pkg.aix.spec).toBe('AIX/1.0');
  });

  it('aix.layer is "L2"', () => {
    expect(pkg.aix.layer).toBe('L2');
  });

  it('aix.layerName is "runtime"', () => {
    expect(pkg.aix.layerName).toBe('runtime');
  });

  it('aix.authority is "axiomid.app"', () => {
    expect(pkg.aix.authority).toBe('axiomid.app');
  });

  it('aix block has exactly six keys — no unexpected fields', () => {
    const expectedKeys = ['stackVersion', 'stackCodename', 'spec', 'layer', 'layerName', 'authority'];
    expect(Object.keys(pkg.aix).sort()).toEqual(expectedKeys.sort());
  });

  it('all aix fields are non-empty strings', () => {
    for (const [key, value] of Object.entries(pkg.aix)) {
      expect(typeof value, `aix.${key} must be a string`).toBe('string');
      expect((value as string).length, `aix.${key} must be non-empty`).toBeGreaterThan(0);
    }
  });

  it('package version is "0.3.69"', () => {
    expect(pkg.version).toBe('0.3.69');
  });

  it('aix.spec follows "AIX/<semver>" format', () => {
    expect(pkg.aix.spec).toMatch(/^AIX\/\d+\.\d+$/);
  });

  it('aix.layer follows "L<digit>" pattern', () => {
    expect(pkg.aix.layer).toMatch(/^L\d+$/);
  });

  it('aix.authority is a valid hostname (no protocol, no path)', () => {
    expect(pkg.aix.authority).not.toContain('://');
    expect(pkg.aix.authority).not.toContain('/');
    expect(pkg.aix.authority).toContain('.');
  });

  // Regression: ensure old description format still present (not regressed)
  it('description is a non-empty string', () => {
    expect(typeof pkg.description).toBe('string');
    expect((pkg.description as string).length).toBeGreaterThan(0);
  });
});

// ── .iqra/cycle.txt — decremented from 15 to 14 ──────────────────────────────

describe('.iqra/cycle.txt — cycle counter decremented to 14 in this PR', () => {
  it('file exists and is readable', () => {
    expect(() => readText('.iqra/cycle.txt')).not.toThrow();
  });

  it('trimmed content is exactly "14"', () => {
    const raw = readText('.iqra/cycle.txt').trim();
    expect(raw).toBe('14');
  });

  it('contains only the digit 14 and optional whitespace', () => {
    const raw = readText('.iqra/cycle.txt').trim();
    expect(raw).toMatch(/^\d+$/);
  });

  it('parsed value is 14', () => {
    const n = Number.parseInt(readText('.iqra/cycle.txt').trim(), 10);
    expect(n).toBe(14);
  });

  it('does NOT contain the old value 15', () => {
    const raw = readText('.iqra/cycle.txt').trim();
    expect(raw).not.toBe('15');
  });

  it('cycle is within the valid [1, 30] range', () => {
    const n = Number.parseInt(readText('.iqra/cycle.txt').trim(), 10);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(30);
  });

  it('cycle is a positive integer (not NaN)', () => {
    const n = Number.parseInt(readText('.iqra/cycle.txt').trim(), 10);
    expect(Number.isInteger(n)).toBe(true);
    expect(n).toBeGreaterThan(0);
  });
});

// ── README.md — v2 asset references + new stack layers ───────────────────────

describe('README.md — v2 SVG asset references updated in this PR', () => {
  let readme: string;

  beforeEach(() => {
    readme = readText('README.md');
  });

  it('references aix-stack-header-v2.svg (new v2 asset)', () => {
    expect(readme).toContain('aix-stack-header-v2.svg');
  });

  it('references aix-stack-diagram-v2.svg (new v2 asset)', () => {
    expect(readme).toContain('aix-stack-diagram-v2.svg');
  });

  it('references aix-footer-quote-v2.svg (new v2 asset)', () => {
    expect(readme).toContain('aix-footer-quote-v2.svg');
  });

  it('does NOT reference the old aix-stack-header.svg (no v2 suffix)', () => {
    // The old reference was "./assets/aix-stack-header.svg" — should be replaced
    expect(readme).not.toMatch(/["']\.\/assets\/aix-stack-header\.svg["']/);
  });

  it('does NOT reference the old aix-stack-diagram.svg (no v2 suffix)', () => {
    expect(readme).not.toMatch(/["']\.\/assets\/aix-stack-diagram\.svg["']/);
  });

  it('does NOT reference the old aix-footer-quote.svg (no v2 suffix)', () => {
    expect(readme).not.toMatch(/["']\.\/assets\/aix-footer-quote\.svg["']/);
  });
});

describe('README.md — Echo369 doctrine + new stack layers added in this PR', () => {
  let readme: string;

  beforeEach(() => {
    readme = readText('README.md');
  });

  it('contains "Echo369" codename', () => {
    expect(readme).toContain('Echo369');
  });

  it('contains "AIX/1.0" spec reference', () => {
    expect(readme).toContain('AIX/1.0');
  });

  it('contains L0 root-authority layer reference', () => {
    expect(readme).toContain('L0');
  });

  it('contains axiomid-project L0 repository reference', () => {
    expect(readme).toContain('axiomid-project');
  });

  it('contains AlphaAxiom L4 satellite reference', () => {
    expect(readme).toContain('AlphaAxiom');
  });

  it('contains PiWorker-OS L5 satellite reference', () => {
    expect(readme).toContain('PiWorker-OS');
  });

  it('contains GemClaw L6 satellite reference', () => {
    expect(readme).toContain('GemClaw');
  });

  it('contains L4 satellite layer designation', () => {
    expect(readme).toContain('L4');
  });

  it('contains L5 satellite layer designation', () => {
    expect(readme).toContain('L5');
  });

  it('contains L6 satellite layer designation', () => {
    expect(readme).toContain('L6');
  });

  it('uses colon separator (not em-dash) for "Sovereign Stack" navigation line', () => {
    // PR replaced "—" separators with ":" in prose
    // e.g. "Built on Graded Linear Logic: every action..."
    expect(readme).toContain('Graded Linear Logic:');
  });
});

describe('README.md — "Built by" section removed in this PR', () => {
  let readme: string;

  beforeEach(() => {
    readme = readText('README.md');
  });

  it('does NOT contain the removed "Built by 1 Human + 7 AI Agents" heading', () => {
    expect(readme).not.toContain('Built by 1 Human + 7 AI Agents');
  });

  it('does NOT contain the removed "Coding Agents (3)" subsection heading', () => {
    expect(readme).not.toContain('Coding Agents (3)');
  });

  it('does NOT contain the removed "Review & Debug Agents" subsection heading', () => {
    expect(readme).not.toContain('Review &amp; Debug Agents');
  });

  it('does NOT contain the removed Codesmith badge link', () => {
    expect(readme).not.toContain('blacksmith.sh');
  });
});

// ── New SVG assets — existence checks ────────────────────────────────────────

describe('new SVG assets — file existence (added in this PR)', () => {
  const NEW_ASSETS = [
    'assets/aix-footer-quote-v2.svg',
    'assets/aix-stack-diagram-v2.svg',
    'assets/aix-stack-header-v2.svg',
    'assets/axi-mascot.svg',
  ];

  for (const asset of NEW_ASSETS) {
    it(`${asset} exists`, () => {
      expect(fs.existsSync(path.join(ROOT, asset))).toBe(true);
    });

    it(`${asset} is non-empty`, () => {
      const content = readText(asset);
      expect(content.length).toBeGreaterThan(0);
    });

    it(`${asset} is well-formed SVG (opens with <svg)`, () => {
      const content = readText(asset).trimStart();
      expect(content).toMatch(/^<svg\b/);
    });

    it(`${asset} includes xmlns="http://www.w3.org/2000/svg"`, () => {
      const content = readText(asset);
      expect(content).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it(`${asset} has a closing </svg> tag`, () => {
      const content = readText(asset);
      expect(content.trimEnd()).toMatch(/<\/svg>\s*$/);
    });
  }
});

// ── assets/axi-mascot.svg — accessibility + structural checks ────────────────

describe('assets/axi-mascot.svg — structure and accessibility', () => {
  let svg: string;

  beforeEach(() => {
    svg = readText('assets/axi-mascot.svg');
  });

  it('has role="img" for screen-reader accessibility', () => {
    expect(svg).toContain('role="img"');
  });

  it('has an aria-label attribute', () => {
    expect(svg).toContain('aria-label=');
  });

  it('aria-label mentions "AXI Mascot"', () => {
    expect(svg).toContain('AXI Mascot');
  });

  it('has a <title> element', () => {
    expect(svg).toContain('<title>');
    expect(svg).toContain('</title>');
  });

  it('has a <desc> element for extended description', () => {
    expect(svg).toContain('<desc>');
    expect(svg).toContain('</desc>');
  });

  it('viewBox is "0 0 200 220"', () => {
    expect(svg).toContain('viewBox="0 0 200 220"');
  });

  it('width is 200 and height is 220', () => {
    expect(svg).toContain('width="200"');
    expect(svg).toContain('height="220"');
  });

  it('contains neon green color #00ff41 (primary palette)', () => {
    expect(svg).toContain('#00ff41');
  });

  it('contains cyan accent color #00d4ff', () => {
    expect(svg).toContain('#00d4ff');
  });

  it('has axiBodyGrad linearGradient definition', () => {
    expect(svg).toContain('id="axiBodyGrad"');
  });

  it('has axiBodyFill radialGradient definition', () => {
    expect(svg).toContain('id="axiBodyFill"');
  });

  it('has body ellipse element', () => {
    expect(svg).toContain('<ellipse');
  });

  it('has smile path element', () => {
    expect(svg).toContain('<path');
  });

  it('smile path uses quadratic bezier curve (Q command)', () => {
    // The smile is: M90 120 Q100 130, 110 120
    expect(svg).toContain(' Q');
  });

  it('desc mentions "L0 root-authority"', () => {
    const descMatch = svg.match(/<desc>([\s\S]*?)<\/desc>/);
    expect(descMatch).not.toBeNull();
    expect(descMatch![1]).toContain('L0 root-authority');
  });
});

// ── assets/aix-footer-quote-v2.svg — content checks ─────────────────────────

describe('assets/aix-footer-quote-v2.svg — content and structure', () => {
  let svg: string;

  beforeEach(() => {
    svg = readText('assets/aix-footer-quote-v2.svg');
  });

  it('viewBox is "0 0 900 240"', () => {
    expect(svg).toContain('viewBox="0 0 900 240"');
  });

  it('contains "ECHO369" in the header comment text', () => {
    expect(svg).toContain('ECHO369');
  });

  it('contains the canonical quote "King isn\'t Born, he is Made."', () => {
    expect(svg).toContain("King isn't Born, he is Made.");
  });

  it('contains all four sovereign stack layers in the footer text', () => {
    expect(svg).toContain('L0');
    expect(svg).toContain('L1');
    expect(svg).toContain('L2');
    expect(svg).toContain('L3');
  });

  it('lists satellite layers in the footer text', () => {
    expect(svg).toContain('alphaaxiom');
    expect(svg).toContain('piworker-os');
    expect(svg).toContain('gemclaw');
  });

  it('has an animated pulse circle (animate element)', () => {
    expect(svg).toContain('<animate');
    expect(svg).toContain('repeatCount="indefinite"');
  });

  it('uses neon green accent #39FF14', () => {
    expect(svg).toContain('#39FF14');
  });

  it('has footerAccentV2 linearGradient', () => {
    expect(svg).toContain('id="footerAccentV2"');
  });

  it('contains "END_OF_TRANSMISSION" signature', () => {
    expect(svg).toContain('END_OF_TRANSMISSION');
  });

  it('contains "AIX SOVEREIGN STACK" branding in comment text', () => {
    expect(svg).toContain('AIX SOVEREIGN STACK');
  });
});

// ── assets/aix-stack-diagram-v2.svg — layer topology checks ─────────────────

describe('assets/aix-stack-diagram-v2.svg — stack topology content', () => {
  let svg: string;

  beforeEach(() => {
    svg = readText('assets/aix-stack-diagram-v2.svg');
  });

  it('viewBox is "0 0 1100 560"', () => {
    expect(svg).toContain('viewBox="0 0 1100 560"');
  });

  it('contains "ECHO369" codename', () => {
    expect(svg).toContain('ECHO369');
  });

  it('contains L0 ROOT AUTHORITY label', () => {
    expect(svg).toContain('ROOT AUTHORITY');
  });

  it('contains AXIOMID-PROJECT as L0 entry', () => {
    expect(svg).toContain('AXIOMID-PROJECT');
  });

  it('contains L1 PROTOCOL sovereign core layer', () => {
    expect(svg).toContain('L1 · PROTOCOL');
  });

  it('contains AIX-FORMAT as L1 entry', () => {
    expect(svg).toContain('AIX-FORMAT');
  });

  it('contains L2 RUNTIME sovereign core layer', () => {
    expect(svg).toContain('L2 · RUNTIME');
  });

  it('contains IQRA as L2 entry', () => {
    expect(svg).toContain('IQRA');
  });

  it('contains L3 MARKETPLACE sovereign core layer', () => {
    expect(svg).toContain('L3 · MARKETPLACE');
  });

  it('contains AGENT-SKILLS as L3 entry', () => {
    expect(svg).toContain('AGENT-SKILLS');
  });

  it('contains L4 satellite trading layer', () => {
    expect(svg).toContain('L4 · SATELLITE · TRADING');
  });

  it('contains ALPHAAXIOM as L4 entry', () => {
    expect(svg).toContain('ALPHAAXIOM');
  });

  it('contains L5 satellite Pi layer', () => {
    expect(svg).toContain('L5 · SATELLITE · Pi');
  });

  it('contains PIWORKER-OS as L5 entry', () => {
    expect(svg).toContain('PIWORKER-OS');
  });

  it('contains L6 satellite voice layer', () => {
    expect(svg).toContain('L6 · SATELLITE · VOICE');
  });

  it('contains GEMCLAW as L6 entry', () => {
    expect(svg).toContain('GEMCLAW');
  });

  it('has identity flow annotation from L0 downward', () => {
    expect(svg).toContain('identity flows down');
  });

  it('has money flow annotation from satellites upward', () => {
    expect(svg).toContain('buys skills');
  });

  it('has trust flow topological invariants legend', () => {
    expect(svg).toContain('TOPOLOGICAL INVARIANTS');
  });

  it('topology legend mentions genus 0 and χ = +1', () => {
    expect(svg).toContain('genus 0');
    expect(svg).toContain('χ = +1');
  });

  it('uses neon green #39FF14 for sovereign core layers', () => {
    expect(svg).toContain('#39FF14');
  });

  it('uses gold #FFD700 for L0 root authority', () => {
    expect(svg).toContain('#FFD700');
  });
});

// ── assets/aix-stack-header-v2.svg — header layout checks ───────────────────

describe('assets/aix-stack-header-v2.svg — header layout and content', () => {
  let svg: string;

  beforeEach(() => {
    svg = readText('assets/aix-stack-header-v2.svg');
  });

  it('viewBox is "0 0 1100 340"', () => {
    expect(svg).toContain('viewBox="0 0 1100 340"');
  });

  it('contains "ECHO369" codename', () => {
    expect(svg).toContain('ECHO369');
  });

  it('contains L0 ROOT AUTHORITY label', () => {
    expect(svg).toContain('ROOT AUTHORITY · L0');
  });

  it('contains AXIOMID-PROJECT as L0 repo', () => {
    expect(svg).toContain('AXIOMID-PROJECT');
  });

  it('contains L1 PROTOCOL sovereign core block', () => {
    expect(svg).toContain('L1 · PROTOCOL');
  });

  it('contains L2 RUNTIME sovereign core block', () => {
    expect(svg).toContain('L2 · RUNTIME');
  });

  it('contains L3 MARKETPLACE sovereign core block', () => {
    expect(svg).toContain('L3 · MARKETPLACE');
  });

  it('contains L4 satellite layer block', () => {
    expect(svg).toContain('L4 · SATELLITE · TRADING');
  });

  it('contains ALPHAAXIOM in L4 satellite block', () => {
    expect(svg).toContain('ALPHAAXIOM');
  });

  it('contains L5 satellite Pi layer block', () => {
    expect(svg).toContain('L5 · SATELLITE · Pi');
  });

  it('contains PIWORKER-OS in L5 satellite block', () => {
    expect(svg).toContain('PIWORKER-OS');
  });

  it('contains L6 satellite voice layer block', () => {
    expect(svg).toContain('L6 · SATELLITE · VOICE');
  });

  it('contains GEMCLAW in L6 satellite block', () => {
    expect(svg).toContain('GEMCLAW');
  });

  it('has a live pulse animation circle', () => {
    expect(svg).toContain('<animate');
    expect(svg).toContain('repeatCount="indefinite"');
  });

  it('has a "LIVE" label near the pulse indicator', () => {
    expect(svg).toContain('LIVE');
  });

  it('uses neon green #39FF14 for core layer borders', () => {
    expect(svg).toContain('#39FF14');
  });

  it('uses gold #FFD700 for L0 root-authority border', () => {
    expect(svg).toContain('#FFD700');
  });

  it('uses dimmed #666666 for satellite layer borders', () => {
    expect(svg).toContain('#666666');
  });

  it('shows M2M money-flow arrows from satellite layers', () => {
    expect(svg).toContain('M2M');
  });

  it('has topAccentV2 gradient for top border bar', () => {
    expect(svg).toContain('id="topAccentV2"');
  });

  it('contains "spec AIX/1.0" in the header text', () => {
    expect(svg).toContain('SPEC AIX/1.0');
  });
});
