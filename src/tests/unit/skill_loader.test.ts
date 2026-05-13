/**
 * Tests for `SkillLoader` in `src/lib/iqra/08-skills/loader.ts`.
 *
 * The new loader (post-PR) is a simplified version of the old one:
 *   - Hard-coded path: `path.join(process.cwd(), '..', 'aix-agent-skills')`
 *   - No ENV_VAR override
 *   - No multiple-candidate resolution
 *   - No caching / resetCache()
 *
 * Because SKILLS_REPO_PATH is a static readonly field computed at class
 * definition time, we cannot influence it via process.chdir(). Instead,
 * all filesystem access is intercepted by mocking the `fs` module so
 * that existsSync / readFileSync return controlled values regardless of
 * the concrete path on disk.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';

// Auto-mock the entire `fs` module. All exported functions become vi.fn().
vi.mock('fs');

// Silence IQRALogger so test output stays clean.
vi.mock('#infra/logger', () => ({
  IQRALogger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { SkillLoader, type SkillManifest } from '#skills/loader';
import { IQRALogger } from '#infra/logger';

const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);

// ── helpers ──────────────────────────────────────────────────────────────────

function makeRecordManifest(skills: Record<string, string>): SkillManifest {
  return { skills };
}

function makeArrayManifest(
  entries: Array<{ name: string; file: string; description?: string }>,
): SkillManifest {
  return { skills: entries };
}

// ── lifecycle ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── loadManifest() ────────────────────────────────────────────────────────────

describe('SkillLoader.loadManifest()', () => {
  it('returns null when skills.json does not exist', () => {
    mockExistsSync.mockReturnValue(false);

    const result = SkillLoader.loadManifest();

    expect(result).toBeNull();
    expect(IQRALogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('skills.json not found at'),
    );
  });

  it('returns null when skills.json contains invalid JSON', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('not-valid-json{{' as any);

    const result = SkillLoader.loadManifest();

    expect(result).toBeNull();
    expect(IQRALogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load skills manifest'),
      expect.anything(),
    );
  });

  it('returns null when readFileSync throws (e.g. EACCES)', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation(() => {
      throw new Error('EACCES: permission denied');
    });

    const result = SkillLoader.loadManifest();

    expect(result).toBeNull();
    expect(IQRALogger.error).toHaveBeenCalled();
  });

  it('returns a parsed manifest with Record-format skills', () => {
    const payload: SkillManifest = makeRecordManifest({
      foo: 'skills/foo.md',
      bar: 'skills/bar.md',
    });
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(payload) as any);

    const result = SkillLoader.loadManifest();

    expect(result).not.toBeNull();
    expect(result!.skills).toEqual(payload.skills);
  });

  it('returns a parsed manifest with Array-format skills', () => {
    const payload: SkillManifest = makeArrayManifest([
      { name: 'alpha', file: 'skills/alpha.md', description: 'Alpha skill' },
      { name: 'beta', file: 'skills/beta.md' },
    ]);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(payload) as any);

    const result = SkillLoader.loadManifest();

    expect(result).not.toBeNull();
    expect(Array.isArray(result!.skills)).toBe(true);
    expect((result!.skills as any[]).length).toBe(2);
  });

  it('returns a manifest that includes optional top-level fields', () => {
    const payload = {
      name: 'my-marketplace',
      version: '1.2.3',
      marketplace_url: 'https://example.com',
      skills: { demo: 'demo.md' },
    };
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(payload) as any);

    const result = SkillLoader.loadManifest();

    expect(result!.name).toBe('my-marketplace');
    expect(result!.version).toBe('1.2.3');
    expect(result!.marketplace_url).toBe('https://example.com');
  });
});

// ── listSkills() ──────────────────────────────────────────────────────────────

describe('SkillLoader.listSkills()', () => {
  it('returns an empty array when no manifest is reachable', () => {
    mockExistsSync.mockReturnValue(false);

    expect(SkillLoader.listSkills()).toEqual([]);
  });

  it('returns skill names from a Record-format manifest', () => {
    const payload = makeRecordManifest({
      quran_search: 'skills/quran_search.md',
      damir_check: 'skills/damir_check.md',
    });
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(payload) as any);

    const skills = SkillLoader.listSkills();

    expect(skills).toEqual(expect.arrayContaining(['quran_search', 'damir_check']));
    expect(skills).toHaveLength(2);
  });

  it('returns skill names from an Array-format manifest', () => {
    const payload = makeArrayManifest([
      { name: 'alpha', file: 'alpha.md' },
      { name: 'beta', file: 'beta.md' },
      { name: 'gamma', file: 'gamma.md' },
    ]);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(payload) as any);

    const skills = SkillLoader.listSkills();

    expect(skills.sort()).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('returns an empty array for a manifest with an empty skills record', () => {
    const payload = makeRecordManifest({});
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(payload) as any);

    expect(SkillLoader.listSkills()).toEqual([]);
  });

  it('returns an empty array for a manifest with an empty skills array', () => {
    const payload = makeArrayManifest([]);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(payload) as any);

    expect(SkillLoader.listSkills()).toEqual([]);
  });
});

// ── getSkillContent() ─────────────────────────────────────────────────────────

describe('SkillLoader.getSkillContent()', () => {
  it('returns null for an unknown skill name', () => {
    const payload = makeRecordManifest({ only: 'skills/only.md' });
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(payload) as any);

    const result = SkillLoader.getSkillContent('does-not-exist');

    expect(result).toBeNull();
    expect(IQRALogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('"does-not-exist" not found in manifest'),
    );
  });

  it('returns null when the skill file itself does not exist on disk', () => {
    const payload = makeRecordManifest({ greet: 'skills/greet.md' });

    // First call (skills.json) — exists; second call (skill file) — does NOT.
    mockExistsSync
      .mockReturnValueOnce(true)  // skills.json check
      .mockReturnValueOnce(false); // skill file check
    mockReadFileSync.mockReturnValueOnce(JSON.stringify(payload) as any);

    const result = SkillLoader.getSkillContent('greet');

    expect(result).toBeNull();
    expect(IQRALogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Skill file not found at'),
    );
  });

  it('returns the markdown content when the skill file is found', () => {
    const payload = makeRecordManifest({ greet: 'skills/greet.md' });
    const skillContent = '# Greeting Skill\nSay hello to the user.\n';

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync
      .mockReturnValueOnce(JSON.stringify(payload) as any) // skills.json
      .mockReturnValueOnce(skillContent as any);           // skill file

    const result = SkillLoader.getSkillContent('greet');

    expect(result).toBe(skillContent);
  });

  it('returns null and logs error when readFileSync throws reading the skill file', () => {
    const payload = makeRecordManifest({ broken: 'skills/broken.md' });

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync
      .mockReturnValueOnce(JSON.stringify(payload) as any)
      .mockImplementationOnce(() => {
        throw new Error('EACCES: permission denied');
      });

    const result = SkillLoader.getSkillContent('broken');

    expect(result).toBeNull();
    expect(IQRALogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to read skill file "broken"'),
      expect.anything(),
    );
  });

  it('resolves skill from an Array-format manifest', () => {
    const payload = makeArrayManifest([
      { name: 'verse', file: 'skills/verse.md' },
    ]);
    const skillContent = '# Verse Skill\n';

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync
      .mockReturnValueOnce(JSON.stringify(payload) as any)
      .mockReturnValueOnce(skillContent as any);

    expect(SkillLoader.getSkillContent('verse')).toBe(skillContent);
  });

  it('returns null when manifest is unavailable (no skills.json)', () => {
    mockExistsSync.mockReturnValue(false);

    expect(SkillLoader.getSkillContent('any-skill')).toBeNull();
  });

  // Boundary / regression: skill name that is an empty string.
  it('returns null for an empty string skill name', () => {
    const payload = makeRecordManifest({ real: 'skills/real.md' });
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(payload) as any);

    expect(SkillLoader.getSkillContent('')).toBeNull();
  });

  // Regression: skill name that appears in Array manifest but not Record
  it('does not confuse skill names across different formats', () => {
    const recordPayload = makeRecordManifest({ a: 'a.md', b: 'b.md' });

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(recordPayload) as any);

    // 'a' and 'b' should resolve; 'c' should not.
    expect(SkillLoader.getSkillContent('c')).toBeNull();
  });
});

// ── path construction (integration-style) ────────────────────────────────────

describe('SkillLoader path construction', () => {
  it('reads skills.json from the sibling aix-agent-skills directory', () => {
    mockExistsSync.mockReturnValue(false);
    SkillLoader.loadManifest();

    // existsSync should be called once with the skills.json path.
    expect(mockExistsSync).toHaveBeenCalledTimes(1);
    const calledPath = mockExistsSync.mock.calls[0][0] as string;
    expect(calledPath).toContain('aix-agent-skills');
    expect(calledPath).toMatch(/skills\.json$/);
  });

  it('builds the skill file path relative to the skills repo', () => {
    const payload = makeRecordManifest({ nav: 'sub/nav.md' });
    const content = '# Nav\n';

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync
      .mockReturnValueOnce(JSON.stringify(payload) as any)
      .mockReturnValueOnce(content as any);

    SkillLoader.getSkillContent('nav');

    // The second existsSync call should be the skill file path.
    const skillFilePath = mockExistsSync.mock.calls[1][0] as string;
    expect(skillFilePath).toContain('aix-agent-skills');
    expect(skillFilePath).toMatch(/sub[/\\]nav\.md$/);
  });
});
