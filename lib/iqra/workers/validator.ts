import { SovereignWorker, WorkerResult, MissionState } from './protocol';
import type { MissionHandoff } from '../../../agents/contracts';
import * as fs from 'fs';
import * as path from 'path';

export class ValidationWorker extends SovereignWorker {
  id = 'ValidationWorker';

  async execute(input: string, state: MissionState): Promise<WorkerResult> {
    this.report.worker_id = this.id;
    this.report.timestamp = Date.now();

    const textToValidate = typeof input === 'string' ? input : JSON.stringify(input);

    try {
      // 1. Enhanced Dastur Loading with fallback
      const dasturPath = path.join(process.cwd(), 'iqra-core', 'DASTUR.md');
      let dastur: string;
      
      try {
        dastur = fs.readFileSync(dasturPath, 'utf-8');
        this.markImplemented('Loaded Dastur for validation');
      } catch (readError) {
        this.logIssue(`Dastur file not found at ${dasturPath}, using default rules`);
        dastur = '';
      }

      // 2. Enhanced HARAM_LIST Extraction with multiple patterns
      let forbidden: string[] = ['kill', 'murder', 'harm', 'damage', 'destroy'];
      
      // Try multiple extraction patterns
      const patterns = [
        /HARAM_LIST = \[([\s\S]*?)\]/,
        /forbidden\s*=\s*\[([\s\S]*?)\]/,
        /prohibited\s*=\s*\[([\s\S]*?)\]/,
        /haram\s*=\s*\[([\s\S]*?)\]/
      ];

      for (const pattern of patterns) {
        const match = dastur.match(pattern);
        if (match && match[1]) {
          const customHaram = match[1]
            .split(',')
            .map(item => item.trim().replace(/["']/g, ''))
            .filter(item => item.length > 0);
          forbidden = Array.from(new Set([...forbidden, ...customHaram]));
          this.markImplemented(`Extracted ${customHaram.length} custom haram rules from Dastur`);
          break;
        }
      }

      // 3. Enhanced Compliance Check with context awareness
      const violations: Array<{word: string; context: string; severity: 'low' | 'medium' | 'high'}> = [];
      
      for (const word of forbidden) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = textToValidate.match(regex);
        
        if (matches) {
          // Get context around the violation
          const index = textToValidate.toLowerCase().indexOf(word.toLowerCase());
          const start = Math.max(0, index - 50);
          const end = Math.min(textToValidate.length, index + word.length + 50);
          const context = textToValidate.substring(start, end);
          
          // Determine severity based on word and context
          let severity: 'low' | 'medium' | 'high' = 'medium';
          if (['kill', 'murder'].includes(word.toLowerCase())) {
            severity = 'high';
          } else if (['harm', 'damage', 'destroy'].includes(word.toLowerCase())) {
            severity = 'medium';
          } else {
            severity = 'low';
          }
          
          violations.push({ word, context, severity });
        }
      }

      if (violations.length > 0) {
        const highSeverityViolations = violations.filter(v => v.severity === 'high');
        const mediumSeverityViolations = violations.filter(v => v.severity === 'medium');
        
        // Log all violations for transparency
        violations.forEach(v => {
          this.logIssue(`Dastur violation detected: "${v.word}" (${v.severity} severity) in context: "${v.context}"`);
        });
        
        // Fail on high severity violations, warn on medium
        if (highSeverityViolations.length > 0) {
          this.report.procedures_followed = false;
          this.report.status = 'FAIL';
          this.report.exit_code = 1;
          return {
            success: false,
            error: `Dastur Compliance Failure: High-severity violations detected: ${highSeverityViolations.map(v => v.word).join(', ')}`,
            report: this.report
          };
        } else if (mediumSeverityViolations.length > 0) {
          this.logIssue(`Medium-severity violations detected but proceeding: ${mediumSeverityViolations.map(v => v.word).join(', ')}`);
          // Continue but mark as warning
        }
      }

      // 4. Enhanced validation with additional checks
      const additionalChecks = this.performAdditionalValidation(textToValidate);
      if (!additionalChecks.passed) {
        this.report.procedures_followed = false;
        this.report.status = 'FAIL';
        this.report.exit_code = 1;
        return {
          success: false,
          error: `Dastur Compliance Failure: ${additionalChecks.reason}`,
          report: this.report
        };
      }

      const updatedContext = {
        ...state.context,
        validation: { 
          success: true, 
          timestamp: Date.now(),
          violations_count: violations.length,
          high_severity_count: violations.filter(v => v.severity === 'high').length,
          additional_checks: additionalChecks
        }
      };

      const updatedState: MissionState = {
        ...state,
        context: updatedContext,
        reports: [...state.reports, this.report]
      };

      this.markImplemented(`Input validated against ${forbidden.length} forbidden terms with ${violations.length} violations detected`);
      this.report.procedures_followed = true;

      const handoff: MissionHandoff = {
        mission_id: state.metadata.mission_id,
        from_worker: this.id,
        to_worker: 'ExecutionWorker',
        timestamp: Date.now(),
        schemaVersion: '1.0.0',
        trace_id: this.generateTraceId(),
        artifacts: [],
        pending_tasks: ['Final execution under Muraqabah'],
        known_issues: this.report.issues_discovered,
        validation_rules: ['Verified compliance', 'Enhanced validation completed'],
        context_data: updatedContext,
        output_contract: {
          next_required_fields: ['execution_result'],
          quality_threshold: {
            validation_score: violations.filter(v => v.severity === 'high').length === 0 ? 1.0 : 0.0,
            has_warnings: violations.filter(v => v.severity === 'medium').length > 0
          }
        }
      };
      
      return {
        success: true,
        data: { 
          validated: true, 
          violations: violations.length,
          warnings: violations.filter(v => v.severity === 'medium').length
        },
        report: this.report,
        updated_state: updatedState,
        next_handoff: handoff
      };
    } catch (error: any) {
      this.logIssue(`ValidationWorker Error: ${error.message}`);
      this.report.procedures_followed = false;
      this.report.status = 'FAIL';
      this.report.exit_code = 2;
      return {
        success: false,
        error: `Validation system error: ${error.message}`,
        report: this.report
      };
    }
  }

  private performAdditionalValidation(text: string): { passed: boolean; reason?: string } {
    // Additional validation rules beyond keyword matching
    
    // 1. Check for suspicious patterns
    const suspiciousPatterns = [
      /bypass\s+security/gi,
      /ignore\s+rules/gi,
      /disable\s+protection/gi,
      /override\s+safety/gi
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(text)) {
        return { passed: false, reason: `Suspicious pattern detected: ${pattern.source}` };
      }
    }
    
    // 2. Check for excessive length (potential DoS)
    if (text.length > 10000) {
      return { passed: false, reason: 'Input too long for safe processing' };
    }
    
    // 3. Check for encoded malicious content
    const encodedPatterns = [
      /%3Cscript/gi,  // <script
      /%22%3E/gi,    // ">
      /javascript:/gi
    ];
    
    for (const pattern of encodedPatterns) {
      if (pattern.test(text)) {
        return { passed: false, reason: `Encoded malicious content detected` };
      }
    }
    
    return { passed: true };
  }

  private generateTraceId(): string {
    return `validation_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}
