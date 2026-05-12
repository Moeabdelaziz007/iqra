/**
 * 🛠️ Tool Router — موجه الأدوات
 * 
 * Routes execution to the appropriate skill or tool based on the Gatekeeper's validation.
 */

import { IQRALogger } from '../src/lib/iqra/12-infrastructure/logger';
import { GitSkill } from '../src/lib/iqra/08-skills/git_skill';
import { GhostSearch } from './ghost-search';
import { ToolsRegistry } from '../src/lib/iqra/12-infrastructure/tools_registry';

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
    // This will eventually call GitSovereign, but for now we map to the old GitSkill
    if (action === 'git_push') {
      return await GitSkill.pushToBranch(params.branch, params.message);
    }
    // TODO: Implement other git actions in GitSovereign
    return { success: false, error: 'Action not implemented in GitSovereign' };
  }

  private async handleSearchAction(action: string, params: any): Promise<any> {
    const result = await this.ghostSearch.research(params.query || params.input);
    return { success: true, data: result };
  }
}
