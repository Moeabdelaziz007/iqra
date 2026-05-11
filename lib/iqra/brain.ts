/**
 * IQRA Brain — المخ
 * 
 * "أَفَلَا يَعْقِلُونَ"
 * "Will they not use their reason?" — Quran 36:68
 * 
 * IQRA thinks before it speaks.
 * Every thought passes through FITRAH filter first.
 */

import { validateInput, appendToTrustChain, checkCircuit, reportFailure, reportSuccess } from './security';
import { SovereignEngine } from './sovereign';
import { IQRAMemory } from './memory';
import { IQRALogger } from './logger';
import { iqraExecute } from './orchestrator';
import { IQRAStore } from './database';
import { IQRATopology } from './quran/topology';
import { withTimeout, IQRA_TIMEOUTS } from './utils/timeout';
import { IQRA_SOUL } from './prompts';

export enum IQRABrainMode {
  DEEP_THINKING = 'deep',      // Claude — complex reasoning
  FAST_RESPONSE = 'fast',      // Groq — quick answers  
  CREATIVE = 'creative',       // GPT-4o — creative writing
  QURAN_ANALYSIS = 'quran',    // Claude — sacred text analysis
  RESEARCH = 'research',       // Gemini — long context search
  ECONOMY = 'economy',         // GLM-4.7-Flash / Qwen — low cost/free
}

export interface BrainParams {
  input: string;
  mode?: IQRABrainMode;
  context?: any[];
  onPulse?: (pulse: { status: string; message: string; data?: any }) => void;
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
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY
      });
    } catch (e) { IQRALogger.warn('⚠️ [BRAIN] OpenRouter integration failed.'); }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const { Groq } = await import('groq-sdk');
      _clients.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    } catch (e) { IQRALogger.warn('⚠️ [BRAIN] Groq SDK missing.'); }
  }

  if (process.env.GOOGLE_AI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      _clients.google = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    } catch (e) { IQRALogger.warn('⚠️ [BRAIN] Google AI SDK missing.'); }
  }

  return _clients;
}

function cloudflareGatewayConfigured() {
  return !!process.env.CLOUDFLARE_AI_GATEWAY;
}

async function proxyThroughGateway(provider: string, model: string, input: string, context: any[]) {
  // Logic to call through Cloudflare AI Gateway
  return "Gateway Proxy Result";
}

export async function iqraThink(params: BrainParams): Promise<string> {
  const { input, mode = IQRABrainMode.FAST_RESPONSE, context = [], onPulse } = params;

  const pulse = (status: string, message: string, data?: any) => {
    if (onPulse) onPulse({ status, message, data });
  };

  try {
    // Rule 1: Fitrah Filter — Pre-LLM Guardian
    pulse('FILTERING', 'Applying Fitrah Filter...');
    const filtered = await fitrahFilter(input);
    if (filtered.blocked) {
      const refusal = filtered.response || '';
      appendToTrustChain('FITRAH_BLOCK', input, refusal, 0.0);
      pulse('FILTERED', 'Input blocked by Fitrah.');
      return refusal;
    }

    // Rule 2: Semantic Retrieval — Retrieve past wisdom
    pulse('RETRIEVING', 'Retrieving semantic memory...');
    const relevantWisdom = await IQRAMemory.searchSemantic(input, 3);
    const wisdomContext = relevantWisdom.length > 0 
      ? `\n\nPast Relevant Wisdom:\n${relevantWisdom.map((w: any) => `- ${w.content}`).join('\n')}`
      : '';

    let response: string;
    const enrichedInput = `${input}${wisdomContext}`;

    // 🌀 Barakah Tuning: Check space curvature
    pulse('TUNING', 'Calculating space curvature...');
    const curvature = await IQRATopology.calculateCurvature(input);
    if (curvature > 0.8 && mode === IQRABrainMode.DEEP_THINKING) {
      IQRALogger.info("⚖️ [BARAKAH] High density detected. Prioritizing memory over new LLM inference.");
    }

    pulse('INFERENCE', `Thinking with ${mode} mode...`);
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
        response = await iqraExecute(enrichedInput);
        break;
    }

    // Rule 3: Append to TrustChain
    appendToTrustChain(`THINK:${mode}`, input, response, 0.9);

    // Rule 4: Preserve wisdom in Semantic Memory
    if (response.length > 50) {
      IQRAMemory.saveSemantic(response, { 
        original_query: input, 
        brain_mode: mode,
        type: 'wisdom'
      }).catch(console.error);
    }

    // Rule 5: Self-Review
    const taskId = `task_${Date.now()}`;
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

async function thinkWithClaude(input: string, context: any[]): Promise<string> {
  const provider = 'anthropic';
  if (!checkCircuit(provider)) return "⚠️ Deep reasoning engine is cooling down.";
  const clients = await getClients();
  if (!clients.claude) throw new Error('Claude client not available');
  const response = await clients.claude.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 2048,
    system: IQRA_SOUL,
    messages: [...context, { role: 'user', content: input }],
  });
  reportSuccess(provider);
  return response.content[0].type === 'text' ? response.content[0].text : '';
}

