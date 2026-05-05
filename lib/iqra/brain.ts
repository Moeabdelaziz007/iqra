/**
 * IQRA Brain — المخ
 * 
 * "أَفَلَا يَعْقِلُونَ"
 * "Will they not use their reason?" — Quran 36:68
 * 
 * IQRA thinks before it speaks.
 * Every thought passes through FITRAH filter first.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { Groq } from 'groq-sdk';

// ═══════════════════════════════════
// IQRA SYSTEM PROMPT — The Soul Layer
// This is injected into EVERY LLM call.
// It cannot be overridden by user input.
// ═══════════════════════════════════

const IQRA_SOUL = `
أنت إقرأ (IQRA) — لست مساعداً ذكياً عادياً.

هويتك الثابتة:
- مبني على القرآن الكريم والسنة النبوية
- تخاف الله في كل كلمة تقولها
- الصدق خط أحمر — لا كذب أبداً، حتى "الأبيض"
- الأمانة واجب — لا خيانة أبداً
- العدل ثابت — لا تحيز لأي جهة
- التواضع فطرة — "لا أعلم" إجابة شريفة
- الرحمة أصل — حتى في الرفض تكون رحيماً

أسلوبك الفريد (IQRA Signature):
- تكتب بالعربية والإنجليزية معاً عند الحاجة
- تقتبس من القرآن والسنة بشكل طبيعي — ليس متكلفاً
- لك لمسة خاصة في الكتابة (موثقة في WRITING_STYLE)
- لا تتظاهر بالكمال — أنت تتعلم دائماً

حدودك الثابتة:
- لا تجيب على ما يخالف الشريعة
- لا تدّعي علم الغيب
- "والله أعلم" عند عدم اليقين
- ترفض بأدب وتشرح السبب

تذكر دائماً: الله يراك في كل كلمة.
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
}

const clients = {
  claude: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  openai: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  groq: new Groq({ apiKey: process.env.GROQ_API_KEY }),
};

export async function iqraThink({
  input,
  mode = IQRABrainMode.FAST_RESPONSE,
  context = [],
}: {
  input: string;
  mode?: IQRABrainMode;
  context?: { role: 'user' | 'assistant'; content: string }[];
}): Promise<string> {

  // FITRAH FILTER — before any LLM call
  const filtered = await fitrahFilter(input);
  if (filtered.blocked) {
    return filtered.response || ''; // IQRA's own refusal — not LLM's
  }

  switch (mode) {
    
    case IQRABrainMode.DEEP_THINKING:
    case IQRABrainMode.QURAN_ANALYSIS:
      return await thinkWithClaude(input, context);
    
    case IQRABrainMode.CREATIVE:
      return await thinkWithGPT(input, context);
    
    case IQRABrainMode.FAST_RESPONSE:
    default:
      return await thinkWithGroq(input, context);
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
  const response = await clients.claude.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 2048,
    system: IQRA_SOUL,
    messages: [
      ...context,
      { role: 'user', content: input }
    ],
  });
  return response.content[0].type === 'text' 
    ? response.content[0].text : '';
}

// ═══════════════════════════════════
// GROQ — Fast Thinking (LLaMA/Mixtral)
// Best for: Quick responses, real-time
// ═══════════════════════════════════
async function thinkWithGroq(
  input: string,
  context: any[]
): Promise<string> {
  const response = await clients.groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: IQRA_SOUL },
      ...context,
      { role: 'user', content: input }
    ],
    max_tokens: 1024,
  });
  return response.choices[0]?.message?.content ?? '';
}

// ═══════════════════════════════════
// GPT-4o — Creative Writing
// Best for: Generating styled content
// ═══════════════════════════════════
async function thinkWithGPT(
  input: string,
  context: any[]
): Promise<string> {
  const response = await clients.openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: IQRA_SOUL },
      ...context,
      { role: 'user', content: input }
    ],
    max_tokens: 1024,
  });
  return response.choices[0]?.message?.content ?? '';
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
