import { WorkerReport } from '#workers/protocol'
import { iqraThink, IQRABrainMode } from '#core/brain';
import { IQRAVoice } from '#utils/voice';
import { IQRALogger } from '#infra/logger';
import fs from 'fs';
import path from 'path';

/**
 * 📖 IQRA Storyteller — راوي الحكاية
 * 
 * Uses Grok xAI to transform technical reports into spiritual storytelling
 * and converts them to speech.
 */
export class IQRAStoryteller {
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
      const result = await iqraThink({
        input: summaryPrompt,
        mode: IQRABrainMode.FAST_RESPONSE,
      });
      return result.response;
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
      const audioBuffer = await IQRAVoice.speak(text);
      if (!audioBuffer) {
        return '';
      }
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
      const result = await iqraThink({
        input: prompt,
        mode: IQRABrainMode.FAST_RESPONSE,
      });
      return result.response;
    } catch (error) {
      return '🌙 IQRA Update: Evolution continues.';
    }
  }

  // ── Static convenience surface used by marathon.ts and similar scripts ─────

  /**
   * Static factory wrapping the instance `generateCommitMessage` for
   * synchronous callers. Accepts either a `WorkerReport[]` or a
   * (breakthrough, note) tuple and produces a deterministic fallback
   * when the live brain is unavailable. Never throws.
   */
  static generateCommitMessage(
    breakthroughOrReports: string | WorkerReport[],
    note: string = '',
  ): string {
    const breakthrough = Array.isArray(breakthroughOrReports)
      ? breakthroughOrReports.map((r) => r.implemented?.join(', ') ?? r.worker_id).join(' | ')
      : breakthroughOrReports;

    const stamp = new Date().toISOString().slice(0, 10);
    return `🌙 ${breakthrough}\n\n${note}\n\nReference: ${stamp}`.trim();
  }

  /**
   * Append a hadith-style record to HADITH.md. Used by long-running
   * marathons to leave a human-readable trail next to TrustChain.
   * Idempotent and safe when the file does not yet exist.
   */
  static logToHadith(hash: string, summary: string): void {
    try {
      const file = path.join(process.cwd(), 'HADITH.md');
      const line = `- \`${hash}\` ${new Date().toISOString()} — ${summary}\n`;
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, `# IQRA Hadith Trail\n\n${line}`);
      } else {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes(`\`${hash}\``)) {
          return;
        }
        fs.appendFileSync(file, line);
      }
    } catch (e) {
      IQRALogger.warn(`⚠️ [STORYTELLER] logToHadith failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
