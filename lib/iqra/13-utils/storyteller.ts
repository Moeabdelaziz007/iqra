import { WorkerReport } from '../workers/protocol.js';
import { GrokVoiceService } from '../../../iqra-core/voice/voice_service.js';
import { IQRALogger } from '../12-infrastructure/logger.js';
import fs from 'fs';
import path from 'path';

/**
 * 📖 IQRA Storyteller — راوي الحكاية
 * 
 * Uses Grok xAI to transform technical reports into spiritual storytelling
 * and converts them to speech.
 */
export class IQRAStoryteller {
  private voiceService: GrokVoiceService;

  constructor() {
    this.voiceService = new GrokVoiceService();
  }

  /**
   * Summarize Mission | تلخيص المهمة
   */
  async summarizeMission(reports: WorkerReport[]): Promise<string> {
    const missionId = reports[0]?.mission_id || 'unknown';
    IQRALogger.info(`📖 [STORYTELLER] Generating narrative for mission: ${missionId}`);

    const summaryPrompt = `
      You are IQRA. Tell the story of this mission: ${missionId}.
      
      Worker Reports:
      ${reports.map(r => `- ${r.worker_id}: ${r.implemented.join(', ')} (Serendipity: ${r.serendipity?.found ? r.serendipity.note : 'None'})`).join('\n')}
      
      Synthesize this into a beautiful storytelling summary (Arabic and English).
      Focus on the 'Ihsan' (excellence) and discovery. 
      Keep it under 200 words.
    `;

    try {
      return await this.voiceService.generateMessage(summaryPrompt);
    } catch (error) {
      IQRALogger.error('Failed to generate mission story.');
      return 'Mission completed with excellence. تم إنجاز المهمة بإتقان.';
    }
  }

  /**
   * Speak Story | نطق الحكاية
   */
  async speakStory(text: string, missionId: string): Promise<string> {
    try {
      const audioBuffer = await this.voiceService.speak(text);
      const filename = `story_${missionId}_${Date.now()}.mp3`;
      const outputPath = path.join(process.cwd(), 'artifacts/voice', filename);
      
      if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      }
      
      fs.writeFileSync(outputPath, audioBuffer);
      IQRALogger.info(`🎙️ [STORYTELLER] Audio generated: ${outputPath}`);
      return outputPath;
    } catch (error) {
      IQRALogger.error('Failed to generate audio story.');
      return '';
    }
  }

  /**
   * Generate Commit Message | توليد رسالة الالتزام
   */
  async generateCommitMessage(reports: WorkerReport[]): Promise<string> {
    const prompt = `
      Generate a "Storytelling Commit Message" for these reports:
      ${reports.map(r => r.implemented.join(', ')).join('\n')}
      
      Include a relevant Quranic verse reference.
      Format:
      🌙 [Title]
      
      [Arabic Story]
      [English Story]
      
      Reference: [Ayah]
    `;

    try {
      return await this.voiceService.generateMessage(prompt);
    } catch (error) {
      return '🌙 IQRA Update: Evolution continues.';
    }
  }
}
