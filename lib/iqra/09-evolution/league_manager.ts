/**
 * 🏆 LeagueManager — مدير دوري الوكلاء السيادي
 * 
 * "وَلَوْلَا دَفْعُ اللَّهِ النَّاسَ بَعْضَهُمْ بِبَعْضٍ لَفَسَدَتِ الْأَرْضُ" — البقرة: 251
 * 
 * Inspired by AlphaStar. Instantiates adversarial roles to pressure-test solutions.
 */

import { ConnectorFactory } from '../../../src/connectors/index';
import { IQRALogger } from '../12-infrastructure/logger';

export interface LeagueVerdict {
  isStable: boolean;
  exploitsFound: string[];
  recommendations: string[];
}

export class LeagueManager {
  
  /**
   * 🤺 Run an adversarial session between a Creator and an Exploiter
   * @param solution The solution/code to be pressure-tested
   */
  static async adjudicate(solution: string): Promise<LeagueVerdict> {
    IQRALogger.info('🤺 [LEAGUE] Initiating adversarial pressure test...');

    // 1. The Creator (Gemma/Groq) - Already provided the solution
    
    // 2. The Exploiter (Phi-3/Topological) - Finds structural weaknesses
    const exploits = await this.runExploiter(solution);
    
    // 3. The Auditor (FunctionGemma/Validator) - Final judgment
    const verdict = await this.runAuditor(solution, exploits);
    
    return verdict;
  }

  /**
   * 🐍 The Exploiter Role: Tries to break the logic
   */
  private static async runExploiter(solution: string): Promise<string[]> {
    const connector = ConnectorFactory.getConnector('google'); // Using Gemini for complex exploitation
    const prompt = `
      You are the IQRA Exploiter (inspired by AlphaStar League). 
      Your sole mission is to find logical holes, security vulnerabilities, or "topological breaks" in this solution.
      Be brutal. No mocks allowed.
      
      SOLUTION:
      ${solution}
      
      Identify exactly 3 potential exploits or weaknesses.
    `;
    
    const result = await connector.generate(prompt);
    return result.split('\n').filter(line => line.includes('-') || line.includes('*'));
  }

  /**
   * ⚖️ The Auditor Role: Final Verdict
   */
  private static async runAuditor(solution: string, exploits: string[]): Promise<LeagueVerdict> {
    const connector = ConnectorFactory.getConnector('google');
    const prompt = `
      You are the IQRA Auditor. Review this solution and the identified exploits.
      Is the solution stable enough for the TrustChain?
      
      SOLUTION: ${solution.slice(0, 500)}...
      EXPLOITS FOUND:
      ${exploits.join('\n')}
      
      Return JSON: { "isStable": boolean, "exploitsFound": string[], "recommendations": string[] }
    `;

    const result = await connector.generate(prompt);
    try {
      // Extract JSON from response
      const jsonStr = result.match(/\{.*\}/s)?.[0] || '{"isStable":false, "exploitsFound":[], "recommendations":["Parse error"]}';
      return JSON.parse(jsonStr);
    } catch {
      return { isStable: false, exploitsFound: exploits, recommendations: ['Failed to parse auditor verdict'] };
    }
  }
}
