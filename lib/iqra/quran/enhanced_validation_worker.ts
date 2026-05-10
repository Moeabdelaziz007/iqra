/**
 * Enhanced ValidationWorker — عامل التحقق المحسّن
 * 
 * Integrates Enhanced Numerical Validator with existing ValidationWorker
 * Maintains backwards compatibility with DASTUR.md validation
 * 
 * "وَلَا تَقْفُ مَا لَيْسَ لَكَ بِهِ عِلْمٌ ۚ إِنَّ السَّمْعَ وَالْبَصَرَ وَالْفُؤَادَ كُلُّ أُولَٰئِكَ كَانَ عَنْهُ مَسْئُولًا"
 */

import { SovereignWorker, WorkerResult, MissionState } from '../workers/protocol';
import type { MissionHandoff } from '../../../agents/contracts';
import * as fs from 'fs';
import * as path from 'path';
import { EnhancedNumericalValidator } from './enhanced_numerical_validator';
import { IQRALogger } from '../logger';

export interface EnhancedValidationResult {
  dasturCompliance: boolean;
  numericalPatterns: any;
  enhancedScore: number;
  violations: string[];
  sacredPatterns: string[];
  overallValidation: 'PASS' | 'FAIL';
}

import type { Provider } from '../../../src/connectors';

export class EnhancedValidationWorker extends SovereignWorker {
  id = 'EnhancedValidationWorker';

  constructor(provider: Provider = 'google') {
    super(provider);
    this.report.mission_id = 'enhanced_validation_mission';
  }

  async execute(input: string, state: MissionState): Promise<WorkerResult> {
    this.report.worker_id = this.id;
    this.report.timestamp = Date.now();

    const textToValidate = typeof input === 'string' ? input : JSON.stringify(input);

    try {
      // 1. Enhanced Numerical Pattern Analysis
      this.markImplemented('Starting enhanced numerical validation');
      const numericalPatterns = EnhancedNumericalValidator.validate(textToValidate);
      
      // 2. Traditional DASTUR Validation (backwards compatibility)
      this.markImplemented('Loading DASTUR for traditional validation');
      const dasturResult = await this.performDasturValidation(textToValidate);
      
      // 3. Calculate Enhanced Validation Score
      const enhancedScore = this.calculateEnhancedScore(numericalPatterns, dasturResult);
      
      // 4. Detect Sacred Pattern Violations
      const violations = this.detectViolations(numericalPatterns, dasturResult);
      
      // 5. Identify Sacred Patterns (positive detection)
      const sacredPatterns = this.identifySacredPatterns(numericalPatterns);
      
      // 6. Determine Overall Validation Status
      const overallValidation = this.determineValidationStatus(
        dasturResult.compliant,
        enhancedScore,
        violations
      );
      
      // 7. Build Enhanced Validation Result
      const validationResult: EnhancedValidationResult = {
        dasturCompliance: dasturResult.compliant,
        numericalPatterns,
        enhancedScore,
        violations,
        sacredPatterns,
        overallValidation
      };
      
      // 8. Store Validation Results
      await this.storeValidationResults(textToValidate, validationResult);
      
      // 9. Update Report
      this.updateValidationReport(validationResult);
      
      // 10. Build Handoff to ExecutionWorker
      const handoff: MissionHandoff = {
        mission_id: this.report.mission_id,
        from_worker: this.id,
        to_worker: 'ExecutionWorker',
        timestamp: Date.now(),
        artifacts: ['enhanced_validation_report'],
        pending_tasks: overallValidation === 'PASS' ? ['execute_with_enhanced_context'] : ['address_validation_issues'],
        known_issues: violations.length > 0 ? violations : [],
        validation_rules: this.generateValidationRules(validationResult),
        context_data: {
          original_input: input,
          enhanced_validation: validationResult,
          dastur_compliance: dasturResult.compliant,
          numerical_resonance: numericalPatterns.overallResonance,
          sacred_patterns_detected: sacredPatterns.length,
          violations_found: violations.length,
          validation_status: overallValidation
        }
      };
      
      this.markImplemented(`Enhanced validation score: ${enhancedScore.toFixed(3)}`);
      this.markImplemented(`Sacred patterns detected: ${sacredPatterns.length}`);
      this.markImplemented(`Violations found: ${violations.length}`);
      
      return {
        success: overallValidation === 'PASS',
        data: validationResult,
        report: this.report,
        next_handoff: handoff
      };
      
    } catch (error: any) {
      this.logIssue(`Enhanced validation failed: ${error.message}`);
      this.markUndone('Complete enhanced validation');
      
      // Fallback to basic validation
      return this.fallbackToBasicValidation(input, state);
    }
  }

