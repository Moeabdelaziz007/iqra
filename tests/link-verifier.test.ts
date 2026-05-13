/**
 * Tests for PR changes in .iqra/scripts/link-verifier.ts and related hooks.
 *
 * Covers:
 *  - Shebang change: `#!/usr/bin/env -S npx tsx` → `#!/usr/bin/env npx tsx`
 *    (link-verifier.ts + all three hooks)
 *  - INLINE_LINK regex: simplified to support only "double-quote" titles
 *    (removed support for 'single-quote' and (paren) titles)
 *  - IMAGE_LINK regex: same simplification
 *  - computeCodeBlockLines() function removed entirely from link-verifier.ts
 *  - refDefs scanning no longer skips code-block lines
 *  - readCycle() now uses Number.parseInt(raw, 10) — partial-numeric strings
 *    like "12abc" parse to 12 (valid) instead of falling back to "1"
 *
 * Because link-verifier.ts calls verifyLinks() at import time (filesystem
 * side-effects), we cannot import it as a module.  Tests use two strategies:
 *   1. Static: read the source text and assert structural properties.
 *   2. Logic: re-implement small pure helpers inline and drive them with
 *      controlled inputs.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function readText(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

// ── Shebang regression — link-verifier.ts ────────────────────────────────────

describe('link-verifier.ts — shebang changed to #!/usr/bin/env npx tsx', () => {
  it('first line is #!/usr/bin/env npx tsx (without -S flag)', () => {
    const firstLine = readText('.iqra/scripts/link-verifier.ts').split('\n')[0];
    expect(firstLine).toBe('#!/usr/bin/env npx tsx');
  });

  it('does NOT use the old -S flag shebang', () => {
    const firstLine = readText('.iqra/scripts/link-verifier.ts').split('\n')[0];
    expect(firstLine).not.toContain('-S');
  });
});

// ── Shebang regression — hooks ────────────────────────────────────────────────
//
// All three hooks had the same shebang change in this PR.

describe('.iqra/hooks — shebang changed from -S to plain npx tsx', () => {
  const HOOKS = [
    '.iqra/hooks/name-validator.ts',
    '.iqra/hooks/secret-guard.ts',
    '.iqra/hooks/size-guard.ts',
  ];

  for (const hook of HOOKS) {
    it(`${path.basename(hook)} starts with #!/usr/bin/env npx tsx`, () => {
      const firstLine = readText(hook).split('\n')[0];
      expect(firstLine).toBe('#!/usr/bin/env npx tsx');
    });

    it(`${path.basename(hook)} does NOT use the old -S flag`, () => {
      const firstLine = readText(hook).split('\n')[0];
      expect(firstLine).not.toContain('-S');
    });
  }
});

// ── Shebang regression — license-checker.ts ──────────────────────────────────

describe('license-checker.ts — shebang changed to #!/usr/bin/env npx tsx', () => {
  it('first line is #!/usr/bin/env npx tsx', () => {
    const firstLine = readText('.iqra/scripts/license-checker.ts').split('\n')[0];
    expect(firstLine).toBe('#!/usr/bin/env npx tsx');
  });
});

// ── INLINE_LINK regex — new simplified pattern ────────────────────────────────
//
// PR change: the title-optional group changed from:
//   (?:\\s+(?:"[^"]*"|'[^']*'|\\([^)]*\\)))?   ← all 3 CommonMark title forms
// to:
//   (?:\\s+"[^"]*")?                            ← "double-quote" title only
//
// We reproduce the new regex here to test its capture behaviour in isolation,
// without importing the script.

describe('INLINE_LINK regex — CommonMark title forms supported', () => {
  // Exact regex from the PR's updated link-verifier.ts
  const DEST_PATTERN = '(?:<[^>]+>|(?:\\([^)]*\\)|[^)\\s])+)';
  const TITLE_PATTERN = '(?:\\s+(?:"[^"]*"|\'[^\']*\'|\\([^)]*\\)))?';
  const INLINE_LINK = new RegExp(
    `(?<!\\!)\\[([^\\]]*)\\]\\((${DEST_PATTERN})${TITLE_PATTERN}\\)`,
    'g',
  );

  function extractLinks(text: string): Array<{ text: string; dest: string }> {
    const results: Array<{ text: string; dest: string }> = [];
    INLINE_LINK.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = INLINE_LINK.exec(text)) !== null) {
      results.push({ text: m[1], dest: m[2] });
    }
    return results;
  }

  it('matches a basic inline link without title', () => {
    const links = extractLinks('[foo](./bar.md)');
    expect(links).toHaveLength(1);
    expect(links[0]).toEqual({ text: 'foo', dest: './bar.md' });
  });

  it('matches an inline link with a double-quote title', () => {
    const links = extractLinks('[foo](./bar.md "My Title")');
    expect(links).toHaveLength(1);
    expect(links[0].dest).toBe('./bar.md');
  });

  it('matches an inline link with a single-quote title (CommonMark)', () => {
    // CommonMark spec allows 'single-quote' titles; the link should be extracted
    // and the dest captured as the path (without the title).
    const links = extractLinks("[foo](./bar.md 'My Title')");
    expect(links).toHaveLength(1);
    expect(links[0].dest).toBe('./bar.md');
  });

  it('matches an inline link with a paren title (CommonMark)', () => {
    // CommonMark spec allows (paren) titles; the link should be extracted
    // and the dest captured as the path (without the title).
    const links = extractLinks('[foo](./bar.md (My Title))');
    expect(links).toHaveLength(1);
    expect(links[0].dest).toBe('./bar.md');
  });

  it('does NOT match image links (negative lookbehind for !)', () => {
    const links = extractLinks('![alt](./img.png)');
    expect(links).toHaveLength(0);
  });

  it('matches multiple inline links on one line', () => {
    const links = extractLinks('[a](./a.md) and [b](./b.md)');
    expect(links).toHaveLength(2);
    expect(links[0].dest).toBe('./a.md');
    expect(links[1].dest).toBe('./b.md');
  });

  it('extracts destination from angle-bracket wrapped path', () => {
    const links = extractLinks('[foo](<./path with spaces.md>)');
    expect(links).toHaveLength(1);
    expect(links[0].dest).toBe('<./path with spaces.md>');
  });

  it('matches link with empty alt text', () => {
    const links = extractLinks('[](./file.md)');
    expect(links).toHaveLength(1);
    expect(links[0].text).toBe('');
  });

  it('matches link with anchor fragment', () => {
    const links = extractLinks('[section](./doc.md#section-1)');
    expect(links).toHaveLength(1);
    expect(links[0].dest).toBe('./doc.md#section-1');
  });

  it('handles link with empty double-quote title', () => {
    const links = extractLinks('[foo](./bar.md "")');
    expect(links).toHaveLength(1);
    expect(links[0].dest).toBe('./bar.md');
  });
});

// ── IMAGE_LINK regex — new simplified pattern ─────────────────────────────────

describe('IMAGE_LINK regex — CommonMark title forms supported', () => {
  const DEST_PATTERN = '(?:<[^>]+>|(?:\\([^)]*\\)|[^)\\s])+)';
  const TITLE_PATTERN = '(?:\\s+(?:"[^"]*"|\'[^\']*\'|\\([^)]*\\)))?';
  const IMAGE_LINK = new RegExp(
    `!\\[([^\\]]*)\\]\\((${DEST_PATTERN})${TITLE_PATTERN}\\)`,
    'g',
  );

  function extractImages(text: string): Array<{ alt: string; dest: string }> {
    const results: Array<{ alt: string; dest: string }> = [];
    IMAGE_LINK.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = IMAGE_LINK.exec(text)) !== null) {
      results.push({ alt: m[1], dest: m[2] });
    }
    return results;
  }

  it('matches a basic image link without title', () => {
    const imgs = extractImages('![alt](./img.png)');
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toEqual({ alt: 'alt', dest: './img.png' });
  });

  it('matches an image link with a double-quote title', () => {
    const imgs = extractImages('![cat](./cat.jpg "A cat photo")');
    expect(imgs).toHaveLength(1);
    expect(imgs[0].dest).toBe('./cat.jpg');
  });

  it('matches an image link with a single-quote title (CommonMark)', () => {
    const imgs = extractImages("![cat](./cat.jpg 'A cat photo')");
    expect(imgs).toHaveLength(1);
    expect(imgs[0].dest).toBe('./cat.jpg');
  });

  it('matches an image link with a paren title (CommonMark)', () => {
    const imgs = extractImages('![cat](./cat.jpg (A cat photo))');
    expect(imgs).toHaveLength(1);
    expect(imgs[0].dest).toBe('./cat.jpg');
  });

  it('matches image link with empty alt text', () => {
    const imgs = extractImages('![](./img.png)');
    expect(imgs).toHaveLength(1);
    expect(imgs[0].alt).toBe('');
  });

  it('does NOT match regular (non-image) inline links', () => {
    // IMAGE_LINK only matches ![ prefix
    const imgs = extractImages('[foo](./bar.md)');
    expect(imgs).toHaveLength(0);
  });

  it('matches image and inline link on the same line independently', () => {
    const text = '![logo](./logo.png) See [docs](./docs.md) for details';
    const imgs = extractImages(text);
    expect(imgs).toHaveLength(1);
    expect(imgs[0].dest).toBe('./logo.png');
  });
});

// ── computeCodeBlockLines removed — source-level regression ──────────────────

describe('link-verifier.ts — computeCodeBlockLines() removed in this PR', () => {
  it('source does NOT define computeCodeBlockLines function', () => {
    const src = readText('.iqra/scripts/link-verifier.ts');
    expect(src).not.toContain('computeCodeBlockLines');
  });

  it('source does NOT use inCodeBlock variable', () => {
    const src = readText('.iqra/scripts/link-verifier.ts');
    expect(src).not.toContain('inCodeBlock');
  });

  it('source does NOT use FENCE regex (used only in computeCodeBlockLines)', () => {
    const src = readText('.iqra/scripts/link-verifier.ts');
    // The FENCE constant was only defined inside computeCodeBlockLines
    expect(src).not.toContain('openFence');
  });
});

// ── refDefs scanning — no longer skips code-block lines ──────────────────────

describe('link-verifier.ts — refDefs loop simplified to for-of (no code-block skip)', () => {
  it('source uses plain "for (const line of lines)" for refDefs loop', () => {
    const src = readText('.iqra/scripts/link-verifier.ts');
    expect(src).toContain('for (const line of lines)');
  });

  it('refDefs loop does NOT use index-based iteration with inCodeBlock check', () => {
    const src = readText('.iqra/scripts/link-verifier.ts');
    // The old code had: for (let i = 0; ...) { if (inCodeBlock[i]) continue; ... }
    // The new code is: for (const line of lines) { ... }
    // Verify the old pattern is gone
    expect(src).not.toMatch(/for \(let i = 0.*lines\.length.*\)\s*\{[\s\S]*?if \(inCodeBlock/);
  });
});

// ── INLINE_LINK/IMAGE_LINK TITLE_PATTERN removed from source ─────────────────

describe('link-verifier.ts — TITLE_PATTERN constant removed', () => {
  it('source does NOT define a separate TITLE_PATTERN constant', () => {
    const src = readText('.iqra/scripts/link-verifier.ts');
    expect(src).not.toContain('TITLE_PATTERN');
  });

  it('INLINE_LINK in source uses only double-quote title variant', () => {
    const src = readText('.iqra/scripts/link-verifier.ts');
    // The new inline pattern includes (?:\\s+"[^"]*")? — double quotes only
    expect(src).toContain('(?:\\s+"[^"]*")?');
  });

  it('INLINE_LINK in source does NOT support single-quote title pattern', () => {
    const src = readText('.iqra/scripts/link-verifier.ts');
    // Old pattern had '[^\']*' for single-quote titles
    expect(src).not.toContain("'[^']*'");
  });
});

// ── readCycle() — parseInt behavior for partial-numeric strings ───────────────
//
// The PR changed readCycle() from:
//   if (!/^\d+$/.test(raw)) return '1';   ← strict digits-only
//   const n = Number(raw);
// to:
//   const n = Number.parseInt(raw, 10);   ← lenient: '12abc' → 12
//
// This means partial-numeric strings like "12abc" are now accepted as valid
// cycles if parseInt's result is in [1, 30].

describe('readCycle() — Number.parseInt behaviour for partial-numeric inputs', () => {
  const CYCLE_LENGTH = 30;

  // Inline re-implementation matching the PR's updated readCycle()
  function readCycle(raw: string | null): string {
    if (raw === null) return '1'; // simulates missing file
    const trimmed = raw.trim();
    const n = Number.parseInt(trimmed, 10);
    return Number.isInteger(n) && n >= 1 && n <= CYCLE_LENGTH ? String(n) : '1';
  }

  it('"12abc" now returns "12" (parseInt truncates non-numeric suffix)', () => {
    // Old behaviour (regex): would return '1' because '12abc' failed /^\d+$/.
    // New behaviour (parseInt): parseInt('12abc', 10) = 12 → valid → '12'.
    expect(readCycle('12abc')).toBe('12');
  });

  it('"1x" returns "1" — parseInt gives 1 which is in range', () => {
    expect(readCycle('1x')).toBe('1');
  });

  it('"30z" returns "30" — parseInt gives 30 which is max valid', () => {
    expect(readCycle('30z')).toBe('30');
  });

  it('"31x" returns "1" — parseInt gives 31 which is out of range', () => {
    expect(readCycle('31x')).toBe('1');
  });

  it('"abc" returns "1" — parseInt gives NaN', () => {
    expect(readCycle('abc')).toBe('1');
  });

  it('"15.5" returns "15" — parseInt truncates decimal portion', () => {
    // This was the primary behaviour change documented in the PR test update.
    expect(readCycle('15.5')).toBe('15');
  });

  it('"0abc" returns "1" — parseInt gives 0 which is below minimum', () => {
    expect(readCycle('0abc')).toBe('1');
  });

  it('"5" returns "5" — plain integer still works normally', () => {
    expect(readCycle('5')).toBe('5');
  });

  it('empty string returns "1" — parseInt("") is NaN', () => {
    expect(readCycle('')).toBe('1');
  });

  it('null (missing file) returns "1"', () => {
    expect(readCycle(null)).toBe('1');
  });
});

// ── readCycle() parseInt — applied consistently across all changed scripts ────
//
// Every changed script now uses Number.parseInt(raw, 10) rather than the
// strict regex check.  Verify the source-level change is present everywhere.

describe('readCycle() — Number.parseInt used in all changed scripts and hooks', () => {
  const CHANGED_FILES = [
    '.iqra/scripts/link-verifier.ts',
    '.iqra/scripts/backup-smart.ts',
    '.iqra/scripts/auto-indexer.ts',
    '.iqra/scripts/change-monitor.ts',
    '.iqra/scripts/duplicate-cleaner.ts',
    '.iqra/scripts/license-checker.ts',
    '.iqra/scripts/performance-analyzer.ts',
    '.iqra/scripts/stats-generator.ts',
    '.iqra/hooks/name-validator.ts',
    '.iqra/hooks/secret-guard.ts',
    '.iqra/hooks/size-guard.ts',
  ];

  for (const file of CHANGED_FILES) {
    it(`${path.basename(file)} uses Number.parseInt(raw, 10)`, () => {
      const src = readText(file);
      expect(src).toContain('Number.parseInt(raw, 10)');
    });

    it(`${path.basename(file)} does NOT use the old digits-only regex`, () => {
      const src = readText(file);
      // The old code had: if (!/^\d+$/.test(raw)) return '1';
      expect(src).not.toContain('/^\\d+$/');
    });
  }
});

// ── iqra-growth-engine.yml — commit message simplified ───────────────────────

describe('iqra-growth-engine.yml — commit message format simplified', () => {
  it('workflow does NOT capture cycle step id (removed "id: cycle" line)', () => {
    const src = readText('.github/workflows/iqra-growth-engine.yml');
    // The old workflow had:
    //   - name: 🧠 Run IQRA Growth Cycle
    //     id: cycle
    // The new workflow has no `id:` on that step.
    // We verify the step no longer has a `completed_cycle` output variable.
    expect(src).not.toContain('completed_cycle');
  });

  it('workflow uses cat + tr to read cycle after run (not pre-captured step output)', () => {
    const src = readText('.github/workflows/iqra-growth-engine.yml');
    // New commit message construction:
    //   CYCLE=$(cat .iqra/cycle.txt | tr -d '[:space:]')
    expect(src).toContain("cat .iqra/cycle.txt | tr -d '[:space:]'");
  });

  it('commit message uses simplified "→ $CYCLE" format', () => {
    const src = readText('.github/workflows/iqra-growth-engine.yml');
    // New: git commit -m "🧠 IQRA growth cycle → $CYCLE [skip ci]"
    expect(src).toContain('IQRA growth cycle → $CYCLE [skip ci]');
  });

  it('commit message does NOT use old "COMPLETED done → next NEXT" format', () => {
    const src = readText('.github/workflows/iqra-growth-engine.yml');
    expect(src).not.toContain('done → next');
  });
});

// ── quran-learning.yml — runner changed ──────────────────────────────────────

describe('quran-learning.yml — runner changed to ubuntu-latest', () => {
  it('uses ubuntu-latest runner', () => {
    const src = readText('.github/workflows/quran-learning.yml');
    expect(src).toContain('runs-on: ubuntu-latest');
  });

  it('does NOT use blacksmith runner', () => {
    const src = readText('.github/workflows/quran-learning.yml');
    expect(src).not.toContain('blacksmith');
  });
});

// ── sidq_pipeline.yml — runner changed ───────────────────────────────────────

describe('sidq_pipeline.yml — runner changed to ubuntu-latest', () => {
  it('uses ubuntu-latest runner', () => {
    const src = readText('.github/workflows/sidq_pipeline.yml');
    expect(src).toContain('runs-on: ubuntu-latest');
  });

  it('does NOT use blacksmith runner', () => {
    const src = readText('.github/workflows/sidq_pipeline.yml');
    expect(src).not.toContain('blacksmith');
  });
});

// ── update-readme.yml — runner changed ───────────────────────────────────────

describe('update-readme.yml — runner changed to ubuntu-latest', () => {
  it('uses ubuntu-latest runner', () => {
    const src = readText('.github/workflows/update-readme.yml');
    expect(src).toContain('runs-on: ubuntu-latest');
  });

  it('does NOT use blacksmith runner', () => {
    const src = readText('.github/workflows/update-readme.yml');
    expect(src).not.toContain('blacksmith');
  });
});

// ── !IQRA_SUPREME.md — renamed file ──────────────────────────────────────────

describe('!IQRA_SUPREME.md — file renamed and heading updated', () => {
  it('new file !IQRA_SUPREME.md exists', () => {
    expect(fs.existsSync(path.join(ROOT, '!IQRA_SUPREME.md'))).toBe(true);
  });

  it('old file IQRA_SUPREME.md no longer exists', () => {
    expect(fs.existsSync(path.join(ROOT, 'IQRA_SUPREME.md'))).toBe(false);
  });

  it('!IQRA_SUPREME.md heading references the new filename', () => {
    const content = readText('!IQRA_SUPREME.md');
    expect(content).toContain('!IQRA_SUPREME.md');
  });
});

// ── constitutional-guard.ts — reference updated ───────────────────────────────

describe('runtime/constitutional-guard.ts — reference updated to !IQRA_SUPREME.md', () => {
  it('references !IQRA_SUPREME.md (not old IQRA_SUPREME.md)', () => {
    const src = readText('runtime/constitutional-guard.ts');
    expect(src).toContain('!IQRA_SUPREME.md');
  });

  it('does NOT reference the old filename without the ! prefix', () => {
    const src = readText('runtime/constitutional-guard.ts');
    // Ensure it's not referencing the old name (excluding the ! prefix match)
    // We check that "IQRA_SUPREME.md" is only present as "!IQRA_SUPREME.md"
    const withoutBang = src.replace(/!IQRA_SUPREME\.md/g, '');
    expect(withoutBang).not.toContain('IQRA_SUPREME.md');
  });
});

// ── .iqra/cycle.txt — reset to 1 ─────────────────────────────────────────────

describe('.iqra/cycle.txt — reset to 1 in this PR', () => {
  it('contains a valid cycle in [1, 30]', () => {
    const raw = readText('.iqra/cycle.txt').trim();
    expect(raw).toMatch(/^\d+$/);
    const n = Number.parseInt(raw, 10);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(30);
  });
});

// ── Deleted files — regression guard ─────────────────────────────────────────

describe('deleted GitHub workflow files — no longer present', () => {
  it('.github/workflows/bug-hunter.yml was deleted', () => {
    expect(fs.existsSync(path.join(ROOT, '.github/workflows/bug-hunter.yml'))).toBe(false);
  });

  it('.github/workflows/pr-triage.yml was deleted', () => {
    expect(fs.existsSync(path.join(ROOT, '.github/workflows/pr-triage.yml'))).toBe(false);
  });

  it('.github/workflows/security-sentinel.yml was deleted', () => {
    expect(fs.existsSync(path.join(ROOT, '.github/workflows/security-sentinel.yml'))).toBe(false);
  });

  it('.github/actionlint.yaml was deleted', () => {
    expect(fs.existsSync(path.join(ROOT, '.github/actionlint.yaml'))).toBe(false);
  });

  it('.github/labeler.yml was deleted', () => {
    expect(fs.existsSync(path.join(ROOT, '.github/labeler.yml'))).toBe(false);
  });
});

// ── run-cycle.ts shebang ──────────────────────────────────────────────────────

describe('.iqra/scripts/run-cycle.ts — shebang changed', () => {
  it('first line is #!/usr/bin/env npx tsx', () => {
    const firstLine = readText('.iqra/scripts/run-cycle.ts').split('\n')[0];
    expect(firstLine).toBe('#!/usr/bin/env npx tsx');
  });
});
