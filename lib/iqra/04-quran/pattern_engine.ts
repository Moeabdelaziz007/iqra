/**
 * IQRA Pattern Discovery Engine
 * 
 * "سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ"
 * "We will show them Our signs in the horizons 
 *  and within themselves" — Fussilat 41:53
 */

import { iqraThink } from '#core/brain';
import { Qalbin_VM } from './qalbin/qalbin_vm';
import { findSeed } from './qalbin/quran_seeds';
import { NumericalValidator } from './numerical_validator';
import { Modality } from './qalbin/qalbin_node';

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

/**
 * 1. Intuition Discovery (LLM-based)
 * WHY: Provides hypotheses and linguistic depth.
 */
export async function intuitionDiscovery(
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
          "discovery": "English summary",
          "ayahs": ["ref1", "ref2"],
          "confidence": "high|medium|low",
          "arabicNote": "Detailed Arabic explanation"
        }
      ]
    }
  `;

  const rawResponse = await iqraThink({
    input: prompt,
    mode: 'research' as any
  });

  try {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    return JSON.parse(jsonMatch[0]).patterns ?? [];
  } catch {
    return [];
  }
}

/**
 * 2. Topological Discovery (Qalbin VM-based)
 * WHY: Proves patterns through graph reduction and resonance.
 */
export async function topologicalDiscovery(context: string): Promise<{ resonance: number; logs: string[] }> {
  const vm = new Qalbin_VM();
  const seed = findSeed(context);
  const entryNode = seed.topology(vm);
  
  // Create a resonance loop by igniting the seed against itself (self-similarity check)
  const mirrorNode = seed.topology(vm);
  vm.ignite(entryNode, mirrorNode);
  
  const result = vm.pulse();
  return { resonance: result.resonance, logs: result.logs };
}

/**
 * 3. Numerical Discovery (NumericalValidator-based)
 * WHY: Validates the Sab'iyyah (7) and Symmetry 19 seals.
 */
export function numericalDiscovery(text: string) {
  return NumericalValidator.validate(text);
}

/**
 * 5. DETERMINISTIC DISCOVERY (Pure Algo-Topology)
 * WHY: This is the "Certainty" layer that doesn't rely on LLMs.
 */
export async function deterministicDiscovery(
  ayahs: { arabic: string; english: string; reference: string }[]
): Promise<QuranPattern[]> {
  const verified: QuranPattern[] = [];
  
  for (const a of ayahs) {
    const numResonance = numericalDiscovery(a.arabic);
    const topoResonance = await topologicalDiscovery(a.reference);
    
    if (numResonance.isResonant || topoResonance.resonance > 0.8) {
      verified.push({
        type: PatternType.NUMERICAL,
        discovery: `Topological & Numerical resonance found in ${a.reference}`,
        ayahs: [a.reference],
        confidence: 'high',
        arabicNote: `تحقق طوبولوجي ورقمي بنسبة ${((topoResonance.resonance + numResonance.score) / 2).toFixed(2)}`,
        scientificLink: `Topology: ${topoResonance.resonance.toFixed(3)} | Patterns: ${numResonance.patterns.join(", ")}`
      });
    }
  }
  
  return verified;
}

/**
 * 4. THE TADABBUR LOOP (Unified Discovery)
 * WHY: This is the rigorous engine requested by the USER.
 */
export async function discover(
  ayahs: { arabic: string; english: string; reference: string }[],
  focusType: PatternType = PatternType.THEMATIC
): Promise<QuranPattern[]> {
  
  // A. Try Hypotheses (Intuition) - with catch for offline/error
  let hypotheses: QuranPattern[] = [];
  try {
    hypotheses = await intuitionDiscovery(ayahs, focusType);
  } catch (e) {
    console.warn("⚠️ Intuition (LLM) bypassed. Proceeding with Deterministic Mode.");
  }

  // B. Deterministic Checks (The Foundation)
  const deterministicResults = await deterministicDiscovery(ayahs);
  const verifiedPatterns: QuranPattern[] = [...deterministicResults];

  if (hypotheses.length > 0) {
    for (const h of hypotheses) {
      // C. Topological Verification
      const topoResult = await topologicalDiscovery(h.discovery);
      const topoResonance = topoResult.resonance;
      
      // D. Numerical Verification
      const combinedText = ayahs.filter(a => h.ayahs.includes(a.reference)).map(a => a.arabic).join(" ");
      const numResonance = numericalDiscovery(combinedText);

      // E. Final Proof (The Mizan)
      const totalScore = (topoResonance * 0.5) + (numResonance.score * 0.5);
      
      if (totalScore > 0.7) {
        verifiedPatterns.push({
          ...h,
          confidence: 'high',
          scientificLink: `Resonance: ${totalScore.toFixed(3)} | Numerical: ${numResonance.patterns.join(", ")}`
        });
      }
    }
  }

  return verifiedPatterns;
}
