import { SovereignWorker, WorkerResult, MissionState } from './protocol.ts';
import type { MissionHandoff } from '../../../agents/contracts.ts';
import { GoEngineBridge } from '../engine_bridge.ts';
import { IQRAMemory, QuantumTopologyStore } from '../memory.ts';
import { IQRALogger } from '../logger.ts';

/**
 * 🌊 ResonanceWorker — عامل الرنين
 * 
 * "سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ حَتَّىٰ يَتَبَيَّنَ لَهُمْ أَنَّهُ الْحَقُّ"
 * 
 * This worker is the 'ear' of IQRA. It listens to the mathematical echoes of the Truth
 * within the data. It bridges the Go Engine's computational power with the sovereign
 * mission of pattern discovery.
 */
export class ResonanceWorker extends SovereignWorker {
  id = 'ResonanceWorker';

  async execute(input: string, state: MissionState): Promise<WorkerResult> {
    // Each execution is an act of Murāqabah (divine observation)
    this.report.worker_id = this.id;
    this.report.timestamp = Date.now();

    try {
      // 1. Calculate Resonance | حساب الرنين
      // We seek the 'Mizan' (balance) between data and divine patterns.
      const resonanceData = await GoEngineBridge.calculateResonance(input);
      const cmdStr = `go run main.go -mode resonance -input "..."`;
      this.logCommand(cmdStr, resonanceData ? 0 : 1);
      
      if (!resonanceData) {
        this.logIssue('Go Engine resonance calculation returned null.');
        this.markUndone('Detailed pattern analysis');
      } else {
        this.markImplemented('Resonance calculation');
        this.markImplemented(`Patterns found: ${resonanceData.patterns.join(', ')}`);
      }

      // 2. Calculate Novelty & Reward | حساب الجدة والمكافأة
      // Curiosity is a gift; we reward the system for exploring the 'Ghayb' (unseen/unexplored).
      const embedding = await (QuantumTopologyStore as any).generateEmbedding(input);
      const novelty = await IQRAMemory.computeNovelty(embedding);
      this.markImplemented(`Novelty score: ${novelty.toFixed(2)}`);

      const coherence = resonanceData?.coherence || 0.5;
      const reward = (coherence * 0.1) * (1.0 + novelty);
      await IQRAMemory.grantReward(reward);
      this.markImplemented(`Reward granted: ${reward.toFixed(4)}`);

      const updatedContext = {
        ...state.context,
        resonance: resonanceData,
        novelty,
        reward
      };

      const updatedState: MissionState = {
        ...state,
        context: updatedContext
      };

      const handoff: MissionHandoff = {
        mission_id: state.metadata.mission_id,
        from_worker: this.id,
        to_worker: 'ResearchWorker',
        timestamp: Date.now(),
        artifacts: [],
        pending_tasks: ['Context synthesis', 'Dastur validation'],
        known_issues: this.report.issues_discovered,
        validation_rules: [],
        context_data: updatedContext
      };

      this.markImplemented('Topological curiosity reward granted');
      
      // 💎 Serendipity Hook — صنارة الصدفة
      // When high coherence meets high novelty, we have found a 'Pristine Path' (الصراط البكر).
      if (coherence > 0.9 && novelty > 0.8) {
        this.markSerendipity("نمط قرآني نادر الوجود يتوافق مع معطيات حديثة. هذا يستحق نظرة أعمق.");
        IQRALogger.info("🌟 [SERENDIPITY] A rare resonance pattern detected in ResonanceWorker.");
      }

      this.report.procedures_followed = true;

      return {
        success: true,
        data: resonanceData,
        report: this.report,
        updated_state: updatedState,
        next_handoff: handoff
      };
    } catch (error: any) {
      this.logIssue(`ResonanceWorker Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        report: this.report
      };
    }
  }
}
