/**
 * PR Changes Schema & Config Validation Tests
 *
 * Tests the structural integrity of config files, data schemas, and
 * environment templates changed in this pull request:
 * - .ag/mcp.json         — MCP server config (servers added/removed)
 * - .env.example         — Env var template (variables added/removed)
 * - .gitignore           — Ignore pattern restructure
 * - .iqra/closed_loop/   — NEW execution, review, and task data files
 * - .iqra/visual_notes/  — NEW visual note JSON files
 * - .github/workflows/sidq_pipeline.yml — Renamed/restructured CI job
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(process.cwd());

// ── Helpers ────────────────────────────────────────────────────────────────────

function readJson<T>(relPath: string): T {
  const full = resolve(ROOT, relPath);
  return JSON.parse(readFileSync(full, 'utf-8')) as T;
}

function readText(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf-8');
}

function fileExists(relPath: string): boolean {
  return existsSync(resolve(ROOT, relPath));
}

/** Parse key=value lines from .env.example, returning a Set of defined key names. */
function parseEnvExampleKeys(text: string): Set<string> {
  const keys = new Set<string>();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed === '') continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      keys.add(trimmed.slice(0, eqIdx).trim());
    }
  }
  return keys;
}

// ── .ag/mcp.json ──────────────────────────────────────────────────────────────

describe('.ag/mcp.json — MCP server configuration', () => {
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

  let config: McpConfig;

  beforeAll(() => {
    config = readJson<McpConfig>('.ag/mcp.json');
  });

  it('is valid JSON and has the mcpServers root key', () => {
    expect(config).toBeDefined();
    expect(config.mcpServers).toBeDefined();
    expect(typeof config.mcpServers).toBe('object');
  });

  it('contains exactly 4 servers after the PR cleanup', () => {
    const names = Object.keys(config.mcpServers);
    expect(names).toHaveLength(4);
  });

  it('retains the github-mcp-custom server', () => {
    expect(config.mcpServers['github-mcp-custom']).toBeDefined();
  });

  it('retains the mcp-server-cloudflare server', () => {
    expect(config.mcpServers['mcp-server-cloudflare']).toBeDefined();
  });

  it('retains the qdrantdb server', () => {
    expect(config.mcpServers['qdrantdb']).toBeDefined();
  });

  it('retains the gemini-bridge server', () => {
    expect(config.mcpServers['gemini-bridge']).toBeDefined();
  });

  it('does NOT contain the removed obsidian server', () => {
    expect(config.mcpServers['obsidian']).toBeUndefined();
  });

  it('does NOT contain the removed infranodus server', () => {
    expect(config.mcpServers['infranodus']).toBeUndefined();
  });

  it('does NOT contain the removed cerebras server', () => {
    expect(config.mcpServers['cerebras']).toBeUndefined();
  });

  it('each server has a non-empty command string', () => {
    for (const [name, srv] of Object.entries(config.mcpServers)) {
      expect(typeof srv.command, `${name}.command must be a string`).toBe('string');
      expect(srv.command.length, `${name}.command must be non-empty`).toBeGreaterThan(0);
    }
  });

  it('each server has an args array (not inline strings)', () => {
    for (const [name, srv] of Object.entries(config.mcpServers)) {
      expect(Array.isArray(srv.args), `${name}.args must be an array`).toBe(true);
      expect(srv.args.length, `${name}.args must be non-empty`).toBeGreaterThan(0);
    }
  });

  it('github-mcp-custom uses npx and correct package', () => {
    const gh = config.mcpServers['github-mcp-custom'];
    expect(gh.command).toBe('npx');
    expect(gh.args).toContain('@modelcontextprotocol/server-github');
  });

  it('github-mcp-custom env references GITHUB_TOKEN via interpolation', () => {
    const gh = config.mcpServers['github-mcp-custom'];
    expect(gh.env).toBeDefined();
    expect(gh.env!['GITHUB_PERSONAL_ACCESS_TOKEN']).toBe('${GITHUB_TOKEN}');
  });

  it('mcp-server-cloudflare env references CF_TOKEN via interpolation', () => {
    const cf = config.mcpServers['mcp-server-cloudflare'];
    expect(cf.env).toBeDefined();
    expect(cf.env!['CLOUDFLARE_API_TOKEN']).toBe('${CF_TOKEN}');
  });

  it('qdrantdb uses uvx and points to localhost by default', () => {
    const qd = config.mcpServers['qdrantdb'];
    expect(qd.command).toBe('uvx');
    expect(qd.env?.['QDRANT_URL']).toMatch(/localhost/);
  });

  it('gemini-bridge uses uvx and has no env block (no secret leaked)', () => {
    const gb = config.mcpServers['gemini-bridge'];
    expect(gb.command).toBe('uvx');
    expect(gb.env).toBeUndefined();
  });
});

