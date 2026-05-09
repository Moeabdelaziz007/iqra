/**
 * 🛠️ MCPValidator — مدقق بروتوكول التحكم في الوكيل (MCP)
 * 
 * "وَإِذَا حَكَمْتُم بَيْنَ النَّاسِ أَن تَحْكُمُوا بِالْعَدْلِ" — النساء: 58
 * 
 * Checks MCP server availability before usage.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { IQRALogger } from '../12-infrastructure/logger';

export interface MCPServer {
  name: string;
  status: 'configured' | 'available' | 'active';
  command?: string;
}

export class MCPValidator {
  private static readonly CONFIG_PATH = path.join(process.cwd(), 'mcp.json');

  /**
   * 🔍 Audit all configured MCP servers
   */
  static async auditInventory(): Promise<MCPServer[]> {
    IQRALogger.info('🔍 [MCP_AUDIT] Inventory check initiated...');
    
    if (!fs.existsSync(this.CONFIG_PATH)) {
      IQRALogger.warn('⚠️ [MCP_AUDIT] No mcp.json found.');
      return [];
    }

    try {
      const config = JSON.parse(fs.readFileSync(this.CONFIG_PATH, 'utf8')) as {
        mcpServers?: Record<string, { command?: string }>;
      };
      const servers = config.mcpServers || {};
      const inventory: MCPServer[] = [];

      for (const [name, server] of Object.entries(servers)) {
        const isAvailable = await this.checkCommand(server.command);
        inventory.push({
          name,
          command: server.command,
          status: isAvailable ? 'active' : 'configured',
        });
      }

      return inventory;
    } catch (error) {
      IQRALogger.error('❌ [MCP_AUDIT] Failed to parse mcp.json', error);
      return [];
    }
  }

  /**
   * ⚡ Check if a command (like npx or uvx) is available in the shell
   */
  private static async checkCommand(command?: string): Promise<boolean> {
    if (!command) return false;
    try {
      const cmd = command.split(' ')[0];
      const result = spawnSync('which', [cmd], { stdio: 'ignore' });
      return result.status === 0;
    } catch {
      return false;
    }
  }
}
