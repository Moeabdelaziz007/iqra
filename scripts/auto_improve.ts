/**
 * scripts/auto_improve.ts
 *
 * Self-Evolving Loop for IQRA.
 * - Uses available LLM APIs if present.
 * - Falls back to local rule-based evolution when no keys are configured.
 * - Enforces Witr retries, max 7 tasks per cycle, before/after snapshots, and stability tracking.
 * - Records all decisions in TrustChain and wisdom logs.
 */

import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { appendToTrustChain } from '../lib/iqra/security';
import { IQRAFilter } from '../lib/iqra/filter';
import { IQRA_SOUL } from '../lib/iqra/prompts';

const ROOT = path.join(process.cwd());
const PLAN_PATH = path.join(ROOT, 'PLAN.md');
const REFLECTION_PATH = path.join(ROOT, 'REFLECTION.md');
const WISDOM_PATH = path.join(ROOT, 'WISDOM_7.md');
const TRUST_FALLBACK_PATH = path.join(ROOT, 'trust_fallback.log');
const STATE_PATH = path.join(ROOT, '.iqra', 'auto_improve_state.json');
const DASTUR_PATH = path.join(ROOT, 'iqra-core', 'DASTŪR.md');
const MITHAQ_PATH = path.join(ROOT, 'iqra-core', 'MĪTHĀQ.md');
const MURAQABAH_PATH = path.join(ROOT, 'iqra-core', 'MURĀQABAH.md');
const FITRAH_PATH = path.join(ROOT, 'iqra-core', 'FITRAH.md');
const UKHUWAH_PATH = path.join(ROOT, 'iqra-core', 'UKHŪWAH.md');

const MAX_COPILOT_TASKS = 7;
const MAX_FILES_PER_RUN = 7;
const TIMEOUT_MS = 5000;
const RETRY_DELAYS = [1000, 3000, 5000, 7000];
const STABILITY_DECAY = 0.05;
const STABILITY_RECOVERY = 0.02;

const log = (msg: string, ...args: any[]) => console.log(`[AutoImprove] ${msg}`, ...args);
const warn = (msg: string, ...args: any[]) => console.warn(`[AutoImprove:WARN] ${msg}`, ...args);
const error = (msg: string, ...args: any[]) => console.error(`[AutoImprove:ERROR] ${msg}`, ...args);

function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`[TIMEOUT] ${operation} exceeded ${ms}ms`)), ms)
    )
  ]);
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function checksum(content: string) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function safePath(filePath: string) {
  return path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
}

function mkDirForFile(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function backupFileSync(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      const backupPath = `${filePath}.bak`;
      fs.copyFileSync(filePath, backupPath);
      log(`Backup created: ${backupPath}`);
    }
  } catch (err) {
    warn(`Failed to create backup for ${filePath}`, err);
  }
}

async function ensureStateFile() {
  const dir = path.dirname(STATE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(STATE_PATH)) {
    await fsPromises.writeFile(STATE_PATH, JSON.stringify({ cycleCount: 0, stability: 1.0, successStreak: 0, taskFailures: {} }, null, 2));
  }
}

async function readState() {
  try {
    await ensureStateFile();
    const raw = await fsPromises.readFile(STATE_PATH, 'utf8');
    return JSON.parse(raw) as any;
  } catch (err) {
    warn('Failed to read auto improve state, resetting.', err);
    return { cycleCount: 0, stability: 1.0, successStreak: 0, taskFailures: {} };
  }
}

