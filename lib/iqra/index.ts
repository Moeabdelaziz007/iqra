// lib/iqra/index.ts — The Complete IQRA

import { IQRABrainMode } from './brain';
import { AgentCore } from './core';
import { VoiceService } from '../../iqra-core/voice/voice_service';

export async function iqra(input: string, mode: IQRABrainMode = IQRABrainMode.FAST_RESPONSE): Promise<{
  text: string;
  audioBuffer?: Buffer;
}> {
  const voiceService = new VoiceService();
  
  // 1. EXECUTE — Includes Tasbih, Istikharah, Basmalah, Thinking, and Styling
  const finalResponse = await AgentCore.execute(input, mode);
  
  // 2. SPEAK — Convert to voice
  const voiceMode = voiceService.detectVoiceMode(finalResponse);
  const audioBuffer = await voiceService.speak(finalResponse, voiceMode);
  
  return {
    text: finalResponse,
    audioBuffer,
  };
}
