/**
 * 🛠️ Tool Router — موجه الأدوات
 * 
 * Routes execution to the appropriate skill or tool based on the Gatekeeper's validation.
 */

import { IQRALogger } from '#infra/logger';
import { GitSkill } from '#skills/git_skill';
import { GhostSearch } from '#runtime/ghost-search';
import { ToolsRegistry } from '#infra/tools_registry';

export class ToolRouter {
  private ghostSearch: GhostSearch;

  constructor() {
    this.ghostSearch = new GhostSearch();
  }

  /**
   * Routes the action to the specific skill implementation
   */
  public async route(skillName: string, action: string, params: any): Promise<any> {
    IQRALogger.info(`🛠️ [TOOL_ROUTER] Routing '${action}' to skill '${skillName}'`);

    // 1. Try routing via the centralized ToolsRegistry (handles all new tools)
    if (ToolsRegistry.get(skillName)) {
      return await ToolsRegistry.call(skillName, params);
    }
    
    if (ToolsRegistry.get(action)) {
      return await ToolsRegistry.call(action, params);
    }

    switch (skillName) {
      case 'GitSovereign':
        return await this.handleGitAction(action, params);
      case 'GhostSearch':
        return await this.handleSearchAction(action, params);
      default:
        throw new Error(`Unknown skill: ${skillName}`);
    }
  }

  private async handleGitAction(action: string, params: any): Promise<any> {
    // This will eventually call GitSovereign, but for now we map to the old
    // GitSkill. Every branch — including the default — produces a typed
    // `{ success, data?, error? }` shape so callers never need to handle
    // mixed return types. `git_push` keeps its boolean return for
    // backwards-compat with the existing pushToBranch contract.
    switch (action) {
      case 'git_push':
        return await GitSkill.pushToBranch(params?.branch, params?.message);

      case 'git_head':
        return { success: true, data: { sha: GitSkill.head() } };

      case 'git_branch':
        return { success: true, data: { branch: GitSkill.branch() } };

      case 'git_status':
        return { success: true, data: { clean: GitSkill.isClean() } };

      case 'git_create_branch': {
        if (!params?.branch) {
          return { success: false, error: 'git_create_branch: `branch` is required' };
        }
        const ok = GitSkill.createBranch(params.branch);
        return ok
          ? { success: true, data: { branch: params.branch } }
          : { success: false, error: `git_create_branch: failed for "${params.branch}"` };
      }

      case 'git_commit': {
        const paths = Array.isArray(params?.paths) ? params.paths : null;
        if (!paths || paths.length === 0 || !params?.message) {
          return {
            success: false,
            error: 'git_commit: `paths` (non-empty array) and `message` are required',
          };
        }
        const sha = GitSkill.commit(paths, params.message);
        return sha
          ? { success: true, data: { sha } }
          : { success: false, error: 'git_commit: commit failed' };
      }

      case 'git_revert': {
        if (!params?.ref) {
          return { success: false, error: 'git_revert: `ref` is required' };
        }
        const ok = GitSkill.revertTo(params.ref);
        return ok
          ? { success: true, data: { ref: params.ref } }
          : { success: false, error: `git_revert: failed to reset to "${params.ref}"` };
      }

      case 'git_recent_commits': {
        const raw = params?.limit;
        const limit = typeof raw === 'number' && Number.isFinite(raw) ? raw : 20;
        return { success: true, data: { commits: GitSkill.recentCommits(limit) } };
      }

      case 'git_open_pr': {
        if (!params?.title) {
          return { success: false, error: 'git_open_pr: `title` is required' };
        }
        const url = await GitSkill.openPR(params.title, params.body || '');
        return url
          ? { success: true, data: { url } }
          : {
              success: false,
              error: 'git_open_pr: `gh` CLI unavailable or PR creation rejected',
            };
      }

      default:
        return {
          success: false,
          error: `GitSovereign: action "${action}" is not implemented`,
        };
    }
  }

  private async handleSearchAction(action: string, params: any): Promise<any> {
    const result = await this.ghostSearch.research(params.query || params.input);
    return { success: true, data: result };
  }
}
