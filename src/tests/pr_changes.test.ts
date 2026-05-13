/**
 * Tests for PR changes:
 * - .ag/mcp.json (config restructure, server removal)
 * - .iqra/memory.json (new file)
 * - .github/workflows/quran-learning.yml (runner + script path change)
 * - .github/workflows/update-readme.yml (runner change)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../');

// ─── Helpers ────────────────────────────────────────────────────────────────

function readJson(relPath: string): unknown {
  const fullPath = resolve(ROOT, relPath);
  const raw = readFileSync(fullPath, 'utf8');
  return JSON.parse(raw);
}

function readText(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf8');
}

// ─── .ag/mcp.json ───────────────────────────────────────────────────────────

describe('.ag/mcp.json — MCP server configuration', () => {
  let config: { mcpServers: Record<string, unknown> };

  it('parses as valid JSON', () => {
    config = readJson('.ag/mcp.json') as typeof config;
    expect(config).toBeDefined();
  });

  it('has a top-level mcpServers object', () => {
    config = readJson('.ag/mcp.json') as typeof config;
    expect(config).toHaveProperty('mcpServers');
    expect(typeof config.mcpServers).toBe('object');
    expect(Array.isArray(config.mcpServers)).toBe(false);
  });

  it('contains exactly the four retained servers (obsidian, infranodus, cerebras removed)', () => {
    config = readJson('.ag/mcp.json') as typeof config;
    const serverKeys = Object.keys(config.mcpServers);
    expect(serverKeys).toHaveLength(4);
    expect(serverKeys).toContain('github-mcp-custom');
    expect(serverKeys).toContain('mcp-server-cloudflare');
    expect(serverKeys).toContain('qdrantdb');
    expect(serverKeys).toContain('gemini-bridge');
  });

  it('does NOT contain the removed servers (obsidian, infranodus, cerebras)', () => {
    config = readJson('.ag/mcp.json') as typeof config;
    const serverKeys = Object.keys(config.mcpServers);
    expect(serverKeys).not.toContain('obsidian');
    expect(serverKeys).not.toContain('infranodus');
    expect(serverKeys).not.toContain('cerebras');
  });

  it('each server has a command string', () => {
    config = readJson('.ag/mcp.json') as typeof config;
    for (const [name, srv] of Object.entries(config.mcpServers)) {
      const server = srv as Record<string, unknown>;
      expect(server, `server ${name} missing command`).toHaveProperty('command');
      expect(typeof server.command, `server ${name} command is not a string`).toBe('string');
    }
  });

  it('each server has an args array', () => {
    config = readJson('.ag/mcp.json') as typeof config;
    for (const [name, srv] of Object.entries(config.mcpServers)) {
      const server = srv as Record<string, unknown>;
      expect(server, `server ${name} missing args`).toHaveProperty('args');
      expect(Array.isArray(server.args), `server ${name} args is not an array`).toBe(true);
    }
  });

  it('args for every server are non-empty arrays', () => {
    config = readJson('.ag/mcp.json') as typeof config;
    for (const [name, srv] of Object.entries(config.mcpServers)) {
      const server = srv as Record<string, unknown>;
      expect((server.args as unknown[]).length, `server ${name} has empty args`).toBeGreaterThan(0);
    }
  });

  it('github-mcp-custom uses npx with correct package', () => {
    config = readJson('.ag/mcp.json') as typeof config;
    const srv = config.mcpServers['github-mcp-custom'] as Record<string, unknown>;
    expect(srv.command).toBe('npx');
    expect(srv.args).toContain('@modelcontextprotocol/server-github');
  });

  it('github-mcp-custom env uses ${GITHUB_TOKEN} placeholder', () => {
    config = readJson('.ag/mcp.json') as typeof config;
    const srv = config.mcpServers['github-mcp-custom'] as Record<string, unknown>;
    const env = srv.env as Record<string, string>;
    expect(env['GITHUB_PERSONAL_ACCESS_TOKEN']).toBe('${GITHUB_TOKEN}');
  });

  it('mcp-server-cloudflare uses npx with correct package', () => {
    config = readJson('.ag/mcp.json') as typeof config;
    const srv = config.mcpServers['mcp-server-cloudflare'] as Record<string, unknown>;
    expect(srv.command).toBe('npx');
    expect(srv.args).toContain('@cloudflare/mcp-server-cloudflare');
  });

  it('mcp-server-cloudflare env uses ${CF_TOKEN} placeholder', () => {
    config = readJson('.ag/mcp.json') as typeof config;
    const srv = config.mcpServers['mcp-server-cloudflare'] as Record<string, unknown>;
    const env = srv.env as Record<string, string>;
    expect(env['CLOUDFLARE_API_TOKEN']).toBe('${CF_TOKEN}');
  });

  it('qdrantdb uses uvx with mcp-server-qdrant', () => {
    config = readJson('.ag/mcp.json') as typeof config;
    const srv = config.mcpServers['qdrantdb'] as Record<string, unknown>;
    expect(srv.command).toBe('uvx');
    expect(srv.args).toContain('mcp-server-qdrant');
  });

  it('qdrantdb env has QDRANT_URL pointing to localhost', () => {
    config = readJson('.ag/mcp.json') as typeof config;
    const srv = config.mcpServers['qdrantdb'] as Record<string, unknown>;
    const env = srv.env as Record<string, string>;
    expect(env['QDRANT_URL']).toBe('http://localhost:6333');
  });

  it('gemini-bridge uses uvx with gemini-bridge arg', () => {
    config = readJson('.ag/mcp.json') as typeof config;
    const srv = config.mcpServers['gemini-bridge'] as Record<string, unknown>;
    expect(srv.command).toBe('uvx');
    expect(srv.args).toContain('gemini-bridge');
  });

  it('gemini-bridge has no env section (no API key required)', () => {
    config = readJson('.ag/mcp.json') as typeof config;
    const srv = config.mcpServers['gemini-bridge'] as Record<string, unknown>;
    expect(srv).not.toHaveProperty('env');
  });

  it('npx-based servers include -y flag for non-interactive installs', () => {
    config = readJson('.ag/mcp.json') as typeof config;
    const npxServers = ['github-mcp-custom', 'mcp-server-cloudflare'];
    for (const name of npxServers) {
      const srv = config.mcpServers[name] as Record<string, unknown>;
      expect(srv.args, `server ${name} is missing -y flag`).toContain('-y');
    }
  });
});

// ─── .iqra/memory.json ──────────────────────────────────────────────────────

describe('.iqra/memory.json — sovereign memory store', () => {
  interface MemoryJson {
    sovereign_key: {
      status: string;
      timestamp: number;
    };
    'list:sovereign_list': string[];
  }

  let memory: MemoryJson;

  it('parses as valid JSON', () => {
    memory = readJson('.iqra/memory.json') as MemoryJson;
    expect(memory).toBeDefined();
  });

  it('has a sovereign_key object', () => {
    memory = readJson('.iqra/memory.json') as MemoryJson;
    expect(memory).toHaveProperty('sovereign_key');
    expect(typeof memory.sovereign_key).toBe('object');
  });

  it('sovereign_key has a status field set to "protected"', () => {
    memory = readJson('.iqra/memory.json') as MemoryJson;
    expect(memory.sovereign_key.status).toBe('protected');
  });

  it('sovereign_key has a numeric timestamp', () => {
    memory = readJson('.iqra/memory.json') as MemoryJson;
    expect(typeof memory.sovereign_key.timestamp).toBe('number');
    expect(Number.isInteger(memory.sovereign_key.timestamp)).toBe(true);
  });

  it('sovereign_key timestamp is a positive Unix millisecond value', () => {
    memory = readJson('.iqra/memory.json') as MemoryJson;
    // Should be > 0 and a plausible ms-epoch (after year 2000 = 946684800000)
    expect(memory.sovereign_key.timestamp).toBeGreaterThan(946684800000);
  });

  it('has a "list:sovereign_list" array key', () => {
    memory = readJson('.iqra/memory.json') as MemoryJson;
    expect(memory).toHaveProperty('list:sovereign_list');
    expect(Array.isArray(memory['list:sovereign_list'])).toBe(true);
  });

  it('"list:sovereign_list" is non-empty', () => {
    memory = readJson('.iqra/memory.json') as MemoryJson;
    expect(memory['list:sovereign_list'].length).toBeGreaterThan(0);
  });

  it('"list:sovereign_list" contains string entries', () => {
    memory = readJson('.iqra/memory.json') as MemoryJson;
    for (const entry of memory['list:sovereign_list']) {
      expect(typeof entry).toBe('string');
    }
  });

  it('contains exactly the expected top-level keys', () => {
    memory = readJson('.iqra/memory.json') as MemoryJson;
    const keys = Object.keys(memory);
    expect(keys).toContain('sovereign_key');
    expect(keys).toContain('list:sovereign_list');
    // Boundary: no extra stray keys introduced accidentally
    expect(keys).toHaveLength(2);
  });
});

// ─── .github/workflows/quran-learning.yml ───────────────────────────────────

describe('.github/workflows/quran-learning.yml — workflow changes', () => {
  let content: string;

  it('can be read as a text file', () => {
    content = readText('.github/workflows/quran-learning.yml');
    expect(content.length).toBeGreaterThan(0);
  });

  it('uses ubuntu-latest runner (not blacksmith-specific)', () => {
    content = readText('.github/workflows/quran-learning.yml');
    expect(content).toContain('runs-on: ubuntu-latest');
    expect(content).not.toContain('blacksmith');
  });

  it('references the updated daily_learning.ts path under lib/iqra/quran/', () => {
    content = readText('.github/workflows/quran-learning.yml');
    expect(content).toContain('lib/iqra/quran/daily_learning.ts');
  });

  it('does NOT reference the old path src/lib/iqra/04-quran/', () => {
    content = readText('.github/workflows/quran-learning.yml');
    expect(content).not.toContain('src/lib/iqra/04-quran/');
  });

  it('runs npx tsx for the daily learning step', () => {
    content = readText('.github/workflows/quran-learning.yml');
    expect(content).toContain('npx tsx lib/iqra/quran/daily_learning.ts');
  });

  it('triggers on a daily schedule cron', () => {
    content = readText('.github/workflows/quran-learning.yml');
    expect(content).toMatch(/cron:/);
  });

  it('supports workflow_dispatch for manual triggering', () => {
    content = readText('.github/workflows/quran-learning.yml');
    expect(content).toContain('workflow_dispatch');
  });

  it('checks out with GITHUB_TOKEN secret', () => {
    content = readText('.github/workflows/quran-learning.yml');
    expect(content).toContain('secrets.GITHUB_TOKEN');
  });

  it('sets up Node.js v20', () => {
    content = readText('.github/workflows/quran-learning.yml');
    expect(content).toContain("node-version: '20'");
  });

  it('passes required AI API key secrets as env vars', () => {
    content = readText('.github/workflows/quran-learning.yml');
    expect(content).toContain('GROQ_API_KEY');
    expect(content).toContain('ANTHROPIC_API_KEY');
  });
});

// ─── .github/workflows/update-readme.yml ────────────────────────────────────

describe('.github/workflows/update-readme.yml — workflow changes', () => {
  let content: string;

  it('can be read as a text file', () => {
    content = readText('.github/workflows/update-readme.yml');
    expect(content.length).toBeGreaterThan(0);
  });

  it('uses ubuntu-latest runner (not blacksmith-specific)', () => {
    content = readText('.github/workflows/update-readme.yml');
    expect(content).toContain('runs-on: ubuntu-latest');
    expect(content).not.toContain('blacksmith');
  });

  it('triggers on push to main branch', () => {
    content = readText('.github/workflows/update-readme.yml');
    expect(content).toContain('branches: [main]');
  });

  it('has contents: write permission for committing README', () => {
    content = readText('.github/workflows/update-readme.yml');
    expect(content).toContain('contents: write');
  });

  it('invokes update_readme.py script', () => {
    content = readText('.github/workflows/update-readme.yml');
    expect(content).toContain('scripts/update_readme.py');
  });

  it('commits README.md changes back to the repo', () => {
    content = readText('.github/workflows/update-readme.yml');
    expect(content).toContain('git add README.md');
  });

  it('uses the GITHUB_TOKEN secret for checkout', () => {
    content = readText('.github/workflows/update-readme.yml');
    expect(content).toContain('secrets.GITHUB_TOKEN');
  });
});
