/**
 * 🦴 IQRA Caveman Protocol — "الضغط اللغوي السيادي"
 * 
 * Linguistic Compression Skill for IQRA.
 * Reduces token usage by ~60% using terse, high-density patterns.
 * 
 * "why use many token when few token do trick"
 */

import { IQRALogger } from '#infra/logger';

export class CavemanSkill {
  /**
   * 🛡️ Deterministic Shield
   * Filters noisy patterns and system prompt leakage artifacts.
   */
  static deterministicShield(text: string): string {
    if (!text) return "";

    return text
      // Remove system prompt leak patterns
      .replace(/I am an AI assistant/gi, "")
      .replace(/As an AI model/gi, "")
      .replace(/I am (not )?allowed to/gi, "")
      // Remove repeated placeholders or hallucinations
      .replace(/([^\w\s])\1{5,}/g, "$1") // Reduce excessive punctuation repetition
      .replace(/(.)\1{10,}/g, "$1")     // Reduce excessive char repetition
      // Clean Arabic system leakage
      .replace(/أنا مساعد ذكاء اصطناعي/g, "")
      .replace(/كـ نموذج ذكاء اصطناعي/g, "")
      .trim();
  }

  /**
   * 💧 Cognitive Rehydration
   * Injects a 'Rehydration Header' to guide local models.
   */
  static rehydratePrompt(compressed: string): string {
    const header = `[MODE: SOVEREIGN CAVEMAN ULTRA]
[INTENT: DENSE COGNITION]
[INSTRUCTION: Expand below compressed seeds into full reports with high resonance.]
---
`;
    return header + compressed;
  }

  /**
   * Arabic Morphological Root Compression (Experimental)
   * Tries to keep only core roots for maximum density.
   */
  private static extractArabicRoots(text: string): string {
    // Basic implementation: remove common prefixes/suffixes
    return text
      .replace(/(^|\s)(ال|ب|ك|ف|ل|و)(\w+)/g, "$1$3") // Remove common prefixes
      .replace(/(\w+)(ون|ين|ات|ة|ه|كم|هم|na|t)($|\s)/g, "$1$3"); // Remove common suffixes
  }

  /**
   * Compresses a prompt into Caveman style.
   * Removes fluff, prepositions, and redundant polite forms.
   * Supports both English and Arabic.
   */
  static compressPrompt(text: string, mode: 'basic' | 'ultra' = 'basic'): string {
    if (!text) return "";

    let compressed = text
      // --- English Compression ---
      .replace(/\bplease\b/gi, "")
      .replace(/\bcould you\b/gi, "")
      .replace(/\bi would like to\b/gi, "want")
      .replace(/\bis it possible to\b/gi, "can")
      .replace(/\bthe\b/gi, "")
      .replace(/\ba\b/gi, "")
      .replace(/\ban\b/gi, "")
      .replace(/\band\b/gi, "&")
      .replace(/\bvery\b/gi, "")
      .replace(/\breally\b/gi, "")
      .replace(/\bhelpful\b/gi, "help")
      .replace(/\binformation\b/gi, "info")
      .replace(/\bwith regards to\b/gi, "about")
      // --- Arabic Compression (التجريد السيادي) ---
      .replace(/من فضلك/g, "")
      .replace(/لو سمحت/g, "")
      .replace(/أريد أن/g, "أريد")
      .replace(/هل يمكنك/g, "ممكن")
      .replace(/بالإضافة إلى/g, "&")
      .replace(/بشكل كبير/g, "جداً");

    if (mode === 'ultra') {
      compressed = this.extractArabicRoots(compressed)
        // --- 🧪 Ultra Semantic Glyphs (Linguistic Topology) ---
        .replace(/\bsummarize\b/gi, "Σ")
        .replace(/\bresult\b/gi, "→")
        .replace(/\bin\b/gi, "∈")
        .replace(/\bnot\b/gi, "¬")
        .replace(/\band\b/gi, "∩")
        .replace(/\bor\b/gi, "∪")
        .replace(/\bcheck\b/gi, "✓")
        .replace(/\berror\b/gi, "✘")
        .replace(/\bimportant\b/gi, "!")
        .replace(/\bquestion\b/gi, "?")
        // Arabic Ultra Glyphs
        .replace(/تلخيص/g, "Σ")
        .replace(/نتيجة/g, "→")
        .replace(/في/g, "∈")
        .replace(/ليس/g, "¬")
        .replace(/و/g, "∩")
        .replace(/أو/g, "∪")
        .replace(/خطأ/g, "✘")
        .replace(/مهم/g, "!");
    }

    compressed = compressed
      .replace(/\sال(\w+)/g, " $1") // Remove definite article "ال"
      .replace(/^ال(\w+)/g, "$1")
      // --- Structural Cleanup ---
      .replace(/[.,!?;:]/g, " ") // Space-separate instead of removing to preserve tokens
      .replace(/\s+/g, " ")
      .trim();

    if (mode === 'ultra') {
      compressed = this.rehydratePrompt(compressed);
    }

    IQRALogger.debug(`🦴 [CAVEMAN] ${mode.toUpperCase()} Compressed: ${text.length} -> ${compressed.length} chars`);
    return compressed;
  }

  /**
   * Transforms a response into a more 'Sovereign Brevity' style if requested.
   */
  static sovereignBrevity(text: string): string {
    const shielded = this.deterministicShield(text);
    return shielded.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 2 && !line.startsWith('>'))
      .join('\n');
  }
}