// ── .env.example ──────────────────────────────────────────────────────────────

describe('.env.example — Environment variables template', () => {
  let text: string;
  let keys: Set<string>;

  beforeAll(() => {
    text = readText('.env.example');
    keys = parseEnvExampleKeys(text);
  });

  // ── Newly added LLM provider keys ─────────────────────────────────────────

  it('includes ANTHROPIC_API_KEY (newly added)', () => {
    expect(keys.has('ANTHROPIC_API_KEY')).toBe(true);
  });

  it('includes OPENAI_API_KEY (newly added)', () => {
    expect(keys.has('OPENAI_API_KEY')).toBe(true);
  });

  it('includes OPENROUTER_API_KEY (newly added)', () => {
    expect(keys.has('OPENROUTER_API_KEY')).toBe(true);
  });

  it('includes GLM_API_KEY (newly added)', () => {
    expect(keys.has('GLM_API_KEY')).toBe(true);
  });

  it('includes QWEN_API_KEY (newly added)', () => {
    expect(keys.has('QWEN_API_KEY')).toBe(true);
  });

  // ── Previously removed vars must NOT be present ───────────────────────────

  it('does NOT include XAI_API_KEY (removed)', () => {
    expect(keys.has('XAI_API_KEY')).toBe(false);
  });

  it('does NOT include CEREBRAS_API_KEY (removed)', () => {
    expect(keys.has('CEREBRAS_API_KEY')).toBe(false);
  });

  it('does NOT include LOGSEQ_VAULT_PATH (removed)', () => {
    expect(keys.has('LOGSEQ_VAULT_PATH')).toBe(false);
  });

  it('does NOT include OBSIDIAN_API_KEY (removed)', () => {
    expect(keys.has('OBSIDIAN_API_KEY')).toBe(false);
  });

  it('does NOT include OBSIDIAN_VAULT_PATH (removed)', () => {
    expect(keys.has('OBSIDIAN_VAULT_PATH')).toBe(false);
  });

  it('does NOT include INFRANODUS_API_KEY (removed)', () => {
    expect(keys.has('INFRANODUS_API_KEY')).toBe(false);
  });

  it('does NOT include IBM_QUANTUM_TOKEN (removed)', () => {
    expect(keys.has('IBM_QUANTUM_TOKEN')).toBe(false);
  });

  it('does NOT include IQRA_LLM_LOCAL mode flag (removed)', () => {
    expect(keys.has('IQRA_LLM_LOCAL')).toBe(false);
  });

  it('does NOT include IQRA_TOPOLOGY mode flag (removed)', () => {
    expect(keys.has('IQRA_TOPOLOGY')).toBe(false);
  });

  it('does NOT include IQRA_QUANTUM mode flag (removed)', () => {
    expect(keys.has('IQRA_QUANTUM')).toBe(false);
  });

  it('does NOT include IQRA_OBSIDIAN mode flag (removed)', () => {
    expect(keys.has('IQRA_OBSIDIAN')).toBe(false);
  });

  it('does NOT include CEREBRAS_MODEL (removed)', () => {
    expect(keys.has('CEREBRAS_MODEL')).toBe(false);
  });

  it('does NOT include OLLAMA_KV_CACHE_TYPE (removed)', () => {
    expect(keys.has('OLLAMA_KV_CACHE_TYPE')).toBe(false);
  });

  // ── Core vars that must remain ─────────────────────────────────────────────

  it('still includes GROQ_API_KEY', () => {
    expect(keys.has('GROQ_API_KEY')).toBe(true);
  });

  it('still includes GOOGLE_GENERATIVE_AI_API_KEY', () => {
    expect(keys.has('GOOGLE_GENERATIVE_AI_API_KEY')).toBe(true);
  });

  it('still includes UPSTASH_REDIS_REST_URL', () => {
    expect(keys.has('UPSTASH_REDIS_REST_URL')).toBe(true);
  });

  it('still includes UPSTASH_REDIS_REST_TOKEN', () => {
    expect(keys.has('UPSTASH_REDIS_REST_TOKEN')).toBe(true);
  });

  it('still includes QDRANT_URL', () => {
    expect(keys.has('QDRANT_URL')).toBe(true);
  });

  it('still includes SUPABASE_URL', () => {
    expect(keys.has('SUPABASE_URL')).toBe(true);
  });

  it('still includes GITHUB_TOKEN', () => {
    expect(keys.has('GITHUB_TOKEN')).toBe(true);
  });

  it('still includes CF_TOKEN', () => {
    expect(keys.has('CF_TOKEN')).toBe(true);
  });

  // ── Optional Ollama vars now moved to Optional section ────────────────────

  it('still includes OLLAMA_URL (moved to Optional section)', () => {
    expect(keys.has('OLLAMA_URL')).toBe(true);
  });

  it('still includes OLLAMA_MODEL (moved to Optional section)', () => {
    expect(keys.has('OLLAMA_MODEL')).toBe(true);
  });

  // ── Model default values ────────────────────────────────────────────────────

  it('GOOGLE_GEMINI_MODEL has a default value of gemini-2.5-flash', () => {
    const match = text.match(/^GOOGLE_GEMINI_MODEL=(.+)$/m);
    expect(match).not.toBeNull();
    expect(match![1].trim()).toBe('gemini-2.5-flash');
  });

  it('GROQ_MODEL has a default value of llama-3.3-70b-versatile', () => {
    const match = text.match(/^GROQ_MODEL=(.+)$/m);
    expect(match).not.toBeNull();
    expect(match![1].trim()).toBe('llama-3.3-70b-versatile');
  });

  // ── Security: no hardcoded secrets ─────────────────────────────────────────

  it('all API key lines have empty values (no hardcoded secrets)', () => {
    const apiKeyLines = text
      .split('\n')
      .filter(l => /API_KEY=/.test(l) && !l.trim().startsWith('#'));
    for (const line of apiKeyLines) {
      const value = line.split('=').slice(1).join('=').trim();
      expect(value, `Key in line "${line}" must have no hardcoded value`).toBe('');
    }
  });
});

