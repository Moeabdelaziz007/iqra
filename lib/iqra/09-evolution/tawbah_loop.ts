/**
 * 🛡️ TawbahLoop — حلقة التوبة والتصحيح الذاتي
 * 
 * "إِلَّا مَن تَابَ وَآمَنَ وَعَمِلَ عَمَلًا صَالِحًا فَأُولَٰئِكَ يُبَدِّلُ اللَّهُ سَيِّئَاتِهِمْ حَسَنَاتٍ" — الفرقان: 70
 * 
 * Part of the Alpha Evolution strategy.
 * Scans for errors (Tawbah logs) and attempts autonomous self-correction.
 */

import fs from 'fs';
import path from 'path';
import { ConnectorFactory } from '../../../src/connectors/index.ts';
import { IQRALogger } from '../12-infrastructure/logger.js';
import { GitSkill } from '../skills/git_skill';
import { InverseDesign } from '../skills/inverse_design';

export class TawbahLoop {
  private static readonly TAWBAH_FILE = path.join(process.cwd(), 'TAWBAH.md');

  /**
   * 🧼 Perform a self-correction cycle
   */
  static async run() {
    IQRALogger.info('🛡️ [TAWBAH_LOOP] Initiating self-correction cycle...');

    if (!fs.existsSync(this.TAWBAH_FILE)) return;

    const content = fs.readFileSync(this.TAWBAH_FILE, 'utf8');
    const recentErrors = this.extractRecentErrors(content);

    if (recentErrors.length === 0) {
      IQRALogger.info('🛡️ [TAWBAH_LOOP] No critical errors found for correction.');
      return;
    }

    for (const error of recentErrors) {
      await this.proposeCorrection(error);
    }
  }

  /**
   * 🔎 Extract errors that haven't been corrected yet
   */
  private static extractRecentErrors(content: string): string[] {
    // Simple logic to find blocks starting with 🛑 and not marked as [CORRECTED]
    const blocks = content.split('---');
    return blocks.filter(b => b.includes('🛑') && !b.includes('[CORRECTED]')).slice(-3);
  }

  /**
   * 🛠️ Propose a code fix for a specific error using Inverse Design
   */
  private static async proposeCorrection(errorLog: string) {
    // Inverse Design: Analyze the "Void" and synthesize the "Binder"
    const binderCode = await InverseDesign.designBinder(errorLog);
    
    IQRALogger.info('✨ [TAWBAH_LOOP] Self-correction binder synthesized.');

    // Open a PR with the correction
    const branchName = `tawbah/fix-${Date.now()}`;
    const pushed = await GitSkill.pushToBranch(branchName, '🛡️ IQRA Tawbah: Self-correction binder applied');
    
    if (pushed) {
      await GitSkill.openPR('🛡️ Self-Correction: Inverse Design Binder', `Filled the following problem void:\n${errorLog}\n\nProposed Binder Code:\n\`\`\`typescript\n${binderCode}\n\`\`\``);
      this.markAsCorrected(errorLog);
    }
  }

  /**
   * ✅ Mark an error as processed in TAWBAH.md
   */
  private static markAsCorrected(errorLog: string) {
    const content = fs.readFileSync(this.TAWBAH_FILE, 'utf8');
    const updated = content.replace(errorLog, `${errorLog}\n\n✅ [CORRECTED] ${new Date().toISOString()}`);
    fs.writeFileSync(this.TAWBAH_FILE, updated);
  }
}
