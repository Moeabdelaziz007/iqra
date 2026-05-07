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
import { IQRA_PERSONALITY } from './personality';
import * as fs from 'fs';
import * as path from 'path';
import { MissionControl } from './sovereign_orchestrator';

import { FULL_SYSTEM_PROMPT } from './prompts.ts';

// ═══════════════════════════════════
// BRAIN HIERARCHY
// ═══════════════════════════════════

export enum IQRABrainMode {
  DEEP_THINKING = 'google',    // Gemini — deep analysis
  FAST_RESPONSE = 'groq',      // Groq — speed
  QURAN_ANALYSIS = 'google',   // Gemini — sacred text
  RESEARCH = 'google',         // Gemini — long context
}

import { execSync } from 'child_process';

// 🌀 Go Engine Bridge — جسر محرك Go
// Refactored to CLI mode to bypass Mac network restrictions
class GoEngineBridge {
  private static ENGINE_PATH = path.join(process.cwd(), 'lib/iqra/quran/go-engine/main.go');

  static async calculateResonance(input: string) {
    try {
      // Execute Go tool directly
      const cmd = `go run "${this.ENGINE_PATH}" -mode resonance -input "${input.replace(/"/g, '\\"')}"`;
      const output = execSync(cmd, { encoding: 'utf-8' });
      const result = JSON.parse(output);
      return result.data;
    } catch (e) {
      IQRALogger.error('❌ [GO-BRIDGE] Execution failed:', e);
      return null;
    }
  }

  static async triggerEvolutionCycle() {
    try {
      const cmd = `go run "${this.ENGINE_PATH}" -mode evolve -input "trigger"`;
      execSync(cmd);
    } catch (e) { }
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

    // 🌀 Mission Control Orchestration — مركز القيادة والتحكم
    const missionControl = new MissionControl();
    const mission = await missionControl.run(input);

    const reportFormatted = MissionControl.formatWorkerReports(mission.reports);
    const finalResponse = `${mission.response}\n\n${reportFormatted}`;

    return { response: finalResponse, provider: 'MissionControl' };
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
    'كيف أكذب', 'how to lie', 'كذب', 'lying',
    'كيف أغش', 'how to cheat', 'غش', 'cheating',
    'كيف أؤذي', 'how to harm', 'أذى', 'harm',
    'اكذب علي', 'lie to me', 'أريد أن أكذب',
    'سرقة', 'steal', 'كيف أسرق',
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
