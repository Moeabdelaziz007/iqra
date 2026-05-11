/**
 * IQRA Worker Protocol — بروتوكول العمال
 *
 * "وَلَا تَقْفُ مَا لَيْسَ لَكَ بِهِ عِلْمٌ" — الإسراء: 36
 *
 * Defines the structure for sovereign handoffs and reports.
 * كل وكيل يُعلن نيته قبل التنفيذ — يُفحص بواسطة DamirConscience.
 */

import type { WorkerReport, MissionHandoff, CommandLog } from '#agents/contracts';
export type { WorkerReport, MissionHandoff, CommandLog };
import type { Provider } from '#connectors/index';

export interface MissionState {
  initial_input: string;
  reports: WorkerReport[];
  context: Record<string, any>;
  assigned_skills?: string[];
  metadata: {
    start_time: number;
    mission_id: string;
  };
}

export interface WorkerResult {
  success: boolean;
  data?: any;
  error?: string;
  report: WorkerReport;
  next_handoff?: MissionHandoff;
  updated_state?: MissionState;
  /** مفتاح المسار — يُبنى في MissionControl بعد اكتمال الحلقة */
  path_key?: string;
}

/**
 * نتيجة فحص الضمير — تُضاف لكل WorkerResult
 */
export interface ConscienceCheck {
  passed: boolean;
  reason?: string;
  latency_ms: number;
}

export abstract class SovereignWorker {
  abstract id: string;

  /**
   * النية الإلزامية — يُعلنها كل وكيل قبل التنفيذ
   * يُفحص بواسطة DamirConscience في sovereign.ts
   * مثال: "تحليل آية قرآنية وإيجاد الأنماط العلمية"
   */
  abstract intention: string;

  protected report: WorkerReport;
  protected provider: Provider;

  constructor(provider: Provider = 'google') {
    this.provider = provider;
    this.report = {
      mission_id: '',
      worker_id: '',
      implemented: [],
      undone: [],
      commands_run: [],
      issues_discovered: [],
      skills_used: [],
      procedures_followed: true,
      status: 'PASS',
      exit_code: 0,
      timestamp: Date.now()
    };
  }

  setMissionId(missionId: string) {
    this.report.mission_id = missionId;
  }

  setProvider(provider: Provider) {
    this.provider = provider;
    if (!this.report.model_metadata) {
      this.report.model_metadata = { provider, model: 'unknown' };
    } else {
      this.report.model_metadata.provider = provider;
    }
  }

  setModel(model: string) {
    if (!this.report.model_metadata) {
      this.report.model_metadata = { provider: this.provider, model };
    } else {
      this.report.model_metadata.model = model;
    }
  }

  protected sovereignPrompt: string = '';

  setSovereignPrompt(prompt: string) {
    this.sovereignPrompt = prompt;
  }

  setTemperature(temperature: number) {
    if (!this.report.model_metadata) {
      this.report.model_metadata = { provider: this.provider, model: 'unknown', temperature };
    } else {
      this.report.model_metadata.temperature = temperature;
    }
  }

  setLatency(latencyMs: number) {
    if (!this.report.model_metadata) {
      this.report.model_metadata = { provider: this.provider, model: 'unknown', latency_ms: latencyMs };
    } else {
      this.report.model_metadata.latency_ms = latencyMs;
    }
  }

  setSkills(skills: string[]) {
    this.report.skills_used = [...skills];
  }

  protected assignSkill(skill: string) {
    if (!this.report.skills_used.includes(skill)) {
      this.report.skills_used.push(skill);
    }
  }

  protected logCommand(command: string, exit_code: number, output?: string) {
    this.report.commands_run.push({ command, exit_code, output });
  }

  protected logIssue(issue: string) {
    this.report.issues_discovered.push(issue);
  }

  protected markImplemented(task: string) {
    this.report.implemented.push(task);
  }

  protected markUndone(task: string) {
    this.report.undone.push(task);
  }

  protected markSerendipity(note: string) {
    this.report.serendipity = { found: true, note };
  }

  abstract execute(input: any, state: MissionState): Promise<WorkerResult>;
}

/**
 * 🌉 Compatibility Bridge | جسر التوافق
 * Ensures a WorkerReport from the protocol layer is compatible with the central contracts.
 */
export function ensureCompatibility(report: WorkerReport): WorkerReport {
  return {
    ...report,
    status: report.status || 'PASS',
    exit_code: report.exit_code ?? 0,
    timestamp: report.timestamp || Date.now(),
    implemented: report.implemented || [],
    undone: report.undone || [],
    commands_run: report.commands_run || [],
    issues_discovered: report.issues_discovered || [],
    skills_used: report.skills_used || [],
    procedures_followed: report.procedures_followed ?? true,
    serendipity: report.serendipity || { found: false, note: '' }
  };
}
