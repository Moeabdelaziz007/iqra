/**
 * Tests for `SkillLoader` marketplace path resolution.
 *
 * Exercises the resolution priority order in
 * `src/lib/iqra/08-cognitive/skills/loader.ts`:
 *
 *   1. IQRA_MARKETPLACE_PATH env var
 *   2. ./aix-agent-skills/ under cwd
 *   3. ../aix-agent-skills/ sibling of cwd
 *   4. ./node_modules/@aix/agent-skills/
 *
 * Each test sets up a temp directory layout, points the loader at
 * it, and asserts the loader picks the right candidate. The cache
 * is reset between tests via the public `resetCache()` helper.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { SkillLoader } from '#skills/loader';

function writeManifest(dir: string, payload: Record<string, unknown>): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'skills.json'), JSON.stringify(payload, null, 2));
}

describe('SkillLoader', () => {
  let tempRoot: string;
  let originalCwd: string;
  let originalEnv: string | undefined;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-loader-'));
    originalCwd = process.cwd();
    originalEnv = process.env[SkillLoader.ENV_VAR];
    delete process.env[SkillLoader.ENV_VAR];
    SkillLoader.resetCache();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (originalEnv === undefined) {
      delete process.env[SkillLoader.ENV_VAR];
    } else {
      process.env[SkillLoader.ENV_VAR] = originalEnv;
    }
    SkillLoader.resetCache();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('returns null when no marketplace is reachable anywhere', () => {
    const empty = fs.mkdtempSync(path.join(tempRoot, 'cwd-'));
    process.chdir(empty);
    expect(SkillLoader.loadManifest()).toBeNull();
    expect(SkillLoader.listSkills()).toEqual([]);
  });

  it('honours the IQRA_MARKETPLACE_PATH env var with highest priority', () => {
    const envDir = path.join(tempRoot, 'explicit');
    const siblingDir = path.join(tempRoot, 'sibling-cwd');
    writeManifest(envDir, { skills: { x: 'skills/x.md' } });
    writeManifest(
      path.join(siblingDir, '..', 'aix-agent-skills'),
      { skills: { y: 'skills/y.md' } },
    );
    fs.mkdirSync(siblingDir, { recursive: true });
    process.chdir(siblingDir);
    process.env[SkillLoader.ENV_VAR] = envDir;

    const manifest = SkillLoader.loadManifest();
    expect(manifest).not.toBeNull();
    expect(SkillLoader.listSkills()).toEqual(['x']);
  });

  it('falls back to the cwd-child layout (./aix-agent-skills)', () => {
    const cwd = path.join(tempRoot, 'project');
    fs.mkdirSync(cwd, { recursive: true });
    writeManifest(path.join(cwd, 'aix-agent-skills'), {
      skills: { foo: 'skills/foo.md' },
    });
    process.chdir(cwd);

    expect(SkillLoader.listSkills()).toEqual(['foo']);
  });

  it('falls back to the sibling layout (../aix-agent-skills) when cwd-child is absent', () => {
    const parent = path.join(tempRoot, 'parent');
    const cwd = path.join(parent, 'iqra');
    fs.mkdirSync(cwd, { recursive: true });
    writeManifest(path.join(parent, 'aix-agent-skills'), {
      skills: { bar: 'skills/bar.md' },
    });
    process.chdir(cwd);

    expect(SkillLoader.listSkills()).toEqual(['bar']);
  });

  it('parses the array-shape skills field', () => {
    const cwd = path.join(tempRoot, 'array-cwd');
    fs.mkdirSync(cwd, { recursive: true });
    writeManifest(path.join(cwd, 'aix-agent-skills'), {
      skills: [
        { name: 'alpha', description: 'a', file: 'skills/alpha.md' },
        { name: 'beta', description: 'b', file: 'skills/beta.md' },
      ],
    });
    process.chdir(cwd);

    expect(SkillLoader.listSkills().sort()).toEqual(['alpha', 'beta']);
  });

  it('returns the markdown content of a known skill', () => {
    const cwd = path.join(tempRoot, 'content-cwd');
    fs.mkdirSync(cwd, { recursive: true });
    const repo = path.join(cwd, 'aix-agent-skills');
    writeManifest(repo, { skills: { greet: 'skills/greet.md' } });
    fs.mkdirSync(path.join(repo, 'skills'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'skills', 'greet.md'), '# Hello\n');
    process.chdir(cwd);

    expect(SkillLoader.getSkillContent('greet')).toBe('# Hello\n');
  });

  it('returns null for an unknown skill name', () => {
    const cwd = path.join(tempRoot, 'unknown-cwd');
    fs.mkdirSync(cwd, { recursive: true });
    writeManifest(path.join(cwd, 'aix-agent-skills'), {
      skills: { only: 'skills/only.md' },
    });
    process.chdir(cwd);

    expect(SkillLoader.getSkillContent('does-not-exist')).toBeNull();
  });
});