  /**
   * Perform traditional DASTUR.md validation
   */
  private async performDasturValidation(text: string): Promise<{ compliant: boolean; forbiddenWords: string[] }> {
    try {
      const dasturPath = path.join(process.cwd(), 'iqra-core', 'DASTUR.md');
      const dastur = fs.readFileSync(dasturPath, 'utf-8');
      this.markImplemented('Loaded DASTUR for validation');

      // Extract HARAM_LIST (Simple parsing for now)
      const haramMatch = dastur.match(/HARAM_LIST = \[([\s\S]*?)\]/);
      let forbidden: string[] = ['كذب', 'غش', 'أذى', 'سرقة', 'harm', 'cheat', 'lie'];
      
      if (haramMatch && haramMatch[1]) {
        const customHaram = haramMatch[1]
          .split(',')
          .map(item => item.trim().replace(/"/g, ''))
          .filter(item => item.length > 0);
        forbidden = [...Array.from(new Set([...forbidden, ...customHaram]))];
        this.markImplemented(`Extracted ${customHaram.length} custom haram rules from Dastur`);
      }

      // Compliance Check
      const lowerText = text.toLowerCase();
      const foundForbidden = Array.from(forbidden).filter((word: string) => lowerText.includes(word));
      
      return {
        compliant: foundForbidden.length === 0,
        forbiddenWords: foundForbidden
      };
      
    } catch (error: any) {
      this.logIssue(`DASTUR validation failed: ${error.message}`);
      return { compliant: false, forbiddenWords: ['dastur_load_failed'] };
    }
  }

  /**
   * Calculate enhanced validation score
   */
  private calculateEnhancedScore(numericalPatterns: any, dasturResult: any): number {
    let score = 0.0;
    
    // Numerical pattern resonance (40%)
    score += numericalPatterns.overallResonance * 0.4;
    
    // DASTUR compliance (30%)
    score += (dasturResult.compliant ? 1.0 : 0.0) * 0.3;
    
    // Sacred pattern bonuses (20%)
    const sacredBonus = this.calculateSacredPatternBonus(numericalPatterns);
    score += Math.min(sacredBonus, 1.0) * 0.2;
    
    // Pattern diversity bonus (10%)
    const diversityBonus = Math.min(numericalPatterns.patterns.length / 10, 1.0);
    score += diversityBonus * 0.1;
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate sacred pattern bonus
   */
  private calculateSacredPatternBonus(numericalPatterns: any): number {
    let bonus = 0.0;
    
    // Seven patterns bonus
    if (numericalPatterns.sevenPatterns.charDivisible) bonus += 0.3;
    if (numericalPatterns.sevenPatterns.versePattern) bonus += 0.2;
    
    // Nineteen patterns bonus
    if (numericalPatterns.nineteenPatterns.mathematicalMiracle) bonus += 0.4;
    if (numericalPatterns.nineteenPatterns.bismillahPattern) bonus += 0.3;
    
    // Tesla 369 bonus
    if (numericalPatterns.teslaPatterns.sequence369) bonus += 0.2;
    if (numericalPatterns.teslaPatterns.digitalRoot9) bonus += 0.1;
    
    // Prime patterns bonus
    if (numericalPatterns.primeAnalysis.charCountPrime) bonus += 0.1;
    
    // Fibonacci patterns bonus
    if (numericalPatterns.fibonacciAnalysis.goldenRatio) bonus += 0.2;
    
    return Math.min(bonus, 1.0);
  }

  /**
   * Detect violations
   */
  private detectViolations(numericalPatterns: any, dasturResult: any): string[] {
    const violations: string[] = [];
    
    // DASTUR violations
    if (!dasturResult.compliant) {
      violations.push(...dasturResult.forbiddenWords.map((word: string) => `DASTUR_VIOLATION:${word}`));
    }
    
    // Numerical pattern concerns (very strict thresholds)
    if (numericalPatterns.overallResonance < 0.1) {
      violations.push('LOW_NUMERICAL_RESONANCE');
    }
    
    return violations;
  }

  /**
   * Identify sacred patterns
   */
  private identifySacredPatterns(numericalPatterns: any): string[] {
    const patterns: string[] = [];
    
    // Seven-based sacred patterns
    if (numericalPatterns.sevenPatterns.charDivisible) {
      patterns.push('SACRED_SEVEN_CHARS');
    }
    if (numericalPatterns.sevenPatterns.wordDivisible) {
      patterns.push('SACRED_SEVEN_WORDS');
    }
    
    // Nineteen-based sacred patterns
    if (numericalPatterns.nineteenPatterns.mathematicalMiracle) {
      patterns.push('MATHEMATICAL_MIRACLE_19');
    }
    if (numericalPatterns.nineteenPatterns.bismillahPattern) {
      patterns.push('BISMILLAH_PATTERN');
    }
    
    // Tesla sacred patterns
    if (numericalPatterns.teslaPatterns.sequence369) {
      patterns.push('TESLA_369_SEQUENCE');
    }
    
    // Prime sacred patterns
    if (numericalPatterns.primeAnalysis.charCountPrime && 
        [7, 19, 13, 3].includes(numericalPatterns.primeAnalysis.primeFactors[0])) {
      patterns.push(`SACRED_PRIME_${numericalPatterns.primeAnalysis.primeFactors[0]}`);
    }
    
    return patterns;
  }

  /**
   * Determine overall validation status
   */
  private determineValidationStatus(
    dasturCompliant: boolean,
    enhancedScore: number,
    violations: string[]
  ): 'PASS' | 'FAIL' {
    // Must be DASTUR compliant
    if (!dasturCompliant) {
      return 'FAIL';
    }
    
    // Must have minimum enhanced score
    if (enhancedScore < 0.2) {
      return 'FAIL';
    }
    
    // Cannot have critical violations
    const criticalViolations = violations.filter(v => 
      v.startsWith('DASTUR_VIOLATION')
    );
    
    if (criticalViolations.length > 0) {
      return 'FAIL';
    }
    
    return 'PASS';
  }

  /**
   * Store validation results in memory
   */
  private async storeValidationResults(input: string, result: EnhancedValidationResult): Promise<void> {
    const memoryKey = `enhanced_validation_${Date.now()}`;
    
    // Use IQRAMemory if available, otherwise log
    try {
      const { IQRAMemory } = await import('../memory');
      await IQRAMemory.set(memoryKey, {
        input,
        validation: result,
        timestamp: Date.now(),
        type: 'enhanced_validation'
      });
    } catch (error) {
      this.logIssue('Could not store validation results in memory');
    }
    
    this.markImplemented('Stored enhanced validation results');
  }

  /**
   * Update validation report
   */
  private updateValidationReport(result: EnhancedValidationResult): void {
    this.report.procedures_followed = result.overallValidation === 'PASS';
    this.report.status = result.overallValidation;
    this.report.exit_code = result.overallValidation === 'PASS' ? 0 : 1;
    
    if (result.violations.length > 0) {
      this.report.issues_discovered = [...result.violations];
    }
    
    if (result.sacredPatterns.length > 0) {
      this.report.implemented.push(`Sacred patterns: ${result.sacredPatterns.join(', ')}`);
    }
  }

  /**
   * Generate validation rules for next worker
   */
  private generateValidationRules(result: EnhancedValidationResult): string[] {
    const rules: string[] = [];
    
    if (result.dasturCompliance) {
      rules.push('MAINTAIN_DASTUR_COMPLIANCE');
    }
    
    if (result.numericalPatterns.overallResonance > 0.5) {
      rules.push('PRESERVE_NUMERICAL_RESONANCE');
    }
    
    if (result.sacredPatterns.length > 0) {
      rules.push('RESPECT_SACRED_PATTERNS');
    }
    
    return rules;
  }

  /**
   * Fallback to basic validation
   */
  private async fallbackToBasicValidation(input: string, state: MissionState): Promise<WorkerResult> {
    this.markImplemented('Falling back to basic validation');
    
    try {
      const textToValidate = typeof input === 'string' ? input : JSON.stringify(input);
      const dasturResult = await this.performDasturValidation(textToValidate);
      
      this.report.procedures_followed = dasturResult.compliant;
      this.report.status = dasturResult.compliant ? 'PASS' : 'FAIL';
      this.report.exit_code = dasturResult.compliant ? 0 : 1;
      
      const handoff: MissionHandoff = {
        mission_id: this.report.mission_id,
        from_worker: this.id,
        to_worker: 'ExecutionWorker',
        timestamp: Date.now(),
        artifacts: ['basic_validation_report'],
        pending_tasks: dasturResult.compliant ? ['execute_with_basic_context'] : ['address_compliance_issues'],
        known_issues: dasturResult.compliant ? [] : dasturResult.forbiddenWords,
        validation_rules: dasturResult.compliant ? ['MAINTAIN_COMPLIANCE'] : ['FIX_VIOLATIONS'],
        context_data: {
          original_input: input,
          basic_validation: dasturResult,
          fallback_mode: true
        }
      };
      
      return {
        success: dasturResult.compliant,
        data: dasturResult,
        report: this.report,
        next_handoff: handoff
      };
      
    } catch (error: any) {
      this.logIssue(`Fallback validation failed: ${error.message}`);
      throw error;
    }
  }
}
