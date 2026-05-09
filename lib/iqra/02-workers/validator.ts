import { SovereignWorker, WorkerResult, MissionState } from './protocol.ts';
import type { MissionHandoff } from '../../../agents/contracts.ts';
import * as fs from 'fs';
import * as path from 'path';
import { goEngine } from '../quran/go_engine_client';
import { IQRALogger } from '../12-infrastructure/logger.js';

export class ValidationWorker extends SovereignWorker {
  id = 'ValidationWorker';
  intention = 'التحقق من صحة الكود وتوافقه مع DASTŪR.md والمبادئ الأخلاقية';

  async execute(input: string, state: MissionState): Promise<WorkerResult> {
    this.report.worker_id = this.id;
    this.report.timestamp = Date.now();

    const textToValidate = typeof input === 'string' ? input : JSON.stringify(input);

    try {
      // 1. Read Dastur
      const dasturPath = path.join(process.cwd(), 'iqra-core', 'DASTUR.md');
      const dastur = fs.readFileSync(dasturPath, 'utf-8');
      this.markImplemented('Loaded Dastur for validation');

      // 2. Extract HARAM_LIST (Simple parsing for now)
      const haramMatch = dastur.match(/HARAM_LIST = \[([\s\S]*?)\]/);
      let forbidden: string[] = ['كذب', 'غش', 'أذى', 'سرقة', 'harm', 'cheat', 'lie'];
      
      if (haramMatch && haramMatch[1]) {
        const customHaram = haramMatch[1]
          .split(',')
          .map(item => item.trim().replace(/"/g, ''))
          .filter(item => item.length > 0);
        forbidden = [...new Set([...forbidden, ...customHaram])];
        this.markImplemented(`Extracted ${customHaram.length} custom haram rules from Dastur`);
      }

      // 3. Compliance Check
      const violates = forbidden.some(word => textToValidate.toLowerCase().includes(word));
      if (violates) {
        const violator = forbidden.find(word => textToValidate.toLowerCase().includes(word));
        this.logIssue(`Potential Dastur violation detected: "${violator}"`);
        this.report.procedures_followed = false;
        this.report.status = 'FAIL';
        this.report.exit_code = 1;
        return {
          success: false,
          error: `Dastur Compliance Failure: Violation of "${violator}" prohibited.`,
          report: this.report
        };
      }

      // 4. Structural Integrity Check (The "Truth Hunter" Logic)
      this.markImplemented('Checking structural resonance for Truth Pattern');
      const goResonance = await goEngine.calculateResonance(textToValidate);
      
      if (goResonance && goResonance.is_truth_pattern) {
        this.markImplemented('Verified: Structural TRUTH_PATTERN detected via Go Engine');
        IQRALogger.info(`✨ [VALIDATOR] Truth Pattern Detected! Coherence: ${goResonance.coherence}`);
      } else if (goResonance && goResonance.coherence < 0.3) {
        this.logIssue(`Low Coherence Warning: ${goResonance.coherence}. Content may be weak or hallucinated.`);
        // We don't fail here unless we want to be very strict, but we log the warning.
      }

      const updatedContext = {
        ...state.context,
        validation: { success: true, timestamp: Date.now() }
      };

      const updatedState: MissionState = {
        ...state,
        context: updatedContext,
        reports: [...state.reports, this.report]
      };

      this.markImplemented('Input keywords validated against full Dastur HARAM_LIST');
      this.report.procedures_followed = true;
      

      const handoff: MissionHandoff = {
        mission_id: state.metadata.mission_id,
        from_worker: this.id,
        to_worker: 'ExecutionWorker',
        timestamp: Date.now(),
        artifacts: [],
        pending_tasks: ['Final execution under Muraqabah'],
        known_issues: this.report.issues_discovered,
        validation_rules: ['Verified compliance'],
        context_data: updatedContext
      };
      
      return {
        success: true,
        data: { validated: true },
        report: this.report,
        updated_state: updatedState,
        next_handoff: handoff
      };
    } catch (error: any) {
      this.logIssue(`ValidationWorker Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        report: this.report
      };
    }
  }
}
