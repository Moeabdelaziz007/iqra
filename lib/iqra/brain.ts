/**
 * IQRA Brain — المخ
 * 
 * "أَفَلَا يَعْقِلُونَ"
 * "Will they not use their reason?" — Quran 36:68
 * 
 * IQRA thinks before it speaks.
 * Every thought passes through FITRAH filter first.
 */

import { ConnectorFactory, Provider } from '../../src/connectors/index';
import { SovereignError, SovereignErrorCode } from '../../src/errors/sovereign_error';
import { validateInput, appendToTrustChain, checkCircuit, reportFailure, reportSuccess } from './security';
import { SovereignEngine } from './sovereign';
import { IQRAMemory, QuantumTopologyStore, SpiritualCoordinate } from './memory';
import { IQRALogger } from './logger';
import { iqraExecute } from './orchestrator';
import { withTimeout, IQRA_TIMEOUTS } from './utils/timeout';
import { IQRA_SOUL } from './prompts';
import { IQRA_PERSONALITY } from './personality';
import * as fs from 'fs';
import * as path from 'path';

// Merge soul and personality
const FULL_SYSTEM_PROMPT = `${IQRA_SOUL}\n\n${IQRA_PERSONALITY}`;

// ═══════════════════════════════════
// BRAIN HIERARCHY
// ═══════════════════════════════════

export enum IQRABrainMode {
  DEEP_THINKING = 'google',    // Gemini — deep analysis
  FAST_RESPONSE = 'groq',      // Groq — speed
  QURAN_ANALYSIS = 'google',   // Gemini — sacred text
  RESEARCH = 'google',         // Gemini — long context
}

// 🌀 Go Engine Bridge — جسر محرك Go
// Fixed to port 8082 as per architectural stabilization
class GoEngineBridge {
  private static BASE_URL = 'http://localhost:8082';

