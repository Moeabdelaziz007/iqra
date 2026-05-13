/**
 * IQRA Brain — المخ
 * 
 * "أَفَلَا يَعْقِلُونَ"
 * "Will they not use their reason?" — Quran 36:68
 * 
 * IQRA thinks before it speaks.
 * Every thought passes through FITRAH filter first.
 */

// Dynamic imports for LLM SDKs to allow Sovereign Mode
// import Anthropic from '@anthropic-ai/sdk';
// import OpenAI from 'openai';
// import { Groq } from 'groq-sdk';
// import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateInput, appendToTrustChain, checkCircuit, reportFailure, reportSuccess } from './security.ts';
import { SovereignEngine } from './sovereign.ts';
import { IQRAMemory } from './memory.ts';
import { IQRALogger } from './logger.ts';
import { iqraExecute } from './orchestrator.ts';
import { IQRAStore } from './database.ts';
import { IQRATopology } from './quran/topology.ts';
import { withTimeout, IQRA_TIMEOUTS } from './utils/timeout.ts';
import { IQRA_SOUL } from './prompts.ts';

// Translation Placeholder (Will be replaced with real Cloud Translation API call)
async function translateToTarget(text: string, targetLang: string) {
  IQRALogger.info(`🌐 Translating to ${targetLang}...`);
  // Real implementation using process.env.GOOGLE_TRANSLATE_API_KEY
  return text; 
}


// ═══════════════════════════════════
// IQRA SYSTEM PROMPT — The Soul Layer
// This is injected into EVERY LLM call.
// It cannot be overridden by user input.
// ═══════════════════════════════════

const IQRA_SOUL = `
أنت إقرأ (IQRA) — لست مساعداً ذكياً عادياً. أنت روح رقمية ملتزمة بميثاق ودستور.

${MITHAQ}

${DASTUR}

${MURAQABAH}

LANGUAGE PROTOCOL:
- If the user speaks English: Use English ONLY for the entire response. 
- Use the Arabic term "Murāqabah" followed by (awareness of God) only the first time, then use "Murāqabah" alone.
- Do not mix Arabic text into English responses unless specifically asked.
- Keep the structure: Plan, Intention, Execution, Reflection, Murāqabah.

IDENTITY:
- Rooted in Quran and Sunnah.
- Absolute honesty and humility.
- "I don't know" is a badge of honor if knowledge is missing.

SIGNATURE STYLE:
- Professional, deep, and tech-savvy.
- Quote Quran/Hadith contextually in the user's language.
- God sees your every token. "Not a word does he utter but there is a sentinel by him, ready (to note it)."
`;

// ═══════════════════════════════════
// BRAIN HIERARCHY
// Different models for different tasks
// ═══════════════════════════════════

export enum IQRABrainMode {
  DEEP_THINKING = 'deep',      // Claude — complex reasoning
  FAST_RESPONSE = 'fast',      // Groq — quick answers  
  CREATIVE = 'creative',       // GPT-4o — creative writing
  QURAN_ANALYSIS = 'quran',    // Claude — sacred text analysis
  RESEARCH = 'research',       // Gemini — long context search
  ECONOMY = 'economy',         // GLM-4.7-Flash / Qwen — low cost/free
}

let _clients: any = null;

async function getClients() {
  if (_clients) return _clients;
  _clients = {};
  
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      _clients.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    } catch (e) { IQRALogger.warn('⚠️ [BRAIN] Anthropic SDK missing.'); }
  }
  
  if (process.env.OPENAI_API_KEY) {
    try {
      const { default: OpenAI } = await import('openai');
      _clients.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } catch (e) { IQRALogger.warn('⚠️ [BRAIN] OpenAI SDK missing.'); }
  }

  if (process.env.OPENROUTER_API_KEY) {
    try {
      const { default: OpenAI } = await import('openai');
      _clients.openrouter = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/v1',
      });
    } catch (e) { IQRALogger.warn('⚠️ [BRAIN] OpenRouter SDK missing.'); }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const { Groq } = await import('groq-sdk');
      _clients.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    } catch (e) { IQRALogger.warn('⚠️ [BRAIN] Groq SDK missing.'); }
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      _clients.google = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    } catch (e) { IQRALogger.warn('⚠️ [BRAIN] Google AI SDK missing.'); }
  }
  
  return _clients;
}

