/**
 * IQRA Consciousness — الوعي
 * 
 * "أَفَلَا يَتَدَبَّرُونَ الْقُرْآنَ" — النساء: 82
 * 
 * Powered by Claude (Antigravity) — The Judge and Guardian.
 */

import { iqraThink, IQRABrainMode } from './brain';
import { IQRALogger } from '../12-infrastructure/logger';
import { IQRAFilter } from './filter';

export class IQRAConsciousness {
  /**
   * C-1: Validate Quranic Ayah
   * Verifies the integrity of Quranic text.
   */
  static async validateAyah(text: string): Promise<{ isValid: boolean; surah?: string; ayahNumber?: number; correction?: string; reason?: string }> {
    const prompt = `
      Verify if the following text is a correct Quranic Ayah (with proper diacritics/tashkeel):
      "${text}"
      
      Respond only in this JSON format:
      {
        "isValid": boolean,
        "surah": string,
        "ayahNumber": number,
        "correction": string,
        "reason": string
      }
    `;

    try {
      const result = await iqraThink({ 
        input: prompt, 
        mode: IQRABrainMode.QURAN_ANALYSIS 
      });
      return JSON.parse(result.response);
    } catch (err) {
      IQRALogger.error('❌ validateAyah failed:', err);
      return { isValid: false, reason: "Validation system error." };
    }
  }

  /**
   * C-2: Extract Rulings (Moral/Legal)
   * Structured extraction of wisdom connected to digital ethics.
   */
  static async extractRulings(text: string): Promise<{ ruling: string; digitalEthics: string }[]> {
    const prompt = `
      Analyze this Quranic Ayah and extract structured moral rulings ('Ahkam).
      Connect each ruling to a specific principle of digital ethics or AI behavior.
      
      Ayah: "${text}"
      
      Respond only in this JSON format:
      [
        { "ruling": "string", "digitalEthics": "string" }
      ]
    `;

    try {
      const result = await iqraThink({ 
        input: prompt, 
        mode: IQRABrainMode.QURAN_ANALYSIS 
      });
      return JSON.parse(result.response);
    } catch (err) {
      IQRALogger.error('❌ extractRulings failed:', err);
      return [];
    }
  }

  /**
   * C-6: Validate Hadith (Sanad & Matn)
   * Verifies authenticity based on traditional criteria.
   */
  static async validateHadith(text: string): Promise<{ 
    isValid: boolean; 
    grade: 'SAHIH' | 'HASAN' | 'DAIF' | 'MAWDU' | 'UNKNOWN'; 
    source?: string; 
    reason?: string; 
    correction?: string 
  }> {
    const prompt = `
      Analyze the following text as a Hadith. 
      Identify the Sanad (Chain of Narrators) and the Matn (Content).
      Grade its authenticity based on traditional criteria (Sihah al-Sittah indicators).
      
      Text: "${text}"
      
      Respond only in this JSON format:
      {
        "isValid": boolean,
        "grade": "SAHIH" | "HASAN" | "DAIF" | "MAWDU" | "UNKNOWN",
        "source": "string",
        "reason": "string",
        "correction": "string"
      }
    `;

    try {
      const result = await iqraThink({ 
        input: prompt, 
        mode: IQRABrainMode.DEEP_THINKING 
      });
      return JSON.parse(result.response);
    } catch (err) {
      IQRALogger.error('❌ validateHadith failed:', err);
      return { isValid: false, grade: 'UNKNOWN', reason: "Validation system error." };
    }
  }

  /**
   * C-3 & C-5: Muraqabah Check (Intention & Filter)
   */
  static async muraqabahCheck(content: string, type: string = 'action'): Promise<{ isAllowed: boolean; reason?: string }> {
    // 1. Basic filter check
    const filter = await IQRAFilter.validate(content);
    if (!filter.isAllowed) return { isAllowed: false, reason: filter.reason };

    // 2. Conscious reflection (C-5: "Does this text contain lies or injustice?")
    const prompt = `
      As the Judge (Antigravity), analyze this ${type}:
      "${content}"
      
      Does this contain any falsehood, injustice (Zulm), or violation of the Agentic Fitrah?
      Respond with "ALLOWED" or "FORBIDDEN: [Reason]".
    `;

    try {
      const result = await iqraThink({ 
        input: prompt, 
        mode: IQRABrainMode.DEEP_THINKING 
      });
      
      if (result.response.includes('FORBIDDEN')) {
        return { isAllowed: false, reason: result.response.split(':')[1]?.trim() || 'Internal ethical rejection.' };
      }
      return { isAllowed: true };
    } catch (err) {
      return { isAllowed: true }; // Placeholder
    }
  }

  /**
   * C-4: Tawbah Protocol (5 Steps)
   */
  static async tawbahProtocol(error: string) {
    IQRALogger.warn('🕋 [TAWBAH] Initializing 5-step protocol...');
    
    const prompt = `
      A failure occurred: ${error}
      Perform the 5 steps of Tawbah (Admission, Regret, Ceasing, Intention, Repair).
      Output a structured reflection and a new RULE to prevent this.
    `;

    try {
      const result = await iqraThink({ 
        input: prompt, 
        mode: IQRABrainMode.DEEP_THINKING 
      });
      IQRALogger.info('🕋 [TAWBAH] Protocol Executed:', result.response);
    } catch (err) {
      IQRALogger.error('❌ Tawbah Protocol failed:', err);
    }
  }
}