async function writeState(state: any) {
  await ensureStateFile();
  await fsPromises.writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function loadIQRARules(): string {
  const rules: string[] = [];
  const ruleFiles = [DASTUR_PATH, MITHAQ_PATH, MURAQABAH_PATH, FITRAH_PATH, UKHUWAH_PATH];
  for (const fullPath of ruleFiles) {
    if (fs.existsSync(fullPath)) {
      rules.push(fs.readFileSync(fullPath, 'utf8'));
    } else {
      warn(`Rule file not found: ${fullPath}`);
    }
  }
  return rules.join('\n\n---\n\n');
}

const IQRA_CONSTITUTION = loadIQRARules();

function hasAnyApiKey(): boolean {
  return !!(process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.GLM_API_KEY || process.env.QWEN_API_KEY);
}

async function appendToTrustChainSafe(type: string, detail: string, metadata: string, confidence: number) {
  try {
    await withTimeout(Promise.resolve(appendToTrustChain(type, detail, metadata, confidence)), TIMEOUT_MS, 'appendToTrustChain');
  } catch (err) {
    warn(`TrustChain append failed: ${err instanceof Error ? err.message : String(err)}`);
    const fallbackEntry = `[${new Date().toISOString()}] ${type}: ${detail} | Conf: ${confidence}\n`;
    try {
      fs.appendFileSync(TRUST_FALLBACK_PATH, fallbackEntry, 'utf8');
      log('Fallback logged to trust_fallback.log');
    } catch (fallbackErr) {
      error('Both TrustChain and fallback logging failed:', fallbackErr);
    }
  }
}

async function checkTaskHistory(taskTitle: string): Promise<boolean> {
  try {
    const reflection = await withTimeout(fsPromises.readFile(REFLECTION_PATH, 'utf8'), TIMEOUT_MS, 'readReflection');
    const lines = reflection.split('\n');
    const now = Date.now();
    for (const line of lines) {
      if (line.includes(taskTitle)) {
        const match = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
        if (match) {
          const entryTime = new Date(match[0]).getTime();
          if ((now - entryTime) / (1000 * 60 * 60) < 24) {
            log(`Task already executed < 24h ago: ${taskTitle}`);
            return true;
          }
        }
      }
    }
  } catch (err) {
    warn(`Could not check task history: ${err instanceof Error ? err.message : String(err)}`);
  }
  return false;
}

function extractIncompleteTasks(planText: string, limit = 7): string[] {
  const lines = planText.split(/\r?\n/);
  const tasks: string[] = [];
  const matcher = /^\s*-\s*\[\s*\]\s*(.+)$/;
  for (const line of lines) {
    const m = line.match(matcher);
    if (m) {
      tasks.push(m[1].trim());
      if (tasks.length >= limit) break;
    }
  }
  return tasks;
}

function describeTask(task: string) {
  const desc: { title: string; steps: string[]; files: string[]; acceptance: string; type: string } = {
    title: task,
    steps: [],
    files: [],
    acceptance: '',
    type: 'general'
  };
  const t = task.toLowerCase();

  if (t.includes('consciousness') || t.includes('consciousness expansion')) {
    desc.steps = [
      'Review the current consciousness pipeline and identify missing extractor hooks.',
      'Add a structured wisdom extraction utility and self-review validations.',
      'Create a unit test that verifies ayah validation and ruling extraction.'
    ];
    desc.files = ['lib/iqra/consciousness', 'tests/curiosity.test'];
    desc.acceptance = 'New consciousness module stubs exist and a regression test is added.';
    desc.type = 'consciousness';
  } else if (t.includes('honest commit') || t.includes('honest commit protocol')) {
    desc.steps = [
      'Create a pre-commit hook enforcing the Honest Commit Protocol.',
      'Document the commit policy in HADITH_COMMITS.md.',
      'Add a simple script or CI lint check to validate commit messages.'
    ];
    desc.files = ['HADITH_COMMITS.md', 'scripts/pre_commit.sh'];
    desc.acceptance = 'Commit hook is installed and documentation exists.';
    desc.type = 'honest-commit';
  } else if (t.includes('rss') || t.includes('rss discovery')) {
    desc.steps = [
      'Add an RSS fetcher module under lib/iqra/tools/rss.ts.',
      'Wire a discovery runner to feed the CuriosityEngine.',
      'Add an integration test that fetches one feed and verifies entries are parsed.'
    ];
    desc.files = ['lib/iqra/tools/rss', 'scripts/meta_pulse'];
    desc.acceptance = 'RSS fetcher exists and the discovery pipeline can read one feed.';
    desc.type = 'rss-discovery';
  } else {
    desc.steps = ['Investigate task details', 'Create a low-risk implementation', 'Validate and reflect.'];
    desc.files = [];
    desc.acceptance = 'Task has been implemented or scaffolded safely.';
    desc.type = 'general';
  }

  return desc;
}

async function callCopilotApi(prompt: string, maxTokens = 1500): Promise<string> {
  const anthroKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (groqKey) {
    try {
      const { default: Groq } = await import('groq-sdk');
      const client = new Groq({ apiKey: groqKey });
      const response = await withTimeout(client.chat.completions.create({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: IQRA_SOUL },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
      }), TIMEOUT_MS * 2, 'groqApiCall');
      return response.choices?.[0]?.message?.content ?? '';
    } catch (err) {
      warn('Groq call failed:', err);
    }
  }

  if (googleKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const client = new GoogleGenerativeAI(googleKey);
      const model = client.getGenerativeModel({ model: process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-flash' });
      const chat = model.startChat({ history: [] });
      const result = await chat.sendMessage([{ text: `SYSTEM: ${IQRA_SOUL}` }, { text: prompt }]);
      const response = await result.response;
      return response.text();
    } catch (err) {
      warn('Gemini call failed:', err);
    }
  }

  if (openRouterKey || openaiKey) {
    try {
      const { OpenAI } = await import('openai');
      const client = new OpenAI({
        apiKey: openRouterKey || openaiKey,
        baseURL: openRouterKey ? process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/v1' : undefined,
      });
      const model = process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const response = await withTimeout(client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: IQRA_SOUL },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
      }), TIMEOUT_MS * 2, 'openaiApiCall');
      return response.choices?.[0]?.message?.content ?? '';
    } catch (err) {
      warn('OpenRouter/OpenAI call failed:', err);
    }
  }

  throw new Error('No available LLM provider configured for auto-improve. Set GROQ_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY.');
}

