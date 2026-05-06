/**
 * IQRA Worker Protocol — بروتوكول العمال
 * 
 * Defines the structure for sovereign handoffs and reports.
 */

export interface WorkerReport {
  workerId: string;
  implemented: string[];
  undone: string[];
  commands: { command: string; exitCode: number; output?: string }[];
  issues: string[];
  skillsUsed: string[]; // Skills active during this mission
  proceduresFollowed: boolean;
  timestamp: number;
}

export interface Handoff {
  from: string;
  to: string;
  payload: any;
  context: string;
}

export interface MissionState {
  initialInput: string;
  reports: WorkerReport[];
  context: Record<string, any>;
  assignedSkills?: string[]; // Dynamic skills assigned by the Orchestrator
  metadata: {
    startTime: number;
    missionId: string;
  };
}

export interface WorkerResult {
  success: boolean;
  data?: any;
  error?: string;
  report: WorkerReport;
  nextHandoff?: Handoff;
  updatedState?: MissionState;
}

import { Provider } from '../../../src/connectors/index.ts';

export abstract class SovereignWorker {
  abstract id: string;
  
  protected report: WorkerReport;
  protected provider: Provider;

  constructor(provider: Provider = 'google') {
    this.provider = provider;
    this.report = {
      workerId: '',
      implemented: [],
      undone: [],
      commands: [],
      issues: [],
      skillsUsed: [],
      proceduresFollowed: true,
      timestamp: Date.now()
    };
  }

  setProvider(provider: Provider) {
    this.provider = provider;
  }

  setSkills(skills: string[]) {
    this.report.skillsUsed = [...skills];
  }

  protected assignSkill(skill: string) {
    if (!this.report.skillsUsed.includes(skill)) {
      this.report.skillsUsed.push(skill);
    }
  }

  protected logCommand(command: string, exitCode: number, output?: string) {
    this.report.commands.push({ command, exitCode, output });
  }

  protected logIssue(issue: string) {
    this.report.issues.push(issue);
  }

  protected markImplemented(task: string) {
    this.report.implemented.push(task);
  }

  protected markUndone(task: string) {
    this.report.undone.push(task);
  }

  abstract execute(input: any, state: MissionState): Promise<WorkerResult>;
}
