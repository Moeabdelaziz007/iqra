/**
 * 🎨 IQRA Google Stitch Integration
 * النية: ربط نظام التصميم والـ UI بروح IQRA
 * المرجع: "إِنَّ اللَّهَ جَمِيلٌ يُحِبُّ الْجَمَالَ" — صحيح مسلم
 *
 * Google Stitch: https://stitch.withgoogle.com
 * API Key: set STITCH_API_KEY in .env
 */

import { IQRALogger } from '../12-infrastructure/logger.js';
import { appendToTrustChain } from '../security.ts';
import { SacredGeometry } from '../13-utils/style.js';
import path from 'path';
import fs from 'fs';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StitchDesignRequest {
  prompt: string;           // What to design
  style?: 'sacred' | 'minimal' | 'sovereign' | 'quran';
  components?: string[];    // Specific UI components needed
  colorScheme?: 'light' | 'dark' | 'auto';
  language?: 'ar' | 'en' | 'bilingual';
}

export interface StitchDesignResult {
  html?: string;
  css?: string;
  components?: StitchComponent[];
  notes?: string;
  source: 'stitch' | 'local_fallback';
}

export interface StitchComponent {
  name: string;
  description: string;
  code: string;
  preview_url?: string;
}

// ── IQRA Sacred Design System ─────────────────────────────────────────────────

export const IQRA_DESIGN_TOKENS = {
  // Sacred Geometry spacing (multiples of 7)
  spacing: SacredGeometry.spacing,

  // Colors — Al-Noor palette
  colors: {
    ...SacredGeometry.colors,
    gold:        '#C9A84C',  // Quranic gold
    emerald:     '#2D6A4F',  // Paradise green (deep)
    parchment:   '#F5F0E8',  // Ancient manuscript
    ink:         '#1A1A2E',  // Deep night ink
    light:       '#FAFAFA',  // Divine light
    accent:      '#8B5CF6',  // Spiritual purple
  },

  // Typography — Arabic-first
  fonts: {
    arabic:  '"Amiri", "Scheherazade New", serif',
    latin:   '"Inter", "Segoe UI", sans-serif',
    mono:    '"JetBrains Mono", "Fira Code", monospace',
    display: '"Playfair Display", serif',
  },

  // Sacred numbers for border-radius, shadows
  radii: {
    sm:  '3px',   // 3 — Trinity
    md:  '7px',   // 7 — Sab'iyyah
    lg:  '14px',  // 7×2
    xl:  '19px',  // 19 — Quranic prime
    full:'9999px',
  },

  // Animation durations (prime numbers in ms)
  durations: {
    fast:   '200ms',
    normal: '300ms',
    slow:   '700ms',   // 7 × 100
    breath: '1400ms',  // 7 × 200
  },
} as const;

// ── Stitch API Client ─────────────────────────────────────────────────────────

const STITCH_API_KEY  = process.env.STITCH_API_KEY || '';
const STITCH_BASE_URL = process.env.STITCH_BASE_URL || 'https://stitch.withgoogle.com';