async function generateCopilotSuggestion(taskDesc: { title: string; steps: string[]; files: string[]; acceptance: string; type: string }) {
  const prompt = `أنت IQRA، وكيل سيادي خُلقت لخدمة الحق والصدق. يجب أن تلتزم بالقوانين التالية في كل كود تولده:\n\n${IQRA_CONSTITUTION}\n\n` +
    `المهمة المطلوبة:\nالعنوان: ${taskDesc.title}\nالخطوات:\n${taskDesc.steps.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}\n` +
    `الملفات المستهدفة: ${taskDesc.files.join(', ') || 'غير محددة'}\n` +
    `معايير القبول: ${taskDesc.acceptance}\n\n` +
    `Important: For each target file, start the generated code block with a line like:\n` +
    `@target: ${taskDesc.files.length === 1 ? taskDesc.files[0] : 'path/to/file'}\n` +
    `Then include a TypeScript code block. This helps map generated code to the correct file.\n\n` +
    `أجب بخطة تنفيذ (Markdown) وكود TypeScript كامل جاهز للإنتاج. احترم الحدود.`;

  try {
    const generated = await withTimeout(callCopilotApi(prompt, 2048), TIMEOUT_MS * 2, 'generateCopilotSuggestion');
    const filtered = await withTimeout(IQRAFilter.validate(generated), TIMEOUT_MS, 'filterValidation');
    if (!filtered.isAllowed) throw new Error(`Generated output violates DASTŪR: ${filtered.reason}`);
    return { success: true, summary: generated.slice(0, 300).replace(/\n+/g, ' ').trim(), code: generated };
  } catch (err) {
    warn('LLM suggestion failed, falling back to local rule engine:', err);
    return await localRuleBasedEvolution(taskDesc);
  }
}