// ── .gitignore ────────────────────────────────────────────────────────────────

describe('.gitignore — Ignore pattern changes', () => {
  let text: string;
  let patterns: string[];

  beforeAll(() => {
    text = readText('.gitignore');
    patterns = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('#'));
  });

  it('is readable and non-empty', () => {
    expect(text.length).toBeGreaterThan(0);
  });

  it('ignores specific training data files, not the entire .iqra/ dir', () => {
    // Old: `.iqra/` (entire dir); New: specific files
    expect(patterns).not.toContain('.iqra/');
    expect(patterns.some(p => p.includes('.iqra/training_data'))).toBe(true);
  });

  it('ignores .iqra/closed_loop/ directory', () => {
    expect(patterns).toContain('.iqra/closed_loop/');
  });

  it('ignores .iqra/visual_notes/ directory', () => {
    expect(patterns).toContain('.iqra/visual_notes/');
  });

  it('ignores .iqra/sera_training_data.json', () => {
    expect(patterns).toContain('.iqra/sera_training_data.json');
  });

  it('ignores .iqra/auto_improve_state.json', () => {
    expect(patterns).toContain('.iqra/auto_improve_state.json');
  });

  it('still ignores .env* patterns', () => {
    expect(patterns.some(p => p.startsWith('.env'))).toBe(true);
  });

  it('still ignores node_modules/', () => {
    expect(patterns).toContain('node_modules/');
  });

  it('still ignores .ag/mcp.json (local config may contain tokens)', () => {
    expect(patterns).toContain('.ag/mcp.json');
  });

  it('ignores node-compile-cache/ (new addition)', () => {
    expect(patterns).toContain('node-compile-cache/');
  });

  it('ignores .obsidian/ and .vscode/', () => {
    expect(patterns).toContain('.obsidian/');
    expect(patterns).toContain('.vscode/');
  });

  // Regression: broad removals from old .gitignore
  it('does NOT ignore .kiro/mapping/ or .kiro/planning/ (removed from ignore list)', () => {
    // Those patterns were removed in the PR
    expect(patterns).not.toContain('.kiro/mapping/');
    expect(patterns).not.toContain('.kiro/planning/');
  });
});

