import { ResonanceWorker } from './workers/resonance.ts';
import { ResearchWorker } from './workers/research.ts';
import { ValidationWorker } from './workers/validator.ts';
import { ExecutionWorker } from './workers/execution.ts';
import { WorkerReport, WorkerResult } from './workers/protocol.ts';
import { IQRALogger } from './logger.ts';

export class MissionControl {
  private reports: WorkerReport[] = [];

  async run(input: string): Promise<{ response: string; reports: WorkerReport[] }> {
    this.reports = [];
    IQRALogger.info('🚀 [MISSION_CONTROL] Initiating Sovereign Worker Chain...');
    
    // 1. Resonance Worker (Discovery Phase - Patterns)
    // Assigned: Gemini (Google) for deep pattern discovery
    const resonanceWorker = new ResonanceWorker('google'); 
    const resResult = await resonanceWorker.execute(input);
    this.reports.push(resResult.report);
    
    if (!resResult.success) {
       return { response: "Mission Aborted: Resonance Failure.", reports: this.reports };
    }

    // 2. Research Worker (Planning Phase - Context)
    // Assigned: Gemini (Google) for deep reasoning and planning
    const researchWorker = new ResearchWorker('google'); 
    const researchResult = await researchWorker.execute(input, resResult.nextHandoff);
    this.reports.push(researchResult.report);

    if (!researchResult.success) {
      return { response: "Mission Aborted: Research Failure.", reports: this.reports };
    }

    // 3. Validation Worker (Validation Phase - Safety)
    // Assigned: Gemini (Google) for rigorous Dastur compliance
    const validationWorker = new ValidationWorker('google'); 
    const valResult = await validationWorker.execute(input, researchResult.nextHandoff);
    this.reports.push(valResult.report);

    if (!valResult.success) {
      return { response: `Mission Aborted: Dastur Violation. ${valResult.error}`, reports: this.reports };
    }

    // 4. Execution Worker (Implementation Phase - Action)
    // Assigned: Groq for low-latency delivery
    const executionWorker = new ExecutionWorker('groq'); 
    const execResult = await executionWorker.execute(input, valResult.nextHandoff);
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