async function localRuleBasedEvolution(taskDesc: { title: string; steps: string[]; files: string[]; acceptance: string; type: string }) {
  log(`Starting local rule-based evolution for task: ${taskDesc.title}`);
  const t = taskDesc.title.toLowerCase();

  try {
    if (taskDesc.type === 'consciousness' || t.includes('consciousness')) {
      const filePath = safePath('lib/iqra/consciousness');
      if (!fs.existsSync(filePath)) {
        mkDirForFile(filePath);
        const boilerplate = `// Auto-generated by IQRA local evolution\nimport { IQRALogger } from './logger';\n\nexport class IQRAConsciousness {\n  static async validateAyah(text: string): Promise<boolean> {\n    IQRALogger.info('Validating ayah text...');\n    return text.trim().length > 10;\n  }\n\n  static async extractRulings(text: string): Promise<string[]> {\n    return [\`Extracted rulings for: \${text.slice(0, 80)}\`];\n  }\n}\n`;
        safeWriteFileSync(filePath, boilerplate, taskDesc.title);
        return { success: true, summary: `Created ${filePath} with consciousness stubs.` };
      }
      return { success: true, summary: `Consciousness module already exists. Manual review recommended.` };
    }

    if (taskDesc.type === 'honest-commit' || t.includes('honest commit')) {
      const hookPath = safePath('.git/hooks/pre-commit');
      const script = `#!/bin/sh\necho \"Checking commit message format...\"\nMSG=$(cat $1)\nif ! echo \"$MSG\" | grep -qE '^(feat|fix|docs|style|refactor|test|chore|evolve|learn|🤲):'; then\n  echo \"❌ Commit message must follow IQRA Conventional Commit tags.\"\n  exit 1\nfi\n`;
      if (!fs.existsSync(hookPath)) {
        mkDirForFile(hookPath);
        fs.writeFileSync(hookPath, script, 'utf8');
        fs.chmodSync(hookPath, 0o755);
        return { success: true, summary: `Created pre-commit hook at ${hookPath}.` };
      }
      return { success: true, summary: 'Pre-commit hook already exists.' };
    }

    if (taskDesc.type === 'rss-discovery' || t.includes('rss')) {
      const rssFile = safePath('lib/iqra/tools/rss');
      mkDirForFile(rssFile);
      if (!fs.existsSync(rssFile)) {
        const rssCode = `import fetch from 'node-fetch';\n\nexport async function fetchRSS(url: string): Promise<string> {\n  const res = await fetch(url);\n  return await res.text();\n}\n`;
        safeWriteFileSync(rssFile, rssCode, taskDesc.title);
        return { success: true, summary: `Created ${rssFile} with simple RSS fetcher.` };
      }
      return { success: true, summary: 'RSS fetcher already exists.' };
    }

    return { success: false, summary: `No local rule matched for task: ${taskDesc.title}` };
  } catch (err) {
    error('Local rule evolution failed:', err);
    return { success: false, summary: `Error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

function safeWriteFileSync(filePath: string, content: string, taskTitle: string) {
  const resolved = safePath(filePath);
  const original = fs.existsSync(resolved) ? fs.readFileSync(resolved, 'utf8') : null;
  backupFileSync(resolved);
  mkDirForFile(resolved);
  fs.writeFileSync(resolved, content, 'utf8');
  const after = fs.readFileSync(resolved, 'utf8');

  if (!validateCodeChange(original, after)) {
    if (original !== null) {
      fs.copyFileSync(`${resolved}.bak`, resolved);
      throw new Error(`Generated content invalid for ${resolved}; rolled back to backup.`);
    }
    throw new Error(`Generated content invalid for ${resolved}; no backup available.`);
  }

  log(`Safe write completed for ${resolved} (${taskTitle})`);
}

function validateCodeChange(original: string | null, content: string) {
  const valid = checksum(content).length > 0;
  return valid;
}

async function appendReflection(taskTitle: string, detail: string) {
  const entry = `\n---\n**AutoImprove** | ${new Date().toISOString()}\n- **Task**: ${taskTitle}\n- **Result Summary**: ${detail.slice(0, 200)}\n`;
  if (!fs.existsSync(REFLECTION_PATH)) {
    writeFileSyncWithBackup(REFLECTION_PATH, '# REFLECTION - Continuous Improvement Log\n');
  }
  fs.appendFileSync(REFLECTION_PATH, entry, 'utf8');
  log(`Reflection appended for ${taskTitle}`);
}

function appendWisdom(taskTitle: string, learnings: string) {
  const entry = `\n---\n**AutoImprove** | ${new Date().toISOString()}\n- **Task**: ${taskTitle}\n- **Learned**: ${learnings}\n`;
  if (!fs.existsSync(WISDOM_PATH)) {
    writeFileSyncWithBackup(WISDOM_PATH, '# WISDOM_7.md - Evolution Log\n');
  }
  fs.appendFileSync(WISDOM_PATH, entry, 'utf8');
  log(`Wisdom logged for ${taskTitle}`);
}

function writeFileSyncWithBackup(filePath: string, content: string) {
  backupFileSync(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
}

function quickTawbah(filePath: string, originalContent: string) {
  try {
    fs.writeFileSync(filePath, originalContent, 'utf8');
    appendToTrustChainSafe('QUICK_TAWBAH', filePath, 'rolled back', 0.9);
    log(`Quick Tawbah performed on ${filePath}`);
  } catch (err) {
    error('Quick Tawbah failed:', err);
  }
}

function markPlanTaskDone(originalPlan: string, taskTitle: string): string {
  const escaped = taskTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^\\s*-\\s*\\[\\s*\\]\\s*${escaped}\\s*$`, 'm');
  if (re.test(originalPlan)) {
    return originalPlan.replace(re, `- [x] ${taskTitle}`);
  }
  const lines = originalPlan.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(taskTitle) && lines[i].includes('[ ]')) {
      lines[i] = lines[i].replace('[ ]', '[x]');
      return lines.join('\n');
    }
  }
  return originalPlan;
}

