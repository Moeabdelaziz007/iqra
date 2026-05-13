/**
 * Unit Tests: Phase 5a PR changes
 *
 * Covers changes introduced in this PR:
 *   - README.md             : SVG references updated to non-v2 assets; Extended
 *                             Ecosystem section and satellite table removed
 *   - package.json          : "aix" metadata block removed
 *   - assets/               : v2 SVG files and mascot deleted; non-v2 SVGs present
 *   - src/services/go-engine/go.mod : OpenTelemetry deps added
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..'); // src/tests/unit → root

// ── helpers ──────────────────────────────────────────────────────────────────

function readFile(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf8');
}

function readJson(relPath: string): unknown {
  return JSON.parse(readFile(relPath));
}

function fileExists(relPath: string): boolean {
  return existsSync(resolve(ROOT, relPath));
}

// ── package.json changes ─────────────────────────────────────────────────────

describe('package.json: aix metadata block removed', () => {
  const pkg = readJson('package.json') as Record<string, unknown>;

  it('no longer has an "aix" top-level field', () => {
    expect(pkg['aix']).toBeUndefined();
  });

  it('package name is still "iqra"', () => {
    expect(pkg['name']).toBe('iqra');
  });

  it('package version is still "0.3.69"', () => {
    expect(pkg['version']).toBe('0.3.69');
  });

  it('description is a non-empty string', () => {
    expect(typeof pkg['description']).toBe('string');
    expect((pkg['description'] as string).length).toBeGreaterThan(0);
  });

  it('description contains "IQRA"', () => {
    expect(pkg['description'] as string).toContain('IQRA');
  });

  // Boundary: confirm the removed keys are truly gone
  it('"aix" block sub-keys are not hoisted to the top level', () => {
    expect(pkg['stackVersion']).toBeUndefined();
    expect(pkg['stackCodename']).toBeUndefined();
    expect(pkg['spec']).toBeUndefined();
    expect(pkg['layer']).toBeUndefined();
    expect(pkg['layerName']).toBeUndefined();
    expect(pkg['authority']).toBeUndefined();
  });
});

// ── assets: deleted files ─────────────────────────────────────────────────────

describe('assets: v2 SVG files and mascot have been deleted', () => {
  it('assets/aix-footer-quote-v2.svg no longer exists', () => {
    expect(fileExists('assets/aix-footer-quote-v2.svg')).toBe(false);
  });

  it('assets/aix-stack-diagram-v2.svg no longer exists', () => {
    expect(fileExists('assets/aix-stack-diagram-v2.svg')).toBe(false);
  });

  it('assets/aix-stack-header-v2.svg no longer exists', () => {
    expect(fileExists('assets/aix-stack-header-v2.svg')).toBe(false);
  });

  it('assets/axi-mascot.svg no longer exists', () => {
    expect(fileExists('assets/axi-mascot.svg')).toBe(false);
  });
});

// ── assets: non-v2 SVGs still present ────────────────────────────────────────

describe('assets: canonical (non-v2) SVG files are present', () => {
  it('assets/aix-stack-header.svg exists', () => {
    expect(fileExists('assets/aix-stack-header.svg')).toBe(true);
  });

  it('assets/aix-stack-diagram.svg exists', () => {
    expect(fileExists('assets/aix-stack-diagram.svg')).toBe(true);
  });

  it('assets/aix-footer-quote.svg exists', () => {
    expect(fileExists('assets/aix-footer-quote.svg')).toBe(true);
  });

  it('assets/aix-stack-header.svg is a valid SVG document', () => {
    const svg = readFile('assets/aix-stack-header.svg');
    expect(svg).toMatch(/<svg\b/);
    expect(svg).toMatch(/<\/svg>/);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('assets/aix-stack-diagram.svg is a valid SVG document', () => {
    const svg = readFile('assets/aix-stack-diagram.svg');
    expect(svg).toMatch(/<svg\b/);
    expect(svg).toMatch(/<\/svg>/);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('assets/aix-footer-quote.svg is a valid SVG document', () => {
    const svg = readFile('assets/aix-footer-quote.svg');
    expect(svg).toMatch(/<svg\b/);
    expect(svg).toMatch(/<\/svg>/);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });
});

// ── README.md: SVG reference updates ─────────────────────────────────────────

describe('README.md: SVG asset references updated to non-v2 paths', () => {
  const readme = readFile('README.md');

  it('references the non-v2 header SVG (aix-stack-header.svg)', () => {
    expect(readme).toContain('aix-stack-header.svg');
  });

  it('does not reference the deleted v2 header SVG (aix-stack-header-v2.svg)', () => {
    expect(readme).not.toContain('aix-stack-header-v2.svg');
  });

  it('references the non-v2 diagram SVG (aix-stack-diagram.svg)', () => {
    expect(readme).toContain('aix-stack-diagram.svg');
  });

  it('does not reference the deleted v2 diagram SVG (aix-stack-diagram-v2.svg)', () => {
    expect(readme).not.toContain('aix-stack-diagram-v2.svg');
  });

  it('references the non-v2 footer SVG (aix-footer-quote.svg)', () => {
    expect(readme).toContain('aix-footer-quote.svg');
  });

  it('does not reference the deleted v2 footer SVG (aix-footer-quote-v2.svg)', () => {
    expect(readme).not.toContain('aix-footer-quote-v2.svg');
  });

  it('does not reference the deleted mascot SVG (axi-mascot.svg)', () => {
    expect(readme).not.toContain('axi-mascot.svg');
  });
});

// ── README.md: Extended Ecosystem section removed ─────────────────────────────

describe('README.md: Extended Ecosystem section and satellite table removed', () => {
  const readme = readFile('README.md');

  it('no longer contains the "Extended Ecosystem" heading', () => {
    expect(readme).not.toContain('### Extended Ecosystem');
  });

  it('no longer contains L0 root authority satellite table rows', () => {
    // The removed table had | 👑 **L0** | and "Root Authority" in the satellite section
    expect(readme).not.toContain('| 👑 **L0**');
  });

  it('no longer contains the satellite tier rows (L4/L5/L6 table)', () => {
    expect(readme).not.toContain('| 💹 **L4**');
    expect(readme).not.toContain('| π **L5**');
    expect(readme).not.toContain('| 🎙️ **L6**');
  });

  it('no longer contains the AXIOM.md Extended Ecosystem doctrine reference', () => {
    // Removed line: "See AXIOM.md §4.5 for the full doctrine and AIX_STACK_VERSIONING.md"
    expect(readme).not.toContain('AXIOM.md §4.5');
  });

  it('no longer contains the L0 sub-navigation line under the header', () => {
    // Removed: "<sub>Root Authority · [**L0 · `axiomid-project` ↑**]..."
    expect(readme).not.toContain('Root Authority · [');
  });

  it('no longer contains the footer satellite links sub-block', () => {
    // Removed: "<sub>L0 · [`axiomid-project`]... L4 · L5 · L6 ...</sub>"
    expect(readme).not.toContain('L4 · [`AlphaAxiom`]');
  });

  it('still contains the main stack section heading', () => {
    expect(readme).toContain('## 🌐 THE STACK');
  });

  it('still contains the sovereign core navigation breadcrumbs (L1/L2/L3)', () => {
    expect(readme).toContain('aix-format');
    expect(readme).toContain('YOU ARE HERE');
    expect(readme).toContain('aix-agent-skills');
  });

  it('still contains the L1/L2/L3 core table', () => {
    // The sovereign core table (3 rows) remains
    expect(readme).toContain('**L1**');
    expect(readme).toContain('**L2**');
    expect(readme).toContain('**L3**');
  });
});

// ── README.md: badge and badge content updates ────────────────────────────────

describe('README.md: badge content reflects simplified stack branding', () => {
  const readme = readFile('README.md');

  it('contains the Layer badge for L2 Runtime', () => {
    expect(readme).toContain('L2%20%C2%B7%20RUNTIME');
  });

  it('contains the AIX Stack version badge (v0.369.0)', () => {
    expect(readme).toContain('v0.369.0');
  });

  it('no longer contains the removed AIX STACK Echo369 badge URL', () => {
    // The badge "AIX%20STACK-Echo369" was removed in this PR
    expect(readme).not.toContain('AIX%20STACK-Echo369');
  });

  it('no longer contains the removed Spec badge (AIX%2F1.0)', () => {
    // The separate Spec badge was removed
    expect(readme).not.toContain('SPEC-AIX%2F1.0');
  });

  it('no longer contains the removed version badge v0.3.69 as a badge', () => {
    // The old version badge "version-v0.3.69" was removed
    expect(readme).not.toContain('version-v0.3.69');
  });
});

// ── README.md: prose punctuation updated (colons → em dashes) ────────────────

describe('README.md: prose punctuation updated from colon to em dash style', () => {
  const readme = readFile('README.md');

  it('uses em dash in the ethics engine description', () => {
    expect(readme).toContain('Graded Linear Logic —');
  });

  it('uses em dash in the multi-agent orchestration description', () => {
    expect(readme).toContain('defined role — no overlap');
  });

  it('uses em dash in the stack description sentence', () => {
    expect(readme).toContain('AIX Sovereign Stack —');
  });

  it('uses em dash in the Local SQLite DB description', () => {
    expect(readme).toContain('SQLite DB — works offline');
  });

  it('uses em dash in the local mode comment', () => {
    expect(readme).toContain('Local mode — 8GB RAM friendly');
  });

  it('uses em dash in the A2A discovery endpoint descriptions', () => {
    expect(readme).toContain('agent-card.json — agent capabilities');
    expect(readme).toContain('did.json — `did:web`');
  });

  it('uses em dash in the IQRA tagline footer', () => {
    expect(readme).toContain('**IQRA** — Built for truth');
  });
});

// ── go.mod: OpenTelemetry dependencies added ──────────────────────────────────

describe('src/services/go-engine/go.mod: OpenTelemetry dependencies', () => {
  const goMod = readFile('src/services/go-engine/go.mod');

  it('declares the otelhttp contrib instrumentation dependency', () => {
    expect(goMod).toContain('go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp');
  });

  it('declares the core otel dependency', () => {
    expect(goMod).toContain('go.opentelemetry.io/otel ');
  });

  it('declares the OTLP trace HTTP exporter', () => {
    expect(goMod).toContain('go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp');
  });

  it('declares the stdout trace exporter', () => {
    expect(goMod).toContain('go.opentelemetry.io/otel/exporters/stdout/stdouttrace');
  });

  it('declares the otel SDK', () => {
    expect(goMod).toContain('go.opentelemetry.io/otel/sdk ');
  });

  it('declares the otel trace package', () => {
    expect(goMod).toContain('go.opentelemetry.io/otel/trace ');
  });

  it('has the correct module name', () => {
    expect(goMod).toContain('module iqra/engine');
  });
});

// ── go.sum: present and non-empty ────────────────────────────────────────────

describe('src/services/go-engine/go.sum: lockfile present', () => {
  it('go.sum file exists', () => {
    expect(fileExists('src/services/go-engine/go.sum')).toBe(true);
  });

  it('go.sum is non-empty', () => {
    const content = readFile('src/services/go-engine/go.sum');
    expect(content.trim().length).toBeGreaterThan(0);
  });

  it('go.sum contains otel SDK hash', () => {
    const content = readFile('src/services/go-engine/go.sum');
    expect(content).toContain('go.opentelemetry.io/otel/sdk');
  });

  it('go.sum contains otelhttp contrib hash', () => {
    const content = readFile('src/services/go-engine/go.sum');
    expect(content).toContain('go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp');
  });
});

// ── observability README section ──────────────────────────────────────────────

describe('src/services/go-engine/README.md: Phase 5a observability section', () => {
  const readme = readFile('src/services/go-engine/README.md');

  it('contains the Observability section heading', () => {
    expect(readme).toContain('## 📈 Observability');
  });

  it('documents OTEL_EXPORTER_OTLP_ENDPOINT env var', () => {
    expect(readme).toContain('OTEL_EXPORTER_OTLP_ENDPOINT');
  });

  it('documents OTEL_STDOUT env var for local debugging', () => {
    expect(readme).toContain('OTEL_STDOUT=true');
  });

  it('documents OTEL_DISABLED env var for CI', () => {
    expect(readme).toContain('OTEL_DISABLED=true');
  });

  it('mentions the Phase 5a label', () => {
    expect(readme).toContain('Phase 5a');
  });

  it('lists AIX Stack identity span attributes', () => {
    expect(readme).toContain('service.name=iqra-go-engine');
    expect(readme).toContain('aix.stack.codename=Echo369');
    expect(readme).toContain('aix.stack.spec=AIX/1.0');
    expect(readme).toContain('aix.layer=L2');
    expect(readme).toContain('aix.authority=axiomid.app');
  });

  it('states the default NoOp behaviour (silent with no env vars)', () => {
    expect(readme).toContain('Defaults are silent');
  });
});
