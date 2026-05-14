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
    // mixed return types or worry about thrown exceptions: any throw from
    // GitSkill is caught below and converted into the same shape.
    const RECENT_COMMITS_DEFAULT = 20;
    const RECENT_COMMITS_MAX = 100;

    try {
      switch (action) {
        case 'git_push': {
          const ok = await GitSkill.pushToBranch(params?.branch, params?.message);
          return ok
            ? { success: true, data: { pushed: true } }
            : { success: false, error: 'git_push: push failed' };
        }

        case 'git_head': {
          // Use the structured *Result so a broken-git situation (no repo,
          // missing binary) surfaces as success=false instead of being
          // hidden behind an empty SHA string.
          const r = GitSkill.headResult();
          return r.ok
            ? { success: true, data: { sha: r.stdout } }
            : { success: false, error: `git_head: ${r.stderr || `exit=${r.code}`}` };
        }

        case 'git_branch': {
          const r = GitSkill.branchResult();
          return r.ok
            ? { success: true, data: { branch: r.stdout } }
            : { success: false, error: `git_branch: ${r.stderr || `exit=${r.code}`}` };
        }

        case 'git_status': {
          // Structured status lets us distinguish "git failed" from
          // "tree is dirty" — the dirty case is data, not an error.
          const r = GitSkill.statusResult();
          return r.ok
            ? { success: true, data: { clean: r.stdout === '' } }
            : { success: false, error: `git_status: ${r.stderr || `exit=${r.code}`}` };
        }

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
          // Coerce, validate, clamp. Negatives, NaN, fractional, and huge
          // values all collapse to a safe positive integer in [1, MAX].
          const raw = Number(params?.limit);
          const limit = Number.isFinite(raw)
            ? Math.min(RECENT_COMMITS_MAX, Math.max(1, Math.floor(raw)))
            : RECENT_COMMITS_DEFAULT;
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
    } catch (e) {
      // Any thrown error from GitSkill (e.g. invalid ref token, shell
      // failure) is normalised into the standard shape so callers see a
      // single contract instead of a mix of returns and exceptions.
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: `GitSovereign:${action}: ${message}` };
    }
  }

  private async handleSearchAction(action: string, params: any): Promise<any> {
    const result = await this.ghostSearch.research(params.query || params.input);
    return { success: true, data: result };
  }
}
