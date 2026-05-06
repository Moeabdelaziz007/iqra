/**
 * IQRA Pattern Discovery Engine
 * 
 * "سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ"
 * "We will show them Our signs in the horizons 
 *  and within themselves" — Fussilat 41:53
 */

import { iqraThink, IQRABrainMode } from '../brain';

export interface QuranPattern {
  type: PatternType;
  discovery: string;
  ayahs: string[];        // references like ["2:255", "59:23"]
  confidence: 'high' | 'medium' | 'low';
  arabicNote: string;
  scientificLink?: string;
}

export enum PatternType {
  LINGUISTIC    = 'linguistic',    // word repetitions, roots
  NUMERICAL     = 'numerical',     // number patterns
  THEMATIC      = 'thematic',      // same theme across surahs
  SCIENTIFIC    = 'scientific',    // science connections
  STRUCTURAL    = 'structural',    // surah structure patterns
}

// ═══════════════════════════════════
// CORE: Discover patterns using LLM
// ═══════════════════════════════════

export async function discoverPatterns(
  ayahs: { arabic: string; english: string; reference: string }[],
  focusType: PatternType = PatternType.THEMATIC
): Promise<QuranPattern[]> {

  const prompt = `
    You are IQRA, a Sovereign Intelligence analyzing the Holy Quran. 
    Task: Identify precise ${focusType} patterns.
    
    Ayahs to Analyze:
    ${ayahs.map(a => `[${a.reference}] ${a.arabic}\n"${a.english}"`).join('\n\n')}

    Rules for Discovery:
    1. STRICT TRUTH: Do not hallucinate. If no pattern exists, return an empty list.
    2. DEPTH: Look for root connections and structural symmetries.
    3. REVERENCE: Treat every word as sacred.
    
    Format: JSON
    {
      "patterns": [
        {
          "type": "${focusType}",
          "discovery": "English summary of discovery",
          "ayahs": ["ref1", "ref2"],
          "confidence": "high|medium|low",
          "arabicNote": "Detailed Arabic explanation (تدبر عميق)",
          "verification": "Reasoning why this pattern is authentic"
        }
      ]
    }
  `;

  const rawResponse = await iqraThink({
    input: prompt,
    mode: 'research' as any // Using Gemini Research for depth
  });

  try {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Rule: Filter for high confidence only for autonomous recording
    return (parsed.patterns ?? []).filter((p: any) => p.confidence === 'high');
  } catch {
    return [];
  }
}