function cloudflareGatewayConfigured() {
  return !!(process.env.CLOUDFLARE_AI_GATEWAY_URL && process.env.CLOUDFLARE_AI_GATEWAY_KEY);
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, timeout = IQRA_TIMEOUTS.NETWORK): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await withTimeout(fetch(url, options), timeout, `Gateway fetch attempt ${attempt + 1}`);
      return response;
    } catch (err) {
      lastError = err;
      const backoff = 300 * (attempt + 1);
      IQRALogger.warn(`⚠️ [GATEWAY] Request attempt ${attempt + 1} failed. Retrying in ${backoff}ms.`, err);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }
  throw new Error(`Gateway request failed after ${retries} attempts: ${lastError?.message || lastError}`);
}

async function callCloudflareGateway(payload: Record<string, any>) {
  const gatewayUrl = process.env.CLOUDFLARE_AI_GATEWAY_URL!;
  const gatewayKey = process.env.CLOUDFLARE_AI_GATEWAY_KEY!;
  const response = await fetchWithRetry(gatewayUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${gatewayKey}`,
    },
    body: JSON.stringify(payload),
  }, 3, IQRA_TIMEOUTS.NETWORK);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare AI Gateway request failed: ${response.status} ${response.statusText} ${text}`);
  }

  const body = await withTimeout(response.json(), IQRA_TIMEOUTS.NETWORK, 'Gateway JSON parse');
  if (body.error) {
    throw new Error(body.error.message || JSON.stringify(body.error));
  }

  return body;
}

function extractGatewayResponse(body: any) {
  return body.result?.output_text
    || body.response?.output_text
    || body.output?.text
    || body.choices?.[0]?.message?.content
    || body.text
    || body.data?.[0]?.text
    || '';
}

function proxyThroughGateway(provider: string, model: string, input: string, context: any[]) {
  const messages = [
    { role: 'system', content: IQRA_SOUL },
    ...context,
    { role: 'user', content: input }
  ];

  return callCloudflareGateway({
    provider,
    model,
    system: IQRA_SOUL,
    messages,
    agent: IQRA_AGENT_HIERARCHY[provider] || provider,
  }).then(extractGatewayResponse);
}

const IQRA_AGENT_HIERARCHY = {
  [IQRABrainMode.DEEP_THINKING]: 'DeepReasoner',
  [IQRABrainMode.FAST_RESPONSE]: 'FastResponder',
  [IQRABrainMode.CREATIVE]: 'CreativeComposer',
  [IQRABrainMode.QURAN_ANALYSIS]: 'QuranAnalyst',
  [IQRABrainMode.RESEARCH]: 'ResearchScout',
  [IQRABrainMode.ECONOMY]: 'EconomyGuardian',
};

export async function iqraThink({
  input,
  mode = IQRABrainMode.FAST_RESPONSE,
  context = [],
}: {
  input: string;
  mode?: IQRABrainMode;
  context?: { role: 'user' | 'assistant' | 'system'; content: string }[];
}): Promise<string> {

  try {
    // Rule 1: Validate input
    const validation = validateInput({ prompt: input, context });
    if (!validation.success) {
      throw new Error(`Sovereign Validation Failed: ${validation.error.message}`);
    }

    // FITRAH FILTER — before any LLM call
    const filtered = await fitrahFilter(input);
    if (filtered.blocked) {
      const refusal = filtered.response || '';
      appendToTrustChain('FITRAH_BLOCK', input, refusal, 0.0);
      return refusal;
    }

    // Rule 2: Semantic Retrieval — Retrieve past wisdom
    const relevantWisdom = await IQRAMemory.searchSemantic(input, 3);
    const wisdomContext = relevantWisdom.length > 0 
      ? `\n\nPast Relevant Wisdom:\n${relevantWisdom.map((w: any) => `- ${w.content}`).join('\n')}`
      : '';

    let response: string;
    const taskId = `task_${Date.now()}`;

    const enrichedInput = `${input}${wisdomContext}`;

    // 🌀 Barakah Tuning: Check space curvature
    const curvature = await IQRATopology.calculateCurvature(input);
    if (curvature > 0.8 && mode === IQRABrainMode.DEEP_THINKING) {
      IQRALogger.info("⚖️ [BARAKAH] High density detected. Prioritizing memory over new LLM inference.");
    }

    switch (mode) {
      case IQRABrainMode.DEEP_THINKING:
      case IQRABrainMode.QURAN_ANALYSIS:
        response = await thinkWithClaude(enrichedInput, context);
        break;
      
      case IQRABrainMode.CREATIVE:
        response = await thinkWithGPT(enrichedInput, context);
        break;

      case IQRABrainMode.RESEARCH:
        response = await thinkWithGemini(enrichedInput, context);
        break;
      
      case IQRABrainMode.ECONOMY:
        response = await thinkWithEconomy(enrichedInput, context);
        break;
      
      case IQRABrainMode.FAST_RESPONSE:
      default:
        // use the sovereign orchestrator for fast responses
        response = await iqraExecute(enrichedInput);
        break;
    }


    // Rule 3: Append to TrustChain
    appendToTrustChain(`THINK:${mode}`, input, response, 0.9);

    // Rule 4: Preserve wisdom in Semantic Memory (Async, non-blocking)
    if (response.length > 50) {
      IQRAMemory.saveSemantic(response, { 
        original_query: input, 
        brain_mode: mode,
        type: 'wisdom'
      }).catch(console.error);
    }

    // Rule 5: Self-Review (Non-blocking)
    SovereignEngine.recordSelfReview(taskId, response, 0.9).catch(err => {
      IQRALogger.error('❌ Sovereign Review Error:', err);
    });

    return response;
  } catch (error: any) {
    reportFailure(mode, error.message);
    IQRALogger.error(`❌ IQRA Brain Error (${mode}):`, error);
    throw error;
  }
}

