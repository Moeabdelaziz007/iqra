import { ResonanceWorker } from '#workers/resonance';
import { ResearchWorker } from '#workers/research';
import { ValidationWorker } from '#workers/validator';
import { ExecutionWorker } from '#workers/execution';
import type { WorkerReport, WorkerResult, MissionState, SovereignWorker } from '#workers/protocol';
import { IQRALogger } from '#infra/logger';
import type { Provider } from '#connectors/index';
import fs from 'fs';
import path from 'path';
import { logToIQRAFile, appendToTrustChain } from '#security/security';
import { ResourceFactory } from '#security/conscience/resource_factory';
import { RewardEngine } from '#rewards/engine';
import { SovereignIdentity } from '#security/sovereign_identity';
import { TopologicalAnalyzer } from '#skills/topological_analyzer';
import { Search369 } from '#evolution/search_369';
import { LeagueManager } from '#evolution/league_manager';
import { TawbahLoop } from '#evolution/tawbah_loop';
import { SkillBank } from '#skills/skill_bank';
import { FithrahBaseline } from '#security/audit/fithrah_baseline';
import { IQRAMemory } from '#memory/memory';
import { SovereignCognitiveOrchestrator } from '#cognitive/engine';

// ── Damir يُحمَّل lazily لتجنب circular imports ──────────────────────────────
let _missionDamir: import('#security/damir_conscience').DamirConscience | null = null;

async function getMissionDamir() {
  if (!_missionDamir) {
    const { DamirConscience } = await import('#security/damir_conscience');
    _missionDamir = new DamirConscience();
  }
  return _missionDamir;
}

export class MissionControl {
  private reports: WorkerReport[] = [];
  private modelsConfig: any = null;

  private loadModels() {
    if (this.modelsConfig) return this.modelsConfig;
    const configPath = path.join(process.cwd(), 'lib/iqra/evolution/models.json');
    if (fs.existsSync(configPath)) {
      this.modelsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return this.modelsConfig;
  }

  private classifyMission(input: string): string[] {
    const skills: string[] = [];
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('code') || lowerInput.includes('function') || lowerInput.includes('bug')) {
      skills.push('coding');
    }
    if (lowerInput.includes('quran') || lowerInput.includes('verse') || lowerInput.includes('hadith')) {
      skills.push('quran_analysis');
    }
    if (lowerInput.includes('search') || lowerInput.includes('find') || lowerInput.includes('who is')) {
      skills.push('research');
    }
    if (lowerInput.includes('plan') || lowerInput.includes('strategy')) {
      skills.push('reasoning');
    }
    if (lowerInput.includes('visual') || lowerInput.includes('ui') || lowerInput.includes('image')) {
      skills.push('creative');
    }

    if (skills.length === 0) {
      skills.push('general');
    }
    return skills;
  }

  private getWorkerForPhase(phase: string, skills: string[], missionId: string): SovereignWorker {
    this.loadModels();

    // 1. Planning: Strong Reasoning (Gemini 1.5 Pro)
    // 2. Implementation: Fast Building (Groq Llama 3)
    // 3. Validation: Strict Logic (Gemini 1.5 Flash)

    let provider: Provider = 'google';
    let model = 'gemini-1.5-pro';

    switch (phase) {
      case 'resonance': 
        provider = 'google';
        model = 'gemini-1.5-flash';
        break;
      case 'research': 
        provider = 'google';
        model = 'gemini-1.5-pro';
        break;
      case 'validation': 
        provider = 'google';
        model = 'gemini-1.5-flash'; // High precision/fast logic
        break;
      case 'execution': 
        provider = 'groq';
        model = 'llama-3.1-70b-versatile'; // Fast builder
        break;
    }

    // Override with custom config if present
    const config = this.modelsConfig?.mission_mapping?.[phase];
    if (config) {
      provider = config.provider as Provider;
      if (config.model) model = config.model;
    }

    let worker: SovereignWorker;
    switch (phase) {
      case 'resonance': worker = new ResonanceWorker(provider); break;
      case 'research': worker = new ResearchWorker(provider); break;
      case 'validation': worker = new ValidationWorker(provider); break;
      case 'execution': worker = new ExecutionWorker(provider); break;
      default: worker = new ExecutionWorker(provider);
    }

    worker.setMissionId(missionId);
    worker.setSkills(skills);
    
    // 🏷️ Model Metadata Tracking — تسجيل الجندي
    // Tracks model version, provider and configuration for compounding advantage
    (worker as any).report.model_metadata = { 
      provider, 
      model,
      temperature: 0.1, // Fixed for deterministic sovereign operations
      version: 'v1.1-sovereign'
    };
    
    return worker;
  }