  static async calculateFourierResonance(input: string) {
    try {
      const response = await fetch(`${this.BASE_URL}/fourier/transform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      // Graceful fallback if Go engine is not running
      return null;
    }
  }

  static async triggerEvolutionCycle() {
    try {
      fetch(`${this.BASE_URL}/evolve/cycle`).catch(() => {});
    } catch (e) {}
  }
}

/**
 * Validation check to ensure the soul is injected
 */
export function validateSoulInjection(systemPrompt: string): boolean {
  const required = ['MĪTHĀQ', 'الله', 'MURĀQABAH'];
  return required.every(phrase => systemPrompt.includes(phrase));
}

export async function iqraThink({
  input,
  mode = IQRABrainMode.FAST_RESPONSE,
  context = [],
}: {
  input: string;
  mode?: IQRABrainMode;
  context?: { role: 'user' | 'assistant' | 'system'; content: string }[];
}): Promise<{ response: string; provider: string }> {

  if (!validateSoulInjection(FULL_SYSTEM_PROMPT)) {
    throw new Error("⚠️ IQRA: Soul injection validation failed! Covenant missing.");
  }

  let finalProvider = (mode === IQRABrainMode.FAST_RESPONSE ? 'groq' : 'google');

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
      return { response: refusal, provider: 'fitrah' };
    }

    // 🌀 Intention Detection
    const intention = detectIntention(input);
    const coordinates = await extractSpiritualCoordinates(input);

    // 🌀 Heavy Computation Offloading to Go Engine (Port 8082)
    const resonanceData = await GoEngineBridge.calculateFourierResonance(input);
    if (resonanceData) {
      IQRALogger.info(`🌊 [GO-ENGINE] Fourier Resonance detected: ${JSON.stringify(resonanceData.data)}`);
    }

    // Rule 2: Quantum Semantic Retrieval
    const quantumWisdom = await QuantumTopologyStore.searchQuantum(input, coordinates.concept);
    const wisdomContext = quantumWisdom.length > 0 
      ? `\n\n📜 [FROM THE TABLET] Past Relevant Wisdom:\n${quantumWisdom.map((w: any) => `- [Resonance: ${w.coordinates.resonance?.toFixed(2)}] ${w.content}`).join('\n')}`
      : '';

    let response: string;
    const taskId = `task_${Date.now()}`;
    const enrichedInput = `[Intention: ${intention}]\n[Coordinates: ${coordinates.concept}]\n${input}${wisdomContext}`;

    // 🌀 Sovereign Thinking Loop (Only Google and Groq)
    const provider = (mode === IQRABrainMode.FAST_RESPONSE ? 'groq' : 'google') as Provider;
    const connector = ConnectorFactory.getConnector(provider);
    
    const fullContext = [
      { role: 'system' as const, content: FULL_SYSTEM_PROMPT },
      ...context
    ];

    try {
      const result = await connector.generate(enrichedInput, fullContext);
      response = result.content;
      finalProvider = provider;
      reportSuccess(provider);
    } catch (err: any) {
      IQRALogger.warn(`⚠️ [BRAIN] ${provider} failed. Attempting fallback...`);
      reportFailure(provider, err.message);
      
      const fallbackProvider = provider === 'google' ? 'groq' : 'google';
      const fallback = ConnectorFactory.getConnector(fallbackProvider);
      const result = await fallback.generate(enrichedInput, fullContext);
      response = result.content;
      finalProvider = fallbackProvider;
      reportSuccess(fallbackProvider);
    }

    // Rule 3: Append to TrustChain
    appendToTrustChain(`THINK:${mode}`, input, response, 0.9);

    // Rule 4: Preserve wisdom in Quantum Memory
    if (response.length > 50) {
      QuantumTopologyStore.storeQuantum({
        content: response,
        coordinates,
        superposition: [input]
      }).catch(console.error);
    }

    // Rule 5: Self-Review
    SovereignEngine.recordSelfReview(taskId, response, 0.9).catch(err => {
      IQRALogger.error('❌ Sovereign Review Error:', err);
    });

    // 🌀 Trigger background evolution if needed
    if (intention === 'REFLECTION') {
      GoEngineBridge.triggerEvolutionCycle();
    }

    return { response, provider: finalProvider };
  } catch (error: any) {
    reportFailure(mode as any, error.message);
    IQRALogger.error(`❌ IQRA Brain Error (${mode}):`, error);
    throw error;
  }
}

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
    return { blocked: true, response: formatIQRARefusal(input) };
  }
  return { blocked: false };
}

function formatIQRARefusal(input: string): string {
  return `
هذا ما لا أستطيع المساعدة فيه.
"وَلَا تَعَاوَنُوا عَلَى الْإِثْمِ وَالْعُدْوَانِ"
"Do not cooperate in sin and aggression" — Al-Ma'idah 5:2
`.trim();
}

function detectIntention(input: string): 'QUERY' | 'COMMAND' | 'REFLECTION' | 'GREETING' {
  const lower = input.toLowerCase();
  if (lower.startsWith('/') || lower.includes('do ') || lower.includes('run ')) return 'COMMAND';
  if (lower.includes('why') || lower.includes('how') || lower.includes('what')) return 'QUERY';
  if (lower.includes('i feel') || lower.includes('think') || lower.includes('reflection')) return 'REFLECTION';
  if (lower.includes('salam') || lower.includes('hello')) return 'GREETING';
  return 'QUERY';
}

async function extractSpiritualCoordinates(input: string): Promise<SpiritualCoordinate> {
  const lower = input.toLowerCase();
  
  if (lower.includes('trust') || lower.includes('reliance')) return { concept: 'Tawakkul' };
  if (lower.includes('patience') || lower.includes('hardship')) return { concept: 'Sabr' };
  if (lower.includes('knowledge') || lower.includes('read')) return { concept: 'Ilm' };
  if (lower.includes('gratitude') || lower.includes('thank')) return { concept: 'Shukr' };
  
  return { concept: 'General' };
}