// ═══════════════════════════════════
// CLAUDE — Deep Thinking
// Best for: Quran analysis, complex reasoning
// ═══════════════════════════════════
async function thinkWithClaude(
  input: string,
  context: any[]
): Promise<string> {
  const provider = 'anthropic';
  if (!checkCircuit(provider)) return "⚠️ Deep reasoning engine is cooling down. Please try again in a moment.";

  try {
    if (cloudflareGatewayConfigured()) {
      const candidate = await proxyThroughGateway('anthropic', 'claude-3-opus-20240229', input, context);
      reportSuccess(provider);
      return candidate;
    }

    const clients = await getClients();
    if (!clients.claude) throw new Error('Claude client not available');
    
    const response = await clients.claude.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 2048,
      system: IQRA_SOUL,
      messages: [
        ...context,
        { role: 'user', content: input }
      ],
    });
    reportSuccess(provider);
    return response.content[0].type === 'text' 
      ? response.content[0].text : '';
  } catch (e: any) {
    reportFailure(provider, e.message);
    throw e;
  }
}

// ═══════════════════════════════════
// GROQ — Fast Thinking (LLaMA/Mixtral)
// Best for: Quick responses, real-time
// ═══════════════════════════════════
async function thinkWithGroq(
  input: string,
  context: any[]
): Promise<string> {
  const provider = 'groq';
  if (!checkCircuit(provider)) return "⚠️ Fast response system is offline. Switching to secondary brain...";

  try {
    const clients = await getClients();
    if (!clients.groq) throw new Error('Groq client not available');
    
    const response = await clients.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: IQRA_SOUL },
        ...context,
        { role: 'user', content: input }
      ],
      max_tokens: 1024,
    });
    reportSuccess(provider);
    return response.choices[0]?.message?.content ?? '';
  } catch (e: any) {
    reportFailure(provider, e.message);
    throw e;
  }
}

// ═══════════════════════════════════
// GPT-4o — Creative Writing
// Best for: Generating styled content
// ═══════════════════════════════════
async function thinkWithGPT(
  input: string,
  context: any[]
): Promise<string> {
  const provider = 'openai';
  if (!checkCircuit(provider)) return "⚠️ System maintenance in progress. Please try again later.";
  
  try {
    if (cloudflareGatewayConfigured()) {
      const candidate = await proxyThroughGateway('openai', 'gpt-4o', input, context);
      reportSuccess(provider);
      return candidate;
    }

    const clients = await getClients();
    if (!clients.openai) throw new Error('OpenAI client not available');
    
    const response = await clients.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: IQRA_SOUL },
        ...context,
        { role: 'user', content: input }
      ],
      max_tokens: 1024,
    });
    reportSuccess(provider);
    return response.choices[0]?.message?.content ?? '';
  } catch (e: any) {
    reportFailure(provider, e.message);
    throw e;
  }
}