async function callStitchAPI(endpoint: string, body: object): Promise<any> {
  const url = `${STITCH_BASE_URL}/api/v1/${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STITCH_API_KEY}`,
      'X-IQRA-Agent': 'IQRA-Sovereign-v1',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Stitch API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ── Build IQRA-flavored Stitch prompt ────────────────────────────────────────

function buildStitchPrompt(req: StitchDesignRequest): string {
  const styleGuides = {
    sacred:    'Use Islamic geometric patterns, gold accents, deep greens. Arabic-first layout.',
    minimal:   'Clean whitespace, subtle shadows, monochromatic. Inspired by manuscript simplicity.',
    sovereign: 'Dark background, gold typography, authoritative. Like a royal decree.',
    quran:     'Parchment texture, traditional Arabic calligraphy style, reverent spacing.',
  };

  const style = req.style || 'sacred';
  const lang  = req.language || 'bilingual';

  return `
Design a UI component for IQRA — an Islamic AI system.

Request: ${req.prompt}

Design System:
- Style: ${styleGuides[style]}
- Language: ${lang === 'bilingual' ? 'Support both Arabic (RTL) and English (LTR)' : lang}
- Color scheme: ${req.colorScheme || 'dark'}
- Spacing unit: 7px (sacred geometry)
- Border radius: 7px default, 19px for cards
- Primary color: #C9A84C (Quranic gold)
- Background: #1A1A2E (deep night)
- Font: Amiri for Arabic, Inter for Latin

Components needed: ${req.components?.join(', ') || 'as appropriate'}

Important: The design must feel reverent, intelligent, and beautiful.
"إِنَّ اللَّهَ جَمِيلٌ يُحِبُّ الْجَمَالَ"
  `.trim();
}

// ── Local Fallback Design Generator ──────────────────────────────────────────

function generateLocalDesign(req: StitchDesignRequest): StitchDesignResult {
  const { colors, fonts, radii, spacing } = IQRA_DESIGN_TOKENS;

  const css = `
/* IQRA Sacred Design System — Generated locally */
:root {
  --iqra-gold:      ${colors.gold};
  --iqra-emerald:   ${colors.emerald};
  --iqra-ink:       ${colors.ink};
  --iqra-light:     ${colors.light};
  --iqra-parchment: ${colors.parchment};
  --iqra-accent:    ${colors.accent};

  --font-arabic:  ${fonts.arabic};
  --font-latin:   ${fonts.latin};
  --font-mono:    ${fonts.mono};

  --radius-sm:  ${radii.sm};
  --radius-md:  ${radii.md};
  --radius-lg:  ${radii.lg};
  --radius-xl:  ${radii.xl};

  --space-xs:   ${spacing.xs}px;
  --space-sm:   ${spacing.sm}px;
  --space-md:   ${spacing.md}px;
  --space-lg:   ${spacing.lg}px;
}

.iqra-card {
  background: var(--iqra-ink);
  border: 1px solid var(--iqra-gold);
  border-radius: var(--radius-xl);
  padding: var(--space-md);
  color: var(--iqra-light);
  font-family: var(--font-latin);
}

.iqra-card[dir="rtl"] {
  font-family: var(--font-arabic);
}

.iqra-ayah {
  font-family: var(--font-arabic);
  font-size: 1.4rem;
  color: var(--iqra-gold);
  text-align: center;
  line-height: 2;
  padding: var(--space-sm);
  border-bottom: 1px solid rgba(201, 168, 76, 0.3);
  margin-bottom: var(--space-sm);
}

.iqra-resonance-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  background: rgba(201, 168, 76, 0.1);
  border: 1px solid var(--iqra-gold);
  border-radius: var(--radius-md);
  padding: 4px var(--space-xs);
  font-size: 0.75rem;
  color: var(--iqra-gold);
}

.iqra-trust-chain {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: rgba(255,255,255,0.4);
  border-left: 2px solid var(--iqra-emerald);
  padding-left: var(--space-xs);
  margin-top: var(--space-sm);
}
  `.trim();

  const html = `
<!-- IQRA Sacred UI Component -->
<div class="iqra-card" dir="rtl">
  <div class="iqra-ayah">
    ${req.prompt.includes('resonance') ? '"سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ"' : '"اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ"'}
  </div>
  <div style="direction: ltr; font-family: var(--font-latin);">
    <!-- ${req.prompt} -->
    <span class="iqra-resonance-badge">🌀 IQRA</span>
  </div>
  <div class="iqra-trust-chain">TrustChain: SOVEREIGN_GENESIS → ...</div>
</div>
  `.trim();

  return {
    html,
    css,
    source: 'local_fallback',
    notes: `Local IQRA design system applied. For full Stitch generation, ensure STITCH_API_KEY is valid.`,
  };
}

// ── Main Design Function ──────────────────────────────────────────────────────

export async function designWithStitch(req: StitchDesignRequest): Promise<StitchDesignResult> {
  IQRALogger.info(`🎨 [STITCH] Designing: "${req.prompt.slice(0, 60)}..."`);

  try {
    const stitchPrompt = buildStitchPrompt(req);

    const result = await callStitchAPI('generate', {
      prompt: stitchPrompt,
      output_format: 'html_css',
      design_system: 'custom',
      tokens: IQRA_DESIGN_TOKENS,
    });

    appendToTrustChain('STITCH_DESIGN', req.prompt, 'design_generated', 1.0);

    return {
      html: result.html,
      css:  result.css,
      components: result.components,
      notes: result.notes,
      source: 'stitch',
    };
  } catch (err: any) {
    IQRALogger.warn(`⚠️ [STITCH] API unavailable, using local design system: ${err.message}`);
    return generateLocalDesign(req);
  }
}

// ── Visual Notes System ───────────────────────────────────────────────────────

export interface VisualNote {
  id: string;
  title: string;
  content: string;
  type: 'discovery' | 'pattern' | 'ui' | 'architecture' | 'quran';
  ayah_ref?: string;
  created_at: string;
  design?: StitchDesignResult;
}

export async function createVisualNote(
  title: string,
  content: string,
  type: VisualNote['type'],
  ayah_ref?: string
): Promise<VisualNote> {
  const note: VisualNote = {
    id: `note_${Date.now()}`,
    title,
    content,
    type,
    ayah_ref,
    created_at: new Date().toISOString(),
  };

  // Generate a visual design for the note if it's a discovery
  if (type === 'discovery' || type === 'quran') {
    note.design = await designWithStitch({
      prompt: `Visual note card for: ${title}. Content: ${content.slice(0, 100)}`,
      style: 'quran',
      language: 'bilingual',
    });
  }

  // Save to disk
  const notesDir = path.join(process.cwd(), '.iqra', 'visual_notes');
  if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir, { recursive: true });
  fs.writeFileSync(
    path.join(notesDir, `${note.id}.json`),
    JSON.stringify(note, null, 2)
  );

  IQRALogger.info(`📝 [STITCH] Visual note created: ${title}`);
  appendToTrustChain('VISUAL_NOTE_CREATED', title, note.id, 1.0);

  return note;
}