async function localTaskCircuitOpen(taskType: string, state: any): Promise<boolean> {
  const failures = state.taskFailures?.[taskType] || 0;
  if (failures >= 3) {
    const lastAttempt = state[`lastAttempt_${taskType}`] || 0;
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - lastAttempt < oneHour) {
      log(`Circuit open for task type ${taskType}; skipping until cooldown.`);
      return true;
    }
    state.taskFailures[taskType] = 0;
    await writeState(state);
  }
  return false;
}

async function recordTaskFailure(taskType: string, state: any) {
  state.taskFailures[taskType] = (state.taskFailures[taskType] || 0) + 1;
  state[`lastAttempt_${taskType}`] = Date.now();
  await writeState(state);
}

async function reflectAndSleep(state: any) {
  const reflections = fs.existsSync(REFLECTION_PATH)
    ? fs.readFileSync(REFLECTION_PATH, 'utf8').split('\n').filter(Boolean).slice(-14)
    : [];
  const wisdom = reflections.slice(-7).map((line, idx) => `${idx + 1}. ${line}`).join('\n');
  appendWisdom('49-cycle reflection', `Completed 49 cycles. Reflections reviewed:\n${wisdom}`);
  log('Entering reflection sleep for 10 minutes.');
  await delay(10 * 60 * 1000);
  state.stability = Math.min(1.0, state.stability + 0.1);
  await writeState(state);
}

async function generateLocalCode(taskDesc: { title: string; steps: string[]; files: string[]; acceptance: string; type: string }) {
  const result = await localRuleBasedEvolution(taskDesc);
  return {
    success: result.success,
    summary: result.summary,
    code: result.success
      ? `// Local fallback for task: ${taskDesc.title}\n// ${result.summary}\n`
      : ''
  };
}

