import { ResonanceWorker } from './workers/resonance.ts';
import { ResearchWorker } from './workers/research.ts';
import { ValidationWorker } from './workers/validator.ts';
import { ExecutionWorker } from './workers/execution.ts';
import { WorkerReport, WorkerResult, MissionState, SovereignWorker } from './workers/protocol.ts';
import { IQRALogger } from './logger.ts';
import { Provider } from '../../src/connectors/index.ts';
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

  private getWorkerForPhase(phase: string, skills: string[]): SovereignWorker {
    this.loadModels();
    const config = this.modelsConfig?.mission_mapping?.[phase];
    let provider: Provider = 'google';

    if (config) {
      // Logic to pick based on skills could be more complex
      // For now, use the default provider in config
      provider = config.provider as Provider;
    }

    let worker: SovereignWorker;
    switch (phase) {
      case 'resonance': worker = new ResonanceWorker(provider); break;
      case 'research': worker = new ResearchWorker(provider); break;
      case 'validation': worker = new ValidationWorker(provider); break;
      case 'execution': worker = new ExecutionWorker(provider); break;
      default: worker = new ExecutionWorker(provider);
    }

    worker.setSkills(skills);
    return worker;
  }

  async run(input: string): Promise<{ response: string; reports: WorkerReport[] }> {
    this.reports = [];
    IQRALogger.info('🚀 [MISSION_CONTROL] Initiating Sovereign Worker Chain...');
    
    const skills = this.classifyMission(input);
    IQRALogger.info(`🎯 [MISSION_CONTROL] Skills identified: ${skills.join(', ') || 'general'}`);

    // Initialize Mission State
    let state: MissionState = {
      initialInput: input,
      reports: [],
      context: {},
      assignedSkills: skills,
      metadata: {
        startTime: Date.now(),
        missionId: `mission_${Math.random().toString(36).substring(7)}`
      }
    };

    // 1. Resonance Worker
    const resonanceWorker = this.getWorkerForPhase('resonance', skills);
    const resResult = await resonanceWorker.execute(input, state);
    if (resResult.updatedState) state = resResult.updatedState;
    this.reports.push(resResult.report);
    
    if (!resResult.success) {
       return { response: "Mission Aborted: Resonance Failure.", reports: this.reports };
    }

    // 2. Research Worker
    const researchWorker = this.getWorkerForPhase('research', skills);
    const researchResult = await researchWorker.execute(input, state);
    if (researchResult.updatedState) state = researchResult.updatedState;
    this.reports.push(researchResult.report);

    if (!researchResult.success) {
      return { response: "Mission Aborted: Research Failure.", reports: this.reports };
    }

    // 3. Validation Worker
    const validationWorker = this.getWorkerForPhase('validation', skills);
    const valResult = await validationWorker.execute(input, state);
    if (valResult.updatedState) state = valResult.updatedState;
    this.reports.push(valResult.report);

    if (!valResult.success) {
      return { response: `Mission Aborted: Dastur Violation. ${valResult.error}`, reports: this.reports };
    }

    // 4. Execution Worker
    const executionWorker = this.getWorkerForPhase('execution', skills);
    const execResult = await executionWorker.execute(input, state);
    if (execResult.updatedState) state = execResult.updatedState;
    this.reports.push(execResult.report);

    IQRALogger.info('🏁 [MISSION_CONTROL] Chain completed successfully.');
    
    return {
      response: execResult.data || "Processing complete.",
      reports: this.reports
    };
  }

  static formatWorkerReports(reports: WorkerReport[]): string {
    let output = "\n---\n";
    output += "## 🛰️ Mission Control | مركز القيادة والتحكم\n";
    output += "> \"وَفَوْقَ كُلِّ ذِي عِلْمٍ عَلِيمٌ\" — يوسف: 76\n\n";
    
    for (const report of reports) {
      const statusIcon = report.proceduresFollowed ? "✅" : "⚠️";
      output += `### 👷 [WORKER] ${report.workerId} | ${statusIcon}\n`;
      output += `**Protocol**: ${report.proceduresFollowed ? "Sovereign Alignment Followed" : "Alignment Deviation Detected"}\n`;
      
      if (report.implemented.length > 0) {
        output += `\n**What was implemented | ما تم إنجازه:**\n`;
        output += report.implemented.map(item => `- ${item}`).join("\n") + "\n";
      }
      
      if (report.undone.length > 0) {
        output += `\n**What was left undone | ما لم يكتمل:**\n`;
        output += report.undone.map(item => `- ${item}`).join("\n") + "\n";
      }
      
      if (report.commands.length > 0) {
        output += `\n**Operations | العمليات المنفذة:**\n`;
        for (const cmd of report.commands) {
          const cmdIcon = cmd.exitCode === 0 ? "🟢" : "🔴";
          output += `- ${cmdIcon} \`${cmd.command}\` (Exit: ${cmd.exitCode})\n`;
        }
      }
      
      if (report.issues.length > 0) {
        output += `\n**Issues Discovered | المشكلات المكتشفة:**\n`;
        output += report.issues.map(item => `- ${item}`).join("\n") + "\n";
      }
      
      output += `\n---\n`;
    }
    
    return output;
  }
}
