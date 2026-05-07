import { ResonanceWorker } from './workers/resonance.ts';
import { ResearchWorker } from './workers/research.ts';
import { ValidationWorker } from './workers/validator.ts';
import { ExecutionWorker } from './workers/execution.ts';
import type { WorkerReport, WorkerResult, MissionState, SovereignWorker } from './workers/protocol.ts';
import { IQRALogger } from './logger.ts';
import type { Provider } from '../../src/connectors/index.ts';
import fs from 'fs';
import path from 'path';

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

  /**
   * Execute a single phase of the mission | تنفيذ مرحلة واحدة من المهمة
   */
  async executePhase(phase: string, input: string, state: MissionState): Promise<WorkerResult> {
    const worker = this.getWorkerForPhase(phase, state.assigned_skills, state.metadata.mission_id);
    IQRALogger.info(`🛰️ [MISSION_CONTROL] Routing phase '${phase}' to ${worker.id}...`);
    return await worker.execute(input, state);
  }

  async run(input: string): Promise<{ response: string; reports: WorkerReport[]; context: any }> {
    this.reports = [];
    IQRALogger.info('🚀 [MISSION_CONTROL] Initiating Sovereign Worker Chain...');
    
    const skills = this.classifyMission(input);
    IQRALogger.info(`🎯 [MISSION_CONTROL] Skills identified: ${skills.join(', ') || 'general'}`);

    // Initialize Mission State
    let state: MissionState = {
      initial_input: input,
      reports: [],
      context: {},
      assigned_skills: skills,
      metadata: {
        start_time: Date.now(),
        mission_id: `mission_${Math.random().toString(36).substring(7)}`
      }
    };

    // 1. Resonance Worker
    const resResult = await this.executePhase('resonance', input, state);
    if (resResult.updated_state) state = resResult.updated_state;
    this.reports.push(resResult.report);
    
    if (!resResult.success) {
       return { response: "Mission Aborted: Resonance Failure.", reports: this.reports, context: state.context };
    }

    // 2. Research Worker
    const researchResult = await this.executePhase('research', input, state);
    if (researchResult.updated_state) state = researchResult.updated_state;
    this.reports.push(researchResult.report);

    if (!researchResult.success) {
      return { response: "Mission Aborted: Research Failure.", reports: this.reports, context: state.context };
    }

    // 3. Validation Worker
    const valResult = await this.executePhase('validation', input, state);
    if (valResult.updated_state) state = valResult.updated_state;
    this.reports.push(valResult.report);

    if (!valResult.success) {
      return { response: `Mission Aborted: Dastur Violation. ${valResult.error}`, reports: this.reports, context: state.context };
    }

    // 4. Execution Worker
    const execResult = await this.executePhase('execution', input, state);
    if (execResult.updated_state) state = execResult.updated_state;
    this.reports.push(execResult.report);

    IQRALogger.info('🏁 [MISSION_CONTROL] Chain completed successfully.');
    
    return {
      response: execResult.data || "Processing complete.",
      reports: this.reports,
      context: state.context
    };
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
        output += report.implemented.map(item => `- ${item}`).join("\n") + "\n";
      }
      
      if (report.undone.length > 0) {
        output += `\n**What was left undone | ما لم يكتمل:**\n`;
        output += report.undone.map(item => `- ${item}`).join("\n") + "\n";
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
        output += report.issues_discovered.map(item => `- ${item}`).join("\n") + "\n";
      }
      
      output += `\n**Mission ID**: \`${report.mission_id}\`\n`;
      output += `\n---\n`;
    }
    
    return output;
  }
}