  private async executePhase(phase: string, input: string, state: MissionState, mock: boolean = false): Promise<WorkerResult> {
    const worker = this.getWorkerForPhase(phase, state.context.skills, state.metadata.mission_id);
    
    if (mock) {
      IQRALogger.info(`🧪 [MISSION_CONTROL] Mocking phase: ${phase}`);
      return {
        success: true,
        data: `Mock response for ${phase}`,
        report: {
          worker_id: worker.id,
          mission_id: state.metadata.mission_id,
          timestamp: Date.now(),
          status: 'PASS',
          exit_code: 0,
          commands_run: [],
          implemented: [`Mocked ${phase}`],
          undone: [],
          issues_discovered: [],
          skills_used: [],
          source_attestations: [],
          no_mock_verified: false,
          procedures_followed: true,
        },
      };
    }

    IQRALogger.info(`🛰️ [MISSION_CONTROL] Routing phase '${phase}' to ${worker.id}...`);

    const intention = (worker as any).intention ?? `تنفيذ مرحلة ${phase} للمهمة ${state.metadata.mission_id}`;
    const factoryResult = ResourceFactory.forWorker(
      worker.id,
      state.metadata.mission_id,
      intention
    );

    const damir = await getMissionDamir();

    for (const r of factoryResult.resources) {
      damir.registerResource(r);
    }

    const action = {
      id: `${state.metadata.mission_id}:${phase}`,
      intention,
      requiredResources: factoryResult.resources,
      agent_id: worker.id,
    };

    const verdict = damir.check(action);

    if (!verdict.allowed) {
      const tawbahEntry = `
### 🛑 [MISSION_DAMIR_BLOCK] ${new Date().toISOString()}
- **Phase**: ${phase}
- **Worker**: ${worker.id}
- **Mission**: ${state.metadata.mission_id}
- **Intention**: ${intention}
- **Reason**: ${verdict.reason}
- **Type**: ${verdict.rejection_type ?? 'unknown'}
---`;
      await logToIQRAFile('TAWBAH.md', tawbahEntry);
      appendToTrustChain('MISSION:CONSCIENCE_BLOCK', `${state.metadata.mission_id}:${phase}`, `BLOCKED reason="${verdict.reason}"`, 0.0);
      IQRALogger.warn(`🛑 [MISSION_CONTROL] Damir blocked phase '${phase}': ${verdict.reason}`);
      damir.reset();

      return {
        success: false,
        error: `[DAMIR_BLOCK] ${verdict.reason}`,
        report: {
          mission_id: state.metadata.mission_id,
          worker_id: worker.id,
          implemented: [],
          undone: [`Phase ${phase} blocked by conscience`],
          commands_run: [],
          issues_discovered: [verdict.reason],
          skills_used: [],
          procedures_followed: false,
          status: 'FAIL',
          exit_code: 1,
          source_attestations: [],
          no_mock_verified: true,
          timestamp: Date.now(),
        },
      };
    }

    damir.execute(action);

    const integratedSoul = await SovereignIdentity.getIntegratedSoul(worker.id, intention);
    worker.setSovereignPrompt(integratedSoul);

    return await worker.execute(input, state);
  }

