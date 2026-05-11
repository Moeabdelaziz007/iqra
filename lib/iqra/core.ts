import { IQRAMemory } from './memory';
import { iqraThink, IQRABrainMode } from './brain';
import { applyIQRAStyle } from './style';
import { DASTUR, MURAQABAH } from './philosophy';
import { VoiceService } from '../../iqra-core/voice/voice_service';
import { ShuraProtocol } from './shura';
import { IQRAFilter } from './filter';
import { TAWBAH } from './tawbah';

export interface IQRAPulse {
  type: 'TASBIH' | 'ISTIKHARAH' | 'BASMALAH' | 'SHURA' | 'THINKING' | 'STYLE' | 'COMPLETED';
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';
  message?: string;
  data?: any;
}

export class AgentCore {
  private static voice = new VoiceService();

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
  static async execute(
    input: string,
    mode: IQRABrainMode = IQRABrainMode.FAST_RESPONSE,
    onPulse?: (pulse: IQRAPulse) => void
  ) {
    const pulse = (type: IQRAPulse['type'], status: IQRAPulse['status'], message?: string, data?: any) => {
      if (onPulse) onPulse({ type, status, message, data });
    };

    try {
      // 1. Tasbih (Reset)
      pulse('TASBIH', 'IN_PROGRESS', 'Purifying state...');
      await this.tasbih();
      pulse('TASBIH', 'SUCCESS', 'State purified.');

      // 2. Istikharah (Fitrah/Alignment Check)
      pulse('ISTIKHARAH', 'IN_PROGRESS', 'Verifying Fitrah alignment...');
      const isAligned = await this.istikharah(input);
      if (!isAligned) {
        pulse('ISTIKHARAH', 'FAILED', 'Input deviates from IQRA Fitrah.');
        // If rejected, trigger Tawbah (Reflect on why we got bad input)
        await TAWBAH.perform();
        throw new Error('ISTIKHARAH_FAILED: Input deviates from IQRA Fitrah.');
      }
      pulse('ISTIKHARAH', 'SUCCESS', 'Input aligned with Fitrah.');

      // 3. Basmalah (Intention)
      pulse('BASMALAH', 'IN_PROGRESS', 'Setting intention...');
      await this.basmalah();
      pulse('BASMALAH', 'SUCCESS', 'Intention set: Bismillah.');

      // 4. Shura Check (Consultation)
      pulse('SHURA', 'IN_PROGRESS', 'Consulting Shura Protocol...');
      const shuraApproved = await ShuraProtocol.request(input);
      if (!shuraApproved) {
        pulse('SHURA', 'FAILED', 'Shura approval required.');
        throw new Error('SHURA_REQUIRED: This action requires explicit human approval as per SHŪRĀ.md.');
      }
      pulse('SHURA', 'SUCCESS', 'Shura protocol passed.');

      // Now proceed to THINK
      pulse('THINKING', 'IN_PROGRESS', 'IQRA is thinking...');
      const rawThought = await iqraThink({
        input,
        mode,
        onPulse: (p) => onPulse?.({ ...p, type: 'THINKING' } as any) // Forward brain pulses if needed
      });
      pulse('THINKING', 'SUCCESS', 'Thought generated.');

      // STYLE
      pulse('STYLE', 'IN_PROGRESS', 'Applying IQRA style...');
      const styledResponse = applyIQRAStyle(rawThought);
      pulse('STYLE', 'SUCCESS', 'Style applied.');

      // VOICE (Optional/Async)
      if (mode === IQRABrainMode.FAST_RESPONSE) {
        this.voice.speak(styledResponse).catch(err => console.error('Voice failed:', err));
      }

      pulse('COMPLETED', 'SUCCESS', 'Mission accomplished.', { response: styledResponse });
      return styledResponse;
    } catch (error: any) {
      pulse('COMPLETED', 'FAILED', error.message);
      throw error;
    }
  }
}
