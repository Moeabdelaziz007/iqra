/**
 * Unit Tests: SkillLoader (src/lib/iqra/08-skills/loader.ts)
 *
 * The new SkillLoader uses static readonly paths computed once at class
 * load time:
 *
 *   SKILLS_REPO_PATH = path.join(process.cwd(), '..', 'aix-agent-skills')
 *   SKILLS_JSON_PATH = path.join(SKILLS_REPO_PATH, 'skills.json')
 *
 * Because these paths are fixed at module initialisation, process.chdir()
 * cannot affect them. Instead we mock the `fs` module so that
 * existsSync / readFileSync return controlled values for the exact paths
 * the loader will probe, letting us exercise every code path without
 * touching the real file system.
 *
 * Covers:
 *  - loadManifest() — skills.json absent, JSON invalid, record format, array format, read error
 *  - listSkills()   — null manifest, record format, array format
 *  - getSkillContent() — null manifest, unknown skill, missing file, read error, happy path
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

// Mock `fs` before importing the module under test so the loader picks up
// the stubs at import time.
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}));

// Suppress logger side-effects.
vi.mock('#infra/logger', () => ({
  IQRALogger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import fs from 'fs';
import { SkillLoader } from '#skills/loader';
import { IQRALogger } from '#infra/logger';

const mockExistsSync  = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);

// Derive the exact paths the loader will use so our mocks can match them.
const REPO_PATH       = path.join(process.cwd(), '..', 'aix-agent-skills');
const MANIFEST_PATH   = path.join(REPO_PATH, 'skills.json');

/** Build a serialised skills.json payload. */
function manifestJSON(skills: Record<string, string> | Array<{ name: string; file: string; description?: string }>): string {
  return JSON.stringify({ name: 'test-marketplace', version: '1.0.0', skills });
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ── loadManifest() ────────────────────────────────────────────────────────────

describe('SkillLoader.loadManifest()', () => {
  it('returns null and warns when skills.json does not exist', () => {
    mockExistsSync.mockReturnValue(false);

    const result = SkillLoader.loadManifest();

    expect(result).toBeNull();
    expect(IQRALogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('skills.json not found'),
    );
  });

  it('returns a parsed manifest with record-format skills', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      manifestJSON({ hello: 'skills/hello.md', world: 'skills/world.md' }) as any,
    );

    const manifest = SkillLoader.loadManifest();

    expect(manifest).not.toBeNull();
    expect(manifest!.skills).toEqual({
      hello: 'skills/hello.md',
      world: 'skills/world.md',
    });
  });

  it('returns a parsed manifest with array-format skills', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      manifestJSON([
        { name: 'alpha', description: 'first', file: 'skills/alpha.md' },
        { name: 'beta',  file: 'skills/beta.md' },
      ]) as any,
    );

    const manifest = SkillLoader.loadManifest();

    expect(manifest).not.toBeNull();
    expect(Array.isArray(manifest!.skills)).toBe(true);
    const arr = manifest!.skills as Array<{ name: string; file: string }>;
    expect(arr).toHaveLength(2);
    expect(arr[0].name).toBe('alpha');
    expect(arr[1].name).toBe('beta');
  });

  it('returns null and logs an error when the JSON is malformed', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('{ not valid json }' as any);

    const result = SkillLoader.loadManifest();

    expect(result).toBeNull();
    expect(IQRALogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load skills manifest'),
      expect.anything(),
    );
  });

  it('returns null and logs an error when readFileSync throws', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation(() => {
      throw new Error('EACCES: permission denied');
    });

    const result = SkillLoader.loadManifest();

    expect(result).toBeNull();
    expect(IQRALogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load skills manifest'),
      expect.any(Error),
    );
  });

  it('passes the correct manifest path to existsSync', () => {
    mockExistsSync.mockReturnValue(false);

    SkillLoader.loadManifest();

    expect(mockExistsSync).toHaveBeenCalledWith(MANIFEST_PATH);
  });

  it('passes the correct manifest path to readFileSync when file exists', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(manifestJSON({}) as any);

    SkillLoader.loadManifest();

    expect(mockReadFileSync).toHaveBeenCalledWith(MANIFEST_PATH, 'utf-8');
  });

  it('includes optional metadata fields in the parsed manifest', () => {
    const raw = JSON.stringify({
      name: 'my-skills',
      version: '2.3.1',
      marketplace_url: 'https://example.com',
      skills: { demo: 'skills/demo.md' },
    });
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(raw as any);

    const manifest = SkillLoader.loadManifest();

    expect(manifest!.name).toBe('my-skills');
    expect(manifest!.version).toBe('2.3.1');
    expect(manifest!.marketplace_url).toBe('https://example.com');
  });
});

// ── listSkills() ──────────────────────────────────────────────────────────────

