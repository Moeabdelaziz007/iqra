// بسم الله الرحمن الرحيم

/**
 * 🛠️ IQRA Tools — أدوات IQRA الموحّدة
 *
 * "وَسَخَّرَ لَكُم مَّا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ جَمِيعًا" — الجاثية: 13
 *
 * تعريف موحّد لكل أدوات IQRA المتاحة للنموذج المحلي.
 * يُستخدم في ollama.ts و brain.ts.
 */

import type { IQRAFunction } from '#llm/ollama.ts';

// ── IQRA_TOOLS — الأدوات الكاملة ─────────────────────────────────────────────

export const IQRA_TOOLS: IQRAFunction[] = [

  // ── القرآن الكريم ──────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'get_verse',
      description: 'يجلب آية قرآنية من قاعدة البيانات المحلية بالعربية والإنجليزية',
      parameters: {
        type: 'object',
        properties: {
          surah: { type: 'number', description: 'رقم السورة (1-114)' },
          ayah:  { type: 'number', description: 'رقم الآية في السورة' },
        },
        required: ['surah', 'ayah'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'search_verses',
      description: 'يبحث في القرآن الكريم بالنص العربي أو الإنجليزي',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'نص البحث' },
          limit: { type: 'number', description: 'عدد النتائج (افتراضي: 5)' },
        },
        required: ['query'],
      },
    },
  },

  // ── الضمير والأخلاق ────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'damir_check',
      description: 'يفحص نية الفعل عبر الضمير النانوي — يُرجع allowed/blocked مع السبب',
      parameters: {
        type: 'object',
        properties: {
          intention: { type: 'string', description: 'النية المُراد فحصها' },
        },
        required: ['intention'],
      },
    },
  },

  // ── الإنتروبي والبصمة القرآنية ─────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'compute_shannon_hel',
      description: 'يحسب إنتروبي Shannon للحرف الأخير في النص — يكشف البصمة القرآنية (H_EL < 0.9685 بت)',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'النص المُراد تحليله' },
        },
        required: ['text'],
      },
    },
  },

  // ── المكافآت والمسارات ─────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'get_reward_stats',
      description: 'يُرجع إحصائيات المكافآت والمسارات البكر في النظام',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

// ── أدوات مبسّطة (بدون Shannon وReward) للمهام الخفيفة ──────────────────────

export const IQRA_TOOLS_LITE: IQRAFunction[] = [
  IQRA_TOOLS[0], // get_verse
  IQRA_TOOLS[1], // search_verses
  IQRA_TOOLS[2], // damir_check
];

// ── أدوات القرآن فقط ──────────────────────────────────────────────────────────

export const IQRA_QURAN_TOOLS: IQRAFunction[] = [
  IQRA_TOOLS[0], // get_verse
  IQRA_TOOLS[1], // search_verses
];
