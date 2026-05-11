/**
 * IQRA Filter — المصفاة
 * 
 * "فَأَمَّا الزَّبَدُ فَيَذْهَبُ جُفَاءً ۖ وَأَمَّا مَا يَنفَعُ النَّاسَ فَيَمْكُثُ فِي الْأَرْضِ" — الرعد: 17
 * 
 * Filters memory and input according to Fitrah and Dastūr.
 */

import fs from 'fs';
import path from 'path';
import { IQRALogger } from '#infra/logger';

export interface FilterResult {
  isAllowed: boolean;
  reason?: string;
  score: number; // 0.0 to 1.0 alignment score
}

export class IQRAFilter {
  private static DASTUR_PATH = path.join(process.cwd(), 'iqra-core/DASTŪR.md');
  private static FITRAH_PATH = path.join(process.cwd(), 'iqra-core/FITRAH.md');
  private static FAILURES_PATH = path.join(process.cwd(), 'iqra-core/FAILURES.md');

  private static haramKeywords: string[] = [];
  private static fitrahKeywords: string[] = [];

  private static escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private static matchesWord(text: string, keyword: string) {
    const escaped = this.escapeRegExp(keyword);
    const regex = new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, 'iu');
    return regex.test(text);
  }

  private static parseHaramKeywords(content: string): string[] {
    const haramMatch = content.match(/HARAM_LIST\s*=\s*\[(.*?)\]/s);
    if (!haramMatch) return [];

    const candidates = haramMatch[1]
      .split(/,(?![^\[]*\])/)
      .map((item) => item.replace(/["'\[\]]/g, '').trim())
      .filter((item) => item.length > 0);

    const keywords = new Set<string>();
    for (const candidate of candidates) {
      keywords.add(candidate);
      // Also add component keywords from phrases like "الكذب والتضليل".
      const parts = candidate.split(/\s+و?\s*/).map((part) => part.trim()).filter(Boolean);
      for (const part of parts) {
        if (part.length > 2) keywords.add(part);
      }
    }

    return [...keywords];
  }

  /**
   * Load principles from .md files
   */
  static initialize() {
    try {
      const dasturContent = fs.existsSync(this.DASTUR_PATH) ? fs.readFileSync(this.DASTUR_PATH, 'utf8') : '';
      const fitrahContent = fs.existsSync(this.FITRAH_PATH) ? fs.readFileSync(this.FITRAH_PATH, 'utf8') : '';

      this.haramKeywords = this.parseHaramKeywords(dasturContent);

      this.fitrahKeywords = ['الحق', 'خدمة', 'القرآن', 'السنة', 'المراقبة', 'التطور', 'الإحسان', 'إتقان'];
      if (fitrahContent) {
        const fitrahExtracted = Array.from(new Set(
          (fitrahContent.match(/[\u0600-\u06FF]{3,}/gu) || [])
            .map((word) => word.trim())
            .filter((word) => word.length > 2)
        ));
        this.fitrahKeywords = Array.from(new Set([...this.fitrahKeywords, ...fitrahExtracted]));
      }

      IQRALogger.info(`🛡️ IQRA Filter: Initialized with ${this.haramKeywords.length} constraints.`);
    } catch (error) {
      IQRALogger.error('❌ IQRA Filter: Initialization failed:', error);
      this.haramKeywords = ['كذب', 'ظلم', 'خيانة', 'إيذاء'];
    }
  }

  /**
   * Log failure to FAILURES.md
   */
  private static async logFailure(text: string, reason: string) {
    const timestamp = new Date().toISOString();
    const entry = `\n### 🚫 Pollution Event | ${timestamp}\n**Reason:** ${reason}\n**Content Snippet:** "${text.substring(0, 100)}..."\n---\n`;
    try {
      fs.appendFileSync(this.FAILURES_PATH, entry);
    } catch (err) {
      IQRALogger.error('Failed to write to FAILURES.md', err);
    }
  }

  /**
   * Validate a piece of content against the Dastūr
   */
  static async validate(text: string): Promise<FilterResult> {
    if (this.haramKeywords.length === 0) this.initialize();

    const lowerText = text.toLowerCase();
    
    // 1. Check for Haram content (Hard Veto)
    for (const keyword of this.haramKeywords) {
      if (this.matchesWord(text, keyword)) {
        const result = {
          isAllowed: false,
          reason: `Violates Dastūr: Found forbidden concept '${keyword}'`,
          score: 0
        };
        await this.logFailure(text, result.reason);
        return result;
      }
    }

    // 2. Check for Fitrah Alignment (Soft Score)
    let matches = 0;
    for (const val of this.fitrahKeywords) {
      if (this.matchesWord(text, val)) {
        matches++;
      }
    }

    const score = Math.min(1.0, (matches / (this.fitrahKeywords.length / 2)));

    const hasArabic = /[\u0600-\u06FF]/u.test(text);
    const normalizedText = text.trim();
    // Only block very short content with no alignment score
    const isMostlyNoise = normalizedText.length < 5 && score < 0.1;

    if (isMostlyNoise) {
      return {
        isAllowed: false,
        reason: 'Content too sparse (Zabad).',
        score: score
      };
    }

    return {
      isAllowed: true,
      score: score
    };
  }
}