  async run(input: string, options: { mock?: boolean } = {}): Promise<{ response: string; reports: WorkerReport[]; provider: string; context: any }> {
    this.reports = [];
    const missionId = `mission_${Date.now()}`;
    IQRALogger.info(`🛰️ [MISSION_CONTROL] Starting mission ${missionId}: "${input}"`);

    // 0. 🛑 Halting Check (Tawbah)
    const isHalted = await this.checkIfHalted();
    if (isHalted) {
      return { 
        response: "🛑 System Halted: Too many uncorrected errors in TAWBAH.md. Self-correction required.", 
        reports: [], 
        provider: 'local', 
        context: { halted: true } 
      };
    }
    
    const skills = this.classifyMission(input);
    let state: MissionState = {
      initial_input: input,
      reports: [],
      context: { skills },
      assigned_skills: skills,
      metadata: {
        start_time: Date.now(),
        mission_id: missionId
      }
    };

    for (const skill of skills) {
      const content = SkillBank.getSkillContent(skill);
      if (content) {
        state.context[`skill_${skill}`] = content;
        IQRALogger.info(`🛠️ [MISSION_CONTROL] Skill context loaded: ${skill}`);
      }
    }

    if (skills.includes('quran_analysis') || skills.includes('reasoning')) {
      IQRALogger.info('🧠 [MISSION_CONTROL] Initiating Sovereign Cognitive Exploration...');
      const cognitiveOrchestrator = new SovereignCognitiveOrchestrator();
      const cognitiveResult = await cognitiveOrchestrator.explore(input);
      
      state.context.cognitive = {
        simulation: cognitiveResult.simulation,
        topology: cognitiveResult.topology,
        swarm_path: cognitiveResult.swarmPath,
        found_verses_count: cognitiveResult.foundVerses.length
      };

      input = `[COGNITIVE_INSIGHT]: Best Path identified via MCTS: ${cognitiveResult.simulation.bestAction}\n` +
              `[TOPOLOGICAL_RESONANCE]: Betti Numbers: ${JSON.stringify(cognitiveResult.topology.betti)}\n` +
              `[ORIGINAL_INPUT]: ${input}`;
              
      IQRALogger.info(`✅ [MISSION_CONTROL] Cognitive exploration complete.`);
    }

    IQRALogger.info('🧬 [MISSION_CONTROL] Initiating Alpha Evolution pulse...');
    const evolutionWinner = await Search369.evolve(input);
    state.context.evolution = {
      winner: evolutionWinner.vector,
      score: evolutionWinner.score,
      simulation: evolutionWinner.vector
    };

    const leagueVerdict = await LeagueManager.adjudicate(evolutionWinner.vector);
    if (!leagueVerdict.isStable) {
      return { response: "Mission Aborted: League Stability Failure.", reports: [], provider: 'local', context: state.context };
    }

    const winnerEmbedding = await IQRAMemory.generateEmbedding(evolutionWinner.vector);
    const alignment = await FithrahBaseline.verifyAlignment(evolutionWinner.vector, winnerEmbedding);
    if (!alignment.isAligned) {
      state.context.anomaly_detected = true;
    }

    let lastProvider = 'local';

    // 1. Resonance Phase
    const resResult = await this.executePhase('resonance', input, state, options.mock);
    if (resResult.updated_state) state = resResult.updated_state;
    this.reports.push(resResult.report);
    if (!resResult.success) {
      await TawbahLoop.run();
      return { response: "Mission Aborted: Resonance Failure.", reports: this.reports, provider: 'local', context: state.context };
    }
    state.context.resonance = resResult.data;

    // 2. Research Phase
    const reschResult = await this.executePhase('research', input, state, options.mock);
    if (reschResult.updated_state) state = reschResult.updated_state;
    this.reports.push(reschResult.report);
    if (!reschResult.success) {
      await TawbahLoop.run();
      return { response: "Mission Aborted: Research Failure.", reports: this.reports, provider: 'local', context: state.context };
    }
    state.context.research = reschResult.data;

    // 3. Validation Phase
    const valResult = await this.executePhase('validation', input, state, options.mock);
    if (valResult.updated_state) state = valResult.updated_state;
    this.reports.push(valResult.report);
    if (!valResult.success) {
      await TawbahLoop.run();
      return { response: "Mission Aborted: Validation Failure.", reports: this.reports, provider: 'local', context: state.context };
    }
    state.context.validation = valResult.data;

    // 4. Execution Worker
    const execResult = await this.executePhase('execution', input, state, options.mock);
    if (execResult.updated_state) state = execResult.updated_state;
    this.reports.push(execResult.report);
    if (!execResult.success) {
      IQRALogger.error(`❌ [MISSION_CONTROL] Execution Phase Failed: ${execResult.error}`);
      await TawbahLoop.run();
      return { response: `Mission Failed: ${execResult.error}`, reports: this.reports, provider: 'local', context: state.context };
    }
    state.context.execution = execResult.data;

    IQRALogger.info('🏁 [MISSION_CONTROL] Chain completed successfully.');

    // Determine last provider used
    const lastReport = this.reports[this.reports.length - 1];
    lastProvider = (lastReport as any).model_metadata?.provider || 'local';

    // ── بناء PathKey ومنح المكافأة ────────────────────────────────────────
    const pathKey = RewardEngine.buildPathKey(this.reports);
    const resonance = state.context?.resonance?.topological_score ?? 0.3;

    const rewardEntry = await RewardEngine.grantFromReports(
      state.metadata.mission_id,
      this.reports,
      resonance
    );

    IQRALogger.info(
      `🏆 [MISSION_CONTROL] Reward: ${rewardEntry.total_reward.toFixed(3)} | ` +
      `${rewardEntry.pristine_multiplier_applied ? '🌟 PRISTINE PATH' : 'repeated path'}`
    );

    return {
      response: execResult?.data || "Processing complete.",
      reports: this.reports,
      provider: lastProvider || 'local',
      context: {
        ...state.context,
        reward: rewardEntry,
        path_key: pathKey,
      },
    };
  }

