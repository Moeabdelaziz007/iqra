/**
 * 🔗 GitSkill — مهارة التواصل مع المستودعات
 * 
 * "وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ" — المائدة: 2
 * 
 * Part of the IQRA Sovereign Mesh.
 * Handles branch creation, commits, and Pull Requests.
 */

import { execSync } from 'child_process';
import { IQRALogger } from '../12-infrastructure/logger';

export class GitSkill {
  
  /**
   * 🌿 Create a new branch and push changes
   */
  static async pushToBranch(branchName: string, commitMessage: string): Promise<boolean> {
    try {
      IQRALogger.info(`🔗 [GIT_SKILL] Creating branch: ${branchName}`);
      execSync(`git checkout -b ${branchName}`);
      execSync(`git add .`);
      execSync(`git commit -m "${commitMessage}"`);
      execSync(`git push origin ${branchName}`);
      return true;
    } catch (error) {
      IQRALogger.error('❌ [GIT_SKILL] Push failed:', error);
      return false;
    }
  }

  /**
   * 📤 Open a Pull Request using GitHub CLI (gh)
   */
  static async openPR(title: string, body: string): Promise<string | null> {
    try {
      IQRALogger.info('🔗 [GIT_SKILL] Opening Pull Request...');
      // Note: Requires GitHub CLI (gh) to be installed and authenticated
      const prUrl = execSync(`gh pr create --title "${title}" --body "${body}"`).toString().trim();
      return prUrl;
    } catch (error: any) {
      IQRALogger.error('❌ [GIT_SKILL] PR creation failed:', error);
      return null;
    }
  }

  /**
   * 🔄 Check for existing PRs
   */
  static async checkExistingPR(branchName: string): Promise<boolean> {
    try {
      const output = execSync(`gh pr list --head ${branchName}`).toString();
      return output.length > 0;
    } catch {
      return false;
    }
  }
}
