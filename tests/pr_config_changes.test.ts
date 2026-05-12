import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── helpers ──────────────────────────────────────────────────────────────────

function readJson<T>(relPath: string): T {
  const raw = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  return JSON.parse(raw) as T;
}

function readText(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

// ── .ag/mcp.json ─────────────────────────────────────────────────────────────

interface McpServer {
  command: string;
  args: string[];
  env?: Record<string, string>;
  disabled?: boolean;
  autoApprove?: string[];
}

interface McpConfig {
  mcpServers: Record<string, McpServer>;
}

describe('.ag/mcp.json — MCP server configuration', () => {
  let config: McpConfig;

  it('is valid JSON', () => {
    expect(() => {
      config = readJson<McpConfig>('.ag/mcp.json');
    }).not.toThrow();
  });

  it('has a top-level mcpServers key', () => {
    config = readJson<McpConfig>('.ag/mcp.json');
    expect(config).toHaveProperty('mcpServers');
    expect(typeof config.mcpServers).toBe('object');
  });

  it('contains exactly the four expected servers after PR cleanup', () => {
    config = readJson<McpConfig>('.ag/mcp.json');
    const serverNames = Object.keys(config.mcpServers);
    expect(serverNames).toHaveLength(4);
    expect(serverNames).toContain('github-mcp-custom');
    expect(serverNames).toContain('mcp-server-cloudflare');
    expect(serverNames).toContain('qdrantdb');
    expect(serverNames).toContain('gemini-bridge');
  });

  it('does NOT contain the removed obsidian server', () => {
    config = readJson<McpConfig>('.ag/mcp.json');
    expect(Object.keys(config.mcpServers)).not.toContain('obsidian');
  });

  it('does NOT contain the removed infranodus server', () => {
    config = readJson<McpConfig>('.ag/mcp.json');
    expect(Object.keys(config.mcpServers)).not.toContain('infranodus');
  });

  it('does NOT contain the removed cerebras server', () => {
    config = readJson<McpConfig>('.ag/mcp.json');
    expect(Object.keys(config.mcpServers)).not.toContain('cerebras');
  });

  it('every server has a "command" string field', () => {
    config = readJson<McpConfig>('.ag/mcp.json');
    for (const [name, server] of Object.entries(config.mcpServers)) {
      expect(typeof server.command, `${name}.command`).toBe('string');
      expect(server.command.length, `${name}.command non-empty`).toBeGreaterThan(0);
    }
  });

  it('every server has an "args" array', () => {
    config = readJson<McpConfig>('.ag/mcp.json');
    for (const [name, server] of Object.entries(config.mcpServers)) {
      expect(Array.isArray(server.args), `${name}.args is array`).toBe(true);
    }
  });

  it('github-mcp-custom uses npx with the correct package', () => {
    config = readJson<McpConfig>('.ag/mcp.json');
    const gh = config.mcpServers['github-mcp-custom'];
    expect(gh.command).toBe('npx');
    expect(gh.args).toContain('@modelcontextprotocol/server-github');
    expect(gh.args).toContain('-y');
  });

  it('github-mcp-custom env references GITHUB_TOKEN placeholder', () => {
    config = readJson<McpConfig>('.ag/mcp.json');
    const gh = config.mcpServers['github-mcp-custom'];
    expect(gh.env?.GITHUB_PERSONAL_ACCESS_TOKEN).toBe('${GITHUB_TOKEN}');
  });

  it('mcp-server-cloudflare uses npx with the correct package', () => {
    config = readJson<McpConfig>('.ag/mcp.json');
    const cf = config.mcpServers['mcp-server-cloudflare'];
    expect(cf.command).toBe('npx');
    expect(cf.args).toContain('@cloudflare/mcp-server-cloudflare');
    expect(cf.args).toContain('-y');
  });

  it('mcp-server-cloudflare env references CF_TOKEN placeholder', () => {
    config = readJson<McpConfig>('.ag/mcp.json');
    const cf = config.mcpServers['mcp-server-cloudflare'];
    expect(cf.env?.CLOUDFLARE_API_TOKEN).toBe('${CF_TOKEN}');
  });

  it('qdrantdb uses uvx with correct package', () => {
    config = readJson<McpConfig>('.ag/mcp.json');
    const qdrant = config.mcpServers['qdrantdb'];
    expect(qdrant.command).toBe('uvx');
    expect(qdrant.args).toContain('mcp-server-qdrant');
  });

  it('qdrantdb env QDRANT_URL points to localhost', () => {
    config = readJson<McpConfig>('.ag/mcp.json');
    const qdrant = config.mcpServers['qdrantdb'];
    expect(qdrant.env?.QDRANT_URL).toBe('http://localhost:6333');
  });

  it('gemini-bridge uses uvx with correct package', () => {
    config = readJson<McpConfig>('.ag/mcp.json');
    const gemini = config.mcpServers['gemini-bridge'];
    expect(gemini.command).toBe('uvx');
    expect(gemini.args).toContain('gemini-bridge');
  });

  it('gemini-bridge has no env block (no credentials required)', () => {
    config = readJson<McpConfig>('.ag/mcp.json');
    const gemini = config.mcpServers['gemini-bridge'];
    expect(gemini.env).toBeUndefined();
  });

  it('npx-based servers include the -y flag to skip prompts', () => {
    config = readJson<McpConfig>('.ag/mcp.json');
    const npxServers = ['github-mcp-custom', 'mcp-server-cloudflare'];
    for (const name of npxServers) {
      expect(
        config.mcpServers[name].args,
        `${name} should include -y`
      ).toContain('-y');
    }
  });

  it('env placeholders follow ${VAR_NAME} pattern', () => {
    config = readJson<McpConfig>('.ag/mcp.json');
    const placeholderPattern = /^\$\{[A-Z_]+\}$/;
    for (const [name, server] of Object.entries(config.mcpServers)) {
      if (!server.env) continue;
      for (const [envKey, envVal] of Object.entries(server.env)) {
        if (envVal.startsWith('$')) {
          expect(
            placeholderPattern.test(envVal),
            `${name}.env.${envKey} uses correct placeholder syntax`
          ).toBe(true);
        }
      }
    }
  });
});

// ── .iqra/memory.json ─────────────────────────────────────────────────────────

interface SovereignKey {
  status: string;
  timestamp: number;
}

interface MemoryJson {
  sovereign_key: SovereignKey;
  'list:sovereign_list': string[];
}

describe('.iqra/memory.json — sovereign memory state', () => {
  let memory: MemoryJson;

  it('is valid JSON', () => {
    expect(() => {
      memory = readJson<MemoryJson>('.iqra/memory.json');
    }).not.toThrow();
  });

  it('has a sovereign_key object', () => {
    memory = readJson<MemoryJson>('.iqra/memory.json');
    expect(memory).toHaveProperty('sovereign_key');
    expect(typeof memory.sovereign_key).toBe('object');
    expect(memory.sovereign_key).not.toBeNull();
  });

  it('sovereign_key.status is "protected"', () => {
    memory = readJson<MemoryJson>('.iqra/memory.json');
    expect(memory.sovereign_key.status).toBe('protected');
  });

  it('sovereign_key.timestamp is a positive integer', () => {
    memory = readJson<MemoryJson>('.iqra/memory.json');
    const { timestamp } = memory.sovereign_key;
    expect(typeof timestamp).toBe('number');
    expect(Number.isInteger(timestamp)).toBe(true);
    expect(timestamp).toBeGreaterThan(0);
  });

  it('sovereign_key.timestamp is a plausible Unix ms epoch (after 2020)', () => {
    memory = readJson<MemoryJson>('.iqra/memory.json');
    const jan2020ms = 1577836800000;
    expect(memory.sovereign_key.timestamp).toBeGreaterThan(jan2020ms);
  });

  it('has a "list:sovereign_list" key', () => {
    memory = readJson<MemoryJson>('.iqra/memory.json');
    expect(memory).toHaveProperty('list:sovereign_list');
  });

  it('"list:sovereign_list" is an array', () => {
    memory = readJson<MemoryJson>('.iqra/memory.json');
    expect(Array.isArray(memory['list:sovereign_list'])).toBe(true);
  });

  it('"list:sovereign_list" has at least one entry', () => {
    memory = readJson<MemoryJson>('.iqra/memory.json');
    expect(memory['list:sovereign_list'].length).toBeGreaterThanOrEqual(1);
  });

  it('"list:sovereign_list" entries are strings', () => {
    memory = readJson<MemoryJson>('.iqra/memory.json');
    for (const entry of memory['list:sovereign_list']) {
      expect(typeof entry).toBe('string');
    }
  });

  it('file has no unexpected top-level keys beyond sovereign_key and list:sovereign_list', () => {
    memory = readJson<MemoryJson>('.iqra/memory.json');
    const knownKeys = new Set(['sovereign_key', 'list:sovereign_list']);
    for (const key of Object.keys(memory)) {
      expect(knownKeys.has(key) || key.startsWith('list:'), `unexpected key: ${key}`).toBe(true);
    }
  });
});

// ── archaeology_sources.json ──────────────────────────────────────────────────

interface ArchaeologySource {
  location: string;
  source: string;
  url: string;
  description: string;
}

describe('archaeology_sources.json — archaeological references', () => {
  let sources: ArchaeologySource[];

  it('is valid JSON', () => {
    expect(() => {
      sources = readJson<ArchaeologySource[]>('archaeology_sources.json');
    }).not.toThrow();
  });

  it('is a non-empty array', () => {
    sources = readJson<ArchaeologySource[]>('archaeology_sources.json');
    expect(Array.isArray(sources)).toBe(true);
    expect(sources.length).toBeGreaterThan(0);
  });

  it('contains at least three entries', () => {
    sources = readJson<ArchaeologySource[]>('archaeology_sources.json');
    expect(sources.length).toBeGreaterThanOrEqual(3);
  });

  it('every entry has a non-empty "location" string', () => {
    sources = readJson<ArchaeologySource[]>('archaeology_sources.json');
    for (const entry of sources) {
      expect(typeof entry.location).toBe('string');
      expect(entry.location.trim().length).toBeGreaterThan(0);
    }
  });

  it('every entry has a non-empty "source" string', () => {
    sources = readJson<ArchaeologySource[]>('archaeology_sources.json');
    for (const entry of sources) {
      expect(typeof entry.source).toBe('string');
      expect(entry.source.trim().length).toBeGreaterThan(0);
    }
  });

  it('every entry has a non-empty "url" string', () => {
    sources = readJson<ArchaeologySource[]>('archaeology_sources.json');
    for (const entry of sources) {
      expect(typeof entry.url).toBe('string');
      expect(entry.url.trim().length).toBeGreaterThan(0);
    }
  });

  it('every entry url starts with https://', () => {
    sources = readJson<ArchaeologySource[]>('archaeology_sources.json');
    for (const entry of sources) {
      expect(entry.url, `${entry.location} url should start with https://`).toMatch(/^https:\/\//);
    }
  });

  it('every entry has a non-empty "description" string', () => {
    sources = readJson<ArchaeologySource[]>('archaeology_sources.json');
    for (const entry of sources) {
      expect(typeof entry.description).toBe('string');
      expect(entry.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('every entry url is parseable as a valid URL', () => {
    sources = readJson<ArchaeologySource[]>('archaeology_sources.json');
    for (const entry of sources) {
      expect(() => new URL(entry.url), `${entry.location}: invalid URL`).not.toThrow();
    }
  });

  it('contains an entry for the Ubar (Atlantis of the Sands) site', () => {
    sources = readJson<ArchaeologySource[]>('archaeology_sources.json');
    const ubarEntry = sources.find(s => s.location.includes('Ubar'));
    expect(ubarEntry).toBeDefined();
  });

  it('contains an entry referencing Rub al Khali / Empty Quarter', () => {
    sources = readJson<ArchaeologySource[]>('archaeology_sources.json');
    const rubAlKhali = sources.find(
      s =>
        s.location.toLowerCase().includes('rub') ||
        s.location.toLowerCase().includes('empty quarter')
    );
    expect(rubAlKhali).toBeDefined();
  });

  it('entries have no duplicate URLs', () => {
    sources = readJson<ArchaeologySource[]>('archaeology_sources.json');
    const urls = sources.map(s => s.url);
    const uniqueUrls = new Set(urls);
    expect(uniqueUrls.size).toBe(urls.length);
  });
});

// ── .github/workflows/quran-learning.yml ─────────────────────────────────────

describe('.github/workflows/quran-learning.yml — script path update', () => {
  let yamlContent: string;

  it('file exists and is readable', () => {
    expect(() => {
      yamlContent = readText('.github/workflows/quran-learning.yml');
    }).not.toThrow();
  });

  it('uses the new script path: lib/iqra/quran/daily_learning.ts', () => {
    yamlContent = readText('.github/workflows/quran-learning.yml');
    expect(yamlContent).toContain('lib/iqra/quran/daily_learning.ts');
  });

  it('does NOT contain the old script path: src/lib/iqra/04-quran/daily_learning.ts', () => {
    yamlContent = readText('.github/workflows/quran-learning.yml');
    expect(yamlContent).not.toContain('src/lib/iqra/04-quran/daily_learning.ts');
  });

  it('runs via npx tsx', () => {
    yamlContent = readText('.github/workflows/quran-learning.yml');
    expect(yamlContent).toContain('npx tsx');
  });

  it('schedules at 3 AM UTC (Fajr time)', () => {
    yamlContent = readText('.github/workflows/quran-learning.yml');
    expect(yamlContent).toContain("cron: '0 3 * * *'");
  });

  it('checks out repository using actions/checkout@v4', () => {
    yamlContent = readText('.github/workflows/quran-learning.yml');
    expect(yamlContent).toContain('actions/checkout@v4');
  });

  it('uses Node 20', () => {
    yamlContent = readText('.github/workflows/quran-learning.yml');
    expect(yamlContent).toContain("node-version: '20'");
  });

  it('includes workflow_dispatch for manual triggering', () => {
    yamlContent = readText('.github/workflows/quran-learning.yml');
    expect(yamlContent).toContain('workflow_dispatch');
  });

  it('passes ANTHROPIC_API_KEY from secrets', () => {
    yamlContent = readText('.github/workflows/quran-learning.yml');
    expect(yamlContent).toContain('ANTHROPIC_API_KEY');
    expect(yamlContent).toContain('secrets.ANTHROPIC_API_KEY');
  });

  it('passes GROQ_API_KEY from secrets', () => {
    yamlContent = readText('.github/workflows/quran-learning.yml');
    expect(yamlContent).toContain('GROQ_API_KEY');
    expect(yamlContent).toContain('secrets.GROQ_API_KEY');
  });
});

// ── .gitignore ────────────────────────────────────────────────────────────────

describe('.gitignore — simplified ignore patterns after PR cleanup', () => {
  let gitignoreContent: string;

  it('file exists and is readable', () => {
    expect(() => {
      gitignoreContent = readText('.gitignore');
    }).not.toThrow();
  });

  it('ignores .env', () => {
    gitignoreContent = readText('.gitignore');
    const lines = gitignoreContent.split('\n').map(l => l.trim());
    expect(lines).toContain('.env');
  });

  it('ignores .env.local', () => {
    gitignoreContent = readText('.gitignore');
    const lines = gitignoreContent.split('\n').map(l => l.trim());
    expect(lines).toContain('.env.local');
  });

  it('ignores node_modules/', () => {
    gitignoreContent = readText('.gitignore');
    const lines = gitignoreContent.split('\n').map(l => l.trim());
    expect(lines).toContain('node_modules/');
  });

  it('ignores .DS_Store', () => {
    gitignoreContent = readText('.gitignore');
    const lines = gitignoreContent.split('\n').map(l => l.trim());
    expect(lines).toContain('.DS_Store');
  });

  it('ignores .next/', () => {
    gitignoreContent = readText('.gitignore');
    const lines = gitignoreContent.split('\n').map(l => l.trim());
    expect(lines).toContain('.next/');
  });

  it('ignores dist/', () => {
    gitignoreContent = readText('.gitignore');
    const lines = gitignoreContent.split('\n').map(l => l.trim());
    expect(lines).toContain('dist/');
  });

  it('does NOT contain the removed .iqra/ pattern', () => {
    gitignoreContent = readText('.gitignore');
    const lines = gitignoreContent.split('\n').map(l => l.trim());
    expect(lines).not.toContain('.iqra/');
  });

  it('ignores .env.* variants while allowing committed example', () => {
    gitignoreContent = readText('.gitignore');
    const lines = gitignoreContent.split('\n').map(l => l.trim());
    expect(lines).toContain('.env.*');
    expect(lines).toContain('!.env.example');
  });

  it('does NOT contain the removed .iqra_loop_state pattern', () => {
    gitignoreContent = readText('.gitignore');
    expect(gitignoreContent).not.toContain('.iqra_loop_state');
  });

  it('does NOT contain the removed archive/ pattern', () => {
    gitignoreContent = readText('.gitignore');
    const lines = gitignoreContent.split('\n').map(l => l.trim());
    expect(lines).not.toContain('archive/');
  });

  it('does NOT contain the removed wrangler.toml pattern', () => {
    gitignoreContent = readText('.gitignore');
    const lines = gitignoreContent.split('\n').map(l => l.trim());
    expect(lines).not.toContain('wrangler.toml');
  });

  it('ignores npm-debug.log*', () => {
    gitignoreContent = readText('.gitignore');
    const lines = gitignoreContent.split('\n').map(l => l.trim());
    expect(lines).toContain('npm-debug.log*');
  });

  // Removed brittle line-count assertion; semantic pattern checks above are sufficient.
});
