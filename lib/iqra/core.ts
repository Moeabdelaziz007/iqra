import { IQRAMemory } from './memory';
import { iqraThink, IQRABrainMode } from './brain';
import { applyIQRAStyle } from './style';
import { DASTUR, MURAQABAH } from './philosophy';
import { GrokVoiceService } from '../../iqra-core/voice/voice_service';
import { ShuraProtocol } from './shura';
import { IQRAFilter } from './filter';
import { TAWBAH } from './tawbah';

export class AgentCore {
  private static voice = new GrokVoiceService();

  /**
   * Pre-execution hooks (Islamic Triangulation)
   */
  private static async tasbih() {
    // Purify state
    await IQRAMemory.softReset();
  }

  private static async istikharah(input: string): Promise<boolean> {
    // Verify Fitrah alignment
    const result = await IQRAFilter.validate(input);
    if (!result.isAllowed) {
      console.error(`🛡️ [FITRAH] Input rejected: ${result.reason}`);
      return false;
    }
    return true;
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

    // 2. Istikharah (Fitrah/Alignment Check)
    const isAligned = await this.istikharah(input);
    if (!isAligned) {
      // If rejected, trigger Tawbah (Reflect on why we got bad input)
      await TAWBAH.perform();
      throw new Error('ISTIKHARAH_FAILED: Input deviates from IQRA Fitrah.');
    }

    // 3. Basmalah (Intention)
    await this.basmalah();

    // 4. Shura Check (Consultation)
    const shuraApproved = await ShuraProtocol.request(input);
    if (!shuraApproved) {
       throw new Error('SHURA_REQUIRED: This action requires explicit human approval as per SHŪRĀ.md.');
    }

    // Now proceed to THINK
    const rawThought = await iqraThink({ input, mode });
    
    // STYLE
    const styledResponse = applyIQRAStyle(rawThought);

    // VOICE (Optional/Async)
    if (mode === IQRABrainMode.FAST_RESPONSE) {
      this.voice.speak(styledResponse).catch(err => console.error('Voice failed:', err));
    }

    return styledResponse;
  }
}

