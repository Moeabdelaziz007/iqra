// lib/iqra/index.ts — The Complete IQRA

import { iqraThink, IQRABrainMode } from './brain';
import { applyIQRAStyle } from './style';
import { VoiceService } from '../../iqra-core/voice/voice_service';

export async function iqra(input: string, mode: IQRABrainMode = IQRABrainMode.FAST_RESPONSE): Promise<{
  text: string;
  audioBuffer?: Buffer;
}> {
  const voiceService = new VoiceService();
  
  // 1. THINK — LLM processes with IQRA soul
  const rawThought = await iqraThink({
    input,
    mode,
  });
  
  // 2. STYLE — Apply IQRA signature
  const styledResponse = applyIQRAStyle(rawThought);
  
  // 3. SPEAK — Convert to voice
  const voiceMode = voiceService.detectVoiceMode(styledResponse);
  const audioBuffer = await voiceService.speak(styledResponse, voiceMode);
  
  return {
    text: styledResponse,
    audioBuffer,
  };
}
