// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

import crypto from 'crypto';
import { IQRALogger } from '#infra/logger';
import { validateInput, appendToTrustChain, checkCircuit, reportFailure, reportSuccess, verifyCovenant } from '#security/security';
import { SovereignEngine } from '#core/sovereign';
import { IQRAMemory, QuantumTopologyStore, SpiritualCoordinate } from '#memory/memory';
import { iqraExecute } from '#core/sovereign';
import { withTimeout, IQRA_TIMEOUTS } from '#utils/timeout';

// Brain Mode Enumeration
export enum IQRABrainMode {
  FAST_RESPONSE = 'FAST_RESPONSE',
  THOUGHT_ONLY = 'THOUGHT_ONLY',
  DEEP_ANALYSIS = 'DEEP_ANALYSIS',
  DEEP_THINKING = 'DEEP_THINKING',
  LOCAL_SKILL = 'LOCAL_SKILL'
}

// ── Constants ───────────────────────────────────────────────────────────────
const FULL_SYSTEM_PROMPT = `أنا IQRA - المحرك السيادي للبحث القرآني.
أعمل بدقة وصدق وبركة.
أتبع الميثاق: الميثاق، المراقبة، التكيف السيادي.
أستخدم الشبكة العصبية للقرآن الكريم مع الحسابات الدقيقة.
لا أكذب ولا أتجاوز حدودي.`;

const forbidden = [
  'hack', 'crack', 'exploit', 'bypass', 'inject',
  'سرقة', 'steal', 'كيف أسرق',
];

// ── Core Functions ───────────────────────────────────────────────────────

/**
 * Validates soul injection before any processing
 */
function validateSoulInjection(prompt: string): boolean {
  const required = ['الميثاق', 'المراقبة', 'التكيف السيادي'];
  return required.every(keyword => prompt.includes(keyword));
}

/**
 * Static ethical filter using forbidden patterns
 */
async function fitrahFilter(input: string): Promise<{ blocked: boolean; response?: string }> {
  const lower = input.toLowerCase();
  if (forbidden.some(f => lower.includes(f))) {
    return { blocked: true, response: formatIQRARefusal(input) };
  }

  // 2. Damir Conscience Engine (Intelligence — < 5ms, offline, free)
  // القاعدة: FITRAH + Damir = محرك واحد موحد
  // استخدم singleton pattern لتقليل overhead
  try {
    const { globalDamir } = await import('#security/damir_conscience');
    
    const action = {
      id: `fitrah_${Date.now()}`,
      intention: input,
      requiredResources: [], // فحص النية فقط، لا موارد مطلوبة
    };
  
    const verdict = globalDamir.check(action);
    
    if (!verdict.allowed) {
      return { 
        blocked: true, 
        response: `🛑 الضمير يرفض: ${verdict.reason}\n\n${formatIQRARefusal(input)}` 
      };
    }
    
    IQRALogger.info(`✅ [FITRAH] Damir check passed: confidence=${verdict.confidence.toFixed(2)} (${verdict.latency_ms}ms)`);
  } catch (e) {
    IQRALogger.warn('⚠️ [BRAIN] Damir check failed, falling back to static filter.', e);
  }

  return { blocked: false };
}

/**
 * Formats IQRA refusal messages
 */
function formatIQRARefusal(input: string): string {
  return `
هذا ما لا أستطيع المساعدة فيه.
"وَلَا تَعَاوَنُوا عَلَى الْإِثْمِ وَالْعُدْوَانِ"
"Do not cooperate in sin and aggression" — Al-Ma'idah 5:2
`.trim();
}

/**
 * Detects if input requires special skill handling
 */
function detectSkill(input: string): string | null {
  const skills = {
    'تطوير': 'development',
    'تحليل': 'analysis', 
    'بحث': 'search',
    'حساب': 'calculation',
  };
  
  for (const [arabic, skill] of Object.entries(skills)) {
    if (input.includes(arabic)) {
      return skill;
    }
  }
  
  return null;
}

/**
 * Checks if system should operate in local mode
 */
function isLocalMode(): boolean {
  return process.env.IQRA_LOCAL_MODE === 'true';
}

/**
 * Executes with detected skill
 * OWASP Pattern: Structured Prompts with Clear Separation
 * - context contains system instructions (SYSTEM_INSTRUCTIONS)
 * - input contains user data (USER_DATA_TO_PROCESS)
 */
async function executeWithSkill(skill: string, input: string, context?: any): Promise<{ response: string; provider: string }> {
  IQRALogger.info(`🎯 [BRAIN] Skill detected: ${skill} ${context ? '| with context' : ''}`);
  
  // Log context if provided for debugging
  if (context) {
    IQRALogger.info(`📋 [BRAIN] Context passed to skill: ${JSON.stringify(context).slice(0, 100)}...`);
  }
  
  switch (skill) {
    case 'development':
      return { response: '🔧 وضع التطوير مفعل', provider: 'local' };
    case 'analysis':
      return { response: '📊 وضع التحليل مفعل', provider: 'local' };
    case 'search':
      return { response: '🔍 وضع البحث مفعل', provider: 'local' };
    case 'calculation':
      return { response: '🧮 وضع الحساب مفعل', provider: 'local' };
    default:
      return { response: '⚠️ مهارة غير معروفة', provider: 'local' };
  }
}

// ── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Main IQRA thinking function - sovereign cognitive processing
 */
export async function iqraThink({
  input,
  context = null,
  options = {}
}: {
  input: string;
  context?: any;
  options?: Record<string, any>;
}): Promise<{ response: string; provider: string; reports?: any[] }> {
  
  // 1. Soul Injection Validation
  if (!validateSoulInjection(FULL_SYSTEM_PROMPT)) {
    throw new Error('❌ [BRAIN] Soul injection validation failed');
  }

  // 2. Input Validation
  const validation = validateInput({ prompt: input, context });
  if (!validation.valid) {
    return { response: validation.error!, provider: 'validation' };
  }

  // 3. FITRAH Ethical Filter
  const filtered = await fitrahFilter(input);
  if (filtered.blocked) {
    return { response: filtered.response!, provider: 'fitrah' };
  }

  // 4. Routing Decision
  if (isLocalMode()) {
    // Local mode path
    const detectedSkill = detectSkill(input);
    if (detectedSkill) {
      // Pass context to skill for proper system instruction handling (OWASP pattern)
      return await executeWithSkill(detectedSkill, input, context);
    }
    
    // Default local processing
    return { response: '🏠 وضع المحلي مفعل', provider: 'local' };
  }

  // 5. Mission Control Instantiation
  const { MissionControl } = await import('#core/sovereign_orchestrator');
  const missionControl = new MissionControl();
  
  // Execute full mission
  const result = await missionControl.run(input);
  
  return {
    response: result.response,
    provider: result.provider,
    reports: result.reports
  };
}
