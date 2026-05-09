/**
 * 🛡️ DeterministicSandbox — بيئة المحاكاة المحكمة
 * 
 * "وَالسَّمَاءَ رَفَعَهَا وَوَضَعَ الْمِيزَانَ" — الرحمن: 7
 * 
 * A strictly deterministic environment for testing code and decisions 
 * before they are etched onto the TrustChain.
 * No Mocks Allowed.
 */

import { IQRALogger } from '../12-infrastructure/logger';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export class DeterministicSandbox {
  private static readonly SANDBOX_DIR = path.join(process.cwd(), '.iqra', 'sandbox');

  /**
   * 🧪 Test a logic vector in a isolated environment
   */
  static async validate(vectorId: string, code: string): Promise<{ success: boolean; output: string; error?: string }> {
    IQRALogger.info(`🛡️ [SANDBOX] Validating vector: ${vectorId}`);

    if (!fs.existsSync(this.SANDBOX_DIR)) {
      fs.mkdirSync(this.SANDBOX_DIR, { recursive: true });
    }

    const testFile = path.join(this.SANDBOX_DIR, `${vectorId}.test.ts`);
    fs.writeFileSync(testFile, code);

    try {
      // Running using vitest or tsx in a sub-process
      // This is a simplified version of a real sandbox
      const output = execSync(`npx tsx ${testFile}`, { timeout: 10000 }).toString();
      return { success: true, output };
    } catch (error: any) {
      IQRALogger.warn(`❌ [SANDBOX] Validation failed for ${vectorId}: ${error.message}`);
      return { success: false, output: error.stdout?.toString() || '', error: error.stderr?.toString() };
    }
  }

  /**
   * 🧼 Clean up sandbox artifacts
   */
  static cleanup() {
    if (fs.existsSync(this.SANDBOX_DIR)) {
      fs.rmSync(this.SANDBOX_DIR, { recursive: true, force: true });
    }
  }
}
