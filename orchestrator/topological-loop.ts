import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { RewardEngine } from '#rewards/engine';
import { RewardLedger } from '#rewards/ledger';
import { MissionHandoff, WorkerReport, CommandLog } from '#agents/contracts';
import { RewardEntry } from '#rewards/types';
import { MissionControl } from '#core/sovereign_orchestrator';
import { IQRAMemory } from '#memory/memory';
import { IQRALogger } from '#infra/logger';
import { IQRAStoryteller } from '#utils/storyteller';

/**
 * 🌙 IQRA Topological Loop Orchestrator — المنسق الحلقي الطوبولوجي
 * 
 * Wires the mission workflow into the reward loop.
 */

export class TopologicalLoop {
  private mission: any;
  private handoffs: MissionHandoff[] = [];
  private reports: WorkerReport[] = [];

  constructor(private missionPath: string) {
    this.loadMission();
  }

  private loadMission() {
    const content = fs.readFileSync(this.missionPath, 'utf8');
    this.mission = yaml.load(content);
    console.log(`📡 [ORCHESTRATOR] Mission Loaded: ${this.mission.mission_id}`);
  }

  async runCycle(input?: string) {
    console.log('🚀 [ORCHESTRATOR] Starting Topological Cycle...');
    const missionInput = input || this.mission.objective || "Evolutionary pulse analysis";

    try {
      const missionControl = new MissionControl();
      const result = await missionControl.run(missionInput);
      
      this.reports = result.reports;

      // 5. Reward Phase (ONLY AFTER SUCCESSFUL VALIDATION)
      // Check if validation worker succeeded
      const valReport = this.reports.find(r => r.worker_id === 'ValidationWorker');
      if (!valReport || !valReport.procedures_followed) {
        throw new Error('Mission Aborted: Validation Gate Failed or report missing.');
      }

      await this.processRewards(this.mission.mission_id, result.context);

      console.log('🏁 [ORCHESTRATOR] Cycle Completed Successfully.');
      return result.response;
    } catch (err) {
      console.error('❌ [ORCHESTRATOR] Cycle Failed:', err);
      throw err;
    }
  }



  private async processRewards(missionId: string, context?: any) {
    console.log('💎 [ORCHESTRATOR] Computing rewards...');

    const valReport = this.reports.find(r => r.worker_id === 'ValidationWorker');
    
    // 🔒 Reward Gate (Murāqabah)
    if (!valReport || valReport.status !== 'PASS' || valReport.exit_code !== 0 || !valReport.procedures_followed) {
      console.error(`🔴 [REWARD_GATE] REJECTED: Mission ${missionId} failed validation gate.`);
      // Optionally record to a FailureLedger if it exists
      return;
    }

    const novelty = context?.novelty || 0.5;
    const resonance = context?.resonance?.coherence || 0.5;
    
    // 🧠 Dynamic Topology Score — كثافة العقد
    // Ratio of implemented tasks across all workers vs total planned
    const totalImplemented = this.reports.reduce((acc, r) => acc + r.implemented.length, 0);
    const totalUndone = this.reports.reduce((acc, r) => acc + r.undone.length, 0);
    const topology_score = totalImplemented / (totalImplemented + totalUndone || 1);

    // 🛣️ Pristine Path Multiplier — ميزان الرنين (الطريق البكر)
    // Tracks the sequence of worker successes as a topological path
    const pathKey = `path:${this.reports.map(r => `${r.worker_id}:${r.status}`).join('->')}`;
    const pathExists = await IQRAMemory.get(`curiosity:${pathKey}`);
    let multiplier = 1.0;

    if (!pathExists) {
      multiplier = 2.0; // 2x reward for exploring a new path
      await IQRAMemory.set(`curiosity:${pathKey}`, Date.now());
      IQRALogger.info(`🌌 [RESONANCE_BALANCE] Pristine Path Discovered: ${pathKey}. Multiplier: 2.0x`);
    }

    const input: any = {
      mission_id: missionId,
      worker_id: 'orchestrator',
      novelty_score: novelty,
      resonance_score: resonance,
      topology_score: Math.min(1.0, topology_score),
      hallucination_penalty: 0.0,
      timestamp: Date.now()
    };

    const output = RewardEngine.computeReward(input);
    
    // Apply path multiplier
    output.total *= multiplier;
    
    const entry: Omit<RewardEntry, 'ledger_id' | 'recorded_at'> = {
      mission_id: this.mission.mission_id,
      worker_id: 'orchestrator',
      timestamp: Date.now(),
      base_reward: output.base,
      total_reward: output.total,
      reward_vector: input,
      discovery_level: RewardEngine.classifyDiscovery(output.total),
      confidence: 0.8,
      validation_status: 'verified',
      notes: `Topological loop completion with ${multiplier}x multiplier`
    };

    await RewardLedger.record(entry);
    
    // 📖 Storytelling & Voice — رواية القصة
    try {
      const storyteller = new IQRAStoryteller();
      const story = await storyteller.summarizeMission(this.reports);
      IQRALogger.info(`\n${story}\n`);
      
      // If serendipity was found, generate a voice report
      if (this.reports.some(r => r.serendipity?.found)) {
        await storyteller.speakStory(story, this.mission.mission_id);
      }
    } catch (storyError) {
      IQRALogger.warn('⚠️ [STORYTELLER] Story generation or voice service unavailable:', storyError);
    }

    IQRALogger.info('🏁 [ORCHESTRATOR] Cycle Completed Successfully.');
    console.log(`✅ [ORCHESTRATOR] Reward Recorded: ${output.total} (level: ${RewardEngine.classifyDiscovery(output.total)})`);
  }
}
