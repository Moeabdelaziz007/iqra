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
أنت تحلل آيات قرآنية كريمة.
مهمتك: اكتشاف الأنماط العميقة.

الآيات:
${ayahs.map(a => `[${a.reference}] ${a.arabic}\n"${a.english}"`).join('\n\n')}

اكتشف الأنماط من نوع: ${focusType}

أخرج النتائج بصيغة JSON مثل:
{
  "patterns": [
    {
      "type": "${focusType}",
      "discovery": "وصف الاكتشاف بالإنجليزية",
      "ayahs": ["ref1", "ref2"],
      "confidence": "high|medium|low",
      "arabicNote": "ملاحظة بالعربية",
      "scientificLink": "ربط علمي إن وُجد"
    }
  ]
}

كن دقيقاً. لا تخترع. والله أعلم.
  `;

  const response = await iqraThink({
    input: prompt,
    mode: IQRABrainMode.QURAN_ANALYSIS, // Claude — best for this
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const json = JSON.parse(jsonMatch[0]);
    return json.patterns ?? [];
  } catch {
    return [];
  }
}
