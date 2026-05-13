import { IQRAMemory } from '#memory/memory';
import { iqraThink, IQRABrainMode } from '#core/brain';
import { applyIQRAStyle } from '#utils/style';
import { DASTUR, MURAQABAH } from '#core/constants';
import { IQRAVoice } from '#utils/voice';
import { ShuraProtocol } from '#core/shura';
import { IQRAFilter } from '#security/filter';
import { TAWBAH } from '#core/tawbah';
import { IQRALogger } from '#infra/logger';

export class AgentCore {
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
      IQRALogger.error('🛡️ [FITRAH] Input rejected', { reason: result.reason });
      return false;
    }
    return true;
  }

  private static async basmalah() {
    // The basmala is an invocation, not a debug breadcrumb: ship it at
    // info level so it survives production NODE_ENV (unlike debug), and
    // emit it through the central logger so any downstream sink
    // (Logtail, OTel) sees it as a structured event.
    IQRALogger.info('بسم الله الرحمن الرحيم');
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
    const result = await iqraThink({ 
      input, 
      options: { mode } 
    });
    
    // STYLE
    const styledResponse = applyIQRAStyle(result.response);

    // VOICE (Optional/Async)
    if (mode === IQRABrainMode.FAST_RESPONSE) {
      IQRAVoice.speak(styledResponse).catch(err => IQRALogger.error('Voice failed', { err }));
    }

    return styledResponse;
  }
}