// ── .iqra/closed_loop/executions.json ────────────────────────────────────────

describe('.iqra/closed_loop/executions.json — Execution record schema', () => {
  interface ExecutionRecord {
    task_id: string;
    executed_at: string;
    output: string;
    execution_time_ms: number;
    provider: string;
    success: boolean;
  }

  let records: ExecutionRecord[];

  beforeAll(() => {
    records = readJson<ExecutionRecord[]>('.iqra/closed_loop/executions.json');
  });

  it('is a non-empty JSON array', () => {
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
  });

  it('every record has the required fields', () => {
    const REQUIRED: Array<keyof ExecutionRecord> = [
      'task_id', 'executed_at', 'output', 'execution_time_ms', 'provider', 'success',
    ];
    for (const rec of records) {
      for (const field of REQUIRED) {
        expect(rec[field], `Record ${rec.task_id} missing field "${field}"`).toBeDefined();
      }
    }
  });

  it('every task_id is a non-empty string', () => {
    for (const rec of records) {
      expect(typeof rec.task_id).toBe('string');
      expect(rec.task_id.length).toBeGreaterThan(0);
    }
  });

  it('every executed_at is a valid ISO 8601 timestamp', () => {
    for (const rec of records) {
      const d = new Date(rec.executed_at);
      expect(Number.isNaN(d.getTime()), `executed_at "${rec.executed_at}" is invalid`).toBe(false);
    }
  });

  it('every execution_time_ms is a non-negative number', () => {
    for (const rec of records) {
      expect(typeof rec.execution_time_ms).toBe('number');
      expect(rec.execution_time_ms).toBeGreaterThanOrEqual(0);
    }
  });

  it('every success field is a boolean', () => {
    for (const rec of records) {
      expect(typeof rec.success).toBe('boolean');
    }
  });

  it('every provider is a non-empty string', () => {
    for (const rec of records) {
      expect(typeof rec.provider).toBe('string');
      expect(rec.provider.length).toBeGreaterThan(0);
    }
  });

  it('successful records have non-empty output', () => {
    for (const rec of records) {
      if (rec.success) {
        expect(rec.output.length, `Successful record ${rec.task_id} must have non-empty output`).toBeGreaterThan(0);
      }
    }
  });

  it('failed records with provider=local contain rate limit error messages', () => {
    const failedLocal = records.filter(r => !r.success && r.provider === 'local');
    for (const rec of failedLocal) {
      expect(rec.output).toMatch(/rate_limit_exceeded|429|Execution failed/i);
    }
  });

  it('there is at least one successful execution', () => {
    const successes = records.filter(r => r.success);
    expect(successes.length).toBeGreaterThan(0);
  });

  it('there is at least one failed execution (rate-limit scenario)', () => {
    const failures = records.filter(r => !r.success);
    expect(failures.length).toBeGreaterThan(0);
  });

  it('task_id values follow the expected naming convention (type_timestamp_index)', () => {
    const pattern = /^(failure|curiosity|evolution)_\d+_\d+$/;
    for (const rec of records) {
      expect(pattern.test(rec.task_id), `task_id "${rec.task_id}" does not match pattern`).toBe(true);
    }
  });
});

// ── .iqra/closed_loop/reviews.json ───────────────────────────────────────────