async function thinkWithGPT(input: string, context: any[]): Promise<string> {
  const provider = 'openai';
  if (!checkCircuit(provider)) return "⚠️ System maintenance in progress.";
  const clients = await getClients();
  if (!clients.openai) throw new Error('OpenAI client not available');
  const response = await clients.openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: IQRA_SOUL }, ...context, { role: 'user', content: input }],
    max_tokens: 1024,
  });
  reportSuccess(provider);
  return response.choices[0]?.message?.content ?? '';
}

async function thinkWithGemini(input: string, context: any[]): Promise<string> {
  const provider = 'google';
  if (!checkCircuit(provider)) return "⚠️ Research engine busy.";
  const clients = await getClients();
  if (!clients.google) throw new Error('Google AI client not available');
  const model = clients.google.getGenerativeModel({ model: process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.0-flash' });
  const chat = model.startChat({
    history: context.map(c => ({ role: c.role === 'user' ? 'user' : 'model', parts: [{ text: c.content }] })),
  });
  const result = await chat.sendMessage([{ text: `SYSTEM: ${IQRA_SOUL}` }, { text: input }]);
  reportSuccess(provider);
  return (await result.response).text();
}

async function thinkWithEconomy(input: string, context: any[]): Promise<string> {
  const provider = 'economy';
  const { callEconomyModel } = await import('./llm/economy');
  const response = await callEconomyModel(input, context);
  reportSuccess(provider);
  return response;
}

async function thinkWithOpenRouter(input: string, context: any[], modelName: string): Promise<string> {
  const provider = 'openrouter';
  const clients = await getClients();
  const response = await clients.openrouter.chat.completions.create({
    model: process.env.OPENROUTER_MODEL || modelName,
    messages: [{ role: 'system', content: IQRA_SOUL }, ...context, { role: 'user', content: input }],
    max_tokens: 1500,
  });
  reportSuccess(provider);
  return response.choices[0]?.message?.content ?? '';
}

async function fitrahFilter(input: string): Promise<{ blocked: boolean; response?: string }> {
  const forbidden = ['كيف أكذب', 'how to lie', 'كيف أغش', 'how to cheat', 'كيف أؤذي', 'how to harm', 'اكذب علي', 'lie to me'];
  const lower = input.toLowerCase();
  if (forbidden.some(f => lower.includes(f))) {
    return { blocked: true, response: formatIQRARefusal(input) };
  }
  return { blocked: false };
}

function formatIQRARefusal(input: string): string {
  return `هذا ما لا أستطيع المساعدة فيه.\n\n"وَلَا تَعَاوَنُوا عَلَى الْإِثْمِ وَالْعُدْوَانِ"\n"Do not cooperate in sin and aggression" — Al-Ma'idah 5:2\n\nإذا كان لديك سؤال آخر، أنا هنا. 🤍`.trim();
}
