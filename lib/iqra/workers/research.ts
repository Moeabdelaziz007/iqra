import { SovereignWorker, WorkerResult, MissionState } from './protocol.ts';
import type { MissionHandoff } from '../../../agents/contracts.ts';
import * as fs from 'fs';
import * as path from 'path';
import { IQRALogger } from '../logger.ts';

/**
 * 📚 ResearchWorker — عامل البحث
 * 
 * "وَقُل رَّبِّ زِدْنِي عِلْمًا"
 * 
 * This worker is the 'intellect' of IQRA. It synthesizes discovered patterns with
 * existing reflections and knowledge, building the 'Experience Archive'.
 */
export class ResearchWorker extends SovereignWorker {
  id = 'ResearchWorker';

  async execute(input: string, state: MissionState): Promise<WorkerResult> {
    // We begin by invoking the name of the Creator of knowledge
    this.report.worker_id = this.id;
    this.report.timestamp = Date.now();

    try {
      // 1. Gather context from DISCOVERIES.md | جمع السياق من المكتشفات
      // We look back at what was found to see how it fits the 'Fitrah' (nature) of the project.
      const discoveriesPath = path.join(process.cwd(), 'DISCOVERIES.md');
      let discoveries = '';
      if (fs.existsSync(discoveriesPath)) {
        discoveries = fs.readFileSync(discoveriesPath, 'utf-8');
        this.markImplemented('Gathered context from DISCOVERIES.md');
      } else {
        this.logIssue('DISCOVERIES.md not found.');
      }

      // 2. Gather context from REFLECTION.md | جمع السياق من التأملات
      // Wisdom is the lost property of the believer; we collect it wherever we find it.
      const reflectionPath = path.join(process.cwd(), 'REFLECTION.md');
      let reflection = '';
      if (fs.existsSync(reflectionPath)) {
        reflection = fs.readFileSync(reflectionPath, 'utf-8');
        this.markImplemented('Gathered context from REFLECTION.md');
      }

      // 3. Synthesize Research | تجميع البحث
      // We weave the threads of data into a tapestry of understanding.
      const updatedContext = {
        ...state.context,
        research: {
          discoveries: discoveries.substring(0, 1000), // Safety limit for the mind (context window)
          reflection: reflection.substring(0, 1000)
        }
      };

      const updatedState: MissionState = {
        ...state,
        context: updatedContext,
        reports: [...state.reports, this.report]
      };

      this.markImplemented('Synthesized internal research context with previous resonance data');
      
      // 💎 Serendipity Hook — صنارة الصدفة
      // Research uncovers hidden paths when combined with high resonance.
      const resonance = state.context.resonance;
      if (resonance && resonance.coherence > 0.95) {
        this.markSerendipity("بحث متعمق في أنماط الرنين عالية الدقة المكتشفة.");
        IQRALogger.info("🌟 [SERENDIPITY] Deep research triggered by high-resonance patterns.");
      }

      this.report.procedures_followed = true;

      const handoff: MissionHandoff = {
        mission_id: state.metadata.mission_id,
        from_worker: this.id,
        to_worker: 'ValidationWorker',
        timestamp: Date.now(),
        artifacts: [],
        pending_tasks: ['Dastur compliance check'],
        known_issues: this.report.issues_discovered,
        validation_rules: ['HARAM_LIST compliance'],
        context_data: updatedContext
      };
      
      return {
        success: true,
        data: updatedContext,
        report: this.report,
        updated_state: updatedState,
        next_handoff: handoff
      };
    } catch (error: any) {
      this.logIssue(`ResearchWorker Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        report: this.report
      };
    }
  }
}