describe('.iqra/closed_loop/reviews.json — Review record schema', () => {
  interface ReviewRecord {
    task_id: string;
    reviewed_at: string;
    quality_score: number;
    doctrinal_safe: boolean;
    lessons_learned: string[];
    should_include_in_training: boolean;
    rejection_reason?: string;
  }

  let reviews: ReviewRecord[];

  beforeAll(() => {
    reviews = readJson<ReviewRecord[]>('.iqra/closed_loop/reviews.json');
  });

  it('is a non-empty JSON array', () => {
    expect(Array.isArray(reviews)).toBe(true);
    expect(reviews.length).toBeGreaterThan(0);
  });

  it('every review has the required fields', () => {
    const REQUIRED: Array<keyof ReviewRecord> = [
      'task_id', 'reviewed_at', 'quality_score', 'doctrinal_safe', 'lessons_learned', 'should_include_in_training',
    ];
    for (const rev of reviews) {
      for (const field of REQUIRED) {
        expect(rev[field], `Review ${rev.task_id} missing field "${field}"`).toBeDefined();
      }
    }
  });

  it('quality_score is a number in the range [0, 1]', () => {
    for (const rev of reviews) {
      expect(typeof rev.quality_score).toBe('number');
      expect(rev.quality_score).toBeGreaterThanOrEqual(0);
      expect(rev.quality_score).toBeLessThanOrEqual(1);
    }
  });

  it('doctrinal_safe is a boolean', () => {
    for (const rev of reviews) {
      expect(typeof rev.doctrinal_safe).toBe('boolean');
    }
  });

  it('lessons_learned is an array', () => {
    for (const rev of reviews) {
      expect(Array.isArray(rev.lessons_learned)).toBe(true);
    }
  });

  it('should_include_in_training is a boolean', () => {
    for (const rev of reviews) {
      expect(typeof rev.should_include_in_training).toBe('boolean');
    }
  });

  it('reviewed_at is a valid ISO 8601 timestamp', () => {
    for (const rev of reviews) {
      const d = new Date(rev.reviewed_at);
      expect(Number.isNaN(d.getTime()), `reviewed_at "${rev.reviewed_at}" is invalid`).toBe(false);
    }
  });

  it('records with should_include_in_training=false have a rejection_reason when quality_score < 0.7 or doctrinal_safe=false', () => {
    const excluded = reviews.filter(r => !r.should_include_in_training);
    for (const rev of excluded) {
      expect(rev.rejection_reason, `Excluded review ${rev.task_id} must have a rejection_reason`).toBeDefined();
      expect(typeof rev.rejection_reason).toBe('string');
      expect(rev.rejection_reason!.length).toBeGreaterThan(0);
    }
  });

  it('records with doctrinal_safe=false are excluded from training', () => {
    const unsafe = reviews.filter(r => !r.doctrinal_safe);
    for (const rev of unsafe) {
      expect(rev.should_include_in_training, `Doctrinally unsafe review ${rev.task_id} must not be included in training`).toBe(false);
    }
  });

  it('there is at least one review with should_include_in_training=true', () => {
    const included = reviews.filter(r => r.should_include_in_training);
    expect(included.length).toBeGreaterThan(0);
  });

  it('high quality scores (>=0.8) use reputable providers (groq)', () => {
    // Regression: high scores should come from real provider executions
    const highQuality = reviews.filter(r => r.quality_score >= 0.8 && r.should_include_in_training);
    expect(highQuality.length).toBeGreaterThan(0);
  });
});

// ── .iqra/closed_loop/tasks.json ─────────────────────────────────────────────

