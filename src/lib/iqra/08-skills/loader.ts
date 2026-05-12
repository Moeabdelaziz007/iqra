import fs from 'fs';
import path from 'path';
import { IQRALogger } from '#infra/logger';

export interface SkillManifest {
  version: string;
  marketplace_url: string;
  skills: Record<string, string>;
}

export class SkillLoader {
  // Skills repository located as a sibling in /Applications
  private static readonly SKILLS_REPO_PATH = path.join(process.cwd(), '..', 'aix-agent-skills');
  private static readonly SKILLS_JSON_PATH = path.join(SkillLoader.SKILLS_REPO_PATH, 'skills.json');

  /**
   * Load the skills.json manifest from the external marketplace repo
   */
  public static loadManifest(): SkillManifest | null {
    try {
      if (!fs.existsSync(this.SKILLS_JSON_PATH)) {
        IQRALogger.warn(`⚠️ [SKILL_LOADER] skills.json not found at ${this.SKILLS_JSON_PATH}`);
        return null;
      }
      const rawData = fs.readFileSync(this.SKILLS_JSON_PATH, 'utf-8');
      return JSON.parse(rawData) as SkillManifest;
    } catch (err) {
      IQRALogger.error('❌ [SKILL_LOADER] Failed to load skills manifest:', err);
      return null;
    }
  }

  /**
   * Get the markdown content of a specific skill
   */
  public static getSkillContent(skillName: string): string | null {
    const manifest = this.loadManifest();
    if (!manifest || !manifest.skills[skillName]) {
      IQRALogger.warn(`⚠️ [SKILL_LOADER] Skill "${skillName}" not found in manifest.`);
      return null;
    }

    const relativePath = manifest.skills[skillName];
    const skillPath = path.join(this.SKILLS_REPO_PATH, relativePath);

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
   * List all available skills registered in the marketplace manifest
   */
  public static listSkills(): string[] {
    const manifest = this.loadManifest();
    if (!manifest) return [];
    return Object.keys(manifest.skills);
  }
}