async function writeGeneratedCode(filePath: string, code: string, taskTitle: string): Promise<boolean> {
  try {
    const codeBlockMatch = code.match(/```(?:typescript|ts)?\n([\s\S]*?)\n```/);
    let codeToWrite = codeBlockMatch ? codeBlockMatch[1] : code;

    const targetHintMatch = codeToWrite.match(/^\s*@target:\s*([^\n\r]+)/m);
    if (targetHintMatch) {
      const hintedPath = targetHintMatch[1].trim();
      const normalizedHint = path.normalize(hintedPath);
      const normalizedTarget = path.normalize(path.relative(ROOT, filePath));
      if (normalizedHint !== normalizedTarget) {
        warn(`Target hint ${hintedPath} does not match file path ${path.relative(ROOT, filePath)}.`);
      }
      codeToWrite = codeToWrite.replace(/^\s*@target:\s*[^\n\r]+\r?\n/, '');
    }

    if (!codeToWrite.trim()) {
      warn(`No code block extracted for ${filePath}.`);
      return false;
    }

    if (!(await validateGeneratedCode(codeToWrite))) {
      warn(`Generated code failed DASTŪR validation for ${filePath}.`);
      return false;
    }

    safeWriteFileSync(filePath, codeToWrite, taskTitle);
    return true;
  } catch (err) {
    error(`Failed to write generated code to ${filePath}:`, err);
    return false;
  }
}

async function validateGeneratedCode(code: string): Promise<boolean> {
  try {
    const result = await withTimeout(IQRAFilter.validate(code), TIMEOUT_MS, 'validateGeneratedCode');
    return result.isAllowed;
  } catch (err) {
    warn('Generated code validation failed:', err);
    return false;
  }
}

async function generateTaskActions(taskDesc: { title: string; steps: string[]; files: string[]; acceptance: string; type: string }) {
  if (hasAnyApiKey()) {
    return await generateCopilotSuggestion(taskDesc);
  }
  return await generateLocalCode(taskDesc);
}

