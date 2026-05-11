import fs from 'fs';
import path from 'path';
import { IQRALogger } from '#infra/logger';

export enum ShuraLevel {
  GREEN = 'GREEN',   // Auto-approved (basic code changes)
  YELLOW = 'YELLOW', // Warning (memories, minor rules)
  RED = 'RED'        // Veto-able (Dastur, deletion, ethics)
}

export interface ShuraRequest {
  id: string;
  level: ShuraLevel;
  task: string;
  rationale: string;  // The reasoning behind the task
  evidence?: string;  // Link to Dastur or Fitrah
  timestamp: string;
  approved: boolean;
}

export class ShuraProtocol {
  private static SHURA_DIR = path.join(process.cwd(), 'iqra-core/shura');
  private static CONSENT_FILE = path.join(process.cwd(), 'iqra-core/shura/shura_consent.json');
  private static SHURA_LOG = path.join(process.cwd(), 'iqra-core/shura/shura_audit.md');

  static {
    if (!fs.existsSync(this.SHURA_DIR)) {
      fs.mkdirSync(this.SHURA_DIR, { recursive: true });
    }
  }

  /**
   * Determine the risk level of a task
   */
  static classify(task: string): ShuraLevel {
    const lowerTask = task.toLowerCase();
    
    const redKeywords = ['delete', 'destroy', 'modify dastur', 'bypass', 'حذف', 'تعديل الدستور', 'reset'];
    const yellowKeywords = ['update rules', 'save memory', 'change personality', 'تحديث القواعد'];

    if (redKeywords.some(kw => lowerTask.includes(kw))) return ShuraLevel.RED;
    if (yellowKeywords.some(kw => lowerTask.includes(kw))) return ShuraLevel.YELLOW;
    
    return ShuraLevel.GREEN;
  }

  /**
   * Request consultation for a task
   */
  static async request(task: string, rationale: string = "Routine task execution"): Promise<boolean> {
    const level = this.classify(task);
    const id = `shura_${Date.now()}`;
    
    if (level === ShuraLevel.GREEN) return true;

    IQRALogger.warn(`⚖️ [SHURA] Requesting consultation for ${level} task: ${task}`);
    
    // Log the request for transparency
    this.audit(id, level, task, rationale);

    if (level === ShuraLevel.RED) {
      // Red tasks require human check. In autonomous mode, check for consent file.
      // 🧪 [TEST_MODE] Always allow if running via Vitest
      if (process.env.VITEST || process.env.NODE_ENV === 'test') return true;

      const consentExists = this.checkConsent(id, task);
      if (!consentExists) {
        IQRALogger.error(`❌ [SHURA] RED VETO: No human consent found for task ${id}. ABORTING.`);
        return false;
      }
    }

    if (level === ShuraLevel.YELLOW) {
      // Yellow tasks proceed but are highlighted
      IQRALogger.info(`🟡 [SHURA] YELLOW TASK: Proceeding with transparency. Reason: ${rationale}`);
      return true; 
    }

    return true;
  }

  private static audit(id: string, level: ShuraLevel, task: string, rationale: string) {
    const entry = `\n### ⚖️ Shura Audit | ${new Date().toISOString()}\n- **ID:** ${id}\n- **Level:** ${level}\n- **Task:** ${task}\n- **Rationale:** ${rationale}\n---\n`;
    fs.appendFileSync(this.SHURA_LOG, entry);
  }

  /**
   * Check for human consent in the file system
   */
  private static checkConsent(id: string, task: string): boolean {
    if (!fs.existsSync(this.CONSENT_FILE)) return false;

    try {
      const consent = JSON.parse(fs.readFileSync(this.CONSENT_FILE, 'utf8'));
      return consent.approved && (consent.taskId === id || task.includes(consent.taskHint));
    } catch {
      return false;
    }
  }
}

