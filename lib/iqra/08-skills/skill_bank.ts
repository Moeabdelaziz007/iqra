// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

import fs from 'fs';
import path from 'path';
import { IQRALogger } from '../12-infrastructure/logger.js';
import { appendToTrustChain } from '../06-security/security.js';

export interface SkillPerformance {
  success_count: number;
  failure_count: number;
  last_used: number;
  last_result: 'success' | 'failure';
}

/**
 * 🛠️ IQRA Skill Bank — بنك المهارات
 * "عَلَّمَ الْإِنسَانَ مَا لَمْ يَعْلَمْ" — العلق: 5
 * 
 * Manages the evolution and execution of IQRA's specialized skills.
 * Skills are stored as Markdown documents that can be updated by the Meta-Agent.
 */
export class SkillBank {
  private static readonly SKILLS_DIR = path.join(process.cwd(), 'iqra-core', 'skills');
  private static readonly LEDGER_PATH = path.join(this.SKILLS_DIR, 'SKILLS_LEDGER.json');

  /**
   * Load the skill ledger
   */
  private static getLedger(): Record<string, SkillPerformance> {
    try {
      if (!fs.existsSync(this.LEDGER_PATH)) return {};
      return JSON.parse(fs.readFileSync(this.LEDGER_PATH, 'utf-8'));
    } catch {
      return {};
    }
  }

  /**
   * Save the skill ledger
   */
  private static saveLedger(ledger: Record<string, SkillPerformance>): void {
    try {
      if (!fs.existsSync(this.SKILLS_DIR)) fs.mkdirSync(this.SKILLS_DIR, { recursive: true });
      fs.writeFileSync(this.LEDGER_PATH, JSON.stringify(ledger, null, 2), 'utf-8');
    } catch (err) {
      IQRALogger.error('❌ [SKILL_BANK] Failed to save ledger:', err);
    }
  }

  /**
   * Register or update performance of a skill
   */
  static async recordPerformance(skillName: string, success: boolean): Promise<void> {
    const ledger = this.getLedger();
    const current = ledger[skillName] || {
      success_count: 0,
      failure_count: 0,
      last_used: 0,
      last_result: 'success'
    };

    if (success) {
      current.success_count++;
      current.last_result = 'success';
    } else {
      current.failure_count++;
      current.last_result = 'failure';
    }

    current.last_used = Date.now();
    ledger[skillName] = current;
    this.saveLedger(ledger);

    IQRALogger.info(`🛠️ [SKILL_BANK] Performance recorded for "${skillName}": ${success ? '✅' : '❌'}`);

    // If failure rate is high, trigger evolution/tawbah for this skill
    if (!success && current.failure_count > 3) {
      await this.evolveSkill(skillName);
    }
  }

  /**
   * Trigger the evolution of a skill (Self-Healing)
   */
  private static async evolveSkill(skillName: string): Promise<void> {
    IQRALogger.warn(`🌀 [SKILL_BANK] Skill "${skillName}" has failed multiple times. Triggering evolution via Ollama...`);
    
    const skillPath = path.join(this.SKILLS_DIR, `${skillName}.md`);
    if (!fs.existsSync(skillPath)) return;

    const currentContent = fs.readFileSync(skillPath, 'utf-8');
    const dastroPath = path.join(process.cwd(), 'iqra-core', 'DASTŪR.md');
    const dastūr = fs.existsSync(dastroPath) ? fs.readFileSync(dastroPath, 'utf-8') : '';

    const prompt = `
      You are the IQRA Meta-Evolution Agent.
      A skill has failed multiple times and needs to be rewritten.
      
      Skill Name: ${skillName}
      Current Content:
      ${currentContent}
      
      Constitutional Context (DASTŪR.md):
      ${dastūr.slice(0, 1000)}
      
      Task:
      Rewrite the skill documentation to solve the failures.
      Maintain the same Markdown structure but optimize the logic.
      Ensure it remains strictly sovereign and compliant with DASTŪR.md.
      
      New Skill Content:
    `;

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          model: 'qwen2.5:7b',
          prompt: prompt,
          stream: false,
        }),
      });
      const result = await response.json();
      const evolvedContent = result.response;

      if (evolvedContent && evolvedContent.length > 100) {
        fs.writeFileSync(skillPath, evolvedContent, 'utf-8');
        IQRALogger.info(`✅ [SKILL_BANK] Skill "${skillName}" successfully evolved.`);
        appendToTrustChain('SKILL:EVOLVED', skillName, 'Skill rewritten by Meta-Agent', 0.8);
      }
    } catch (e) {
      IQRALogger.error(`⚠️ [SKILL_BANK] Evolution failed for "${skillName}":`, e);
      // Fallback: just append the request
      const timestamp = new Date().toISOString();
      const evolutionRequest = `\n\n### 🌀 Evolution Request | ${timestamp}\n- **Status**: FAILED_TO_EVOLVE\n- **Reason**: LLM connectivity issue.\n`;
      fs.appendFileSync(skillPath, evolutionRequest, 'utf-8');
    }
  }

  /**
   * Discover and create a new skill autonomously
   */
  static async discoverSkill(skillName: string, context: string): Promise<void> {
    IQRALogger.info(`✨ [SKILL_BANK] Discovering new skill: "${skillName}"...`);
    
    const skillPath = path.join(this.SKILLS_DIR, `${skillName}.md`);
    if (fs.existsSync(skillPath)) return;

    const dastroPath = path.join(process.cwd(), 'iqra-core', 'DASTŪR.md');
    const dastūr = fs.existsSync(dastroPath) ? fs.readFileSync(dastroPath, 'utf-8') : '';

    const prompt = `
      You are the IQRA Sovereign Architect. 
      You have discovered a new required capability: "${skillName}".
      
      Context: ${context}
      
      Constitutional Context (DASTŪR.md):
      ${dastūr.slice(0, 1000)}
      
      Task:
      Create a comprehensive Markdown skill document for "${skillName}".
      Follow the standard IQRA skill format:
      # [Skill Name]
      ## Purpose (النية)
      ## Constitutional Alignment
      ## Operational Flow
      ## Failure Modes & Tawbah
      
      Ensure it is strictly sovereign and uses no mocks.
      
      Skill Documentation:
    `;

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          model: 'qwen2.5:7b',
          prompt: prompt,
          stream: false,
        }),
      });
      const result = await response.json();
      const content = result.response;

      if (content && content.length > 100) {
        if (!fs.existsSync(this.SKILLS_DIR)) fs.mkdirSync(this.SKILLS_DIR, { recursive: true });
        fs.writeFileSync(skillPath, content, 'utf-8');
        IQRALogger.info(`✅ [SKILL_BANK] New skill "${skillName}" discovered and registered.`);
        appendToTrustChain('SKILL:DISCOVERED', skillName, 'New skill created autonomously', 0.9);
      }
    } catch (e) {
      IQRALogger.error(`⚠️ [SKILL_BANK] Discovery failed for "${skillName}":`, e);
    }
  }

  /**
   * Get the content of a skill for the Planner
   */
  static getSkillContent(skillName: string): string | null {
    const skillPath = path.join(this.SKILLS_DIR, `${skillName}.md`);
    if (!fs.existsSync(skillPath)) return null;
    return fs.readFileSync(skillPath, 'utf-8');
  }

  /**
   * List all available skills
   */
  static listSkills(): string[] {
    if (!fs.existsSync(this.SKILLS_DIR)) return [];
    return fs.readdirSync(this.SKILLS_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''));
  }
}