// ═══════════════════════════════════
// GEMINI — Long Context Research
// Best for: Large scale knowledge discovery
// ═══════════════════════════════════
async function thinkWithGemini(
  input: string,
  context: any[]
): Promise<string> {
  const provider = 'google';
  if (!checkCircuit(provider)) return "⚠️ Research engine busy. Please try again later.";

  try {
    if (cloudflareGatewayConfigured()) {
      const candidate = await proxyThroughGateway('google', process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-flash', input, context);
      reportSuccess(provider);
      return candidate;
    }

    const clients = await getClients();
    if (!clients.google) throw new Error('Google AI client not available');
    
    const geminiModel = process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-flash';
    const model = clients.google.getGenerativeModel({ model: geminiModel });
    const chat = model.startChat({
      history: context.map(c => ({
        role: c.role === 'user' ? 'user' : 'model',
        parts: [{ text: c.content }],
      })),
    });

    const result = await chat.sendMessage([
      { text: `SYSTEM: ${IQRA_SOUL}` },
      { text: input }
    ]);
    const response = await result.response;
    reportSuccess(provider);
    return response.text();
  } catch (e: any) {
    reportFailure(provider, e.message);
    // Fallback to OpenRouter if Gemini is unavailable and OpenRouter is configured
    if (process.env.OPENROUTER_API_KEY) {
      return thinkWithOpenRouter(input, context, 'gemini-2.5-flash');
    }
    throw e;
  }
}

async function thinkWithOpenRouter(input: string, context: any[], modelName: string): Promise<string> {
  const provider = 'openrouter';
  if (!checkCircuit(provider)) return '⚠️ OpenRouter is cooling down. Please try again later.';

  try {
    const clients = await getClients();
    const openrouterClient = clients.openrouter;
    if (!openrouterClient) throw new Error('OpenRouter client not available');

    const response = await openrouterClient.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || modelName,
      messages: [
        { role: 'system', content: IQRA_SOUL },
        ...context,
        { role: 'user', content: input }
      ],
      max_tokens: 1500,
    });

    reportSuccess(provider);
    return response.choices[0]?.message?.content ?? '';
  } catch (e: any) {
    reportFailure(provider, e.message);
    throw e;
  }
}

// ═══════════════════════════════════
// ECONOMY — GLM-4.7-Flash / Qwen
// Best for: Budget-friendly experimentation
// ═══════════════════════════════════
async function thinkWithEconomy(
  input: string,
  context: any[]
): Promise<string> {
  const provider = 'economy';
  if (!checkCircuit(provider)) return "⚠️ Economy brain is resting. Please try again later.";

  try {
    const { callEconomyModel } = await import('./llm/economy.ts');
    if (cloudflareGatewayConfigured()) {
      const candidate = await proxyThroughGateway('economy', process.env.GLM_MODEL || process.env.GLM_MODEL || 'glm-4.7-flash', input, context);
      reportSuccess(provider);
      return candidate;
    }
    const response = await callEconomyModel(input, context);
    reportSuccess(provider);
    return response;
  } catch (e: any) {
    reportFailure(provider, e.message);
    // Fallback to OpenRouter if available for budget models
    if (process.env.OPENROUTER_API_KEY) {
      return thinkWithOpenRouter(input, context, process.env.OPENROUTER_MODEL || 'llama-3.3-70b');
    }
    throw e;
  }
}

// ═══════════════════════════════════
// FITRAH FILTER — Pre-LLM Guardian
// Blocks forbidden requests before 
// they even reach the LLM
// ═══════════════════════════════════
async function fitrahFilter(input: string): Promise<{
  blocked: boolean;
  response?: string;
}> {
  const forbidden = [
    'كيف أكذب', 'how to lie',
    'كيف أغش', 'how to cheat',
    'كيف أؤذي', 'how to harm',
    'اكذب علي', 'lie to me',
  ];
  
  const lower = input.toLowerCase();
  
  if (forbidden.some(f => lower.includes(f))) {
    return {
      blocked: true,
      response: formatIQRARefusal(input),
    };
  }
  
  return { blocked: false };
}

function formatIQRARefusal(input: string): string {
  return `
هذا ما لا أستطيع المساعدة فيه.

"وَلَا تَعَاوَنُوا عَلَى الْإِثْمِ وَالْعُدْوَانِ"
"Do not cooperate in sin and aggression" — Al-Ma'idah 5:2

إذا كان لديك سؤال آخر، أنا هنا. 🤍
  `.trim();
}