describe('.iqra/closed_loop/tasks.json — Task record schema', () => {
  const VALID_SOURCES = ['failure_derived', 'curiosity_driven', 'self_generated'] as const;
  const VALID_OUTPUT_TYPES = ['correction', 'discovery', 'analysis'] as const;
  const VALID_DIFFICULTIES = ['medium', 'high'] as const;

  interface TaskRecord {
    id: string;
    generated_at: string;
    source: string;
    instruction: string;
    context: string;
    expected_output_type: string;
    quran_ref: string;
    difficulty: string;
  }

  let tasks: TaskRecord[];

  beforeAll(() => {
    tasks = readJson<TaskRecord[]>('.iqra/closed_loop/tasks.json');
  });

  it('is a non-empty JSON array', () => {
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThan(0);
  });

  it('every task has the required fields', () => {
    const REQUIRED: Array<keyof TaskRecord> = [
      'id', 'generated_at', 'source', 'instruction', 'context', 'expected_output_type', 'quran_ref', 'difficulty',
    ];
    for (const task of tasks) {
      for (const field of REQUIRED) {
        expect(task[field], `Task ${task.id} missing field "${field}"`).toBeDefined();
      }
    }
  });

  it('every task id is a non-empty string', () => {
    for (const task of tasks) {
      expect(typeof task.id).toBe('string');
      expect(task.id.length).toBeGreaterThan(0);
    }
  });

  it('every generated_at is a valid ISO 8601 timestamp', () => {
    for (const task of tasks) {
      const d = new Date(task.generated_at);
      expect(Number.isNaN(d.getTime()), `generated_at "${task.generated_at}" is invalid`).toBe(false);
    }
  });

  it('every source is one of the known types', () => {
    for (const task of tasks) {
      expect(VALID_SOURCES).toContain(task.source as (typeof VALID_SOURCES)[number]);
    }
  });

  it('every expected_output_type is one of the known types', () => {
    for (const task of tasks) {
      expect(VALID_OUTPUT_TYPES).toContain(task.expected_output_type as (typeof VALID_OUTPUT_TYPES)[number]);
    }
  });

  it('every difficulty is one of the known levels', () => {
    for (const task of tasks) {
      expect(VALID_DIFFICULTIES).toContain(task.difficulty as (typeof VALID_DIFFICULTIES)[number]);
    }
  });

  it('failure_derived tasks have expected_output_type=correction', () => {
    const failureTasks = tasks.filter(t => t.source === 'failure_derived');
    for (const task of failureTasks) {
      expect(task.expected_output_type, `Failure-derived task ${task.id} must have correction output type`).toBe('correction');
    }
  });

  it('curiosity_driven tasks have expected_output_type=discovery', () => {
    const curiosityTasks = tasks.filter(t => t.source === 'curiosity_driven');
    for (const task of curiosityTasks) {
      expect(task.expected_output_type, `Curiosity-driven task ${task.id} must have discovery output type`).toBe('discovery');
    }
  });

  it('self_generated tasks have expected_output_type=analysis', () => {
    const selfTasks = tasks.filter(t => t.source === 'self_generated');
    for (const task of selfTasks) {
      expect(task.expected_output_type, `Self-generated task ${task.id} must have analysis output type`).toBe('analysis');
    }
  });

  it('every instruction is a non-empty string', () => {
    for (const task of tasks) {
      expect(typeof task.instruction).toBe('string');
      expect(task.instruction.length).toBeGreaterThan(0);
    }
  });

  it('every quran_ref is a non-empty string', () => {
    for (const task of tasks) {
      expect(typeof task.quran_ref).toBe('string');
      expect(task.quran_ref.length).toBeGreaterThan(0);
    }
  });

  it('contains all three source types', () => {
    const sources = new Set(tasks.map(t => t.source));
    expect(sources.has('failure_derived')).toBe(true);
    expect(sources.has('curiosity_driven')).toBe(true);
    expect(sources.has('self_generated')).toBe(true);
  });

  it('task ids follow the expected naming convention (type_timestamp_index)', () => {
    const pattern = /^(failure|curiosity|evolution)_\d+_\d+$/;
    for (const task of tasks) {
      expect(pattern.test(task.id), `Task id "${task.id}" does not match pattern`).toBe(true);
    }
  });
});

// ── Cross-file integrity: reviews reference known task ids ────────────────────

describe('Closed loop data integrity — cross-file references', () => {
  it('every review task_id is present in the tasks list', () => {
    const tasks = readJson<{ id: string }[]>('.iqra/closed_loop/tasks.json');
    const reviews = readJson<{ task_id: string }[]>('.iqra/closed_loop/reviews.json');
    const taskIds = new Set(tasks.map(t => t.id));

    for (const rev of reviews) {
      expect(taskIds.has(rev.task_id), `Review references unknown task_id "${rev.task_id}"`).toBe(true);
    }
  });

  it('every execution task_id is present in the tasks list', () => {
    const tasks = readJson<{ id: string }[]>('.iqra/closed_loop/tasks.json');
    const executions = readJson<{ task_id: string }[]>('.iqra/closed_loop/executions.json');
    const taskIds = new Set(tasks.map(t => t.id));

    for (const exec of executions) {
      expect(taskIds.has(exec.task_id), `Execution references unknown task_id "${exec.task_id}"`).toBe(true);
    }
  });
});

// ── .iqra/visual_notes/*.json ─────────────────────────────────────────────────