  private async checkIfHalted(): Promise<boolean> {
    const tawbahPath = path.join(process.cwd(), 'TAWBAH.md');
    if (!fs.existsSync(tawbahPath)) return false;

    const content = fs.readFileSync(tawbahPath, 'utf8');
    const uncorrectedCount = (content.match(/🛑/g) || []).length - (content.match(/✅ \[CORRECTED\]/g) || []).length;
    
    // Halt if more than 7 uncorrected errors (Sovereign limit)
    return uncorrectedCount > 7;
  }

  static formatWorkerReports(reports: WorkerReport[]): string {
    let output = "\n---\n";
    output += "## 🛰️ Mission Control | مركز القيادة والتحكم\n";
    output += "> \"وَفَوْقَ كُلِّ ذِي عِلْمٍ عَلِيمٌ\" — يوسف: 76\n\n";
    
    for (const report of reports) {
      const statusIcon = report.procedures_followed ? "✅" : "⚠️";
      const modelInfo = report.model_metadata ? ` (${report.model_metadata.provider}/${report.model_metadata.model})` : "";
      output += `### 👷 [WORKER] ${report.worker_id}${modelInfo} | ${statusIcon}\n`;
      output += `**Protocol**: ${report.procedures_followed ? "Sovereign Alignment Followed" : "Alignment Deviation Detected"}\n`;
      
      if (report.implemented.length > 0) {
        output += `\n**What was implemented | ما تم إنجازه:**\n`;
        output += report.implemented.map((item: string) => `- ${item}`).join("\n") + "\n";
      }
      
      if (report.undone.length > 0) {
        output += `\n**What was left undone | ما لم يكتمل:**\n`;
        output += report.undone.map((item: string) => `- ${item}`).join("\n") + "\n";
      }
      
      if (report.commands_run.length > 0) {
        output += `\n**Operations | العمليات المنفذة:**\n`;
        for (const cmd of report.commands_run) {
          const cmdIcon = cmd.exit_code === 0 ? "🟢" : "🔴";
          output += `- ${cmdIcon} \`${cmd.command}\` (Exit: ${cmd.exit_code})\n`;
        }
      }
      
      if (report.issues_discovered.length > 0) {
        output += `\n**Issues Discovered | المشكلات المكتشفة:**\n`;
        output += report.issues_discovered.map((item: string) => `- ${item}`).join("\n") + "\n";
      }
      
      output += `\n**Mission ID**: \`${report.mission_id}\`\n`;
      output += `\n---\n`;
    }
    
    return output;
  }
}
