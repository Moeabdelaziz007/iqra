// lib/iqra/index.ts — The Complete IQRA

import { IQRAExecutionLoop } from './loop';
import { IQRATopology } from './topology';

export async function executeWithIqra(task: string, action: () => Promise<void>) {
  const topology = new IQRATopology();
  await topology.syncStateWithReality();

  return IQRAExecutionLoop.runTask(async () => {
    try {
      await action();
      console.log(topology.transition(true));
    } catch (error) {
      console.log(topology.transition(false)); // Quantum Tunneling Trigger
      throw error;
    }
  }, {
    id: Date.now().toString(),
    intention: task
  });
}

import { IQRABrainMode } from './brain';
import { AgentCore } from './core';
import { IQRACommands } from './commands';
import { GrokVoiceService } from '../../iqra-core/voice/voice_service';

export async function iqra(input: string, mode: IQRABrainMode = IQRABrainMode.FAST_RESPONSE): Promise<{
  text: string;
  audioBuffer?: Buffer;
}> {
  const voiceService = new GrokVoiceService();
  
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