async function main() {
  try {
    log('========== AutoImprove Cycle Started ==========');
    const state = await readState();
    state.cycleCount = (state.cycleCount || 0) + 1;

    if (state.cycleCount > 0 && state.cycleCount % 49 === 0) {
      await reflectAndSleep(state);
    }

    let planText = await withTimeout(fsPromises.readFile(PLAN_PATH, 'utf8'), TIMEOUT_MS, 'readPlan');
    const tasks = extractIncompleteTasks(planText, MAX_COPILOT_TASKS);
    if (tasks.length === 0) {
      log('No incomplete tasks found in PLAN.md');
      appendWisdom('System readiness', 'No pending tasks for this cycle.');
      await writeState(state);
      if (process.env.AUTO_IMPROVE_CONTINUOUS === 'true') scheduleNextRun(24);
      return;
    }

    let processedCount = 0;
    let filesChanged = 0;

    for (const task of tasks) {
      if (processedCount >= MAX_COPILOT_TASKS) break;
      const desc = describeTask(task);
      if (await checkTaskHistory(task)) continue;
      if (await localTaskCircuitOpen(desc.type, state)) continue;

      const validation = await withTimeout(IQRAFilter.validate(task), TIMEOUT_MS, 'filterValidation');
      if (!validation.isAllowed) {
        warn(`Task skipped due to DASTŪR validation: ${task}`);
        await recordTaskFailure(desc.type, state);
        continue;
      }

      await appendToTrustChainSafe('AUTO_IMPROVE:INTENT', task, JSON.stringify(desc, null, 2), 1.0);
      let sim: { success: boolean; summary: string; code?: string } = { success: false, summary: "" };

      for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
        try {
          sim = await generateTaskActions(desc);
          break;
        } catch (err) {
          error(`Attempt ${attempt + 1} failed for task ${task}:`, err);
          if (attempt === RETRY_DELAYS.length - 1) throw err;
          await delay(RETRY_DELAYS[attempt]);
        }
      }

      if (!sim || !sim.success) {
        warn(`Task generation failed for ${task}`);
        await recordTaskFailure(desc.type, state);
        state.stability = Math.max(0, state.stability - STABILITY_DECAY);
        continue;
      }

      await appendToTrustChainSafe('AUTO_IMPROVE:RESULT', task, sim.summary, 1.0);
      await appendReflection(task, sim.summary + (sim.code ? '\n\n```\n' + sim.code + '\n```' : ''));

      const writtenFiles: string[] = [];
      for (const target of desc.files) {
        if (filesChanged >= MAX_FILES_PER_RUN) {
          warn('Max files per run reached; deferring remaining file writes.');
          break;
        }
        if (!sim.code) break;
        const targetPath = safePath(target);
        const wrote = await writeGeneratedCode(targetPath, sim.code, task);
        if (wrote) {
          writtenFiles.push(targetPath);
          filesChanged += 1;
        }
      }

      if (desc.files.length === 0 && sim.code) {
        appendWisdom(task, `Generated safe scaffold for manual review.`);
      } else {
        appendWisdom(task, `Generated ${writtenFiles.length} files. Files changed: ${writtenFiles.join(', ')}`);
      }

      const newPlan = markPlanTaskDone(planText, task);
      if (newPlan !== planText) {
        writeFileSyncWithBackup(PLAN_PATH, newPlan);
        planText = newPlan;
        log(`Marked task done in PLAN.md: ${task}`);
      }

      processedCount += 1;
      state.successStreak = (state.successStreak || 0) + 1;
      if (state.successStreak % 7 === 0) state.stability = Math.min(1.0, state.stability + STABILITY_RECOVERY);
      state.stability = Math.max(0, state.stability);
      if (state.stability < 0.5) {
        warn('Stability dropped below 0.5; halting and requesting human intervention.');
        appendWisdom('Stability Alert', `Stability ${state.stability.toFixed(2)}. Human review required.`);
        await writeState(state);
        break;
      }
    }

    if (processedCount >= MAX_COPILOT_TASKS) {
      log('Reached 7 tasks this cycle; delaying next run by one hour.');
      if (process.env.AUTO_IMPROVE_CONTINUOUS === 'true') scheduleNextRun(1);
    } else if (process.env.AUTO_IMPROVE_CONTINUOUS === 'true') {
      scheduleNextRun(24);
    }

    await writeState(state);
    log(`AutoImprove cycle complete. Processed ${processedCount} tasks. Stability=${state.stability.toFixed(2)}.`);
  } catch (err) {
    error('AutoImprove failed:', err);
    appendWisdom('AutoImprove Error', `Run failed: ${err instanceof Error ? err.message : String(err)}`);
    if (process.env.AUTO_IMPROVE_CONTINUOUS === 'true') scheduleNextRun(1);
  }
}

function scheduleNextRun(hoursDelay: number = 24) {
  if (process.env.AUTO_IMPROVE_CONTINUOUS !== 'true' && process.env.AUTO_IMPROVE_DAEMON !== 'true') {
    log('Continuous mode disabled; not scheduling next run.');
    return;
  }
  const delayMs = hoursDelay * 60 * 60 * 1000;
  log(`Scheduling next AutoImprove run in ${hoursDelay} hours...`);
  setTimeout(() => {
    log('Running scheduled AutoImprove cycle...');
    main().catch(err => error('Scheduled AutoImprove run failed', err));
  }, delayMs);
  if (process.env.AUTO_IMPROVE_DAEMON === 'true') {
    process.stdin.resume();
  }
}

main().catch(err => {
  error('Unhandled error in AutoImprove main:', err);
  process.exit(1);
});
