// lib/iqra/index.ts — The Complete IQRA

import { IQRABrainMode } from './brain';
import { AgentCore } from './core';
import { IQRACommands } from './commands';
import { VoiceService } from '../../iqra-core/voice/voice_service';

export async function iqra(input: string, mode: IQRABrainMode = IQRABrainMode.FAST_RESPONSE): Promise<{
  text: string;
  audioBuffer?: Buffer;
}> {
  const voiceService = new VoiceService();
  
  // 0. CHECK COMMANDS — /status, /sleep, /wake
  if (input.startsWith('/')) {
    const command = input.split(' ')[0].toLowerCase();
    if (command === '/status') return { text: IQRACommands.getStatus() };
    if (command === '/sleep') return { text: IQRACommands.sleep() };
    if (command === '/wake') return { text: IQRACommands.wake() };
  }

  // 0.5. CHECK SLEEP STATE
  if (IQRACommands.isSleeping()) {
    return { text: "😴 IQRA في وضع النوم حالياً. استخدم /wake لإيقاظي." };
  }

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
