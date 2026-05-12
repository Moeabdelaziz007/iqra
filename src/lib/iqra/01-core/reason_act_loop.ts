/**
 * 🔄 Reason-Act Loop — حلقة التفكير والفعل
 * 
 * Implements the 7-phase cognitive cycle:
 * Observe → Retrieve Memory → Reason → Validate → Execute → Reflect → Save Pattern
 * 
 * Inspired by Gemini-3.0 Superpowers architecture
 * Integrated with IQRA's constitutional framework
 */

import { IQRALogger } from '#infra/logger';
import { IQRAMemory } from '#memory/memory';
import { appendToTrustChain } from '#security/security';
import { ShannonHELEntropy } from './ShannonHELEntropy';
import { QalbinVM } from './QalbinVM';
import crypto from 'crypto';

export interface ReasonActContext {
  sessionId: string;
  userId?: string;
  timestamp: number;
  phase: LoopPhase;
  metadata: Record<string, unknown>;
}

export interface ReasonActResult {
  success: boolean;
  phase: LoopPhase;
  observations: string[];
  reasoning: string;
  validation: {
    passed: boolean;
    issues: string[];
  };
  execution?: {
    action: string;
    result: unknown;
    error?: string;
  };
  reflection: {
    insights: string[];
    patterns: string[];
    improvements: string[];
  };
  trustScore: number;
  patternId?: string;
}

export enum LoopPhase {
  OBSERVE = "OBSERVE",
  RETRIEVE = "RETRIEVE",
  REASON = "REASON",
  VALIDATE = "VALIDATE",
  EXECUTE = "EXECUTE",
  REFLECT = "REFLECT",
  SAVE_PATTERN = "SAVE_PATTERN"
}

export class ReasonActLoop {
  private static readonly MAX_CONTEXT_ITEMS = 5;
  private static readonly MAX_REASONING_TIME = 30000; // 30 seconds

