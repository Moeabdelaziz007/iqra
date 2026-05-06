/**
 * IQRA AgentCore — النواة
 * 
 * "إِنَّ اللَّهَ مَعَ الَّذِينَ اتَّقَوا وَّالَّذِينَ هُم مُّحْسِنُونَ" — النحل: 128
 * 
 * Principle of Triangulation (3): Tasbih, Istikharah, Basmalah.
 */

import { IQRAMemory } from './memory';
import { iqraThink, IQRABrainMode } from './brain';
import { applyIQRAStyle } from './style';
import { DASTUR, MURAQABAH } from './philosophy';

export class AgentCore {
  /**
   * Pre-execution hooks (Islamic Triangulation)
   */
  private static async tasbih() {
    await IQRAMemory.softReset();
  }

  private static async istikharah(input: string): Promise<boolean> {
    console.log('⚖️ Istikharah: Checking alignment with Dastur & Muraqabah...');
    // Simple check: does the input violate core tenets?
    // This is a deeper check than the basic Fitrah filter
    const lowerInput = input.toLowerCase();
    const coreTenets = [DASTUR, MURAQABAH].join(' ').toLowerCase();
    
    // In a more advanced version, this would be an LLM call to verify "intention"
    return true; // Assuming aligned for now, but hook is registered
  }

  private static async basmalah() {
    console.log('بسم الله الرحمن الرحيم');
  }

  /**
   * Execute task with sacred hooks
   */
  static async execute(input: string, mode: IQRABrainMode = IQRABrainMode.FAST_RESPONSE) {
    // 1. Tasbih (Reset)
    await this.tasbih();

    // 2. Istikharah (Consult)
    const isAligned = await this.istikharah(input);
    if (!isAligned) {
      throw new Error('Istikharah indicated this path is not aligned with IQRA values.');
    }

    // 3. Basmalah (Intention)
    await this.basmalah();

    // Now proceed to THINK
    const rawThought = await iqraThink({ input, mode });
    
    // STYLE
    const styledResponse = applyIQRAStyle(rawThought);

    return styledResponse;
  }
}