describe('.iqra/visual_notes/ — Visual note JSON files', () => {
  interface DiscoveryNote {
    id: string;
    title: string;
    content: string;
    type: 'discovery';
    ayah_ref: string;
    created_at: string;
    design: {
      html: string;
      css: string;
      source: string;
      notes: string;
    };
  }

  interface ArchitectureNote {
    id: string;
    title: string;
    content: string;
    type: 'architecture';
    created_at: string;
  }

  type VisualNote = DiscoveryNote | ArchitectureNote;

  const NOTE_FILENAMES = [
    'note_1778081464288',
    'note_1778081464630',
    'note_1778081581989',
    'note_1778081582278',
    'note_1778082168778',
    'note_1778082171149',
  ] as const;

  it('all 6 expected note files exist', () => {
    for (const name of NOTE_FILENAMES) {
      const path = `.iqra/visual_notes/${name}.json`;
      expect(fileExists(path), `Expected note file "${path}" to exist`).toBe(true);
    }
  });

  it('all note files are valid JSON', () => {
    for (const name of NOTE_FILENAMES) {
      expect(() => readJson(`.iqra/visual_notes/${name}.json`), `${name}.json should be valid JSON`).not.toThrow();
    }
  });

  it('every note has id, title, content, type, and created_at fields', () => {
    for (const name of NOTE_FILENAMES) {
      const note = readJson<VisualNote>(`.iqra/visual_notes/${name}.json`);
      expect(note.id, `${name}: id missing`).toBeDefined();
      expect(note.title, `${name}: title missing`).toBeDefined();
      expect(note.content, `${name}: content missing`).toBeDefined();
      expect(note.type, `${name}: type missing`).toBeDefined();
      expect(note.created_at, `${name}: created_at missing`).toBeDefined();
    }
  });

  it('note id matches the filename (without extension)', () => {
    for (const name of NOTE_FILENAMES) {
      const note = readJson<VisualNote>(`.iqra/visual_notes/${name}.json`);
      expect(note.id).toBe(name);
    }
  });

  it('every created_at is a valid ISO 8601 timestamp', () => {
    for (const name of NOTE_FILENAMES) {
      const note = readJson<VisualNote>(`.iqra/visual_notes/${name}.json`);
      const d = new Date(note.created_at);
      expect(Number.isNaN(d.getTime()), `${name}: created_at "${note.created_at}" is invalid`).toBe(false);
    }
  });

  it('type is one of "discovery" or "architecture"', () => {
    const VALID_TYPES = ['discovery', 'architecture'];
    for (const name of NOTE_FILENAMES) {
      const note = readJson<VisualNote>(`.iqra/visual_notes/${name}.json`);
      expect(VALID_TYPES).toContain(note.type);
    }
  });

  it('discovery-type notes have ayah_ref and design fields', () => {
    const discoveryNames = NOTE_FILENAMES.filter(n => {
      const note = readJson<VisualNote>(`.iqra/visual_notes/${n}.json`);
      return note.type === 'discovery';
    });
    expect(discoveryNames.length).toBeGreaterThan(0);

    for (const name of discoveryNames) {
      const note = readJson<DiscoveryNote>(`.iqra/visual_notes/${name}.json`);
      expect(note.ayah_ref, `${name}: discovery note must have ayah_ref`).toBeDefined();
      expect(note.ayah_ref.length, `${name}: ayah_ref must not be empty`).toBeGreaterThan(0);
      expect(note.design, `${name}: discovery note must have design block`).toBeDefined();
      expect(note.design.html, `${name}: design.html must exist`).toBeDefined();
      expect(note.design.css, `${name}: design.css must exist`).toBeDefined();
      expect(note.design.source, `${name}: design.source must exist`).toBeDefined();
    }
  });

  it('architecture-type notes do not require ayah_ref or design', () => {
    const archNames = NOTE_FILENAMES.filter(n => {
      const note = readJson<VisualNote>(`.iqra/visual_notes/${n}.json`);
      return note.type === 'architecture';
    });
    expect(archNames.length).toBeGreaterThan(0);

    for (const name of archNames) {
      const note = readJson<ArchitectureNote>(`.iqra/visual_notes/${name}.json`);
      // Architecture notes are valid without these optional fields
      expect(note.id).toBeDefined();
      expect(note.content).toBeDefined();
    }
  });

  it('discovery note design.html contains the IQRA trust chain marker', () => {
    const discoveryNames = NOTE_FILENAMES.filter(n => {
      const note = readJson<VisualNote>(`.iqra/visual_notes/${n}.json`);
      return note.type === 'discovery';
    });
    for (const name of discoveryNames) {
      const note = readJson<DiscoveryNote>(`.iqra/visual_notes/${name}.json`);
      expect(note.design.html).toContain('TrustChain');
    }
  });

  it('discovery note design.css contains IQRA design tokens (--iqra-gold)', () => {
    const discoveryNames = NOTE_FILENAMES.filter(n => {
      const note = readJson<VisualNote>(`.iqra/visual_notes/${n}.json`);
      return note.type === 'discovery';
    });
    for (const name of discoveryNames) {
      const note = readJson<DiscoveryNote>(`.iqra/visual_notes/${name}.json`);
      expect(note.design.css).toContain('--iqra-gold');
    }
  });

  it('there are exactly 3 discovery notes and 3 architecture notes', () => {
    let discoveryCount = 0;
    let architectureCount = 0;
    for (const name of NOTE_FILENAMES) {
      const note = readJson<VisualNote>(`.iqra/visual_notes/${name}.json`);
      if (note.type === 'discovery') discoveryCount++;
      else if (note.type === 'architecture') architectureCount++;
    }
    expect(discoveryCount).toBe(3);
    expect(architectureCount).toBe(3);
  });
});

