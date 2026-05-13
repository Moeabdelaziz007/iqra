import fs from 'fs';
import path from 'path';
import { IQRALogger } from '#infra/logger';

export interface SkillEntry {
  name: string;
  description?: string;
  file: string;
}

export interface SkillManifest {
  name?: string;
  version?: string;
  marketplace_url?: string;
  skills: Record<string, string> | SkillEntry[];
}

/**
 * Loads skill definitions from the `aix-agent-skills` marketplace
 * (the L3 layer of the Sovereign Stack). This loader is read-only
 * and never executes skill code; it surfaces the markdown content
 * that the cognitive layer feeds to LLMs as instructions.
 *
 * Marketplace location resolution priority:
 *
 *   1. `IQRA_MARKETPLACE_PATH` environment variable, if set and the
 *      directory contains a readable `skills.json`. Explicit wins.
 *   2. `./aix-agent-skills/` under `process.cwd()` (monorepo layout
 *      where the marketplace is a subdirectory or git submodule).
 *   3. `../aix-agent-skills/` (the historical sibling-directory
 *      layout used in local development, kept for backwards
 *      compatibility but not relied upon).
 *   4. `./node_modules/@aix/agent-skills/` for the eventual npm
 *      package distribution.
 *
 * Each candidate is tested by checking whether
 * `${candidate}/skills.json` exists. The first hit wins and is
 * cached for the life of the process to avoid repeated stat calls.
 *
 * Resolution is lazy: it runs at the first call, not at module
 * load, so tests and runtime configuration tooling can set the
 * environment variable before the first lookup without having to
 * arrange import-time ordering.
 */
export class SkillLoader {
  /**
   * Cache for the resolved marketplace path. `null` means not yet
   * resolved; `''` means resolution failed (avoid retrying every
   * call when the marketplace is genuinely absent).
   */
  private static _cachedRepoPath: string | null = null;

  /** Environment variable callers can set to override discovery. */
  public static readonly ENV_VAR = 'IQRA_MARKETPLACE_PATH';

  /**
   * Resolve the marketplace root directory. Returns an empty string
   * when no candidate contains a readable `skills.json`. Caches the
   * result so the second call is O(1).
   */
  private static getRepoPath(): string {
    if (this._cachedRepoPath !== null) {
      return this._cachedRepoPath;
    }

    const cwd = process.cwd();
    const candidates: Array<{ source: string; dir: string }> = [];

    const envValue = process.env[this.ENV_VAR];
    if (envValue && envValue.trim()) {
      candidates.push({
        source: `env:${this.ENV_VAR}`,
        dir: path.resolve(envValue.trim()),
      });
    }

    candidates.push(
      { source: 'cwd-child', dir: path.join(cwd, 'aix-agent-skills') },
      { source: 'sibling', dir: path.join(cwd, '..', 'aix-agent-skills') },
      {
        source: 'node_modules',
        dir: path.join(cwd, 'node_modules', '@aix', 'agent-skills'),
      },
    );

    for (const c of candidates) {
      const manifest = path.join(c.dir, 'skills.json');
      if (fs.existsSync(manifest)) {
        IQRALogger.info(
          `🔎 [SKILL_LOADER] resolved marketplace at ${c.dir} (source: ${c.source})`,
        );
        this._cachedRepoPath = c.dir;
        return c.dir;
      }
    }

    IQRALogger.warn(
      `⚠️ [SKILL_LOADER] aix-agent-skills not found in any known location. ` +
        `Set ${this.ENV_VAR}=/absolute/path or place the repo at one of: ` +
        candidates.map((c) => c.dir).join(', '),
    );
    this._cachedRepoPath = '';
    return '';
  }

  /**
   * Reset the cached marketplace path. Intended for tests and for
   * hot-reload scenarios where the marketplace location may change
   * at runtime.
   */
  public static resetCache(): void {
    this._cachedRepoPath = null;
  }

  /**
   * Load the `skills.json` manifest from the marketplace repo.
   * Returns `null` when no marketplace is reachable or the file
   * cannot be parsed.
   */
  public static loadManifest(): SkillManifest | null {
    const repo = this.getRepoPath();
    if (!repo) {
      return null;
    }
    const manifestPath = path.join(repo, 'skills.json');
    try {
      const rawData = fs.readFileSync(manifestPath, 'utf-8');
      return JSON.parse(rawData) as SkillManifest;
    } catch (err) {
      IQRALogger.error('❌ [SKILL_LOADER] Failed to load skills manifest:', err);
      return null;
    }
  }

  /**
   * Get the mapping of skill name to its file path.
   */
  private static getSkillsMap(): Record<string, string> {
    const manifest = this.loadManifest();
    if (!manifest) return {};

    if (Array.isArray(manifest.skills)) {
      const map: Record<string, string> = {};
      manifest.skills.forEach((skill) => {
        map[skill.name] = skill.file;
      });
      return map;
    }

    return manifest.skills;
  }

  /**
   * Get the markdown content of a specific skill. Returns `null`
   * when the skill is unknown, the marketplace is not reachable,
   * or the file is missing on disk.
   */
  public static getSkillContent(skillName: string): string | null {
    const repo = this.getRepoPath();
    if (!repo) return null;

    const skillsMap = this.getSkillsMap();
    if (!skillsMap[skillName]) {
      IQRALogger.warn(`⚠️ [SKILL_LOADER] Skill "${skillName}" not found in manifest.`);
      return null;
    }

    const relativePath = skillsMap[skillName];
    const skillPath = path.join(repo, relativePath);

    try {
      if (!fs.existsSync(skillPath)) {
        IQRALogger.warn(`⚠️ [SKILL_LOADER] Skill file not found at ${skillPath}`);
        return null;
      }
      return fs.readFileSync(skillPath, 'utf-8');
    } catch (err) {
      IQRALogger.error(`❌ [SKILL_LOADER] Failed to read skill file "${skillName}":`, err);
      return null;
    }
  }

  /**
   * List all available skills registered in the marketplace manifest.
   */
  public static listSkills(): string[] {
    return Object.keys(this.getSkillsMap());
  }
}