describe('SkillLoader.listSkills()', () => {
  it('returns an empty array when the manifest is not reachable', () => {
    mockExistsSync.mockReturnValue(false);

    expect(SkillLoader.listSkills()).toEqual([]);
  });

  it('returns skill names from a record-format manifest', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      manifestJSON({ foo: 'skills/foo.md', bar: 'skills/bar.md' }) as any,
    );

    const skills = SkillLoader.listSkills();
    expect(skills.sort()).toEqual(['bar', 'foo']);
  });

  it('returns skill names from an array-format manifest', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      manifestJSON([
        { name: 'alpha', file: 'skills/alpha.md' },
        { name: 'beta',  file: 'skills/beta.md' },
        { name: 'gamma', file: 'skills/gamma.md' },
      ]) as any,
    );

    const skills = SkillLoader.listSkills();
    expect(skills.sort()).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('returns an empty array when JSON is malformed', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('bad json' as any);

    expect(SkillLoader.listSkills()).toEqual([]);
  });

  it('returns skills from an empty record as empty array', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(manifestJSON({}) as any);

    expect(SkillLoader.listSkills()).toEqual([]);
  });
});

// ── getSkillContent() ─────────────────────────────────────────────────────────

describe('SkillLoader.getSkillContent()', () => {
  it('returns null and warns when the manifest is not reachable', () => {
    mockExistsSync.mockReturnValue(false);

    const result = SkillLoader.getSkillContent('any-skill');

    expect(result).toBeNull();
    expect(IQRALogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('"any-skill" not found in manifest'),
    );
  });

  it('returns null and warns when skill name is not in the manifest', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      manifestJSON({ known: 'skills/known.md' }) as any,
    );

    const result = SkillLoader.getSkillContent('unknown-skill');

    expect(result).toBeNull();
    expect(IQRALogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('"unknown-skill" not found in manifest'),
    );
  });

  it('returns null and warns when the skill file does not exist on disk', () => {
    // existsSync returns true for the manifest but false for the skill file.
    mockExistsSync
      .mockReturnValueOnce(true)   // skills.json exists
      .mockReturnValueOnce(false); // skill file does not exist

    mockReadFileSync.mockReturnValue(
      manifestJSON({ my_skill: 'skills/my_skill.md' }) as any,
    );

    const result = SkillLoader.getSkillContent('my_skill');

    expect(result).toBeNull();
    expect(IQRALogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Skill file not found at'),
    );
  });

  it('returns null and logs an error when reading the skill file throws', () => {
    mockExistsSync.mockReturnValue(true); // both manifest and skill file "exist"
    mockReadFileSync
      .mockReturnValueOnce(manifestJSON({ boom: 'skills/boom.md' }) as any)
      .mockImplementationOnce(() => {
        throw new Error('EACCES: permission denied');
      });

    const result = SkillLoader.getSkillContent('boom');

    expect(result).toBeNull();
    expect(IQRALogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to read skill file "boom"'),
      expect.any(Error),
    );
  });

  it('returns the file content when the skill is known and the file exists', () => {
    const skillContent = '# My Skill\nDo amazing things.\n';
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync
      .mockReturnValueOnce(manifestJSON({ my_skill: 'skills/my_skill.md' }) as any)
      .mockReturnValueOnce(skillContent as any);

    const result = SkillLoader.getSkillContent('my_skill');

    expect(result).toBe(skillContent);
  });

  it('reads the skill file from the correct absolute path (record format)', () => {
    const skillContent = '# Greet\nHello!\n';
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync
      .mockReturnValueOnce(manifestJSON({ greet: 'skills/greet.md' }) as any)
      .mockReturnValueOnce(skillContent as any);

    SkillLoader.getSkillContent('greet');

    // The second readFileSync call must target the resolved skill path.
    const expectedSkillPath = path.join(REPO_PATH, 'skills/greet.md');
    expect(mockReadFileSync).toHaveBeenNthCalledWith(2, expectedSkillPath, 'utf-8');
  });

  it('resolves skill content from an array-format manifest', () => {
    const skillContent = '# Alpha Skill\nDo alpha things.\n';
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync
      .mockReturnValueOnce(
        manifestJSON([
          { name: 'alpha', description: 'first', file: 'skills/alpha.md' },
          { name: 'beta',  file: 'skills/beta.md' },
        ]) as any,
      )
      .mockReturnValueOnce(skillContent as any);

    const result = SkillLoader.getSkillContent('alpha');

    expect(result).toBe(skillContent);
  });

  it('returns null for a skill in array format when the file does not exist', () => {
    mockExistsSync
      .mockReturnValueOnce(true)   // manifest exists
      .mockReturnValueOnce(false); // skill file missing

    mockReadFileSync.mockReturnValue(
      manifestJSON([{ name: 'ghost', file: 'skills/ghost.md' }]) as any,
    );

    const result = SkillLoader.getSkillContent('ghost');

    expect(result).toBeNull();
    expect(IQRALogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Skill file not found at'),
    );
  });

  it('returns null for the second skill when the first is in the same call chain', () => {
    // Regression: verify the skills map correctly handles multiple array entries.
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync
      .mockReturnValueOnce(
        manifestJSON([
          { name: 'a', file: 'skills/a.md' },
          { name: 'b', file: 'skills/b.md' },
        ]) as any,
      );

    // Request skill "c" which is absent — should warn, not throw.
    const result = SkillLoader.getSkillContent('c');

    expect(result).toBeNull();
    expect(IQRALogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('"c" not found in manifest'),
    );
  });

  it('returns an empty string content without error when skill file is empty', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync
      .mockReturnValueOnce(manifestJSON({ empty: 'skills/empty.md' }) as any)
      .mockReturnValueOnce('' as any);

    const result = SkillLoader.getSkillContent('empty');

    expect(result).toBe('');
    expect(IQRALogger.error).not.toHaveBeenCalled();
  });
});