  /**
   * Main cognitive cycle execution
   */
  static async executeCycle(input: string, context: Partial<ReasonActContext> = {}): Promise<ReasonActResult> {
    const sessionId = context.sessionId || this.generateSessionId();
    const startTime = Date.now();

    IQRALogger.info(`🔄 [REASON_ACT] Starting cycle for session ${sessionId}`);

    const result: ReasonActResult = {
      success: false,
      phase: LoopPhase.OBSERVE,
      observations: [],
      reasoning: '',
      validation: { passed: false, issues: [] },
      reflection: { insights: [], patterns: [], improvements: [] },
      trustScore: 0
    };

    try {
      // Phase 1: OBSERVE
      result.observations = await this.observe(input, context);
      result.phase = LoopPhase.RETRIEVE;

      // Phase 2: RETRIEVE MEMORY
      const memoryContext = await this.retrieveMemory(sessionId, result.observations);
      result.phase = LoopPhase.REASON;

      // Phase 3: REASON
      result.reasoning = await this.reason(input, result.observations, memoryContext);
      result.phase = LoopPhase.VALIDATE;

      // Phase 4: VALIDATE
      result.validation = await this.validate(result.reasoning, context);
      result.phase = LoopPhase.EXECUTE;

      // Phase 5: EXECUTE (if validation passes)
      if (result.validation.passed) {
        result.execution = await this.execute(result.reasoning, context);
      } else {
        result.execution = {
          action: 'BLOCKED',
          result: 'Validation failed',
          error: result.validation.issues.join('; ')
        };
      }
      result.phase = LoopPhase.REFLECT;

      // Phase 6: REFLECT
      result.reflection = await this.reflect(result, context);
      result.phase = LoopPhase.SAVE_PATTERN;

      // Phase 7: SAVE PATTERN
      await this.savePattern(result, sessionId);
      result.phase = LoopPhase.OBSERVE; // Reset for next cycle

      // Calculate trust score
      result.trustScore = this.calculateTrustScore(result);
      result.success = result.validation.passed && !result.execution?.error;

      // Log to trust chain
      await this.logToTrustChain(result, sessionId, startTime);

      IQRALogger.info(`✅ [REASON_ACT] Cycle completed for session ${sessionId} | Trust: ${result.trustScore.toFixed(3)}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      IQRALogger.error(`❌ [REASON_ACT] Cycle failed for session ${sessionId}:`, error);
      result.success = false;
      result.execution = {
        action: 'ERROR',
        result: error,
        error: errorMessage
      };
    }

    return result;
  }

  /**
   * Phase 1: OBSERVE - Gather sensory input and context
   */
  private static async observe(input: string, context: Partial<ReasonActContext>): Promise<string[]> {
    IQRALogger.info(`👁️ [OBSERVE] Analyzing input: ${input.slice(0, 100)}...`);

    const observations: string[] = [];

    // Analyze input characteristics
    observations.push(`Input length: ${input.length} characters`);
    observations.push(`Input language: ${this.detectLanguage(input)}`);
    observations.push(`Input type: ${this.classifyInputType(input)}`);

    // Check for Quranic content
    if (this.containsQuranicContent(input)) {
      const entropyResult = ShannonHELEntropy.calculate(input);
      observations.push(`Quranic entropy: ${entropyResult.value.toFixed(4)} (threshold: ${entropyResult.isQuranic ? 'QURANIC' : 'NON-QURANIC'})`);
      
      if (entropyResult.isQuranic) {
        observations.push('Quranic signature detected - high confidence');
      }
    }

    // Analyze emotional/intentional content
    const emotionalState = this.analyzeEmotionalState(input);
    observations.push(`Emotional state: ${emotionalState}`);

    // Check for security concerns
    const securityFlags = this.checkSecurityFlags(input);
    if (securityFlags.length > 0) {
      observations.push(`Security flags: ${securityFlags.join(', ')}`);
    }

    return observations;
  }

  /**
   * Phase 2: RETRIEVE MEMORY - Get relevant context
   */
  private static async retrieveMemory(sessionId: string, observations: string[]): Promise<Record<string, unknown>> {
    IQRALogger.info(`🧠 [RETRIEVE] Retrieving memory for session ${sessionId}`);

    const memoryContext: Record<string, unknown> = {};

    try {
      // Get recent session context
      const sessionMemory = await IQRAMemory.getContextForSession(sessionId, this.MAX_CONTEXT_ITEMS);
      Object.assign(memoryContext, sessionMemory);

      // Get semantic memories related to observations
      for (const observation of observations) {
        const semanticMemories = await IQRAMemory.searchSemantic(observation, 3);
        if (semanticMemories.length > 0) {
          memoryContext[`semantic_${observation.slice(0, 20)}`] = semanticMemories;
        }
      }

      // Get pattern memories
      const patternMemories = await IQRAMemory.getPatternMemories(observations);
      if (Object.keys(patternMemories).length > 0) {
        memoryContext.patterns = patternMemories;
      }

      IQRALogger.info(`📚 [RETRIEVE] Retrieved ${Object.keys(memoryContext).length} memory contexts`);

    } catch (error) {
      IQRALogger.warn(`⚠️ [RETRIEVE] Memory retrieval failed:`, error);
    }

    return memoryContext;
  }

  /**
   * Phase 3: REASON - Logical reasoning and analysis
   */
  private static async reason(input: string, observations: string[], memoryContext: Record<string, unknown>): Promise<string> {
    IQRALogger.info(`🧭 [REASON] Performing logical reasoning`);

    let reasoning = '';

    // Analyze input with context
    reasoning += 'ANALYSIS:\n';
    reasoning += `Input: "${input}"\n`;
    reasoning += `Observations: ${observations.join(', ')}\n`;
    reasoning += `Memory Context: ${JSON.stringify(memoryContext, null, 2)}\n\n`;

    // Apply QalbinVM for topological reasoning
    const qalbin = new QalbinVM();
    const topology = qalbin.transform(input);
    reasoning += 'TOPOLOGICAL ANALYSIS:\n';
    reasoning += `Nodes: ${topology.nodes.length}\n`;
    reasoning += `Edges: ${topology.edges.length}\n`;
    reasoning += `Integrity: ${topology.integrity.toFixed(3)}\n\n`;

    // Islamic reasoning framework
    reasoning += 'ISLAMIC REASONING:\n';
    reasoning += '1. Qiyas (Analogical Reasoning): ';
    reasoning += this.applyQiyas(input, memoryContext);
    reasoning += '\n2. Istihsan (Textual Evidence): ';
    reasoning += this.applyIstihsan(observations, memoryContext);
    reasoning += '\n3. Ijma (Consensus): ';
    reasoning += this.applyIjma(input, memoryContext);
    reasoning += '\n';

    return reasoning;
  }

  /**
   * Phase 4: VALIDATE - Check against constitutional rules
   */
  private static async validate(reasoning: string, context: Partial<ReasonActContext>): Promise<{ passed: boolean; issues: string[] }> {
    IQRALogger.info(`⚖️ [VALIDATE] Validating reasoning against constitutional rules`);

    const issues: string[] = [];

    // Check against IQRA_RULES
    if (!this.checkHaramCompliance(reasoning)) {
      issues.push('Violates HARAM_LIST principles');
    }

    // Check intention purity
    if (!this.checkIntentionPurity(reasoning)) {
      issues.push('Intention not pure or contains hidden agenda');
    }

    // Check logical consistency
    if (!this.checkLogicalConsistency(reasoning)) {
      issues.push('Logical inconsistency detected');
    }

    // Check Islamic compliance
    const islamicCompliance = this.checkIslamicCompliance(reasoning);
    if (!islamicCompliance.compliant) {
      issues.push(...islamicCompliance.violations);
    }

    const passed = issues.length === 0;
    
    IQRALogger.info(`${passed ? '✅' : '❌'} [VALIDATE] ${passed ? 'Validation passed' : 'Validation failed'}: ${issues.join('; ')}`);

    return { passed, issues };
  }

  /**
   * Phase 5: EXECUTE - Perform the action
   */
  private static async execute(reasoning: string, context: Partial<ReasonActContext>): Promise<{ action: string; result: unknown; error?: string }> {
    IQRALogger.info(`⚡ [EXECUTE] Executing based on reasoning`);

    try {
      // Determine action type based on reasoning
      const actionType = this.determineActionType(reasoning);
      
      switch (actionType) {
        case 'ANALYSIS_RESPONSE':
          return {
            action: 'Provide analysis',
            result: reasoning
          };
          
        case 'QURANIC_ANALYSIS':
          const quranicResult = await this.performQuranicAnalysis(reasoning);
          return {
            action: 'Quranic analysis',
            result: quranicResult
          };
          
        case 'MEMORY_OPERATION':
          const memoryResult = await this.performMemoryOperation(reasoning, context);
          return {
            action: 'Memory operation',
            result: memoryResult
          };
          
        case 'EXTERNAL_ACTION':
          const externalResult = await this.performExternalAction(reasoning, context);
          return {
            action: 'External action',
            result: externalResult
          };
          
        default:
          return {
            action: 'Default response',
            result: reasoning
          };
      }
    } catch (error) {
      return {
        action: 'ERROR',
        result: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Phase 6: REFLECT - Analyze the cycle and extract insights
   */
  private static async reflect(result: ReasonActResult, context: Partial<ReasonActContext>): Promise<{ insights: string[]; patterns: string[]; improvements: string[] }> {
    IQRALogger.info(`🔍 [REFLECT] Reflecting on cycle results`);

    const insights: string[] = [];
    const patterns: string[] = [];
    const improvements: string[] = [];

    // Extract insights from execution
    if (result.execution) {
      insights.push(`Action executed: ${result.execution.action}`);
      if (result.execution.error) {
        insights.push(`Execution error: ${result.execution.error}`);
        improvements.push('Add better error handling for this action type');
      }
    }

    // Analyze validation results
    if (!result.validation.passed) {
      insights.push(`Validation failed: ${result.validation.issues.join(', ')}`);
      patterns.push('Validation failure pattern detected');
      improvements.push('Review constitutional alignment for similar inputs');
    }

    // Analyze reasoning quality
    const reasoningQuality = this.analyzeReasoningQuality(result.reasoning);
    insights.push(`Reasoning quality: ${reasoningQuality}`);
    if (reasoningQuality.score < 0.7) {
      improvements.push('Improve logical reasoning framework');
    }

    // Check for learning opportunities
    const learningOpportunities = this.identifyLearningOpportunities(result, context);
    insights.push(...learningOpportunities);
    patterns.push('Continuous learning pattern');

    IQRALogger.info(`💡 [REFLECT] Generated ${insights.length} insights, ${patterns.length} patterns, ${improvements.length} improvements`);

    return { insights, patterns, improvements };
  }

  /**
   * Phase 7: SAVE PATTERN - Store learned patterns
   */
  private static async savePattern(result: ReasonActResult, sessionId: string): Promise<void> {
    IQRALogger.info(`💾 [SAVE_PATTERN] Saving patterns from cycle ${sessionId}`);

    try {
      const patternData = {
        sessionId,
        timestamp: Date.now(),
        inputHash: crypto.createHash('sha256').update(result.reasoning).digest('hex'),
        reasoning: result.reasoning,
        validation: result.validation,
        execution: result.execution,
        reflection: result.reflection,
        trustScore: result.trustScore,
        patternId: this.generatePatternId(result)
      };

      // Save to memory
      await IQRAMemory.savePattern(patternData);

      // Update pattern statistics
      await this.updatePatternStatistics(patternData);

      IQRALogger.info(`✅ [SAVE_PATTERN] Pattern saved with ID: ${patternData.patternId}`);

    } catch (error) {
      IQRALogger.error(`❌ [SAVE_PATTERN] Failed to save pattern:`, error);
    }
  }

  // Helper methods
  private static generateSessionId(): string {
    return `session_${Date.now()}_${crypto.randomBytes(8).toString('hex').slice(0, 8)}`;
  }

  private static generatePatternId(result: ReasonActResult): string {
    const base = `${result.phase}_${Date.now()}`;
    return crypto.createHash('sha256').update(base).digest('hex').slice(0, 16);
  }

  private static detectLanguage(input: string): string {
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(input) ? 'Arabic' : 'Other';
  }

  private static classifyInputType(input: string): string {
    if (input.includes('?')) return 'Question';
    if (input.includes('analyze') || input.includes('تحليل')) return 'Analysis request';
    if (input.includes('help') || input.includes('مساعدة')) return 'Help request';
    return 'Statement';
  }

  private static containsQuranicContent(input: string): boolean {
    const quranicKeywords = ['قرآن', 'آية', 'سورة', 'الفاتحة', 'بسم الله', 'صلى الله عليه وسلم'];
    return quranicKeywords.some(keyword => input.includes(keyword));
  }

  private static analyzeEmotionalState(input: string): string {
    const positiveWords = ['الحمد', 'الشكر', 'الفرح', 'السرور'];
    const negativeWords = ['الحزن', 'الغضب', 'الخوف', 'القلق'];
    
    const positiveCount = positiveWords.filter(word => input.includes(word)).length;
    const negativeCount = negativeWords.filter(word => input.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'Positive';
    if (negativeCount > positiveCount) return 'Negative';
    return 'Neutral';
  }

  private static checkSecurityFlags(input: string): string[] {
    const flags: string[] = [];
    
    if (input.includes('hack') || input.includes('crack')) flags.push('Potential malicious intent');
    if (input.includes('password') || input.includes('سر')) flags.push('Password-related request');
    if (input.includes('admin') && input.includes('override')) flags.push('Privilege escalation attempt');
    
    return flags;
  }

  private static checkHaramCompliance(reasoning: string): boolean {
    const haramPatterns = ['ربا', 'فائدة', 'ظلم', 'عدوان', 'كذب'];
    return !haramPatterns.some(pattern => reasoning.includes(pattern));
  }

  private static checkIntentionPurity(reasoning: string): boolean {
    // Check for hidden agendas or manipulative language
    const manipulativePatterns = ['خداع', 'تضليل', 'غش', 'مخادعة'];
    return !manipulativePatterns.some(pattern => reasoning.includes(pattern));
  }

  private static checkLogicalConsistency(reasoning: string): boolean {
    // Basic consistency check
    const lines = reasoning.split('\n');
    let hasThesis = false;
    let hasEvidence = false;
    let hasConclusion = false;
    
    for (const line of lines) {
      if (line.includes('ANALYSIS:') || line.includes('CONCLUSION:')) hasConclusion = true;
      if (line.includes('EVIDENCE:')) hasEvidence = true;
      if (line.includes('THESIS:')) hasThesis = true;
    }
    
    return hasThesis && hasEvidence && hasConclusion;
  }

  private static checkIslamicCompliance(reasoning: string): { compliant: boolean; violations: string[] } {
    const violations: string[] = [];
    
    // Check for compliance with Islamic principles
    if (reasoning.includes('ربا') || reasoning.includes('usury')) {
      violations.push('References to Riba/Usury');
    }
    
    if (reasoning.includes('ظلم') || reasoning.includes('injustice')) {
      violations.push('References to Zulm/Injustice');
    }
    
    // Check for respect in language
    const disrespectfulPatterns = ['سخر', 'استهزاء', 'تحقير'];
    if (disrespectfulPatterns.some(pattern => reasoning.includes(pattern))) {
      violations.push('Disrespectful language detected');
    }
    
    return {
      compliant: violations.length === 0,
      violations
    };
  }

  private static applyQiyas(input: string, memoryContext: Record<string, unknown>): string {
    // Analogical reasoning based on Islamic jurisprudence
    return 'Applying Qiyas (analogical reasoning) based on Quran and Sunnah principles';
  }

  private static applyIstihsan(observations: string[], memoryContext: Record<string, unknown>): string {
    // Textual evidence-based reasoning
    return 'Applying Istihsan (textual evidence) from primary sources and observations';
  }

  private static applyIjma(input: string, memoryContext: Record<string, unknown>): string {
    // Consensus-based reasoning
    return 'Applying Ijma (consensus) considering scholarly opinions and community standards';
  }

  private static determineActionType(reasoning: string): string {
    if (reasoning.includes('QURANIC') || reasoning.includes('قرآني')) return 'QURANIC_ANALYSIS';
    if (reasoning.includes('MEMORY') || reasoning.includes('ذاكرة')) return 'MEMORY_OPERATION';
    if (reasoning.includes('EXTERNAL') || reasoning.includes('خارجي')) return 'EXTERNAL_ACTION';
    return 'ANALYSIS_RESPONSE';
  }

  private static async performQuranicAnalysis(reasoning: string): Promise<any> {
    // Placeholder for Quranic analysis
    return { type: 'quranic_analysis', result: reasoning };
  }

  private static async performMemoryOperation(reasoning: string, context: Partial<ReasonActContext>): Promise<any> {
    // Placeholder for memory operations
    return { type: 'memory_operation', result: 'Memory operation completed' };
  }

  private static async performExternalAction(reasoning: string, context: Partial<ReasonActContext>): Promise<any> {
    // Placeholder for external actions
    return { type: 'external_action', result: 'External action completed' };
  }

  private static analyzeReasoningQuality(reasoning: string): { score: number; assessment: string } {
    // Simple quality assessment
    const hasStructure = reasoning.includes('ANALYSIS:') && reasoning.includes('EVIDENCE:') && reasoning.includes('CONCLUSION:');
    const hasDepth = reasoning.length > 200;
    const hasClarity = !reasoning.includes('unclear') && !reasoning.includes('ambiguous');
    
    const score = (hasStructure ? 0.3 : 0) + (hasDepth ? 0.4 : 0) + (hasClarity ? 0.3 : 0);
    
    let assessment = 'Poor';
    if (score >= 0.8) assessment = 'Good';
    else if (score >= 0.5) assessment = 'Fair';
    
    return { score, assessment };
  }

  private static identifyLearningOpportunities(result: ReasonActResult, context: Partial<ReasonActContext>): string[] {
    const opportunities: string[] = [];
    
    if (!result.validation.passed) {
      opportunities.push('Study constitutional rules for better compliance');
    }
    
    if (result.execution?.error) {
      opportunities.push('Improve error handling and recovery mechanisms');
    }
    
    if (result.trustScore < 0.5) {
      opportunities.push('Focus on building trust through consistent behavior');
    }
    
    return opportunities;
  }

  private static calculateTrustScore(result: ReasonActResult): number {
    let score = 0.5; // Base score
    
    if (result.validation.passed) score += 0.3;
    if (!result.execution?.error) score += 0.2;
    
    // Adjust based on reflection quality
    const insightCount = result.reflection.insights.length;
    if (insightCount > 3) score += 0.1;
    if (insightCount > 5) score += 0.1;
    
    return Math.min(1.0, score);
  }

  private static async updatePatternStatistics(patternData: any): Promise<void> {
    // Update pattern statistics in memory
    try {
      await IQRAMemory.updatePatternStatistics(patternData.patternId, {
        lastUsed: Date.now(),
        usageCount: 1,
        successRate: patternData.validation.passed ? 1 : 0
      });
    } catch (error) {
      IQRALogger.warn(`⚠️ [PATTERN_STATS] Failed to update statistics:`, error);
    }
  }

  private static async logToTrustChain(result: ReasonActResult, sessionId: string, startTime: number): Promise<void> {
    const duration = Date.now() - startTime;
    
    const trustEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      phase: result.phase,
      action: result.execution?.action || 'NO_ACTION',
      success: result.success,
      trustScore: result.trustScore,
      duration,
      patternId: result.patternId,
      validationIssues: result.validation.issues,
      insights: result.reflection.insights
    };

    await appendToTrustChain('REASON_ACT_CYCLE', sessionId, JSON.stringify(trustEntry), result.trustScore);
  }
}
