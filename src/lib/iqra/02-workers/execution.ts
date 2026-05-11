import { SovereignWorker } from './protocol';
import type { WorkerResult, MissionState } from './protocol';
import { ConnectorFactory, Provider } from '#connectors/index';
import { FULL_SYSTEM_PROMPT } from '#utils/prompts';
import { IQRAMemory } from '#memory/memory';
import { assertConscience } from './worker_conscience';

export class ExecutionWorker extends SovereignWorker {
  id = 'ExecutionWorker';
  intention = 'تنفيذ المهمة البرمجية وبناء الكود بصدق وأمانة';

  async execute(input: string, state: MissionState): Promise<WorkerResult> {
    this.report.worker_id = this.id;
    this.report.timestamp = Date.now();

    // 🫀 فحص الضمير — التوبة الفورية إذا رُفض
    await assertConscience(this.id, this.intention, state.metadata.mission_id);

    try {
      const { resonance, novelty, research } = state.context;
      
      const curiosity = await IQRAMemory.getCuriosity();
      
      let enrichedInput = `[Curiosity: ${curiosity.toFixed(2)}][Resonance: ${resonance?.coherence?.toFixed(2)}][Novelty: ${novelty?.toFixed(2)}]\n`;
      
      if (research) {
        enrichedInput += `[RESEARCH_CONTEXT]: ${research.discoveries.substring(0, 300)}...\n`;
      }
      
      enrichedInput += `[PROMPT]: ${input}`;

      const connector = ConnectorFactory.getConnector(this.provider); 
      const messages = [
        { role: 'system' as const, content: FULL_SYSTEM_PROMPT },
        { role: 'user' as const, content: enrichedInput }
      ];

      const result = await connector.generate(enrichedInput, messages);
      
      this.markImplemented('Final response generation with enriched serial context');
      this.markImplemented(`Model specialized: ${this.provider} (Execution Optimization)`);
      this.report.procedures_followed = true;

      const updatedState: MissionState = {
        ...state,
        reports: [...state.reports, this.report]
      };

      return {
        success: true,
        data: result.content,
        report: this.report,
        updated_state: updatedState
      };
    } catch (error: any) {
      this.logIssue(`ExecutionWorker Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        report: this.report
      };
    }
  }
}
