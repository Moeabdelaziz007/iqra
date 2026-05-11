import { ResonanceWorker } from './workers/resonance';
import { ResearchWorker } from './workers/research';
import { ValidationWorker } from './workers/validator';
import { ExecutionWorker } from './workers/execution';
import { StateCoordinator } from './workers/state_coordinator';
import type { WorkerReport, WorkerResult, MissionState, SovereignWorker } from './workers/protocol';
import { IQRALogger } from './logger';
import type { Provider } from '../../src/connectors/index.ts';
import fs from 'fs';
import path from 'path';

export class MissionControl {
  private reports: WorkerReport[] = [];
  private modelsConfig: any = null;
  private stateCoordinator: StateCoordinator;

  constructor() {
    this.stateCoordinator = StateCoordinator.getInstance();
  }

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
    const worker = this.getWorkerForPhase(phase, state.assigned_skills || [], state.metadata.mission_id);
    IQRALogger.info(`🛰️ [MISSION_CONTROL] Routing phase '${phase}' to ${worker.id}...`);
    
    try {
      const result = await worker.execute(input, state);
      
      // دمج الحالة باستخدام StateCoordinator
      if (result.success && result.updated_state) {
        this.stateCoordinator.mergeWorkerState(worker.id, result.updated_state);
        
        // تحديث الحالة المحلية من StateCoordinator
        const mergedState = this.stateCoordinator.getCurrentState();
        state.context = mergedState.context || state.context;
        state.reports = mergedState.reports || state.reports;
      }
      
      return result;
    } catch (error) {
      IQRALogger.error(`❌ [MISSION_CONTROL] Phase '${phase}' execution failed:`, error);
      throw error;
    }
  }

  async run(input: string): Promise<{ response: string; reports: WorkerReport[]; context: any }> {
    this.reports = [];
    IQRALogger.info('🚀 [MISSION_CONTROL] Initiating Sovereign Worker Chain...');
    
    const skills = this.classifyMission(input);
    IQRALogger.info(`🎯 [MISSION_CONTROL] Skills identified: ${skills.join(', ') || 'general'}`);

    // Initialize Mission State with enhanced tracking
    let state: MissionState = {
      initial_input: input,
      reports: [],
      assigned_skills: skills,
      metadata: {
        start_time: Date.now(),
        mission_id: `mission_${Math.random().toString(36).substring(7)}`,
        phase_history: [],
        error_count: 0,
        retry_count: 0
      }
    };

    // Enhanced orchestration with retry logic and error recovery
    const phases = ['resonance', 'research', 'validation', 'execution'];
    let lastError: string | null = null;

    for (const phase of phases) {
      const maxRetries = 2;
      let phaseSuccess = false;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          IQRALogger.info(`🛰️ [MISSION_CONTROL] Executing phase '${phase}' (attempt ${attempt + 1}/${maxRetries + 1})`);
          
          const phaseResult = await this.executePhase(phase, input, state);
          
          // Track phase execution
          if (!state.metadata.phase_history) state.metadata.phase_history = [];
          state.metadata.phase_history.push({
            phase,
            attempt: attempt + 1,
            success: phaseResult.success,
            timestamp: Date.now(),
            worker_id: phaseResult.report?.worker_id
          });

          if (phaseResult.success) {
            if (phaseResult.updated_state) state = phaseResult.updated_state;
            this.reports.push(phaseResult.report);
            phaseSuccess = true;
            IQRALogger.info(`✅ [MISSION_CONTROL] Phase '${phase}' completed successfully`);
            break;
          } else {
            lastError = phaseResult.error || `Phase ${phase} failed`;
            state.metadata.error_count = (state.metadata.error_count || 0) + 1;
            IQRALogger.warn(`⚠️ [MISSION_CONTROL] Phase '${phase}' failed: ${lastError}`);
            
            if (attempt === maxRetries) {
              // Final attempt failed - check if we can continue
              if (phase === 'validation') {
                return { 
                  response: `Mission Aborted: Dastur Violation. ${lastError}`, 
                  reports: this.reports, 
                  context: state.context 
                };
              } else if (phase === 'resonance') {
                return { 
                  response: "Mission Aborted: Resonance Failure.", 
                  reports: this.reports, 
                  context: state.context 
                };
              } else if (phase === 'research') {
                // Research failure is less critical - continue with warning
                IQRALogger.warn(`⚠️ [MISSION_CONTROL] Research failed but continuing: ${lastError}`);
                phaseSuccess = true;
                break;
              }
            } else {
              // Retry with exponential backoff
              const backoffMs = Math.pow(2, attempt) * 1000;
              IQRALogger.info(`⏳ [MISSION_CONTROL] Retrying phase '${phase}' in ${backoffMs}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoffMs));
              state.metadata.retry_count = (state.metadata.retry_count || 0) + 1;
            }
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          state.metadata.error_count = (state.metadata.error_count || 0) + 1;
          IQRALogger.error(`❌ [MISSION_CONTROL] Phase '${phase}' threw error: ${lastError}`);
          
          if (attempt === maxRetries) {
            return { 
              response: `Mission Aborted: Critical Error in ${phase}. ${lastError}`, 
              reports: this.reports, 
              context: state.context 
            };
          }
        }
      }

      if (!phaseSuccess) {
        IQRALogger.error(`❌ [MISSION_CONTROL] Phase '${phase}' failed after all retries`);
        return { 
          response: `Mission Aborted: ${phase} phase failed after ${maxRetries + 1} attempts. ${lastError}`, 
          reports: this.reports, 
          context: state.context 
        };
      }
    }

    // Mission completed successfully
    const totalTime = Date.now() - state.metadata.start_time;
    IQRALogger.info(`🏁 [MISSION_CONTROL] Chain completed successfully in ${totalTime}ms`);
    IQRALogger.info(`📊 [MISSION_CONTROL] Total phases: ${phases.length}, Retries: ${state.metadata.retry_count || 0}, Errors: ${state.metadata.error_count || 0}`);
    
    return {
      response: this.reports[this.reports.length - 1]?.response || "Processing complete.",
      reports: this.reports,
      context: {
        ...state.context,
        mission_metadata: state.metadata
      }
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
