// بسم الله الرحمن الرحيم

/**
 * 🧪 IQRA_SUPREME.md Rename Regression Tests
 *
 * Verifies that all references to the old filename "!IQRA_SUPREME.md" have
 * been replaced with the correct "IQRA_SUPREME.md" across changed files.
 *
 * Scope: Covers every file touched in the PR that renamed the file:
 *   - runtime/constitutional-guard.ts
 *   - src/scripts_v2/agent.ts
 *   - src/scripts_v2/integrity_check.ts
 *   - IQRA_SUPREME.md (the renamed file itself)
 *   - src/lib/iqra/00-manifest/DASTŪR.md
 *   - src/lib/iqra/00-manifest/FITRAH.md
 *   - src/lib/iqra/00-manifest/TAWBAH.md
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Project root (three levels up from src/tests/unit/)
const ROOT = path.resolve(import.meta.dirname, '../../../');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

// ── Helper ────────────────────────────────────────────────────────────────────

/** Returns true if the content contains the OLD forbidden reference */
function containsOldReference(content: string): boolean {
  return content.includes('!IQRA_SUPREME.md');
}

// ── TypeScript files ──────────────────────────────────────────────────────────

describe('IQRA_SUPREME.md rename — TypeScript file references', () => {

  describe('runtime/constitutional-guard.ts', () => {
    const content = readFile('runtime/constitutional-guard.ts');

    it('does not reference the old filename "!IQRA_SUPREME.md"', () => {
      expect(containsOldReference(content)).toBe(false);
    });

    it('references the new filename "IQRA_SUPREME.md"', () => {
      expect(content).toContain('IQRA_SUPREME.md');
    });
  });

  describe('src/scripts_v2/agent.ts', () => {
    const content = readFile('src/scripts_v2/agent.ts');

    it('does not reference the old filename "!IQRA_SUPREME.md"', () => {
      expect(containsOldReference(content)).toBe(false);
    });

    it('references the new filename "IQRA_SUPREME.md"', () => {
      expect(content).toContain('IQRA_SUPREME.md');
    });
  });

  describe('src/scripts_v2/integrity_check.ts', () => {
    const content = readFile('src/scripts_v2/integrity_check.ts');

    it('does not reference the old filename "!IQRA_SUPREME.md"', () => {
      expect(containsOldReference(content)).toBe(false);
    });

    it('references the new filename "IQRA_SUPREME.md"', () => {
      expect(content).toContain('IQRA_SUPREME.md');
    });
  });
});

// ── Markdown files ────────────────────────────────────────────────────────────

describe('IQRA_SUPREME.md rename — Markdown file references', () => {

  describe('IQRA_SUPREME.md (the sovereign file itself)', () => {
    const content = readFile('IQRA_SUPREME.md');

    it('exists at the new path (IQRA_SUPREME.md, not !IQRA_SUPREME.md)', () => {
      const exists = fs.existsSync(path.join(ROOT, 'IQRA_SUPREME.md'));
      expect(exists).toBe(true);
    });

    it('old path "!IQRA_SUPREME.md" no longer exists', () => {
      const oldExists = fs.existsSync(path.join(ROOT, '!IQRA_SUPREME.md'));
      expect(oldExists).toBe(false);
    });

    it('title heading contains the updated filename "IQRA_SUPREME.md"', () => {
      expect(content).toContain('IQRA_SUPREME.md');
    });

    it('title heading does not reference the old filename "!IQRA_SUPREME.md"', () => {
      expect(containsOldReference(content)).toBe(false);
    });
  });

  describe('src/lib/iqra/00-manifest/DASTŪR.md', () => {
    const content = readFile('src/lib/iqra/00-manifest/DASTŪR.md');

    it('does not reference the old filename "!IQRA_SUPREME.md"', () => {
      expect(containsOldReference(content)).toBe(false);
    });

    it('references the new filename "IQRA_SUPREME.md"', () => {
      expect(content).toContain('IQRA_SUPREME.md');
    });

    it('link to IQRA_SUPREME.md uses a relative path to the repo root', () => {
      // The updated link should point upward with ../../../../ prefix
      expect(content).toContain('../../../../IQRA_SUPREME.md');
    });
  });

  describe('src/lib/iqra/00-manifest/FITRAH.md', () => {
    const content = readFile('src/lib/iqra/00-manifest/FITRAH.md');

    it('does not reference the old filename "!IQRA_SUPREME.md"', () => {
      expect(containsOldReference(content)).toBe(false);
    });

    it('references the new filename "IQRA_SUPREME.md"', () => {
      expect(content).toContain('IQRA_SUPREME.md');
    });
  });

  describe('src/lib/iqra/00-manifest/TAWBAH.md', () => {
    const content = readFile('src/lib/iqra/00-manifest/TAWBAH.md');

    it('does not reference the old filename "!IQRA_SUPREME.md"', () => {
      expect(containsOldReference(content)).toBe(false);
    });

    it('references "IQRA_SUPREME.md" in all three updated locations', () => {
      // The PR updated three occurrences in this file
      const matches = content.match(/IQRA_SUPREME\.md/g);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThanOrEqual(3);
    });

    it('Stage 6 (Tawbah) section references IQRA_SUPREME.md for Constitutional Adherence', () => {
      expect(content).toContain('IQRA_SUPREME.md Stage 6 (Tawbah)');
    });

    it('Constitutional Alignment section references IQRA_SUPREME.md principles', () => {
      expect(content).toContain('IQRA_SUPREME.md principles');
    });
  });
});

// ── integrity_check.ts FORBIDDEN_STRINGS regression ──────────────────────────

describe('integrity_check.ts — FORBIDDEN_STRINGS and TARGET_DIRS content', () => {
  const content = readFile('src/scripts_v2/integrity_check.ts');

  it('declares FORBIDDEN_STRINGS including "mock"', () => {
    expect(content).toContain('"mock"');
  });

  it('declares FORBIDDEN_STRINGS including git conflict markers', () => {
    expect(content).toContain('"<<<<<<<"');
    expect(content).toContain('"======="');
    expect(content).toContain('">>>>>>>"');
  });

  it('scans src/lib/iqra as a target directory', () => {
    expect(content).toContain("'src/lib/iqra'");
  });

  it('scans src/scripts_v2 as a target directory', () => {
    expect(content).toContain("'src/scripts_v2'");
  });

  it('scans runtime as a target directory', () => {
    expect(content).toContain("'runtime'");
  });

  it('exits with code 1 on violations (process.exit(1) call present)', () => {
    expect(content).toContain('process.exit(1)');
  });

  it('excludes .test.ts files from grep scan', () => {
    expect(content).toContain('.test.ts');
  });
});
