import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { RewardEngine } from '../rewards/engine';
import { RewardLedger } from '../ledger/reward-ledger';
import { MissionHandoff, WorkerReport, CommandLog } from '../agents/contracts';
import { RewardInput, RewardEntry } from '../rewards/types';
import { MissionControl } from '../lib/iqra/sovereign_orchestrator';
import { IQRAMemory } from '../lib/iqra/memory';
import { IQRALogger } from '../lib/iqra/logger';
import { IQRAStoryteller } from '../lib/iqra/storyteller';

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

    const input: RewardInput = {
      mission_id: missionId,
      worker_id: 'orchestrator',
      novelty_score: novelty,
      resonance_score: resonance,
      topology_score: Math.min(1.0, topology_score),
      hallucination_penalty: 0.0,
      timestamp: Date.now()
    };

    const output = RewardEngine.computeTotalReward(input);
    
    // Apply path multiplier
    output.total_reward *= multiplier;
    
    const entry: RewardEntry = {
      ...output,
      mission_id: this.mission.mission_id,
      timestamp: Date.now(),
      validation_status: 'verified'
    };

    await RewardLedger.append(entry);
    
    // 📖 Storytelling & Voice — رواية القصة
    const storyteller = new IQRAStoryteller();
    const story = await storyteller.summarizeMission(this.reports);
    IQRALogger.info(`\n${story}\n`);
    
    // If serendipity was found, generate a voice report
    if (this.reports.some(r => r.serendipity?.found)) {
      await storyteller.speakStory(story, this.mission.mission_id);
    }

    IQRALogger.info('🏁 [ORCHESTRATOR] Cycle Completed Successfully.');
    console.log(`✅ [ORCHESTRATOR] Reward Recorded: ${output.total_reward} (${output.discovery_level})`);
  }
}