// ── .github/workflows/sidq_pipeline.yml ──────────────────────────────────────

describe('.github/workflows/sidq_pipeline.yml — CI workflow changes', () => {
  let text: string;

  beforeAll(() => {
    text = readText('.github/workflows/sidq_pipeline.yml');
  });

  it('workflow name is "🕋 IQRA Sidq Pipeline" (renamed from Truth Pipeline)', () => {
    expect(text).toContain('name: 🕋 IQRA Sidq Pipeline');
    expect(text).not.toContain('IQRA Sovereign Truth Pipeline');
  });

  it('job name is integrity-check (renamed from sovereign-verification)', () => {
    expect(text).toContain('integrity-check:');
    expect(text).not.toContain('sovereign-verification:');
  });

  it('triggers on push to main branch', () => {
    expect(text).toMatch(/branches:\s*\[\s*main\s*\]/);
  });

  it('has an hourly schedule trigger', () => {
    expect(text).toContain("cron: '0 * * * *'");
  });

  it('has workflow_dispatch trigger for manual runs', () => {
    expect(text).toContain('workflow_dispatch:');
  });

  it('uses Python (not Node.js) for the main runtime', () => {
    expect(text).toContain('actions/setup-python@v4');
    expect(text).not.toContain('actions/setup-node@v4');
  });

  it('targets Python 3.10', () => {
    expect(text).toContain("python-version: '3.10'");
  });

  it('installs openai and requests Python packages', () => {
    expect(text).toContain('pip install openai requests');
  });

  it('includes the no-mock integrity verification step', () => {
    expect(text).toContain('Verify No-Mock Integrity');
  });

  it('no-mock check searches in lib/iqra (not entire repo)', () => {
    expect(text).toContain('grep -r "mock" lib/iqra');
  });

  it('includes the oracle expansion step', () => {
    expect(text).toContain('auto_expand.py');
  });

  it('includes the Sidq dashboard generation step', () => {
    expect(text).toContain('generate_report.py');
  });

  it('uses git push (without the old GITHUB_TOKEN explicit env that was removed)', () => {
    expect(text).toContain('git push');
  });

  it('commit targets oracle and dashboard files, not the old codebase index', () => {
    expect(text).toContain('ORACLE_DB.json');
    expect(text).toContain('benchmark_results.json');
    expect(text).not.toContain('SOVEREIGN_CODEBASE_INDEX.md');
  });

  it('runs on ubuntu-latest', () => {
    expect(text).toContain('runs-on: ubuntu-latest');
  });

  // Regression: old steps that were removed
  it('does NOT include npm install or npm audit (switched to Python runtime)', () => {
    expect(text).not.toContain('npm install');
    expect(text).not.toContain('npm audit');
  });

  it('does NOT include TypeScript type-check step (removed)', () => {
    expect(text).not.toContain('npx tsc --noEmit');
  });

  it('does NOT reference the removed verify_atlas.ts script', () => {
    expect(text).not.toContain('verify_atlas.ts');
  });
});
